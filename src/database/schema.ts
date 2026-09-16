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
    }
  }

  const fkResults = db.exec("SELECT * FROM pragma_foreign_key_list('ARTWORK') UNION SELECT * FROM pragma_foreign_key_list('SALE');");
  if (fkResults.length > 0) {
    for (const row of fkResults[0].values) {
      foreignKeys.push({
        fromTable: row[2] as string,
        fromColumn: row[3] as string,
        toTable: row[4] as string,
        toColumn: row[5] as string,
      });
    }
  }

  return { tables, foreignKeys };
}

function getTableInfo(db: Database, tableName: string): TableInfo {
  const columns: ColumnInfo[] = [];

  const pragmaResult = db.exec(`PRAGMA table_info(${tableName});`);
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

  const fkResult = db.exec(`PRAGMA foreign_key_list(${tableName});`);
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

  const countResult = db.exec(`SELECT COUNT(*) FROM ${tableName};`);
  const rowCount = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;

  return { name: tableName, columns, rowCount };
}

export function getTablePreview(db: Database, tableName: string, limit = 50): { columns: string[]; rows: unknown[][] } {
  const result = db.exec(`SELECT * FROM ${tableName} LIMIT ${limit};`);
  if (result.length === 0) {
    return { columns: [], rows: [] };
  }
  return {
    columns: result[0].columns,
    rows: result[0].values,
  };
}

export function getTableCount(db: Database, tableName: string): number {
  const result = db.exec(`SELECT COUNT(*) FROM ${tableName};`);
  return result.length > 0 ? (result[0].values[0][0] as number) : 0;
}