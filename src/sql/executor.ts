import { Database } from 'sql.js';
import { ParsedSQL, QueryResult } from '../types';
import { MaterializedViewManager } from '../materializedViews/manager';
import { ViewManager } from '../views/manager';
import { DependencyTracker } from '../dependencies/tracker';

export interface ExecutionContext {
  db: Database;
  viewManager: ViewManager;
  mvManager: MaterializedViewManager;
  dependencyTracker: DependencyTracker;
}

function emptySuccess(startTime: number): QueryResult {
  return {
    columns: [],
    rows: [],
    rowCount: 0,
    executionTime: performance.now() - startTime,
  };
}

export async function executeSQL(context: ExecutionContext, parsed: ParsedSQL): Promise<QueryResult> {
  const { db, viewManager, mvManager, dependencyTracker } = context;
  const startTime = performance.now();

  try {
    switch (parsed.type) {
      case 'SELECT': {
        let sql = parsed.originalSQL;
        const result = db.exec(sql);
        
        let plan: string[] = [];
        try {
           const explainRes = db.exec("EXPLAIN QUERY PLAN " + sql);
           if (explainRes.length > 0) {
             const detailIndex = explainRes[0].columns.indexOf("detail");
             if (detailIndex >= 0) {
               plan = explainRes[0].values.map(row => row[detailIndex] as string);
             }
           }
        } catch (e) {
           // Ignore explain query plan errors if it fails for some reason
        }
        
        return formatResult(result, startTime, plan);
      }

      case 'INSERT':
      case 'UPDATE':
      case 'DELETE': {
        db.run(parsed.originalSQL);
        const tableName = parsed.tableName;
        if (tableName) {
          dependencyTracker.markStale(tableName);
          const affected = dependencyTracker.getDependentViews(tableName);
          for (const name of affected) {
            if (mvManager.hasView(name)) {
              mvManager.markStale(name);
            }
          }
          for (const name of affected) {
            const mv = mvManager.getView(name);
            if (mv) dependencyTracker.setNodeStatus(name, mv.status);
          }
        }
        return emptySuccess(startTime);
      }

      case 'CREATE_VIEW': {
        if (!parsed.viewName || !parsed.definition) {
          throw new Error('Invalid CREATE VIEW statement');
        }
        if (viewManager.hasView(parsed.viewName) || mvManager.hasView(parsed.viewName)) {
          throw new Error(`View "${parsed.viewName}" already exists`);
        }

        db.run(`CREATE VIEW ${quoteIdent(parsed.viewName)} AS ${parsed.definition}`);

        const dependencies = dependencyTracker.extractDependencies(
          parsed.definition,
          viewManager.getAllViews(),
          mvManager.getAllViews()
        );
        viewManager.createView(parsed.viewName, parsed.definition, dependencies);
        dependencyTracker.registerView(parsed.viewName, 'view', dependencies);
        return emptySuccess(startTime);
      }

      case 'DROP_VIEW': {
        if (!parsed.viewName) {
          throw new Error('Invalid DROP VIEW statement');
        }
        if (!viewManager.hasView(parsed.viewName)) {
          throw new Error(`View "${parsed.viewName}" does not exist`);
        }
        db.run(`DROP VIEW IF EXISTS ${quoteIdent(parsed.viewName)}`);
        viewManager.dropView(parsed.viewName);
        dependencyTracker.removeView(parsed.viewName);
        return emptySuccess(startTime);
      }

      case 'CREATE_MATERIALIZED_VIEW': {
        if (!parsed.materializedViewName || !parsed.definition) {
          throw new Error('Invalid CREATE MATERIALIZED VIEW statement');
        }
        if (mvManager.hasView(parsed.materializedViewName) || viewManager.hasView(parsed.materializedViewName)) {
          throw new Error(`Materialized view "${parsed.materializedViewName}" already exists`);
        }

        const dependencies = dependencyTracker.extractDependencies(
          parsed.definition,
          viewManager.getAllViews(),
          mvManager.getAllViews()
        );

        await mvManager.createMaterializedView(
          db,
          parsed.materializedViewName,
          parsed.definition,
          dependencies
        );
        dependencyTracker.registerView(parsed.materializedViewName, 'materialized-view', dependencies);
        dependencyTracker.setNodeStatus(parsed.materializedViewName, 'FRESH');
        return emptySuccess(startTime);
      }

      case 'DROP_MATERIALIZED_VIEW': {
        if (!parsed.materializedViewName) {
          throw new Error('Invalid DROP MATERIALIZED VIEW statement');
        }
        const dropped = await mvManager.dropMaterializedView(db, parsed.materializedViewName);
        if (!dropped) {
          throw new Error(`Materialized view "${parsed.materializedViewName}" does not exist`);
        }
        dependencyTracker.removeView(parsed.materializedViewName);
        return emptySuccess(startTime);
      }

      case 'REFRESH_MATERIALIZED_VIEW': {
        if (!parsed.materializedViewName) {
          throw new Error('Invalid REFRESH MATERIALIZED VIEW statement');
        }
        await mvManager.refreshMaterializedView(db, parsed.materializedViewName);
        dependencyTracker.refreshView(parsed.materializedViewName);
        return emptySuccess(startTime);
      }

      default: {
        db.run(parsed.originalSQL);
        return emptySuccess(startTime);
      }
    }
  } catch (error) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTime: performance.now() - startTime,
      error: formatError(error),
    };
  }
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function formatError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error';

  const columnMatch = message.match(/no such column: (.+)/i);
  if (columnMatch) {
    return `SQL Error: Column "${columnMatch[1]}" does not exist.`;
  }

  const tableMatch = message.match(/no such table: (.+)/i);
  if (tableMatch) {
    return `SQL Error: Table "${tableMatch[1]}" does not exist.`;
  }

  return message;
}

function formatResult(result: any[], startTime: number, plan: string[] = []): QueryResult {
  if (result.length === 0) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTime: performance.now() - startTime,
      plan
    };
  }

  const stmt = result[0];
  return {
    columns: stmt.columns,
    rows: stmt.values,
    rowCount: stmt.values.length,
    executionTime: performance.now() - startTime,
    plan
  };
}

export function executeViewQuery(db: Database, definition: string): QueryResult {
  const startTime = performance.now();
  try {
    const result = db.exec(definition);
    let plan: string[] = [];
    try {
       const explainRes = db.exec("EXPLAIN QUERY PLAN " + definition);
       if (explainRes.length > 0) {
         const detailIndex = explainRes[0].columns.indexOf("detail");
         if (detailIndex >= 0) {
           plan = explainRes[0].values.map(row => row[detailIndex] as string);
         }
       }
    } catch (e) {}
    
    return formatResult(result, startTime, plan);
  } catch (error) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTime: performance.now() - startTime,
      error: formatError(error),
    };
  }
}
