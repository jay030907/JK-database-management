import {AlertCircle, BookOpen, CheckCircle2, Clock, User} from 'lucide-react';
import type {BookRecord, StudentRecord, TransactionDetail} from '../types.ts';

interface ParticularDetailsPanelProps {
  matches: TransactionDetail[];
  selectedTx: TransactionDetail | null;
  onSelectTx: (tx: TransactionDetail) => void;
  directStudent: StudentRecord | null;
  directBook: BookRecord | null;
  criteria: {
    usn: number | null;
    bookId: string | null;
    transactionId: number | null;
  };
  onClear: () => void;
}

function StatusLabel({
  status,
}: {
  status: string | null | undefined;
}) {
  const normalized = (status ?? '').trim().toLowerCase();
  if (normalized === 'returned') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Returned</span>
      </span>
    );
  }
  if (normalized === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700">
        <Clock className="h-4 w-4 shrink-0" />
        <span>Pending</span>
      </span>
    );
  }
  return (
    <span className="text-sm font-medium text-slate-700">
      {status || 'Not recorded'}
    </span>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd
        className={`text-right text-sm font-medium text-slate-900 ${
          mono ? 'font-mono tabular-nums' : ''
        }`}
      >
        {value !== null && value !== undefined && value !== ''
          ? value
          : 'Unavailable'}
      </dd>
    </div>
  );
}

export function ParticularDetailsPanel({
  matches,
  selectedTx,
  onSelectTx,
  directStudent,
  directBook,
  criteria,
  onClear,
}: ParticularDetailsPanelProps) {
  const active = selectedTx ?? matches[0] ?? null;

  if (!active && !directStudent && !directBook) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                No Matching Record Found
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                No transaction, student, or book matched
                {criteria.usn !== null ? ` USN ${criteria.usn}` : ''}
                {criteria.bookId ? ` Book ID ${criteria.bookId}` : ''}
                {criteria.transactionId !== null
                  ? ` Transaction ID ${criteria.transactionId}`
                  : ''}
                . Try switching to Match Any or clearing one of the fields.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="h-10 shrink-0 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium whitespace-nowrap text-slate-700 transition-colors hover:bg-slate-50"
          >
            Clear Lookup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {active && (
        <section
          aria-label="Particular Record Details"
          className="rounded-lg border border-slate-200 bg-white"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono tabular-nums">
                  Transaction #{active.transaction_id}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">USN {active.usn}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{active.book_id}</span>
              </div>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                {active.student_name ?? `Student #${active.usn}`} —{' '}
                {active.book_name ?? active.book_id}
              </h3>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs text-slate-500">Return Status</div>
                <div className="mt-0.5">
                  <StatusLabel status={active.return_status} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 divide-y divide-slate-200 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            <div className="p-6">
              <h4 className="text-sm font-semibold text-slate-900">
                Transaction Details
              </h4>
              <dl className="mt-3 divide-y divide-slate-100">
                <DetailRow
                  label="Transaction ID"
                  value={active.transaction_id}
                  mono
                />
                <DetailRow
                  label="Borrow Status"
                  value={active.borrow_status}
                />
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-sm text-slate-500">Return Status</dt>
                  <dd>
                    <StatusLabel status={active.return_status} />
                  </dd>
                </div>
              </dl>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <h4 className="text-sm font-semibold text-slate-900">
                  Student Details
                </h4>
              </div>
              <dl className="mt-3 divide-y divide-slate-100">
                <DetailRow label="USN" value={active.usn} mono />
                <DetailRow label="Full Name" value={active.student_name} />
                <DetailRow
                  label="Department"
                  value={active.student_department}
                />
              </dl>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-slate-400" />
                <h4 className="text-sm font-semibold text-slate-900">
                  Book Details
                </h4>
              </div>
              <dl className="mt-3 divide-y divide-slate-100">
                <DetailRow label="Book ID" value={active.book_id} mono />
                <DetailRow label="Book Title" value={active.book_name} />
                <DetailRow label="Author" value={active.book_author} />
              </dl>
            </div>
          </div>
        </section>
      )}

      {matches.length > 1 && (
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h4 className="text-sm font-semibold text-slate-900">
              All Matching Transactions ({matches.length})
            </h4>
            <p className="mt-0.5 text-xs text-slate-500">
              Select any row to inspect its complete transaction, student, and
              book details above.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <tr>
                  <th className="px-6 py-3">Transaction ID</th>
                  <th className="px-4 py-3">USN</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Book ID</th>
                  <th className="px-4 py-3">Book Title</th>
                  <th className="px-4 py-3">Borrow</th>
                  <th className="px-6 py-3">Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matches.map((row) => {
                  const isSelected = active?.transaction_id === row.transaction_id;
                  return (
                    <tr
                      key={row.transaction_id}
                      onClick={() => onSelectTx(row)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-6 py-2.5 font-mono font-medium tabular-nums text-slate-900">
                        #{row.transaction_id}
                      </td>
                      <td className="px-4 py-2.5 font-mono tabular-nums text-slate-700">
                        {row.usn}
                      </td>
                      <td className="px-4 py-2.5 text-slate-900">
                        {row.student_name ?? 'Unknown'}
                        {row.student_department ? (
                          <span className="text-slate-500">
                            {' '}
                            · {row.student_department}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-700">
                        {row.book_id}
                      </td>
                      <td className="px-4 py-2.5 text-slate-900">
                        {row.book_name ?? 'Unknown'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {row.borrow_status ?? '—'}
                      </td>
                      <td className="px-6 py-2.5">
                        <StatusLabel status={row.return_status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!active && (directStudent || directBook) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {directStudent && (
            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <h4 className="text-sm font-semibold text-slate-900">
                  Matched Student Record (No Transaction Match)
                </h4>
              </div>
              <dl className="mt-3 divide-y divide-slate-100">
                <DetailRow label="USN" value={directStudent.usn} mono />
                <DetailRow label="Full Name" value={directStudent.name} />
                <DetailRow
                  label="Department"
                  value={directStudent.department}
                />
              </dl>
            </section>
          )}
          {directBook && (
            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-slate-400" />
                <h4 className="text-sm font-semibold text-slate-900">
                  Matched Book Record (No Transaction Match)
                </h4>
              </div>
              <dl className="mt-3 divide-y divide-slate-100">
                <DetailRow label="Book ID" value={directBook.book_id} mono />
                <DetailRow label="Book Title" value={directBook.book_name} />
                <DetailRow label="Author" value={directBook.author} />
              </dl>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
