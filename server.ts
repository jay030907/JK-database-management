import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer as createViteServer} from 'vite';
import {
  clearRuntimeDatabaseUri,
  getConnectionStatus,
  getPool,
  setRuntimeDatabaseUri,
} from './src/server/db.ts';
import type {
  BookRecord,
  LookupMode,
  LookupResponse,
  RegistryOverview,
  StudentRecord,
  TransactionDetail,
} from './src/types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({limit: '32kb'}));

  app.get('/api/health', async (_req, res) => {
    const status = await getConnectionStatus();
    res.json(status);
  });

  app.post('/api/config/database', async (req, res) => {
    if (process.env.DATABASE_URL?.trim()) {
      res.status(403).json({
        error: 'Database connection is managed via server environment variables.',
      });
      return;
    }

    const connectionString =
      typeof req.body?.connectionString === 'string' ? req.body.connectionString : '';

    try {
      const status = await setRuntimeDatabaseUri(connectionString);
      res.json(status);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Failed to connect to database.',
      });
    }
  });

  app.post('/api/config/database/disconnect', async (_req, res) => {
    if (process.env.DATABASE_URL?.trim()) {
      res.status(403).json({
        error: 'Environment-configured connections cannot be disconnected from the browser.',
      });
      return;
    }
    await clearRuntimeDatabaseUri();
    const status = await getConnectionStatus();
    res.json(status);
  });

  app.get('/api/records', async (_req, res) => {
    const pool = getPool();
    if (!pool) {
      res.status(503).json({error: 'Database is not configured.'});
      return;
    }

    try {
      const [txResult, studentResult, bookResult] = await Promise.all([
        pool.query<TransactionDetail>(`
          SELECT
            t.transaction_id,
            t.usn,
            t.book_id,
            t.borrow_status,
            t.return_status,
            s.name AS student_name,
            s.department AS student_department,
            b.book_name,
            b.author AS book_author
          FROM public.transactions t
          LEFT JOIN public.students1 s ON t.usn = s.usn
          LEFT JOIN public.books b ON UPPER(t.book_id) = UPPER(b.book_id)
          ORDER BY t.transaction_id ASC
          LIMIT 200
        `),
        pool.query<StudentRecord>(`
          SELECT usn, name, department
          FROM public.students1
          ORDER BY usn ASC
          LIMIT 200
        `),
        pool.query<BookRecord>(`
          SELECT book_id, book_name, author
          FROM public.books
          ORDER BY book_id ASC
          LIMIT 200
        `),
      ]);

      const transactions = txResult.rows;
      const returnedCount = transactions.filter(
        (r) => (r.return_status ?? '').toLowerCase() === 'returned'
      ).length;
      const pendingCount = transactions.filter(
        (r) => (r.return_status ?? '').toLowerCase() === 'pending'
      ).length;

      const overview: RegistryOverview = {
        transactions,
        students: studentResult.rows,
        books: bookResult.rows,
        stats: {
          totalTransactions: transactions.length,
          returnedCount,
          pendingCount,
          totalStudents: studentResult.rows.length,
          totalBooks: bookResult.rows.length,
        },
      };

      res.json(overview);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to fetch database records.',
      });
    }
  });

  app.get('/api/lookup', async (req, res) => {
    const pool = getPool();
    if (!pool) {
      res.status(503).json({error: 'Database is not configured.'});
      return;
    }

    const rawUsn = typeof req.query.usn === 'string' ? req.query.usn.trim() : '';
    const rawBookId = typeof req.query.bookId === 'string' ? req.query.bookId.trim() : '';
    const rawTxId =
      typeof req.query.transactionId === 'string' ? req.query.transactionId.trim() : '';
    const mode: LookupMode = req.query.mode === 'any' ? 'any' : 'all';

    if (!rawUsn && !rawBookId && !rawTxId) {
      res.status(400).json({
        error: 'Enter at least one field: USN, Book ID, or Transaction ID.',
      });
      return;
    }

    let parsedUsn: number | null = null;
    if (rawUsn) {
      if (!/^\d+$/.test(rawUsn)) {
        res.status(400).json({error: 'USN must be a valid integer (for example: 1).'});
        return;
      }
      parsedUsn = Number.parseInt(rawUsn, 10);
      if (!Number.isSafeInteger(parsedUsn) || parsedUsn > 2147483647) {
        res.status(400).json({error: 'USN is out of valid range.'});
        return;
      }
    }

    let parsedTxId: number | null = null;
    if (rawTxId) {
      if (!/^\d+$/.test(rawTxId)) {
        res.status(400).json({
          error: 'Transaction ID must be a valid integer (for example: 1).',
        });
        return;
      }
      parsedTxId = Number.parseInt(rawTxId, 10);
      if (!Number.isSafeInteger(parsedTxId) || parsedTxId > 2147483647) {
        res.status(400).json({error: 'Transaction ID is out of valid range.'});
        return;
      }
    }

    if (rawBookId.length > 64) {
      res.status(400).json({error: 'Book ID exceeds maximum allowed length.'});
      return;
    }

    const conditions: string[] = [];
    const params: Array<number | string> = [];

    if (parsedUsn !== null) {
      params.push(parsedUsn);
      conditions.push(`t.usn = $${params.length}`);
    }
    if (rawBookId) {
      params.push(rawBookId);
      conditions.push(`UPPER(t.book_id) = UPPER($${params.length})`);
    }
    if (parsedTxId !== null) {
      params.push(parsedTxId);
      conditions.push(`t.transaction_id = $${params.length}`);
    }

    const joinOperator = mode === 'any' ? ' OR ' : ' AND ';
    const whereClause = conditions.join(joinOperator);

    try {
      const txPromise = pool.query<TransactionDetail>(
        `
        SELECT
          t.transaction_id,
          t.usn,
          t.book_id,
          t.borrow_status,
          t.return_status,
          s.name AS student_name,
          s.department AS student_department,
          b.book_name,
          b.author AS book_author
        FROM public.transactions t
        LEFT JOIN public.students1 s ON t.usn = s.usn
        LEFT JOIN public.books b ON UPPER(t.book_id) = UPPER(b.book_id)
        WHERE ${whereClause}
        ORDER BY t.transaction_id ASC
        `,
        params
      );

      const studentPromise =
        parsedUsn !== null
          ? pool.query<StudentRecord>(
              'SELECT usn, name, department FROM public.students1 WHERE usn = $1',
              [parsedUsn]
            )
          : Promise.resolve(null);

      const bookPromise = rawBookId
        ? pool.query<BookRecord>(
            'SELECT book_id, book_name, author FROM public.books WHERE UPPER(book_id) = UPPER($1)',
            [rawBookId]
          )
        : Promise.resolve(null);

      const [txResult, studentResult, bookResult] = await Promise.all([
        txPromise,
        studentPromise,
        bookPromise,
      ]);

      const payload: LookupResponse = {
        criteria: {
          usn: parsedUsn,
          bookId: rawBookId || null,
          transactionId: parsedTxId,
        },
        mode,
        matches: txResult.rows,
        directStudent: studentResult?.rows[0] ?? null,
        directBook: bookResult?.rows[0] ?? null,
      };

      res.json(payload);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Database lookup failed.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
