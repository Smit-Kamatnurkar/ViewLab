import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Database } from 'sql.js';
import { ViewManager } from '../views/manager';
import { MaterializedViewManager } from '../materializedViews/manager';
import { DependencyTracker } from '../dependencies/tracker';
import { parseSQL } from '../sql/parser';
import { executeSQL } from '../sql/executor';
import { getSchema } from '../database/schema';
import { LABS } from '../labs/data';
import {
  DatabaseSchema,
  HistoryEntry,
  LabState,
  QueryResult,
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

  lastResult: QueryResult | null;
  running: boolean;
  /** Bumped after every state-mutating operation so React re-reads managers */
  version: number;

  setDb: (db: Database) => void;
  setSchema: (schema: DatabaseSchema) => void;
  setInitialized: (initialized: boolean) => void;
  setInitializing: (initializing: boolean) => void;
  setInitError: (error: string | null) => void;

  addHistoryEntry: (entry: Omit<HistoryEntry, 'id'>) => void;
  clearHistory: () => void;

  setLabState: (state: Partial<LabState>) => void;
  setUI: (ui: Partial<UIState>) => void;

  selectedView: string | null;
  setSelectedView: (name: string | null) => void;

  refreshSchema: () => void;
  runQuery: (sql: string) => Promise<QueryResult>;

  resetDatabase: () => void;
  exportState: () => string;
  importState: (json: string) => void;
}

const initialUIState: UIState = {
  sidebarOpen: true,
  sidebarTab: 'database',
  learnMode: true,
  theme: 'dark',
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
  baseUrl: ''
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

      clearHistory: () => set({ history: [] }),

      setLabState: (labState) =>
        set((state) => ({
          labState: { ...state.labState, ...labState },
        })),

      setUI: (ui) =>
        set((state) => ({
          ui: { ...state.ui, ...ui },
        })),

      selectedView: null,
  selectedGraphNode: null,
      setSelectedView: (selectedView) => set({ selectedView }),

      refreshSchema: () => {
        const { db, mvManager } = get();
        if (!db) return;
        const schema = getSchema(db, new Set(mvManager.getViewNames()));
        set({ schema });
      },

      
      runQuery: async (sql: string) => {
        const { db, viewManager, mvManager, dependencyTracker,  } = get();
        if (!db) {
          const errorResult = {
            columns: [],
            rows: [],
            rowCount: 0,
            executionTime: 0,
            error: 'Database not initialized',
          } as any;
          set({ lastResult: errorResult });
          return errorResult;
        }

        set({ running: true });
        try {
          const parsed = parseSQL(sql);
          const result = await executeSQL(
            { db, viewManager, mvManager, dependencyTracker },
            parsed
          );

          get().addHistoryEntry({
            timestamp: Date.now(),
            operation: parsed.type,
            object:
              parsed.viewName ||
              parsed.materializedViewName ||
              parsed.tableName ||
              'query',
            status: result.error ? 'ERROR' : 'SUCCESS',
            details: result.error,
          });

          get().refreshSchema();
          set({ lastResult: result, version: get().version + 1 });
          
          // Auto-validate current lab step
          const currentLabId = get().labState.currentLabId;
          if (currentLabId) {
             const currentLab = LABS.find(l => l.id === currentLabId);
             if (currentLab) {
                const currentStep = currentLab.steps[get().labState.currentStepIndex];
                if (currentStep) {
                   const ctx = { db, viewManager, mvManager, lastResult: result };
                   if (currentStep.validate(get().labState, ctx as any)) {
                      // Mark complete
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


      resetDatabase: () => {
        const { viewManager, mvManager, dependencyTracker } = get();
        viewManager.clear();
        mvManager.clear();
        dependencyTracker.clear();
        set({
          history: [],
          labState: initialLabState,
          lastResult: null,
          version: get().version + 1,
        });
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
      }),
    }
  )
);