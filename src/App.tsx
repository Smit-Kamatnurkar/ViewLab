import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from './store';
import { initializeDatabase } from './database/sqlite';
import { Sidebar } from './components/layout/Sidebar';
import { Button } from './components/Button';

// Pages
import { Overview } from './components/pages/Overview';
import { Credits } from './components/pages/Credits';
import { Settings } from './components/pages/Settings';
import { SQLEditor } from './components/SQLEditor';
import { DependencyGraphView } from './components/DependencyGraph';
import { ExecutionFlowView } from './components/ExecutionFlowView';
import { ComparisonView } from './components/ComparisonView';
import { LabsPanel } from './components/layout/LabsPanel';
import { AIAssistant } from './components/AIAssistant';

export default function App() {
  const {
    db, initError,
    ui, setDb, refreshSchema,
    setInitialized, setInitializing, setInitError,
    viewManager, mvManager, dependencyTracker,
    selectedView, lastResult
  } = useStore(useShallow(state => ({
    db: state.db,
    initError: state.initError,
    ui: state.ui,
    setDb: state.setDb,
    refreshSchema: state.refreshSchema,
    setInitialized: state.setInitialized,
    setInitializing: state.setInitializing,
    setInitError: state.setInitError,
    viewManager: state.viewManager,
    mvManager: state.mvManager,
    dependencyTracker: state.dependencyTracker,
    selectedView: state.selectedView,
    lastResult: state.lastResult,
  })));

  
  useEffect(() => {
    if (ui.theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [ui.theme]);

  useEffect(() => {
    async function init() {
      setInitializing(true);
      setInitError(null);
      console.log('[ViewLab] Starting initialization');
      try {
        console.log('[ViewLab] Creating database');
        const database = await initializeDatabase();
        console.log('[ViewLab] Database created successfully');
        setDb(database);
        console.log('[ViewLab] Refreshing schema');
        refreshSchema();
        setInitialized(true);
        console.log('[ViewLab] Initialization complete');
      } catch (error) {
        console.error('[ViewLab] Failed to initialize database:', error);
        setInitError(error instanceof Error ? error.message : String(error));
      } finally {
        setInitializing(false);
      }
    }
    
    const timeoutId = setTimeout(() => {
      const { initialized, initError } = useStore.getState();
      if (!initialized && !initError) {
        console.error('[ViewLab] Initialization timed out');
        setInitError('Initialization timed out after 10 seconds. Check console for details.');
        setInitializing(false);
      }
    }, 10000);
    
    init();
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (initError) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="max-w-md p-8 neo-surface text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">Unable to initialize ViewLab</h2>
          <p className="text-muted-foreground mb-6">The database could not be initialized.</p>
          <div className="p-4 neo-surface-inset text-sm text-left text-red-400 font-mono mb-8 overflow-auto max-h-32">
            {initError}
          </div>
          <Button onClick={() => window.location.reload()} className="w-full h-12 text-lg">
            Retry Initialization
          </Button>
        </div>
      </div>
    );
  }

  if (!db) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Initializing ViewLab...</p>
        </div>
      </div>
    );
  }

  const activePage = (ui as any).activePage || 'overview';
    const buildExecutionFlow = () => {
    const selectedNormalView = selectedView ? viewManager.getView(selectedView) : null;
    if (selectedNormalView) {
      return {
        type: 'view' as const,
        steps: [
          { label: 'SQL Query', description: 'SELECT * FROM ' + selectedNormalView.name, status: 'complete' as const },
          { label: 'View Definition', description: selectedNormalView.definition, status: 'complete' as const },
          { label: 'Base Tables', description: selectedNormalView.dependencies.join(', '), status: 'complete' as const },
          { label: 'Query Execution', description: 'Execute against current database state', status: 'complete' as const },
          { label: 'Current Result', description: 'Returns live, up-to-date data', status: 'complete' as const },
        ],
      };
    }
    if (selectedMV) {
      if (selectedMV.status === 'STALE') {
        return {
          type: 'materialized-view' as const,
          steps: [
            { label: 'SQL Query', description: 'SELECT * FROM ' + selectedMV.name, status: 'complete' as const },
            { label: 'Materialized Result', description: 'Read from stored result (Table SCAN)', status: 'complete' as const },
            { label: 'Stored Result', description: (selectedMV.result?.rowCount ?? 0) + ' rows (from last refresh)', status: 'complete' as const },
            { label: 'Status', description: 'STALE - base tables have changed since last refresh', status: 'complete' as const },
          ],
        };
      }
      return {
        type: 'materialized-view' as const,
        steps: [
          { label: 'SQL Query', description: 'SELECT * FROM ' + selectedMV.name, status: 'complete' as const },
          { label: 'Materialized Result', description: 'Read from stored result (Table SCAN)', status: 'complete' as const },
          { label: 'Stored Result', description: (selectedMV.result?.rowCount ?? 0) + ' rows', status: 'complete' as const },
          { label: 'Status', description: 'FRESH - matches current database state', status: 'complete' as const },
        ],
      };
    }
    
    // Default flow based on last query
    if (lastResult?.plan) {
      return {
        type: 'query' as const,
        steps: lastResult.plan.map(step => ({
          label: 'Execution Step',
          description: step,
          status: 'complete' as const
        }))
      };
    }
    return null;
  };

  const selectedMV = selectedView ? mvManager.getView(selectedView) : null;
  const mvLiveResult = null;
  const mvStoredResult = selectedMV ? selectedMV.result : null;

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      <Sidebar />

      <div className="flex-1 min-h-0 flex flex-col relative z-0 overflow-hidden">
        {/* Main Content Router */}
        {activePage === 'overview' && <Overview />}
        {activePage === 'credits' && <Credits />}
        {activePage === 'settings' && <Settings />}
        
        {activePage === 'sql-lab' && (
          <div className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
            <div className="neo-surface flex-1 min-h-0 overflow-hidden flex flex-col">
              <SQLEditor />
            </div>
          </div>
        )}

        {activePage === 'dependencies' && (
          <div className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
            <div className="neo-surface flex-1 min-h-0 overflow-hidden flex flex-col">
              <DependencyGraphView graph={dependencyTracker.getGraph()} />
            </div>
          </div>
        )}

        {activePage === 'flow' && (
          <div className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
            <div className="neo-surface flex-1 min-h-0 overflow-hidden flex flex-col">
               <ExecutionFlowView flow={buildExecutionFlow()} />
            </div>
          </div>
        )}

        {activePage === 'compare' && (
          <div className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
            <div className="neo-surface flex-1 min-h-0 overflow-hidden flex flex-col">
              <ComparisonView
                viewResult={mvLiveResult}
                mvResult={mvStoredResult}
                mvStatus={selectedMV?.status || 'FRESH'}
                mvName={selectedMV?.name}
              />
            </div>
          </div>
        )}

        {activePage === 'labs' && (
          <div className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
             <div className="neo-surface flex-1 min-h-0 overflow-hidden flex flex-row ">
                 <div className="w-1/3 border-r border-border/10 overflow-y-auto p-4">
                   <LabsPanel labState={useStore.getState().labState} />
                 </div>
                 <div className="w-2/3 h-full">
                    <SQLEditor />
                 </div>
             </div>
          </div>
        )}
        
            <AIAssistant />
    </div>
    </div>
  );
}
