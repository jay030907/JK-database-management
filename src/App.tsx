import {useCallback, useEffect, useState, type FormEvent} from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  Database,
  Menu,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react';
import {DatabaseConnectPanel} from './components/DatabaseConnectPanel.tsx';
import {ParticularDetailsPanel} from './components/ParticularDetailsPanel.tsx';
import {
  BooksTable,
  StudentsTable,
  TransactionsTable,
} from './components/RegistryTables.tsx';
import type {
  ConnectionStatus,
  LookupMode,
  LookupResponse,
  RegistryOverview,
  TransactionDetail,
} from './types.ts';

type WorkspaceView = 'lookup' | 'transactions' | 'students' | 'books';

const VIEW_LABELS: Record<WorkspaceView, string> = {
  lookup: 'Record Lookup',
  transactions: 'Transactions',
  students: 'Students',
  books: 'Books',
};

export default function App() {
  const [view, setView] = useState<WorkspaceView>('lookup');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [connStatus, setConnStatus] = useState<ConnectionStatus | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(true);

  const [overview, setOverview] = useState<RegistryOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [usnInput, setUsnInput] = useState('');
  const [bookIdInput, setBookIdInput] = useState('');
  const [transactionIdInput, setTransactionIdInput] = useState('');
  const [lookupMode, setLookupMode] = useState<LookupMode>('all');

  const [lookupResult, setLookupResult] = useState<LookupResponse | null>(null);
  const [selectedTx, setSelectedTx] = useState<TransactionDetail | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    setOverviewError(null);
    try {
      const res = await fetch('/api/records');
      const data = await res.json();
      if (!res.ok) {
        setOverviewError(data.error || 'Failed to load library records.');
        return;
      }
      setOverview(data as RegistryOverview);
    } catch {
      setOverviewError('Network error while loading library records.');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const checkHealth = useCallback(async () => {
    setCheckingHealth(true);
    try {
      const res = await fetch('/api/health');
      const data = (await res.json()) as ConnectionStatus;
      setConnStatus(data);
      if (data.connected) {
        await loadOverview();
      }
    } catch {
      setConnStatus({
        configured: false,
        connected: false,
        source: 'none',
        error: 'Unable to reach backend server.',
      });
    } finally {
      setCheckingHealth(false);
    }
  }, [loadOverview]);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  const executeLookup = useCallback(
    async (params: {
      usn: string;
      bookId: string;
      transactionId: string;
      mode: LookupMode;
    }) => {
      const trimmedUsn = params.usn.trim();
      const trimmedBookId = params.bookId.trim();
      const trimmedTxId = params.transactionId.trim();

      if (!trimmedUsn && !trimmedBookId && !trimmedTxId) {
        setLookupError(
          'Enter at least one of USN, Book ID, or Transaction ID.'
        );
        return;
      }

      setLookupLoading(true);
      setLookupError(null);

      const searchParams = new URLSearchParams();
      if (trimmedUsn) searchParams.set('usn', trimmedUsn);
      if (trimmedBookId) searchParams.set('bookId', trimmedBookId);
      if (trimmedTxId) searchParams.set('transactionId', trimmedTxId);
      searchParams.set('mode', params.mode);

      try {
        const res = await fetch(`/api/lookup?${searchParams.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          setLookupError(data.error || 'Lookup failed.');
          setLookupResult(null);
          setSelectedTx(null);
          return;
        }
        const typed = data as LookupResponse;
        setLookupResult(typed);
        setSelectedTx(typed.matches[0] ?? null);
      } catch {
        setLookupError('Network error while querying PostgreSQL.');
      } finally {
        setLookupLoading(false);
      }
    },
    []
  );

  function handleLookupSubmit(e: FormEvent) {
    e.preventDefault();
    void executeLookup({
      usn: usnInput,
      bookId: bookIdInput,
      transactionId: transactionIdInput,
      mode: lookupMode,
    });
  }

  function handleClearLookup() {
    setUsnInput('');
    setBookIdInput('');
    setTransactionIdInput('');
    setLookupResult(null);
    setSelectedTx(null);
    setLookupError(null);
  }

  function handleInspectTransaction(tx: TransactionDetail) {
    setView('lookup');
    setUsnInput(String(tx.usn));
    setBookIdInput(tx.book_id);
    setTransactionIdInput(String(tx.transaction_id));
    setLookupMode('all');
    void executeLookup({
      usn: String(tx.usn),
      bookId: tx.book_id,
      transactionId: String(tx.transaction_id),
      mode: 'all',
    });
  }

  function handleLookupByUsn(usn: number) {
    setView('lookup');
    setUsnInput(String(usn));
    setBookIdInput('');
    setTransactionIdInput('');
    setLookupMode('all');
    void executeLookup({
      usn: String(usn),
      bookId: '',
      transactionId: '',
      mode: 'all',
    });
  }

  function handleLookupByBookId(bookId: string) {
    setView('lookup');
    setUsnInput('');
    setBookIdInput(bookId);
    setTransactionIdInput('');
    setLookupMode('all');
    void executeLookup({
      usn: '',
      bookId,
      transactionId: '',
      mode: 'all',
    });
  }

  async function handleDisconnect() {
    await fetch('/api/config/database/disconnect', {method: 'POST'});
    setOverview(null);
    setLookupResult(null);
    setSelectedTx(null);
    await checkHealth();
  }

  const navItems: Array<{
    id: WorkspaceView;
    label: string;
    icon: typeof Search;
    count?: number;
  }> = [
    {id: 'lookup', label: 'Record Lookup', icon: Search},
    {
      id: 'transactions',
      label: 'Transactions',
      icon: ArrowLeftRight,
      count: overview?.stats.totalTransactions,
    },
    {
      id: 'students',
      label: 'Students',
      icon: Users,
      count: overview?.stats.totalStudents,
    },
    {
      id: 'books',
      label: 'Books',
      icon: BookOpen,
      count: overview?.stats.totalBooks,
    },
  ];

  const isConnected = Boolean(connStatus?.connected);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="flex h-16 items-center border-b border-slate-200 px-6">
            <span className="font-display text-base font-bold tracking-tight whitespace-nowrap text-slate-900">
              Library Registry
            </span>
          </div>

          <nav aria-label="Workspace views" className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={`flex h-10 w-full items-center justify-between rounded-md px-3 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.count !== undefined && (
                    <span className="font-mono text-xs tabular-nums text-slate-500">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <Database className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="truncate">
                {isConnected
                  ? connStatus?.database || 'PostgreSQL'
                  : 'Not connected'}
              </span>
            </div>
            {isConnected && connStatus?.host && (
              <p className="mt-1 truncate font-mono text-xs text-slate-500">
                {connStatus.host}
              </p>
            )}
            {isConnected && connStatus?.source === 'runtime' && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="mt-3 text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
              >
                Switch Database URI
              </button>
            )}
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="fixed inset-0 bg-slate-900/30"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="relative z-50 flex w-64 flex-col bg-white shadow-lg">
              <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
                <span className="font-display text-base font-bold tracking-tight text-slate-900">
                  Library Registry
                </span>
                <button
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 p-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = view === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setView(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex h-11 w-full items-center justify-between rounded-md px-3 text-sm font-medium ${
                        active
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </span>
                      {item.count !== undefined && (
                        <span className="font-mono text-xs tabular-nums text-slate-500">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between gap-8 border-b border-slate-200 bg-white px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation menu"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 truncate text-sm">
                <span className="text-slate-500">Registry</span>
                <span className="text-slate-400" aria-hidden="true">
                  /
                </span>
                <span className="font-medium text-slate-900">
                  {VIEW_LABELS[view]}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {isConnected ? (
                <button
                  type="button"
                  onClick={() => void loadOverview()}
                  disabled={loadingOverview}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-medium whitespace-nowrap text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${
                      loadingOverview ? 'animate-spin' : ''
                    }`}
                  />
                  <span>Refresh Data</span>
                </button>
              ) : null}
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 p-6 lg:p-8">
            {checkingHealth ? (
              <div className="space-y-6">
                <div className="h-44 animate-pulse rounded-lg border border-slate-200 bg-white" />
                <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />
              </div>
            ) : !isConnected ? (
              <DatabaseConnectPanel
                status={
                  connStatus ?? {
                    configured: false,
                    connected: false,
                    source: 'none',
                  }
                }
                onConnected={(newStatus) => {
                  setConnStatus(newStatus);
                  if (newStatus.connected) {
                    void loadOverview();
                  }
                }}
              />
            ) : (
              <div className="space-y-6">
                {/* Summary Strip */}
                {overview && (
                  <div className="grid grid-cols-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                    <div className="px-5 py-4">
                      <div className="text-xs text-slate-500">
                        Total Transactions
                      </div>
                      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                        {overview.stats.totalTransactions}
                      </div>
                    </div>
                    <div className="px-5 py-4">
                      <div className="text-xs text-slate-500">
                        Pending Returns
                      </div>
                      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-amber-700">
                        {overview.stats.pendingCount}
                      </div>
                    </div>
                    <div className="px-5 py-4">
                      <div className="text-xs text-slate-500">
                        Returned Books
                      </div>
                      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-700">
                        {overview.stats.returnedCount}
                      </div>
                    </div>
                    <div className="px-5 py-4">
                      <div className="text-xs text-slate-500">
                        Students / Books
                      </div>
                      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                        {overview.stats.totalStudents}{' '}
                        <span className="text-slate-400">/</span>{' '}
                        {overview.stats.totalBooks}
                      </div>
                    </div>
                  </div>
                )}

                {overviewError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-5 py-3.5 text-sm text-red-700"
                  >
                    {overviewError}
                  </div>
                )}

                {view === 'lookup' && (
                  <div className="space-y-6">
                    {/* Search Form */}
                    <section
                      aria-label="Particular Record Search"
                      className="rounded-lg border border-slate-200 bg-white p-6"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                            Find Particular Student, Book &amp; Transaction
                          </h1>
                          <p className="mt-1 text-sm text-slate-600">
                            Enter USN, Book ID, Transaction ID, or any
                            combination to display full details from PostgreSQL.
                          </p>
                        </div>

                        <div
                          role="group"
                          aria-label="Criteria matching mode"
                          className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-0.5"
                        >
                          <button
                            type="button"
                            onClick={() => setLookupMode('all')}
                            className={`h-8 rounded px-3 text-xs font-medium whitespace-nowrap transition-colors ${
                              lookupMode === 'all'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Match All Entered
                          </button>
                          <button
                            type="button"
                            onClick={() => setLookupMode('any')}
                            className={`h-8 rounded px-3 text-xs font-medium whitespace-nowrap transition-colors ${
                              lookupMode === 'any'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Match Any
                          </button>
                        </div>
                      </div>

                      <form onSubmit={handleLookupSubmit} className="mt-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div>
                            <label
                              htmlFor="input-usn"
                              className="block text-sm font-medium text-slate-700"
                            >
                              USN
                            </label>
                            <input
                              id="input-usn"
                              type="text"
                              inputMode="numeric"
                              value={usnInput}
                              onChange={(e) => setUsnInput(e.target.value)}
                              placeholder="e.g. 1"
                              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="input-book-id"
                              className="block text-sm font-medium text-slate-700"
                            >
                              Book ID
                            </label>
                            <input
                              id="input-book-id"
                              type="text"
                              value={bookIdInput}
                              onChange={(e) => setBookIdInput(e.target.value)}
                              placeholder="e.g. B101"
                              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="input-transaction-id"
                              className="block text-sm font-medium text-slate-700"
                            >
                              Transaction ID
                            </label>
                            <input
                              id="input-transaction-id"
                              type="text"
                              inputMode="numeric"
                              value={transactionIdInput}
                              onChange={(e) =>
                                setTransactionIdInput(e.target.value)
                              }
                              placeholder="e.g. 1"
                              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none"
                            />
                          </div>
                        </div>

                        {lookupError && (
                          <div
                            role="alert"
                            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
                          >
                            {lookupError}
                          </div>
                        )}

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>Quick samples:</span>
                            {overview?.transactions.slice(0, 3).map((sample) => (
                              <button
                                key={sample.transaction_id}
                                type="button"
                                onClick={() => handleInspectTransaction(sample)}
                                className="font-mono text-blue-700 hover:underline"
                              >
                                USN {sample.usn} / {sample.book_id} / TXN{' '}
                                {sample.transaction_id}
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={handleClearLookup}
                              className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium whitespace-nowrap text-slate-700 transition-colors hover:bg-slate-50"
                            >
                              Clear
                            </button>
                            <button
                              type="submit"
                              disabled={lookupLoading}
                              className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-5 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
                            >
                              <Search className="h-4 w-4 shrink-0" />
                              <span>
                                {lookupLoading ? 'Searching...' : 'Find Details'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </form>
                    </section>

                    {/* Lookup Result */}
                    {lookupLoading ? (
                      <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />
                    ) : lookupResult ? (
                      <ParticularDetailsPanel
                        matches={lookupResult.matches}
                        selectedTx={selectedTx}
                        onSelectTx={setSelectedTx}
                        directStudent={lookupResult.directStudent}
                        directBook={lookupResult.directBook}
                        criteria={lookupResult.criteria}
                        onClear={handleClearLookup}
                      />
                    ) : null}

                    {/* Reference Transactions Directory */}
                    {loadingOverview && !overview ? (
                      <div className="h-72 animate-pulse rounded-lg border border-slate-200 bg-white" />
                    ) : overview ? (
                      <TransactionsTable
                        transactions={overview.transactions}
                        onInspectTransaction={handleInspectTransaction}
                        compact
                      />
                    ) : null}
                  </div>
                )}

                {view === 'transactions' && overview && (
                  <TransactionsTable
                    transactions={overview.transactions}
                    onInspectTransaction={handleInspectTransaction}
                  />
                )}

                {view === 'students' && overview && (
                  <StudentsTable
                    students={overview.students}
                    onLookupByUsn={handleLookupByUsn}
                  />
                )}

                {view === 'books' && overview && (
                  <BooksTable
                    books={overview.books}
                    onLookupByBookId={handleLookupByBookId}
                  />
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
