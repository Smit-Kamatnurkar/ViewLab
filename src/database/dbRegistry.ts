import initSqlJs, { Database } from 'sql.js';
// @ts-ignore
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { executeMultiSQL } from '../sql/executor';
import { ViewManager } from '../views/manager';
import { MaterializedViewManager } from '../materializedViews/manager';
import { DependencyTracker } from '../dependencies/tracker';

export interface CustomColumnDef {
  name: string;
  type: 'INTEGER' | 'TEXT' | 'REAL' | 'DATE';
  primaryKey: boolean;
  notNull: boolean;
  unique: boolean;
  foreignKeyTable?: string;
  foreignKeyColumn?: string;
}

export interface CustomTableDef {
  name: string;
  columns: CustomColumnDef[];
  sampleData: Record<string, any>[];
}

export interface CustomViewDef {
  name: string;
  sql: string;
}

export interface CustomDbDefinition {
  id: string;
  name: string;
  description?: string;
  tables: CustomTableDef[];
  views: CustomViewDef[];
  createdAt: number;
}

export interface DatabaseMetadata {
  id: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  icon: string;
}

export const BUILTIN_DATABASES: DatabaseMetadata[] = [
  {
    id: 'art_gallery',
    name: 'Art Gallery Database',
    description: 'Original ViewLab dataset containing Artists, Artworks, and Sales records.',
    isBuiltIn: true,
    icon: '🎨',
  },
  {
    id: 'bank_loan',
    name: 'Bank Loan Management',
    description: 'Financial dataset containing Customers, Loans, Payments, and Loan Summary Views.',
    isBuiltIn: true,
    icon: '🏦',
  },
];

// Bank Loan Management Schema & Seed SQL
export const BANK_LOAN_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS CUSTOMER (
  customer_id INTEGER PRIMARY KEY,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS LOAN (
  loan_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  loan_type TEXT NOT NULL,
  loan_amount REAL NOT NULL,
  interest_rate REAL NOT NULL,
  status TEXT NOT NULL,
  application_date TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES CUSTOMER(customer_id)
);

CREATE TABLE IF NOT EXISTS PAYMENT (
  payment_id INTEGER PRIMARY KEY,
  loan_id INTEGER NOT NULL,
  payment_date TEXT NOT NULL,
  amount_paid REAL NOT NULL,
  payment_status TEXT NOT NULL,
  FOREIGN KEY (loan_id) REFERENCES LOAN(loan_id)
);
`;

export const BANK_LOAN_SEED_SQL = `
INSERT INTO CUSTOMER (customer_id, customer_name, email, phone, city) VALUES
(1, 'Alice Smith', 'alice@example.com', '555-0101', 'New York'),
(2, 'Bob Johnson', 'bob@example.com', '555-0102', 'Los Angeles'),
(3, 'Charlie Brown', 'charlie@example.com', '555-0103', 'Chicago'),
(4, 'Diana Prince', 'diana@example.com', '555-0104', 'Houston'),
(5, 'Evan Wright', 'evan@example.com', '555-0105', 'Phoenix'),
(6, 'Fiona Gallagher', 'fiona@example.com', '555-0106', 'Seattle'),
(7, 'George Clark', 'george@example.com', '555-0107', 'Denver'),
(8, 'Hannah Abbott', 'hannah@example.com', '555-0108', 'Boston');

INSERT INTO LOAN (loan_id, customer_id, loan_type, loan_amount, interest_rate, status, application_date) VALUES
(101, 1, 'Home Loan', 250000.0, 4.5, 'Active', '2023-01-15'),
(102, 1, 'Auto Loan', 35000.0, 5.2, 'Active', '2023-06-10'),
(103, 2, 'Personal Loan', 15000.0, 8.5, 'Completed', '2022-03-20'),
(104, 3, 'Business Loan', 500000.0, 6.0, 'Active', '2023-09-01'),
(105, 4, 'Education Loan', 40000.0, 3.8, 'Active', '2023-08-12'),
(106, 5, 'Home Loan', 180000.0, 4.2, 'Pending', '2024-01-05'),
(107, 6, 'Personal Loan', 20000.0, 9.0, 'Active', '2023-11-18'),
(108, 7, 'Auto Loan', 42000.0, 5.5, 'Active', '2023-12-01');

INSERT INTO PAYMENT (payment_id, loan_id, payment_date, amount_paid, payment_status) VALUES
(1, 101, '2023-02-15', 1500.0, 'Completed'),
(2, 101, '2023-03-15', 1500.0, 'Completed'),
(3, 102, '2023-07-10', 600.0, 'Completed'),
(4, 103, '2022-04-20', 15000.0, 'Completed'),
(5, 104, '2023-10-01', 5000.0, 'Completed'),
(6, 104, '2023-11-01', 5000.0, 'Completed'),
(7, 105, '2023-09-12', 450.0, 'Completed'),
(8, 107, '2023-12-18', 500.0, 'Completed');
`;

export const BANK_LOAN_VIEWS_SQL = `
CREATE VIEW ACTIVE_LOANS_VIEW AS SELECT * FROM LOAN WHERE status = 'Active';
CREATE VIEW CUSTOMER_LOAN_VIEW AS SELECT c.customer_name, c.email, c.city, l.loan_id, l.loan_type, l.loan_amount, l.status FROM CUSTOMER c JOIN LOAN l ON c.customer_id = l.customer_id;
CREATE VIEW HIGH_VALUE_LOANS_VIEW AS SELECT * FROM LOAN WHERE loan_amount >= 50000;
CREATE VIEW LOAN_PAYMENT_SUMMARY_VIEW AS SELECT l.loan_id, l.loan_type, l.loan_amount, SUM(p.amount_paid) AS total_paid FROM LOAN l LEFT JOIN PAYMENT p ON l.loan_id = p.loan_id GROUP BY l.loan_id;
CREATE MATERIALIZED VIEW LOAN_PAYMENT_SUMMARY_MV AS SELECT * FROM LOAN_PAYMENT_SUMMARY_VIEW;
`;

export async function createDatabaseInstance(
  dbId: string,
  managers: { viewManager: ViewManager; mvManager: MaterializedViewManager; dependencyTracker: DependencyTracker },
  customDef?: CustomDbDefinition
): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      if (typeof window === 'undefined') {
        return `./node_modules/sql.js/dist/${file}`;
      }
      return wasmUrl;
    },
  });

  const db = new SQL.Database();
  const { viewManager, mvManager, dependencyTracker } = managers;

  viewManager.clear();
  mvManager.clear();
  dependencyTracker.clear();

  if (dbId === 'bank_loan') {
    db.run(BANK_LOAN_SCHEMA_SQL);
    db.run(BANK_LOAN_SEED_SQL);

    dependencyTracker.registerView('CUSTOMER', 'table', []);
    dependencyTracker.registerView('LOAN', 'table', []);
    dependencyTracker.registerView('PAYMENT', 'table', []);

    await executeMultiSQL({ db, viewManager, mvManager, dependencyTracker }, BANK_LOAN_VIEWS_SQL);
  } else if (dbId === 'art_gallery') {
    // Import dynamically or load standard art gallery tables
    const { initializeDatabase } = await import('./sqlite');
    return await initializeDatabase();
  } else if (customDef) {
    // Build Custom Database from Definition
    for (const tbl of customDef.tables) {
      const colDefs: string[] = [];
      for (const col of tbl.columns) {
        let defStr = `${col.name} ${col.type}`;
        if (col.primaryKey) defStr += ' PRIMARY KEY';
        if (col.notNull) defStr += ' NOT NULL';
        if (col.unique) defStr += ' UNIQUE';
        colDefs.push(defStr);
      }

      for (const col of tbl.columns) {
        if (col.foreignKeyTable && col.foreignKeyColumn) {
          colDefs.push(`FOREIGN KEY (${col.name}) REFERENCES ${col.foreignKeyTable}(${col.foreignKeyColumn})`);
        }
      }

      const createTblSql = `CREATE TABLE ${tbl.name} (\n  ${colDefs.join(',\n  ')}\n);`;
      db.run(createTblSql);
      dependencyTracker.registerView(tbl.name, 'table', []);

      // Insert sample rows
      if (tbl.sampleData && tbl.sampleData.length > 0) {
        for (const rowObj of tbl.sampleData) {
          const keys = Object.keys(rowObj);
          if (keys.length > 0) {
            const placeholders = keys.map(() => '?').join(', ');
            const insertSql = `INSERT INTO ${tbl.name} (${keys.join(', ')}) VALUES (${placeholders});`;
            db.run(insertSql, Object.values(rowObj));
          }
        }
      }
    }

    // Execute custom view definitions
    for (const v of customDef.views) {
      if (v.sql && v.sql.trim()) {
        try {
          await executeMultiSQL({ db, viewManager, mvManager, dependencyTracker }, v.sql);
        } catch (err) {
          console.error(`Error executing custom view SQL (${v.name}):`, err);
        }
      }
    }
  }

  return db;
}
