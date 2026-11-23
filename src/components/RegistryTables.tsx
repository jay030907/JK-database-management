import {useMemo, useState} from 'react';
import {CheckCircle2, Clock, Search} from 'lucide-react';
import type {BookRecord, StudentRecord, TransactionDetail} from '../types.ts';

interface TransactionsTableProps {
  transactions: TransactionDetail[];
  onInspectTransaction: (tx: TransactionDetail) => void;
  compact?: boolean;
}

export function TransactionsTable({
  transactions,
  onInspectTransaction,
  compact = false,
}: TransactionsTableProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'returned'>(
    'all'
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((row) => {
      const returnStatus = (row.return_status ?? '').toLowerCase();
      if (statusFilter !== 'all' && returnStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        String(row.transaction_id).includes(q) ||
        String(row.usn).includes(q) ||
        row.book_id.toLowerCase().includes(q) ||
        (row.student_name ?? '').toLowerCase().includes(q) ||
        (row.student_department ?? '').toLowerCase().includes(q) ||
        (row.book_name ?? '').toLowerCase().includes(q) ||
        (row.book_author ?? '').toLowerCase().includes(q)
      );
    });
  }, [transactions, query, statusFilter]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {compact ? 'Recent Library Transactions' : 'All Library Transactions'}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Click any row to populate USN, Book ID, and Transaction ID and view
            full details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter records..."
              className="h-9 w-52 rounded-md border border-slate-300 bg-white pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none"
            />
          </div>

          <div
            role="group"
            aria-label="Filter by return status"
            className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-0.5"
          >
            {(['all', 'pending', 'returned'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`h-8 rounded px-3 text-xs font-medium whitespace-nowrap capitalize transition-colors ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-slate-500">
          No transactions match your current filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
              <tr>
                <th className="px-6 py-3 whitespace-nowrap">Transaction ID</th>
                <th className="px-4 py-3 whitespace-nowrap">USN</th>
                <th className="px-4 py-3 whitespace-nowrap">Student</th>
                <th className="px-4 py-3 whitespace-nowrap">Department</th>
                <th className="px-4 py-3 whitespace-nowrap">Book ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Book Title</th>
                <th className="px-4 py-3 whitespace-nowrap">Author</th>
                <th className="px-6 py-3 whitespace-nowrap">Return Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => {
                const isReturned =
                  (row.return_status ?? '').toLowerCase() === 'returned';
                return (
                  <tr
                    key={row.transaction_id}
                    onClick={() => onInspectTransaction(row)}
                    className="h-11 cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="px-6 py-2.5 font-mono font-medium whitespace-nowrap tabular-nums text-blue-700">
                      #{row.transaction_id}
                    </td>
                    <td className="px-4 py-2.5 font-mono whitespace-nowrap tabular-nums text-slate-700">
                      {row.usn}
                    </td>
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap text-slate-900">
                      {row.student_name ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">
                      {row.student_department ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono whitespace-nowrap text-slate-700">
                      {row.book_id}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {row.book_name ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">
                      {row.book_author ?? '—'}
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      {isReturned ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>Returned</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span>{row.return_status ?? 'Pending'}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

interface StudentsTableProps {
  students: StudentRecord[];
  onLookupByUsn: (usn: number) => void;
}

export function StudentsTable({students, onLookupByUsn}: StudentsTableProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        String(s.usn).includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.department ?? '').toLowerCase().includes(q)
    );
  }, [students, query]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Student Directory
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Click any student to look up all transaction and book details for
            their USN.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by USN, name, dept..."
            className="h-9 w-60 rounded-md border border-slate-300 bg-white pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
            <tr>
              <th className="px-6 py-3">USN</th>
              <th className="px-4 py-3">Student Name</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((student) => (
              <tr
                key={student.usn}
                onClick={() => onLookupByUsn(student.usn)}
                className="h-11 cursor-pointer transition-colors hover:bg-slate-50"
              >
                <td className="px-6 py-2.5 font-mono font-medium tabular-nums text-slate-900">
                  {student.usn}
                </td>
                <td className="px-4 py-2.5 font-medium text-slate-900">
                  {student.name}
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {student.department ?? '—'}
                </td>
                <td className="px-6 py-2.5 text-right">
                  <span className="text-xs font-medium text-blue-700 hover:underline">
                    View Details
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface BooksTableProps {
  books: BookRecord[];
  onLookupByBookId: (bookId: string) => void;
}

export function BooksTable({books, onLookupByBookId}: BooksTableProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter(
      (b) =>
        b.book_id.toLowerCase().includes(q) ||
        b.book_name.toLowerCase().includes(q) ||
        (b.author ?? '').toLowerCase().includes(q)
    );
  }, [books, query]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Book Catalog
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Click any book to inspect borrowing transactions and student holder
            details.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by Book ID, title, author..."
            className="h-9 w-64 rounded-md border border-slate-300 bg-white pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
            <tr>
              <th className="px-6 py-3">Book ID</th>
              <th className="px-4 py-3">Book Title</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((book) => (
              <tr
                key={book.book_id}
                onClick={() => onLookupByBookId(book.book_id)}
                className="h-11 cursor-pointer transition-colors hover:bg-slate-50"
              >
                <td className="px-6 py-2.5 font-mono font-medium text-slate-900">
                  {book.book_id}
                </td>
                <td className="px-4 py-2.5 font-medium text-slate-900">
                  {book.book_name}
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {book.author ?? '—'}
                </td>
                <td className="px-6 py-2.5 text-right">
                  <span className="text-xs font-medium text-blue-700 hover:underline">
                    View Details
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
