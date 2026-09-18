import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from './store';
import { initializeDatabase, exportDatabase, uint8ToBase64, createDatabaseFromSQL } from './database/sqlite';
import { SHOP_SCHEMA, SHOP_SEED, HOSPITAL_SCHEMA, HOSPITAL_SEED } from './database/seeds';
import { executeMultiSQL } from './sql/executor';
import { Sidebar } from './components/layout/Sidebar';
import { Button } from './components/Button';

// Pages
import { Overview } from './components/pages/Overview';
import { Credits } from './components/pages/Credits';
import { ReferencesPage } from './components/pages/ReferencesPage';
import { Settings } from './components/pages/Settings';
import { LearnPage } from './components/pages/LearnPage';
import { HistoryPage } from './components/pages/HistoryPage';
import { UseCasesPage } from './components/pages/UseCasesPage';
import { SqlLabWorkspace } from './components/workspace/SqlLabWorkspace';
import { SimulatorWorkspace } from './components/workspace/SimulatorWorkspace';
import { DependenciesWorkspace } from './components/workspace/DependenciesWorkspace';
import { CompareWorkspace } from './components/workspace/CompareWorkspace';
import { QueryXRayWorkspace } from './components/workspace/QueryXRayWorkspace';
import { SQLEditor } from './components/SQLEditor';
import { LabsPanel } from './components/layout/LabsPanel';
import { AIAssistant } from './components/AIAssistant';
import { LearnModePanel } from './components/LearnMode';
import { ExportPanel } from './components/ExportPanel';

export default function App() {
  const {
    db, initError,
    ui,
    setInitialized, setInitializing, setInitError
  } = useStore(useShallow(state => ({
    db: state.db,
    initError: state.initError,
    ui: state.ui,
    setInitialized: state.setInitialized,
    setInitializing: state.setInitializing,
    setInitError: state.setInitError,
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
        const store = useStore.getState();
        const { databases } = store;

        // Ensure Default DB exists
        if (!databases['default-db']) {
          console.log('[ViewLab] Creating Default DB');
          const db = await initializeDatabase();
          // Demo graph
          const { viewManager, mvManager, dependencyTracker } = useStore.getState();
          const demoSQL = `CREATE VIEW artwork_sales AS SELECT a.title, ar.name AS artist_name, s.buyer, s.sale_price FROM ARTWORK a JOIN ARTIST ar ON a.artist_id = ar.artist_id JOIN SALE s ON a.artwork_id = s.artwork_id;\nCREATE MATERIALIZED VIEW artwork_sales_mv AS SELECT * FROM artwork_sales;`;
          await executeMultiSQL({ db, viewManager, mvManager, dependencyTracker }, demoSQL);
          
          const base64 = uint8ToBase64(exportDatabase(db));
          
          useStore.setState((state) => ({
            databases: {
              ...state.databases,
              'default-db': {
                metadata: { id: 'default-db', name: 'Default DB', description: 'Default art gallery database with artists, artworks, and sales', isDefault: true },
                views: viewManager.serialize(),
                materializedViews: mvManager.serialize(),
                dependencies: dependencyTracker.getGraph(),
                history: [],
                sqliteBase64: base64
              }
            }
          }));
        }

        if (!useStore.getState().databases['shop-db']) {
          console.log('[ViewLab] Creating ShopDB');
          const db = await createDatabaseFromSQL(SHOP_SCHEMA, SHOP_SEED);
          const base64 = uint8ToBase64(exportDatabase(db));
          useStore.setState((state) => ({
            databases: {
              ...state.databases,
              'shop-db': {
                metadata: { id: 'shop-db', name: 'ShopDB', description: 'E-commerce analytics database with customers, products, orders', isDefault: false },
                views: [],
                materializedViews: [],
                dependencies: { nodes: [], edges: [] },
                history: [],
                sqliteBase64: base64
              }
            }
          }));
        }

        if (!useStore.getState().databases['hospital-db']) {
          console.log('[ViewLab] Creating HospitalDB');
          const db = await createDatabaseFromSQL(HOSPITAL_SCHEMA, HOSPITAL_SEED);
          const base64 = uint8ToBase64(exportDatabase(db));
          useStore.setState((state) => ({
            databases: {
              ...state.databases,
              'hospital-db': {
                metadata: { id: 'hospital-db', name: 'HospitalDB', description: 'Healthcare educational database with patients, doctors, appointments', isDefault: false },
                views: [],
                materializedViews: [],
                dependencies: { nodes: [], edges: [] },
                history: [],
                sqliteBase64: base64
              }
            }
          }));
        }

        const activeId = useStore.getState().activeDatabaseId || 'default-db';
        await useStore.getState().switchDatabase(activeId);

        setInitialized(true);
        console.log('[ViewLab] Initialization complete');
      } catch (error) {
        console.error('[ViewLab] Failed to initialize databases:', error);
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

  const activePage = ui.activePage || 'overview';

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      <Sidebar />

      <div className="flex-1 min-h-0 flex flex-col relative z-10 overflow-hidden">
        {/* Workspace Router */}
        {activePage === 'overview' && <Overview />}
        {activePage === 'sql-lab' && <SqlLabWorkspace />}
        {activePage === 'simulation' && <SimulatorWorkspace />}
        {activePage === 'dependencies' && <DependenciesWorkspace />}
        {activePage === 'compare' && <CompareWorkspace />}
        {activePage === 'flow' && <QueryXRayWorkspace />}

        {/* Non-Workspace Sections (Preserved) */}
        {activePage === 'credits' && <Credits />}
        {activePage === 'references' && <ReferencesPage />}
        {activePage === 'settings' && <Settings />}
        {activePage === 'learn' && <LearnPage />}
        {activePage === 'history' && <HistoryPage />}
        {activePage === 'use-cases' && <UseCasesPage />}
        {activePage === 'export' && <ExportPanel />}

        {activePage === 'labs' && (
          <div className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
             <div className="neo-surface flex-1 min-h-0 overflow-hidden flex flex-row">
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
        <LearnModePanel />
      </div>
    </div>
  );
}
