import dns from 'node:dns/promises';
import net from 'node:net';
import pg from 'pg';
import type {ConnectionStatus} from '../types.ts';

const {Pool} = pg;

let activePool: pg.Pool | null = null;
let runtimeDatabaseUrl: string | null = null;

function isPrivateOrLoopbackIp(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:')) {
    return true;
  }
  if (normalized.startsWith('::ffff:')) {
    return isPrivateOrLoopbackIp(normalized.slice(7));
  }
  const parts = normalized.split('.').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export async function validateExternalPostgresUri(rawUri: string): Promise<URL> {
  const trimmed = rawUri.trim();
  if (!trimmed) {
    throw new Error('Service URI is required.');
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Invalid PostgreSQL URI format.');
  }

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('URI must start with postgres:// or postgresql://.');
  }

  const host = parsed.hostname.toLowerCase();
  if (!host) {
    throw new Error('URI must include a valid database host.');
  }

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new Error('Private or loopback database hosts are not allowed.');
  }

  if (net.isIP(host)) {
    if (isPrivateOrLoopbackIp(host)) {
      throw new Error('Private or loopback IP addresses are not allowed.');
    }
  } else {
    try {
      const addresses = await dns.lookup(host, {all: true});
      if (addresses.length === 0) {
        throw new Error('Database hostname could not be resolved.');
      }
      for (const entry of addresses) {
        if (isPrivateOrLoopbackIp(entry.address)) {
          throw new Error('Database hostname resolves to a restricted network address.');
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('restricted')) {
        throw err;
      }
      throw new Error('Could not resolve database hostname.');
    }
  }

  return parsed;
}

function buildPoolFromUri(uri: string): pg.Pool {
  const parsed = new URL(uri);
  const sslMode = parsed.searchParams.get('sslmode');
  parsed.searchParams.delete('sslmode');

  const useSsl = sslMode !== 'disable';
  return new Pool({
    connectionString: parsed.toString(),
    ssl: useSsl ? {rejectUnauthorized: false} : false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
  });
}

export function getActiveUriInfo(): {
  uri: string | null;
  source: 'env' | 'runtime' | 'none';
} {
  const envUri = process.env.DATABASE_URL?.trim();
  if (envUri) {
    return {uri: envUri, source: 'env'};
  }
  if (runtimeDatabaseUrl) {
    return {uri: runtimeDatabaseUrl, source: 'runtime'};
  }
  return {uri: null, source: 'none'};
}

export function getPool(): pg.Pool | null {
  const {uri} = getActiveUriInfo();
  if (!uri) {
    return null;
  }
  if (!activePool) {
    activePool = buildPoolFromUri(uri);
  }
  return activePool;
}

export async function setRuntimeDatabaseUri(rawUri: string): Promise<ConnectionStatus> {
  if (process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is already configured by the server environment.');
  }

  const parsed = await validateExternalPostgresUri(rawUri);
  const candidatePool = buildPoolFromUri(parsed.toString());

  try {
    await candidatePool.query('SELECT 1');
  } catch (err) {
    await candidatePool.end().catch(() => {});
    const message = err instanceof Error ? err.message : 'Unable to connect to PostgreSQL.';
    throw new Error(`Connection failed: ${message}`);
  }

  if (activePool) {
    await activePool.end().catch(() => {});
  }
  runtimeDatabaseUrl = parsed.toString();
  activePool = candidatePool;

  return getConnectionStatus();
}

export async function clearRuntimeDatabaseUri(): Promise<void> {
  if (activePool && !process.env.DATABASE_URL?.trim()) {
    await activePool.end().catch(() => {});
    activePool = null;
  }
  runtimeDatabaseUrl = null;
}

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const {uri, source} = getActiveUriInfo();
  if (!uri) {
    return {
      configured: false,
      connected: false,
      source: 'none',
    };
  }

  let host: string | undefined;
  let database: string | undefined;
  try {
    const parsed = new URL(uri);
    host = parsed.hostname;
    database = parsed.pathname.replace(/^\//, '') || 'defaultdb';
  } catch {
    return {
      configured: false,
      connected: false,
      source,
      error: 'Configured DATABASE_URL is not a valid URI.',
    };
  }

  const pool = getPool();
  if (!pool) {
    return {configured: false, connected: false, source};
  }

  try {
    await pool.query('SELECT 1');
    return {
      configured: true,
      connected: true,
      source,
      host,
      database,
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      source,
      host,
      database,
      error: err instanceof Error ? err.message : 'Database connection check failed.',
    };
  }
}
