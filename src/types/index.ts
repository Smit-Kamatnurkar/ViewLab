export interface ColumnInfo {
  name: string;
  type: string;
  primaryKey: boolean;
  foreignKey: string | null;
  notNull: boolean;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
}

export interface ForeignKeyInfo {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface DatabaseSchema {
  tables: TableInfo[];
  foreignKeys: ForeignKeyInfo[];
}

export interface DuplicateViewConflict {
  name: string;
  type: 'VIEW' | 'MATERIALIZED_VIEW';
  existingDefinition: string;
  newDefinition: string;
  sql: string;
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  executionTime: number;
  plan?: string[];
  error?: string;
  operation?: string;
  objectName?: string;
  sourceType?: 'TABLE' | 'VIEW' | 'MATERIALIZED_VIEW' | 'OTHER';
  mvStatus?: 'FRESH' | 'STALE';
  lastRefreshedAt?: number;
  simulationSteps?: SimulationStep[];
  warnings?: string[];
}

export type ViewStatus = 'LIVE';

export interface ViewInfo {
  name: string;
  definition: string;
  dependencies: string[];
  status: ViewStatus;
  createdAt: number;
}

export type MaterializedViewStatus = 'FRESH' | 'STALE';

export interface MaterializedViewInfo {
  id: string;
  name: string;
  definition: string;
  result: QueryResult | null;
  dependencies: string[];
  createdAt: number;
  lastRefreshedAt: number;
  status: MaterializedViewStatus;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  sql?: string;
  operation: string;
  object: string;
  status: 'SUCCESS' | 'ERROR' | 'STALE' | 'REFRESHED';
  details?: string;
  executionTime?: number;
  rowsAffected?: number;
}

export interface LabStep {
  id: string;
  title: string;
  description: string;
  instruction: string;
  hint?: string;
  validate: (state: LabState, context: ValidationContext) => boolean;
}

export interface Lab {
  id: string;
  title: string;
  description: string;
  steps: LabStep[];
}

export interface LabState {
  currentLabId: string | null;
  currentStepIndex: number;
  completedSteps: string[];
  completedLabs: string[];
}

export interface DependencyNode {
  id: string;
  name: string;
  type: 'table' | 'view' | 'materialized-view';
  status?: MaterializedViewStatus;
  position?: { x: number; y: number };
}

export interface DependencyEdge {
  id: string;
  source: string;
  target: string;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface ExecutionStep {
  label: string;
  description: string;
  status: 'pending' | 'running' | 'complete' | 'error';
}

export interface ExecutionFlow {
  steps: ExecutionStep[];
  type: 'view' | 'materialized-view' | 'refresh' | 'query';
}

export type SQLOperationType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE_VIEW' | 'DROP_VIEW' | 'CREATE_MATERIALIZED_VIEW' | 'DROP_MATERIALIZED_VIEW' | 'REFRESH_MATERIALIZED_VIEW' | 'CREATE_TABLE' | 'OTHER';

export interface ParsedSQL {
  type: SQLOperationType;
  viewName?: string;
  materializedViewName?: string;
  tableName?: string;
  columns?: string[];
  whereClause?: string;
  definition?: string;
  originalSQL: string;
}

// Simulation types
export interface SimulationStep {
  id: string;
  label: string;
  description: string;
  detail?: string;
  icon: 'parse' | 'identify' | 'resolve' | 'execute' | 'store' | 'define' | 'graph' | 'result' | 'refresh' | 'stale' | 'scan' | 'filter' | 'group' | 'aggregate';
  status: 'pending' | 'running' | 'complete';
  highlight?: 'view' | 'materialized-view' | 'table' | 'stale' | 'fresh' | 'refresh';
}

// Scenario types
export interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  schemaSQL: string;
  seedSQL: string;
  createViewSQL: string;
  createMVSQL: string;
  dmlSQL: string;
  refreshSQL: string;
  expectedStale: string;
}

export interface AppState {
  database: DatabaseState;
  views: ViewsState;
  materializedViews: MaterializedViewsState;
  dependencies: DependenciesState;
  history: HistoryState;
  labs: LabState;
  ui: UIState;
}

export interface DatabaseState {
  db: any;
  schema: DatabaseSchema | null;
  initialized: boolean;
  initializing: boolean;
}

export interface ViewsState {
  views: Map<string, ViewInfo>;
  selectedView: string | null;
}

export interface MaterializedViewsState {
  views: Map<string, MaterializedViewInfo>;
  selectedView: string | null;
  refreshing: Set<string>;
}

export interface DependenciesState {
  graph: DependencyGraph;
  tableToViews: Map<string, Set<string>>;
  viewToViews: Map<string, Set<string>>;
}

export interface HistoryState {
  entries: HistoryEntry[];
}

export type ActivePage = 'overview' | 'sql-lab' | 'dependencies' | 'compare' | 'flow' | 'labs' | 'credits' | 'settings' | 'history' | 'learn' | 'simulation' | 'use-cases' | 'export';

export interface UIState {
  sidebarOpen: boolean;
  sidebarTab: 'database' | 'labs' | 'history';
  learnMode: boolean;
  theme: 'dark' | 'light';
  activePanel: 'editor' | 'result' | 'comparison' | 'graph' | 'flow';
  activePage: ActivePage;
  splitRatio: number;
  selectedGraphNode: string | null;
  selectedView: string | null;
}

export interface ValidationContext {
  db: import('sql.js').Database;
  viewManager: import('../views/manager').ViewManager;
  mvManager: import('../materializedViews/manager').MaterializedViewManager;
  lastResult: QueryResult | null;
}
