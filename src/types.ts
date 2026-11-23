export interface ConnectionStatus {
  configured: boolean;
  connected: boolean;
  source: 'env' | 'runtime' | 'none';
  host?: string;
  database?: string;
  error?: string;
}

export interface TransactionDetail {
  transaction_id: number;
  usn: number;
  book_id: string;
  borrow_status: string | null;
  return_status: string | null;
  student_name: string | null;
  student_department: string | null;
  book_name: string | null;
  book_author: string | null;
}

export interface StudentRecord {
  usn: number;
  name: string;
  department: string | null;
}

export interface BookRecord {
  book_id: string;
  book_name: string;
  author: string | null;
}

export interface RegistryStats {
  totalTransactions: number;
  returnedCount: number;
  pendingCount: number;
  totalStudents: number;
  totalBooks: number;
}

export interface RegistryOverview {
  transactions: TransactionDetail[];
  students: StudentRecord[];
  books: BookRecord[];
  stats: RegistryStats;
}

export type LookupMode = 'all' | 'any';

export interface LookupResponse {
  criteria: {
    usn: number | null;
    bookId: string | null;
    transactionId: number | null;
  };
  mode: LookupMode;
  matches: TransactionDetail[];
  directStudent: StudentRecord | null;
  directBook: BookRecord | null;
}
