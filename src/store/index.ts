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
import { initializeDatabase } from '../database/sqlite';
import {
  DatabaseSchema,
  DuplicateViewConflict,
  HistoryEntry,
  LabState,
  QueryResult,
  SimulationStep,
  UIState,
} from '../types';

export interface AISettings {
  provider: 'mock' | 'openai' | 'anthropic' | 'compatible';
  apiKey: string;
  model: string;
  baseUrl: string;
}

interface AppStore {
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
  provider: 'mock',
  apiKey: '',
  model: 'gpt-4o-mini',
  baseUrl: '',
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
        const { viewManager, mvManager, dependencyTracker } = get();

        // 1. Re-initialize database
        const newDb = await initializeDatabase();
        viewManager.clear();
        mvManager.clear();
        dependencyTracker.clear();

        // Register base tables in dependencyTracker
        dependencyTracker.registerView('ARTIST', 'table', []);
        dependencyTracker.registerView('ARTWORK', 'table', []);
        dependencyTracker.registerView('SALE', 'table', []);

        set({
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
        });

        get().refreshSchema();
      },

      runSignatureDemo: async () => {
        await get().resetDatabase();
        const demoSQL = `CREATE VIEW expensive_artworks AS SELECT * FROM ARTWORK WHERE price > 100000;
CREATE MATERIALIZED VIEW expensive_artworks_mv AS SELECT * FROM ARTWORK WHERE price > 100000;
UPDATE ARTWORK SET price = 150000 WHERE artwork_id = 3;
SELECT * FROM expensive_artworks;
SELECT * FROM expensive_artworks_mv;
REFRESH MATERIALIZED VIEW expensive_artworks_mv;`;

        await get().runQuery(demoSQL);
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
      partialize: (state) => ({
        history: state.history,
        labState: state.labState,
        ui: state.ui,
        aiSettings: state.aiSettings,
      }),
    }
  )
);