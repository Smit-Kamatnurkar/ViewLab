import { ParsedSQL, SimulationStep } from '../types';

export function createSimulationStepsForParsedSQL(sql: string, parsed: ParsedSQL): SimulationStep[] {
  const shortSql = sql.length > 30 ? sql.slice(0, 30) + '...' : sql;
  const base: SimulationStep[] = [
    { id: 's1', label: 'Parse SQL', description: `Tokenize and parse: "${shortSql}"`, icon: 'parse', status: 'pending' },
    { id: 's2', label: 'Identify Operation', description: `Detected: ${parsed.type.replace(/_/g, ' ')}`, icon: 'identify', status: 'pending' },
  ];

  switch (parsed.type) {
    case 'SELECT': {
      return [
        ...base,
        { id: 's3', label: 'Resolve Object', description: 'Determine target (Base Table, Virtual View, or Materialized View)', icon: 'resolve', status: 'pending' },
        { id: 's4', label: 'Check Object Type & Status', description: 'Virtual Views evaluate live query; Materialized Views read stored table snapshot', icon: 'scan', status: 'pending' },
        { id: 's5', label: 'Execute Query in Engine', description: 'Access SQLite storage or compute view dynamically', icon: 'execute', status: 'pending' },
        { id: 's6', label: 'Return Rows', description: 'Format and return result dataset to caller', icon: 'result', status: 'pending' },
      ];
    }

    case 'CREATE_VIEW': {
      const name = parsed.viewName || 'view';
      return [
        ...base,
        { id: 's3', label: 'Resolve Dependencies', description: `Extract referenced source tables for "${name}"`, icon: 'resolve', status: 'pending' },
        { id: 's4', label: 'Validate Source Tables', description: 'Verify all source tables exist in SQLite schema', icon: 'scan', status: 'pending' },
        { id: 's5', label: 'Store Query Definition', description: `Save View definition query (Data is NOT copied or stored)`, icon: 'define', status: 'pending', highlight: 'view' },
        { id: 's6', label: 'Register in SQLite', description: `Register CREATE VIEW "${name}" in sqlite_master`, icon: 'store', status: 'pending' },
        { id: 's7', label: 'Update Dependency Graph', description: `Register DAG edge: Source Tables → ${name} (Status: LIVE)`, icon: 'graph', status: 'pending' },
        { id: 's8', label: 'Complete', description: `Virtual View "${name}" created. Future queries evaluate definition against live data.`, icon: 'result', status: 'pending', highlight: 'view' },
      ];
    }

    case 'CREATE_MATERIALIZED_VIEW': {
      const name = parsed.materializedViewName || 'mv';
      return [
        ...base,
        { id: 's3', label: 'Resolve Dependencies', description: `Extract referenced source tables for "${name}"`, icon: 'resolve', status: 'pending' },
        { id: 's4', label: 'Validate Source Tables', description: 'Verify all source tables exist in database', icon: 'scan', status: 'pending' },
        { id: 's5', label: 'Execute Source Query', description: 'Run defining query against current base table state', icon: 'execute', status: 'pending' },
        { id: 's6', label: 'Store Physical Snapshot', description: `Materialize result set into physical table "${name}"`, icon: 'store', status: 'pending', highlight: 'materialized-view' },
        { id: 's7', label: 'Update Dependency Graph', description: `Register DAG edge: Source Tables → ${name} (Status: FRESH)`, icon: 'graph', status: 'pending' },
        { id: 's8', label: 'Complete', description: `Materialized View "${name}" created with FRESH status.`, icon: 'result', status: 'pending', highlight: 'fresh' },
      ];
    }

    case 'INSERT':
    case 'UPDATE':
    case 'DELETE': {
      const table = parsed.tableName || 'table';
      return [
        ...base,
        { id: 's3', label: 'Validate Target Table', description: `Verify table "${table}" exists in schema`, icon: 'scan', status: 'pending' },
        { id: 's4', label: 'Execute DML Operation', description: `Modify rows in base table "${table}"`, icon: 'execute', status: 'pending', highlight: 'table' },
        { id: 's5', label: 'Find Dependent Objects', description: `Traverse DAG to locate views/MVs depending on "${table}"`, icon: 'resolve', status: 'pending' },
        { id: 's6', label: 'Virtual Views Remain LIVE', description: 'Normal Views dynamically compute definition on query — always fresh!', icon: 'define', status: 'pending', highlight: 'view' },
        { id: 's7', label: 'Mark Affected MVs STALE', description: 'Dependent Materialized Views now contain outdated physical snapshots', icon: 'stale', status: 'pending', highlight: 'stale' },
        { id: 's8', label: 'Complete', description: `Base table modified. Dependent MVs marked STALE until REFRESH.`, icon: 'result', status: 'pending', highlight: 'stale' },
      ];
    }

    case 'REFRESH_MATERIALIZED_VIEW': {
      const name = parsed.materializedViewName || 'mv';
      return [
        ...base,
        { id: 's3', label: 'Locate Materialized View', description: `Find stored MV definition for "${name}"`, icon: 'scan', status: 'pending' },
        { id: 's4', label: 'Check Dependencies', description: 'Verify status of base tables and source queries', icon: 'resolve', status: 'pending' },
        { id: 's5', label: 'Re-execute Defining Query', description: 'Run stored query against current live database state', icon: 'execute', status: 'pending', highlight: 'refresh' },
        { id: 's6', label: 'Replace Stored Snapshot', description: `Drop old table "${name}" and write updated physical rows`, icon: 'store', status: 'pending', highlight: 'fresh' },
        { id: 's7', label: 'Update Timestamp & Status', description: `Set ${name} status from STALE → FRESH`, icon: 'result', status: 'pending', highlight: 'fresh' },
        { id: 's8', label: 'Complete', description: `Materialized View "${name}" is now FRESH and synchronized.`, icon: 'result', status: 'pending', highlight: 'fresh' },
      ];
    }

    case 'DROP_VIEW': {
      return [
        ...base,
        { id: 's3', label: 'Locate Virtual View', description: 'Find definition in sqlite_master and ViewManager', icon: 'scan', status: 'pending' },
        { id: 's4', label: 'Remove SQLite View', description: 'Execute DROP VIEW in SQLite', icon: 'execute', status: 'pending' },
        { id: 's5', label: 'Update Dependency Graph', description: 'Remove node and edges from dependency tracker', icon: 'graph', status: 'pending' },
        { id: 's6', label: 'Complete', description: 'Virtual View dropped successfully', icon: 'result', status: 'pending' },
      ];
    }

    case 'DROP_MATERIALIZED_VIEW': {
      return [
        ...base,
        { id: 's3', label: 'Locate Materialized View', description: 'Find physical stored table in database', icon: 'scan', status: 'pending' },
        { id: 's4', label: 'Drop Stored Physical Table', description: 'Execute DROP TABLE in SQLite', icon: 'execute', status: 'pending' },
        { id: 's5', label: 'Update Dependency Graph', description: 'Remove node and edges from dependency tracker', icon: 'graph', status: 'pending' },
        { id: 's6', label: 'Complete', description: 'Materialized View dropped successfully', icon: 'result', status: 'pending' },
      ];
    }

    default: {
      return [
        ...base,
        { id: 's3', label: 'Execute Statement', description: 'Run statement in SQLite engine', icon: 'execute', status: 'pending' },
        { id: 's4', label: 'Complete', description: 'Execution completed', icon: 'result', status: 'pending' },
      ];
    }
  }
}
