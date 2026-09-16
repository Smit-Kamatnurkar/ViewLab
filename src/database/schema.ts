import { Database } from 'sql.js';
import { DatabaseSchema, TableInfo, ColumnInfo, ForeignKeyInfo } from '../types';

export function getSchema(db: Database, excludeTables: Set<string> = new Set()): DatabaseSchema {
  const tables: TableInfo[] = [];
  const foreignKeys: ForeignKeyInfo[] = [];

  const tableNames = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");

  if (tableNames.length > 0) {
    for (const row of tableNames[0].values) {
      const tableName = row[0] as string;
      if (excludeTables.has(tableName)) continue;
      const tableInfo = getTableInfo(db, tableName);
      tables.push(tableInfo);

      // Dynamically extract foreign keys for every table
      const fkResult = db.exec(`PRAGMA foreign_key_list("${tableName.replace(/"/g, '""')}");`);
      if (fkResult.length > 0) {
        for (const fkRow of fkResult[0].values) {
          foreignKeys.push({
            fromTable: tableName,
            fromColumn: fkRow[3] as string,
            toTable: fkRow[2] as string,
            toColumn: fkRow[4] as string,
          });
        }
      }
    }
  }

  return { tables, foreignKeys };
}

function getTableInfo(db: Database, tableName: string): TableInfo {
  const columns: ColumnInfo[] = [];
  const quotedName = `"${tableName.replace(/"/g, '""')}"`;

  const pragmaResult = db.exec(`PRAGMA table_info(${quotedName});`);
  if (pragmaResult.length > 0) {
    for (const row of pragmaResult[0].values) {
      columns.push({
        name: row[1] as string,
        type: row[2] as string,
        primaryKey: (row[5] as number) === 1,
        foreignKey: null,
        notNull: (row[3] as number) === 1,
      });
    }
  }

  const fkResult = db.exec(`PRAGMA foreign_key_list(${quotedName});`);
  if (fkResult.length > 0) {
    for (const row of fkResult[0].values) {
      const fromColumn = row[3] as string;
      const toTable = row[2] as string;
      const toColumn = row[4] as string;

      const col = columns.find(c => c.name === fromColumn);
      if (col) {
        col.foreignKey = `${toTable}.${toColumn}`;
      }
    }
  }

  let rowCount = 0;
  try {
    const countResult = db.exec(`SELECT COUNT(*) FROM ${quotedName};`);
    rowCount = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;
  } catch {
    // Table may not exist yet during schema refresh
  }

  return { name: tableName, columns, rowCount };
}

export function getTablePreview(db: Database, tableName: string, limit = 50): { columns: string[]; rows: unknown[][] } {
  const quotedName = `"${tableName.replace(/"/g, '""')}"`;
  const result = db.exec(`SELECT * FROM ${quotedName} LIMIT ${limit};`);
  if (result.length === 0) {
    return { columns: [], rows: [] };
  }
  return {
    columns: result[0].columns,
    rows: result[0].values,
  };
}

export function getTableCount(db: Database, tableName: string): number {
  const quotedName = `"${tableName.replace(/"/g, '""')}"`;
  try {
    const result = db.exec(`SELECT COUNT(*) FROM ${quotedName};`);
    return result.length > 0 ? (result[0].values[0][0] as number) : 0;
  } catch {
    return 0;
  }
}