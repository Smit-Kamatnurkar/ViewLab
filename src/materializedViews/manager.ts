import { Database } from 'sql.js';
import { MaterializedViewInfo } from '../types';
import { executeViewQuery } from '../sql/executor';

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Materialized views are implemented as an application-level simulation:
 * the query result snapshot is materialized as a real SQLite table of the
 * same name. This means:
 *
 * - SELECT * FROM <mv> reads the stored result (real SQL execution).
 * - Base-table changes do NOT propagate into the stored result.
 * - REFRESH drops and recreates the backing table from the definition.
 */
export class MaterializedViewManager {
  private views = new Map<string, MaterializedViewInfo>();
  private refreshing = new Set<string>();

  async createMaterializedView(
    db: Database,
    name: string,
    definition: string,
    dependencies: string[]
  ): Promise<void> {
    // Materialize the stored result as a real SQLite table.
    db.run(`CREATE TABLE ${quoteIdent(name)} AS ${definition}`);

    const result = executeViewQuery(db, `SELECT * FROM ${quoteIdent(name)}`);

    this.views.set(name, {
      id: crypto.randomUUID(),
      name,
      definition,
      result,
      dependencies,
      createdAt: Date.now(),
      lastRefreshedAt: Date.now(),
      status: 'FRESH',
    });
  }

  async refreshMaterializedView(db: Database, name: string): Promise<void> {
    const mv = this.views.get(name);
    if (!mv) {
      throw new Error(`Materialized view "${name}" does not exist`);
    }

    this.refreshing.add(name);

    try {
      db.run(`DROP TABLE ${quoteIdent(name)}`);
      db.run(`CREATE TABLE ${quoteIdent(name)} AS ${mv.definition}`);

      const result = executeViewQuery(db, `SELECT * FROM ${quoteIdent(name)}`);

      this.views.set(name, {
        ...mv,
        result,
        lastRefreshedAt: Date.now(),
        status: 'FRESH',
      });
    } finally {
      this.refreshing.delete(name);
    }
  }

  async dropMaterializedView(db: Database, name: string): Promise<boolean> {
    if (!this.views.has(name)) {
      return false;
    }
    db.run(`DROP TABLE IF EXISTS ${quoteIdent(name)}`);
    return this.views.delete(name);
  }

  /** Read the stored (possibly stale) result directly. */
  getStoredResult(name: string) {
    return this.views.get(name)?.result ?? null;
  }

  getView(name: string): MaterializedViewInfo | undefined {
    return this.views.get(name);
  }

  getAllViews(): Map<string, MaterializedViewInfo> {
    return new Map(this.views);
  }

  getViewNames(): string[] {
    return Array.from(this.views.keys());
  }

  hasView(name: string): boolean {
    return this.views.has(name);
  }

  isRefreshing(name: string): boolean {
    return this.refreshing.has(name);
  }

  markStale(name: string): void {
    const mv = this.views.get(name);
    if (mv && mv.status === 'FRESH') {
      this.views.set(name, { ...mv, status: 'STALE' });
    }
  }

  clear(): void {
    this.views.clear();
    this.refreshing.clear();
  }

  loadViews(views: MaterializedViewInfo[]): void {
    this.views.clear();
    for (const view of views) {
      this.views.set(view.name, view);
    }
  }

  serialize(): MaterializedViewInfo[] {
    return Array.from(this.views.values());
  }
}