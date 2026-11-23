import {useState, type FormEvent} from 'react';
import {Database, Eye, EyeOff, Lock} from 'lucide-react';
import type {ConnectionStatus} from '../types.ts';

interface DatabaseConnectPanelProps {
  status: ConnectionStatus;
  onConnected: (newStatus: ConnectionStatus) => void;
}

export function DatabaseConnectPanel({
  status,
  onConnected,
}: DatabaseConnectPanelProps) {
  const [uri, setUri] = useState('');
  const [showUri, setShowUri] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(status.error ?? null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!uri.trim()) {
      setError('Please enter your PostgreSQL service URI.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/config/database', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({connectionString: uri.trim()}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not connect to PostgreSQL.');
        return;
      }
      setUri('');
      onConnected(data as ConnectionStatus);
    } catch {
      setError('Network error while connecting to the server.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="rounded-lg border border-slate-200 bg-white p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
            <Database className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              Connect PostgreSQL Service
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Enter your PostgreSQL service URI to query the{' '}
              <span className="font-mono text-slate-800">students1</span>,{' '}
              <span className="font-mono text-slate-800">books</span>, and{' '}
              <span className="font-mono text-slate-800">transactions</span>{' '}
              tables. For persistent deployments, configure{' '}
              <span className="font-mono text-slate-800">DATABASE_URL</span> in
              environment secrets.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="postgres-uri"
              className="block text-sm font-medium text-slate-700"
            >
              PostgreSQL Service URI
            </label>
            <div className="relative mt-1.5">
              <input
                id="postgres-uri"
                type={showUri ? 'text' : 'password'}
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                placeholder="postgres://user:password@host:port/defaultdb?sslmode=require"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-md border border-slate-300 bg-white py-2.5 pr-10 pl-3.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowUri((prev) => !prev)}
                aria-label={showUri ? 'Hide service URI' : 'Show service URI'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700"
              >
                {showUri ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span>Held in server memory only; never stored in browser.</span>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 items-center justify-center rounded-md bg-blue-700 px-5 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Connecting...' : 'Connect Database'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
