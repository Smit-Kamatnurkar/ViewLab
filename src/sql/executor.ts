import { Database } from 'sql.js';
import { ParsedSQL, QueryResult } from '../types';
import { MaterializedViewManager } from '../materializedViews/manager';
import { ViewManager } from '../views/manager';
import { DependencyTracker } from '../dependencies/tracker';
import { parseSQL, splitSQLStatements } from './parser';
import { createSimulationStepsForParsedSQL } from './simulator';

export interface ExecutionContext {
  db: Database;
  viewManager: ViewManager;
  mvManager: MaterializedViewManager;
  dependencyTracker: DependencyTracker;
}

function emptySuccess(startTime: number, operation?: string, objectName?: string): QueryResult {
  return {
    columns: [],
    rows: [],
    rowCount: 0,
    executionTime: performance.now() - startTime,
    operation,
    objectName,
  };
}

export async function executeSQL(
  context: ExecutionContext,
  parsed: ParsedSQL,
  options?: { forceRecreate?: boolean }
): Promise<QueryResult> {
  const { db, viewManager, mvManager, dependencyTracker } = context;
  const startTime = performance.now();

  try {
    switch (parsed.type) {
      case 'SELECT': {
        const sql = parsed.originalSQL;
        const result = db.exec(sql);

        let plan: string[] = [];
        try {
          const explainRes = db.exec('EXPLAIN QUERY PLAN ' + sql);
          if (explainRes.length > 0) {
            const detailIndex = explainRes[0].columns.indexOf('detail');
            if (detailIndex >= 0) {
              plan = explainRes[0].values.map((row) => row[detailIndex] as string);
            }
          }
        } catch {
          // Ignore EXPLAIN errors
        }

        const formatted = formatResult(result, startTime, plan);
        formatted.operation = 'SELECT';

        // Detect if querying a View, Materialized View, or Base Table
        const mvs = mvManager.getAllViews();
        const views = viewManager.getAllViews();

        for (const [mvName, mv] of mvs.entries()) {
          const regex = new RegExp(`\\b${mvName}\\b`, 'i');
          if (regex.test(sql)) {
            formatted.sourceType = 'MATERIALIZED_VIEW';
            formatted.objectName = mvName;
            formatted.mvStatus = mv.status;
            formatted.lastRefreshedAt = mv.lastRefreshedAt;
            break;
          }
        }

        if (!formatted.sourceType) {
          for (const [vName] of views.entries()) {
            const regex = new RegExp(`\\b${vName}\\b`, 'i');
            if (regex.test(sql)) {
              formatted.sourceType = 'VIEW';
              formatted.objectName = vName;
              break;
            }
          }
        }

        if (!formatted.sourceType) {
          formatted.sourceType = 'TABLE';
        }

        formatted.simulationSteps = createSimulationStepsForParsedSQL(sql, parsed);
        return formatted;
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
        const res = emptySuccess(startTime, parsed.type, tableName);
        res.simulationSteps = createSimulationStepsForParsedSQL(parsed.originalSQL, parsed);
        return res;
      }

      case 'CREATE_VIEW': {
        const name = parsed.viewName;
        if (!name || !parsed.definition) {
          throw new Error('Invalid CREATE VIEW statement syntax.');
        }

        const existsInViews = viewManager.hasView(name);
        const existsInMVs = mvManager.hasView(name);

        if ((existsInViews || existsInMVs) && !options?.forceRecreate) {
          return {
            columns: [],
            rows: [],
            rowCount: 0,
            executionTime: performance.now() - startTime,
            error: `View "${name}" already exists.`,
            operation: 'CREATE_VIEW',
            objectName: name,
            simulationSteps: createSimulationStepsForParsedSQL(parsed.originalSQL, parsed),
          };
        }

        if (options?.forceRecreate) {
          try {
            db.run(`DROP VIEW IF EXISTS ${quoteIdent(name)}`);
            viewManager.dropView(name);
            mvManager.dropMaterializedView(db, name);
            dependencyTracker.removeView(name);
          } catch {
            // ignore cleanup errors during recreate
          }
        }

        db.run(`CREATE VIEW ${quoteIdent(name)} AS ${parsed.definition}`);

        const dependencies = dependencyTracker.extractDependencies(
          parsed.definition,
          viewManager.getAllViews(),
          mvManager.getAllViews()
        );
        viewManager.createView(name, parsed.definition, dependencies);
        dependencyTracker.registerView(name, 'view', dependencies);

        const res = emptySuccess(startTime, 'CREATE_VIEW', name);
        res.simulationSteps = createSimulationStepsForParsedSQL(parsed.originalSQL, parsed);
        return res;
      }

      case 'DROP_VIEW': {
        if (!parsed.viewName) {
          throw new Error('Invalid DROP VIEW statement.');
        }
        if (!viewManager.hasView(parsed.viewName)) {
          throw new Error(`View "${parsed.viewName}" does not exist.`);
        }
        db.run(`DROP VIEW IF EXISTS ${quoteIdent(parsed.viewName)}`);
        viewManager.dropView(parsed.viewName);
        dependencyTracker.removeView(parsed.viewName);
        const res = emptySuccess(startTime, 'DROP_VIEW', parsed.viewName);
        res.simulationSteps = createSimulationStepsForParsedSQL(parsed.originalSQL, parsed);
        return res;
      }

      case 'CREATE_MATERIALIZED_VIEW': {
        const name = parsed.materializedViewName;
        if (!name || !parsed.definition) {
          throw new Error('Invalid CREATE MATERIALIZED VIEW statement syntax.');
        }

        const existsInMVs = mvManager.hasView(name);
        const existsInViews = viewManager.hasView(name);

        if ((existsInMVs || existsInViews) && !options?.forceRecreate) {
          return {
            columns: [],
            rows: [],
            rowCount: 0,
            executionTime: performance.now() - startTime,
            error: `Materialized view "${name}" already exists.`,
            operation: 'CREATE_MATERIALIZED_VIEW',
            objectName: name,
            simulationSteps: createSimulationStepsForParsedSQL(parsed.originalSQL, parsed),
          };
        }

        if (options?.forceRecreate) {
          try {
            await mvManager.dropMaterializedView(db, name);
            db.run(`DROP VIEW IF EXISTS ${quoteIdent(name)}`);
            viewManager.dropView(name);
            dependencyTracker.removeView(name);
          } catch {
            // ignore cleanup errors
          }
        }

        const dependencies = dependencyTracker.extractDependencies(
          parsed.definition,
          viewManager.getAllViews(),
          mvManager.getAllViews()
        );

        await mvManager.createMaterializedView(db, name, parsed.definition, dependencies);
        dependencyTracker.registerView(name, 'materialized-view', dependencies);
        dependencyTracker.setNodeStatus(name, 'FRESH');

        const res = emptySuccess(startTime, 'CREATE_MATERIALIZED_VIEW', name);
        res.simulationSteps = createSimulationStepsForParsedSQL(parsed.originalSQL, parsed);
        return res;
      }

      case 'DROP_MATERIALIZED_VIEW': {
        if (!parsed.materializedViewName) {
          throw new Error('Invalid DROP MATERIALIZED VIEW statement.');
        }
        const dropped = await mvManager.dropMaterializedView(db, parsed.materializedViewName);
        if (!dropped) {
          throw new Error(`Materialized view "${parsed.materializedViewName}" does not exist.`);
        }
        dependencyTracker.removeView(parsed.materializedViewName);
        const res = emptySuccess(startTime, 'DROP_MATERIALIZED_VIEW', parsed.materializedViewName);
        res.simulationSteps = createSimulationStepsForParsedSQL(parsed.originalSQL, parsed);
        return res;
      }

      case 'REFRESH_MATERIALIZED_VIEW': {
        const name = parsed.materializedViewName;
        if (!name) {
          throw new Error('Invalid REFRESH MATERIALIZED VIEW statement.');
        }
        if (!mvManager.hasView(name)) {
          return {
            columns: [],
            rows: [],
            rowCount: 0,
            executionTime: performance.now() - startTime,
            error: `Cannot refresh "${name}" because it is not a materialized view.`,
            operation: 'REFRESH_MATERIALIZED_VIEW',
            objectName: name,
            simulationSteps: createSimulationStepsForParsedSQL(parsed.originalSQL, parsed),
          };
        }

        await mvManager.refreshMaterializedView(db, name);
        dependencyTracker.refreshView(name);

        const res = emptySuccess(startTime, 'REFRESH_MATERIALIZED_VIEW', name);
        res.mvStatus = 'FRESH';
        res.lastRefreshedAt = Date.now();
        res.simulationSteps = createSimulationStepsForParsedSQL(parsed.originalSQL, parsed);
        return res;
      }

      default: {
        db.run(parsed.originalSQL);
        const res = emptySuccess(startTime, 'OTHER');
        res.simulationSteps = createSimulationStepsForParsedSQL(parsed.originalSQL, parsed);
        return res;
      }
    }
  } catch (error) {
    const formattedErr = formatError(error);
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTime: performance.now() - startTime,
      error: formattedErr,
      simulationSteps: createSimulationStepsForParsedSQL(parsed.originalSQL, parsed),
    };
  }
}

export async function executeMultiSQL(
  context: ExecutionContext,
  fullSQL: string,
  options?: { forceRecreate?: boolean }
): Promise<QueryResult> {
  const statements = splitSQLStatements(fullSQL);
  if (statements.length === 0) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTime: 0,
    };
  }

  let lastResult: QueryResult | null = null;
  const allSimulationSteps: any[] = [];

  for (const stmt of statements) {
    const parsed = parseSQL(stmt);
    const res = await executeSQL(context, parsed, options);
    lastResult = res;

    if (res.simulationSteps) {
      allSimulationSteps.push(...res.simulationSteps);
    }

    // Stop execution on fatal syntax or database execution error
    if (res.error && !res.error.includes('already exists')) {
      break;
    }
  }

  if (lastResult) {
    lastResult.simulationSteps = allSimulationSteps;
    return lastResult;
  }

  return {
    columns: [],
    rows: [],
    rowCount: 0,
    executionTime: 0,
  };
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function formatError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error';

  const columnMatch = message.match(/no such column: (.+)/i);
  if (columnMatch) {
    return `SQL Error: Column "${columnMatch[1]}" does not exist in target schema.`;
  }

  const tableMatch = message.match(/no such table: (.+)/i);
  if (tableMatch) {
    return `SQL Error: Table "${tableMatch[1]}" does not exist in database.`;
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
      plan,
    };
  }

  const stmt = result[0];
  return {
    columns: stmt.columns,
    rows: stmt.values,
    rowCount: stmt.values.length,
    executionTime: performance.now() - startTime,
    plan,
  };
}

export function executeViewQuery(db: Database, definition: string): QueryResult {
  const startTime = performance.now();
  try {
    const result = db.exec(definition);
    let plan: string[] = [];
    try {
      const explainRes = db.exec('EXPLAIN QUERY PLAN ' + definition);
      if (explainRes.length > 0) {
        const detailIndex = explainRes[0].columns.indexOf('detail');
        if (detailIndex >= 0) {
          plan = explainRes[0].values.map((row) => row[detailIndex] as string);
        }
      }
    } catch {}

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
