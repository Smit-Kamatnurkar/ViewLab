import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Database } from 'sql.js';
import { ViewManager } from '../views/manager';
import { MaterializedViewManager } from '../materializedViews/manager';
import { DependencyTracker } from '../dependencies/tracker';
import { parseSQL, splitSQLStatements } from '../sql/parser';
import { executeMultiSQL } from '../sql/executor';
import { getSchema } from '../database/schema';
import { LABS } from '../labs/data';
import { initializeDatabase, exportDatabase, importDatabase, uint8ToBase64, base64ToUint8, createDatabaseFromSQL } from '../database/sqlite';
import {
  AISettings,
  DatabaseSchema,
  DuplicateViewConflict,
  HistoryEntry,
  LabState,
  QueryResult,
  SimulationStep,
  UIState,
} from '../types';

export interface DatabaseMetadata {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
}

export interface SerializableDatabaseState {
  metadata: DatabaseMetadata;
  views: any;
  materializedViews: any;
  dependencies: any;
  history: HistoryEntry[];
  sqliteBase64: string;
}

interface AppStore {
  databases: Record<string, SerializableDatabaseState>;
  activeDatabaseId: string;
  
  db: Database | null;
  schema: DatabaseSchema | null;
  initialized: boolean;
  initializing: boolean;
  initError: string | null;

  viewManager: ViewManager;
  mvManager: MaterializedViewManager;
  dependencyTracker: DependencyTracker;

  history: HistoryEntry[];
  labState: LabState;
  ui: UIState;
  aiSettings: AISettings;
  setAISettings: (settings: Partial<AISettings>) => void;

  switchDatabase: (id: string) => Promise<void>;
  createDatabase: (name: string, description?: string) => Promise<void>;

  // Single Source of Truth for Query Results & Simulation
  lastResult: QueryResult | null;
  running: boolean;
  version: number;

  currentSQL: string;
  simulationSteps: SimulationStep[];
  simulationStepIndex: number;
  isSimulationPlaying: boolean;
  simulationSpeedIndex: number;
  duplicateViewConflict: DuplicateViewConflict | null;

  setSimulationState: (
    state: Partial<{
      currentSQL: string;
      simulationSteps: SimulationStep[];
      simulationStepIndex: number;
      isSimulationPlaying: boolean;
      simulationSpeedIndex: number;
    }>
  ) => void;


  setDuplicateViewConflict: (conflict: DuplicateViewConflict | null) => void;
  resolveDuplicateViewConflict: (action: 'use' | 'recreate' | 'cancel') => Promise<void>;

  setDb: (db: Database) => void;
  setSchema: (schema: DatabaseSchema) => void;
  setInitialized: (initialized: boolean) => void;
  setInitializing: (initializing: boolean) => void;
  setInitError: (error: string | null) => void;

  addHistoryEntry: (entry: Omit<HistoryEntry, 'id'>) => void;
  deleteHistoryEntry: (id: string) => void;
  clearHistory: () => void;

  setLabState: (state: Partial<LabState>) => void;
  setUI: (ui: Partial<UIState>) => void;

  selectedView: string | null;
  setSelectedView: (name: string | null) => void;

  refreshSchema: () => void;
  runQuery: (sql: string, options?: { forceRecreate?: boolean }) => Promise<QueryResult>;

  resetDatabase: () => Promise<void>;
  runSignatureDemo: () => Promise<void>;
  exportState: () => string;
  importState: (json: string) => void;
}

const getInitialTheme = (): 'dark' | 'light' => {
  try {
    const saved = localStorage.getItem('viewlab-theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch (e) {}
  return 'dark';
};

const initialUIState: UIState = {
  sidebarOpen: true,
  sidebarTab: 'database',
  learnMode: true,
  theme: getInitialTheme(),
  activePanel: 'editor',
  activePage: 'overview',
  splitRatio: 50,
  selectedView: null,
  selectedGraphNode: null,
};

const initialAISettings: AISettings = {
  provider: 'compatible',
  apiKey: '',
  model: 'google/gemini-2.5-flash',
  baseUrl: 'https://openrouter.ai/api/v1',
  testStatus: 'idle',
};

const initialLabState: LabState = {
  currentLabId: null,
  currentStepIndex: 0,
  completedSteps: [],
  completedLabs: [],
};

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      databases: {},
      activeDatabaseId: '',
      db: null,
      schema: null,
      initialized: false,
      initializing: false,
      initError: null,

      viewManager: new ViewManager(),
      mvManager: new MaterializedViewManager(),
      dependencyTracker: new DependencyTracker(),

      history: [],
      labState: initialLabState,
      ui: initialUIState,
      aiSettings: initialAISettings,
      setAISettings: (settings) => set((state) => ({ aiSettings: { ...state.aiSettings, ...settings } })),

      switchDatabase: async (id: string) => {
        const { databases, activeDatabaseId, db, viewManager, mvManager, dependencyTracker, history } = get();
        
        if (db && activeDatabaseId && databases[activeDatabaseId]) {
          const currentBase64 = uint8ToBase64(exportDatabase(db));
          const currentState: SerializableDatabaseState = {
            metadata: databases[activeDatabaseId].metadata,
            views: viewManager.serialize(),
            materializedViews: mvManager.serialize(),
            dependencies: dependencyTracker.getGraph(),
            history: history,
            sqliteBase64: currentBase64
          };
          set((state) => ({ databases: { ...state.databases, [activeDatabaseId]: currentState } }));
        }

        const target = get().databases[id];
        if (!target) return;

        set({ initializing: true });
        try {
          const newDb = await importDatabase(base64ToUint8(target.sqliteBase64));
          
          viewManager.clear();
          mvManager.clear();
          dependencyTracker.clear();
          
          if (target.views) viewManager.loadViews(target.views);
          if (target.materializedViews) mvManager.loadViews(target.materializedViews);
          if (target.dependencies) dependencyTracker.loadGraph(target.dependencies);

          set({ 
            db: newDb, 
            activeDatabaseId: id,
            history: target.history || [],
            lastResult: null,
            currentSQL: '',
            simulationSteps: [],
            simulationStepIndex: -1,
            isSimulationPlaying: false,
            duplicateViewConflict: null,
            version: get().version + 1,
            initializing: false
          });
          
          get().refreshSchema();
        } catch(e) {
          console.error("[ViewLab] Failed to switch DB", e);
          set({ initializing: false });
        }
      },

      createDatabase: async (name: string, description?: string) => {
        const id = 'custom-' + Date.now();
        const emptyDb = await createDatabaseFromSQL('');
        const base64 = uint8ToBase64(exportDatabase(emptyDb));
        
        const newState: SerializableDatabaseState = {
          metadata: { id, name, description: description || 'Custom database', isDefault: false },
          views: [],
          materializedViews: [],
          dependencies: { nodes: [], edges: [] },
          history: [],
          sqliteBase64: base64
        };

        set((state) => ({ databases: { ...state.databases, [id]: newState } }));
        await get().switchDatabase(id);
      },

      lastResult: null,
      running: false,
      version: 0,

      currentSQL: '',
      simulationSteps: [],
      simulationStepIndex: -1,
      isSimulationPlaying: false,
      simulationSpeedIndex: 1,
      duplicateViewConflict: null,

      setSimulationState: (simState) =>
        set((state) => ({
          ...state,
          ...simState,
        })),

      setDuplicateViewConflict: (conflict) => set({ duplicateViewConflict: conflict }),

      resolveDuplicateViewConflict: async (action) => {
        const conflict = get().duplicateViewConflict;
        if (!conflict) return;

        set({ duplicateViewConflict: null });

        if (action === 'recreate') {
          await get().runQuery(conflict.sql, { forceRecreate: true });
        } else if (action === 'use') {
          const viewName = conflict.name;
          const query = `SELECT * FROM ${viewName};`;
          await get().runQuery(query);
        }
      },

      setDb: (db) => set({ db }),
      setSchema: (schema) => set({ schema }),
      setInitialized: (initialized) => set({ initialized }),
      setInitializing: (initializing) => set({ initializing }),
      setInitError: (initError) => set({ initError }),

      addHistoryEntry: (entry) =>
        set((state) => ({
          history: [
            { ...entry, id: crypto.randomUUID() },
            ...state.history.slice(0, 99),
          ],
        })),

      deleteHistoryEntry: (id) =>
        set((state) => ({
          history: state.history.filter((e) => e.id !== id),
        })),

      clearHistory: () => set({ history: [] }),

      setLabState: (labState) =>
        set((state) => ({
          labState: { ...state.labState, ...labState },
        })),

      setUI: (ui) =>
        set((state) => {
          const updatedUI = { ...state.ui, ...ui };
          if (ui.theme) {
            try {
              localStorage.setItem('viewlab-theme', ui.theme);
            } catch (e) {}
          }
          return { ui: updatedUI };
        }),

      selectedView: null,
      selectedGraphNode: null,
      setSelectedView: (selectedView) => set({ selectedView }),

      refreshSchema: () => {
        const { db, mvManager, dependencyTracker } = get();
        if (!db) return;
        const schema = getSchema(db, new Set(mvManager.getViewNames()));
        for (const tbl of schema.tables) {
          dependencyTracker.registerView(tbl.name, 'table', []);
        }
        set({ schema, version: get().version + 1 });
      },

      runQuery: async (sql: string, options?: { forceRecreate?: boolean }) => {
        const { db, viewManager, mvManager, dependencyTracker } = get();
        if (!db) {
          const errorResult = {
            columns: [],
            rows: [],
            rowCount: 0,
            executionTime: 0,
            error: 'Database not initialized',
          } as QueryResult;
          set({ lastResult: errorResult });
          return errorResult;
        }

        set({ running: true });
        const startTs = performance.now();

        try {
          const result = await executeMultiSQL(
            { db, viewManager, mvManager, dependencyTracker },
            sql,
            options
          );

          const execTime = performance.now() - startTs;

          // Check if view already exists and prompt user if no forceRecreate
          if (result.error && result.error.includes('already exists') && !options?.forceRecreate) {
            const statements = splitSQLStatements(sql);
            const firstStmt = statements[0] || sql;
            const parsed = parseSQL(firstStmt);
            const name = parsed.viewName || parsed.materializedViewName || result.objectName || '';
            const isMV = parsed.type === 'CREATE_MATERIALIZED_VIEW';
            const existingDef = isMV
              ? mvManager.getView(name)?.definition || ''
              : viewManager.getView(name)?.definition || '';

            set({
              duplicateViewConflict: {
                name,
                type: isMV ? 'MATERIALIZED_VIEW' : 'VIEW',
                existingDefinition: existingDef,
                newDefinition: parsed.definition || '',
                sql,
              },
            });
          }

          const parsed = parseSQL(sql);
          get().addHistoryEntry({
            timestamp: Date.now(),
            sql: sql.trim(),
            operation: result.operation || parsed.type,
            object:
              result.objectName ||
              parsed.viewName ||
              parsed.materializedViewName ||
              parsed.tableName ||
              'query',
            status: result.error ? 'ERROR' : 'SUCCESS',
            details: result.error,
            executionTime: execTime,
            rowsAffected: result.rowCount,
          });

          get().refreshSchema();

          set({
            lastResult: result,
            currentSQL: sql,
            simulationSteps: result.simulationSteps || [],
            simulationStepIndex: result.simulationSteps && result.simulationSteps.length > 0 ? 0 : -1,
            isSimulationPlaying: false,
            version: get().version + 1,
          });

          // Auto-validate current lab step
          const currentLabId = get().labState.currentLabId;
          if (currentLabId) {
            const currentLab = LABS.find((l) => l.id === currentLabId);
            if (currentLab) {
              const currentStep = currentLab.steps[get().labState.currentStepIndex];
              if (currentStep) {
                const ctx = { db, viewManager, mvManager, lastResult: result };
                if (currentStep.validate(get().labState, ctx as any)) {
                  const newCompleted = [...get().labState.completedSteps, currentStep.id];
                  const nextStepIndex = get().labState.currentStepIndex + 1;

                  if (nextStepIndex >= currentLab.steps.length) {
                    get().setLabState({
                      completedSteps: newCompleted,
                      completedLabs: [...get().labState.completedLabs, currentLab.id],
                      currentLabId: null,
                      currentStepIndex: 0,
                    });
                  } else {
                    get().setLabState({ completedSteps: newCompleted, currentStepIndex: nextStepIndex });
                  }
                }
              }
            }
          }

          return result;
        } finally {
          set({ running: false });
        }
      },

      resetDatabase: async () => {
        const { viewManager, mvManager, dependencyTracker, activeDatabaseId, databases } = get();
        const activeDb = databases[activeDatabaseId];
        
        if (!activeDb) return;

        // Re-create the database based on its type
        let newDb: Database;
        if (activeDb.metadata.isDefault) {
          // Default DB - reinitialize with seed data
          newDb = await initializeDatabase();
          
          // Rebuild demo graph
          dependencyTracker.registerView('ARTIST', 'table', []);
          dependencyTracker.registerView('ARTWORK', 'table', []);
          dependencyTracker.registerView('SALE', 'table', []);
          
          const demoSQL = `CREATE VIEW artwork_sales AS SELECT a.title, ar.name AS artist_name, s.buyer, s.sale_price FROM ARTWORK a JOIN ARTIST ar ON a.artist_id = ar.artist_id JOIN SALE s ON a.artwork_id = s.artwork_id;\nCREATE MATERIALIZED VIEW artwork_sales_mv AS SELECT * FROM artwork_sales;`;
          await executeMultiSQL({ db: newDb, viewManager, mvManager, dependencyTracker }, demoSQL);
        } else if (activeDb.metadata.id === 'shop-db') {
          // ShopDB - reseed
          const { SHOP_SCHEMA, SHOP_SEED } = await import('../database/seeds');
          newDb = await createDatabaseFromSQL(SHOP_SCHEMA, SHOP_SEED);
          viewManager.clear();
          mvManager.clear();
          dependencyTracker.clear();
        } else if (activeDb.metadata.id === 'hospital-db') {
          // HospitalDB - reseed
          const { HOSPITAL_SCHEMA, HOSPITAL_SEED } = await import('../database/seeds');
          newDb = await createDatabaseFromSQL(HOSPITAL_SCHEMA, HOSPITAL_SEED);
          viewManager.clear();
          mvManager.clear();
          dependencyTracker.clear();
        } else {
          // Custom database - just clear to empty
          newDb = await createDatabaseFromSQL('');
          viewManager.clear();
          mvManager.clear();
          dependencyTracker.clear();
        }

        // Update the stored database state
        const base64 = uint8ToBase64(exportDatabase(newDb));
        const updatedState: SerializableDatabaseState = {
          metadata: activeDb.metadata,
          views: viewManager.serialize(),
          materializedViews: mvManager.serialize(),
          dependencies: dependencyTracker.getGraph(),
          history: [],
          sqliteBase64: base64
        };

        set((state) => ({
          databases: { ...state.databases, [activeDatabaseId]: updatedState },
          db: newDb,
          history: [],
          labState: initialLabState,
          lastResult: null,
          currentSQL: '',
          simulationSteps: [],
          simulationStepIndex: -1,
          isSimulationPlaying: false,
          duplicateViewConflict: null,
          version: get().version + 1,
        }));

        get().refreshSchema();
      },

      runSignatureDemo: async () => {
        await get().resetDatabase();
        const updateSQL = `UPDATE ARTWORK SET price = 150000 WHERE artwork_id = 3;`;
        await get().runQuery(updateSQL);
        get().setUI({ activePage: 'compare' });
      },

      exportState: () => {
        const { viewManager, mvManager, dependencyTracker, history, labState, ui } = get();
        return JSON.stringify({
          views: viewManager.serialize(),
          materializedViews: mvManager.serialize(),
          dependencies: dependencyTracker.getGraph(),
          history,
          labState,
          ui: { ...ui, sidebarOpen: true },
        });
      },

      importState: (json) => {
        try {
          const data = JSON.parse(json);
          const { viewManager, mvManager, dependencyTracker } = get();

          if (data.views) viewManager.loadViews(data.views);
          if (data.materializedViews) mvManager.loadViews(data.materializedViews);
          if (data.dependencies) dependencyTracker.loadGraph(data.dependencies);
          if (data.history) set({ history: data.history });
          if (data.labState) set({ labState: data.labState });
          if (data.ui) set({ ui: { ...get().ui, ...data.ui } });
        } catch (e) {
          console.error('Failed to import state:', e);
        }
      },
    }),
    {
      name: 'viewlab-state',
      partialize: (state) => {
        // Save current active DB into databases map before persisting
        const currentDatabases = { ...state.databases };
        if (state.db && state.activeDatabaseId && currentDatabases[state.activeDatabaseId]) {
          currentDatabases[state.activeDatabaseId] = {
            ...currentDatabases[state.activeDatabaseId],
            views: state.viewManager.serialize(),
            materializedViews: state.mvManager.serialize(),
            dependencies: state.dependencyTracker.getGraph(),
            history: state.history,
            sqliteBase64: uint8ToBase64(exportDatabase(state.db))
          };
        }
        
        return {
          databases: currentDatabases,
          activeDatabaseId: state.activeDatabaseId,
          labState: state.labState,
          ui: state.ui,
          aiSettings: state.aiSettings,
        };
      },
    }
  )
);