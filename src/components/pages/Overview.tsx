import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';

export function Overview() {
  const { schema, viewManager, mvManager, setUI } = useStore(useShallow(state => ({
    schema: state.schema,
    viewManager: state.viewManager,
    mvManager: state.mvManager,
    setUI: state.setUI
  })));

  const tablesCount = schema?.tables.length || 0;
  const viewsCount = viewManager.getViewNames().length;
  
  const mvs = Array.from(mvManager.getAllViews().values());
  const mvsCount = mvs.length;
  const staleCount = mvs.filter(mv => mv.status === 'STALE').length;

  return (
    <div className="p-10 flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <header className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Understand what your database is actually doing.</h1>
          <p className="text-xl text-muted-foreground">
            ViewLab is an interactive SQL laboratory. Create views, materialize them, modify source data, and instantly visualize the dependency consequences.
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard title="DATABASE" value="SQLite" />
          <StatCard title="TABLES" value={tablesCount} />
          <StatCard title="VIEWS" value={viewsCount} />
          <StatCard title="MATERIALIZED VIEWS" value={mvsCount} alert={staleCount > 0 ? `${staleCount} STALE` : undefined} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="neo-surface p-8 space-y-6">
            <h2 className="text-2xl font-semibold">Quick Actions</h2>
            <div className="space-y-3">
              <ActionButton icon="▶" label="Open SQL Lab" onClick={() => setUI({ activePage: 'sql-lab' } as any)} primary />
              <ActionButton icon="+" label="Create a View" onClick={() => setUI({ activePage: 'sql-lab' } as any)} />
              <ActionButton icon="+" label="Create Materialized View" onClick={() => setUI({ activePage: 'sql-lab' } as any)} />
              <ActionButton icon="⚗" label="Explore Dependencies" onClick={() => setUI({ activePage: 'dependencies' } as any)} />
              <ActionButton icon="✓" label="Start a Lab" onClick={() => setUI({ activePage: 'labs' } as any)} />
            </div>
          </div>

          <div className="neo-surface-inset p-8 space-y-8 flex flex-col justify-center">
            <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider mb-2">How it works</h2>
            
            <div className="space-y-2">
              <h3 className="font-bold text-[var(--color-view)]">VIEW</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="neo-surface px-3 py-1">LIVE</span>
                <span>→</span>
                <span>Query</span>
                <span>→</span>
                <span className="text-foreground font-medium">Current Data</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-[var(--color-mv)]">MATERIALIZED VIEW</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="neo-surface px-3 py-1">STORED</span>
                <span>→</span>
                <span>Cached Result</span>
                <span>→</span>
                <span className="text-[var(--color-stale)] font-bold">Refresh Required</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, alert }: { title: string, value: string | number, alert?: string }) {
  return (
    <div className="neo-surface p-6 flex flex-col justify-between">
      <span className="text-xs font-semibold text-muted-foreground tracking-wider mb-4">{title}</span>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold">{value}</span>
        {alert && <span className="px-2 py-1 text-xs font-bold bg-[var(--color-stale)] text-white rounded shadow-[0_0_10px_rgba(255,165,0,0.5)]">{alert}</span>}
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, primary }: { icon: string, label: string, onClick: () => void, primary?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg font-medium transition-all text-left ${primary ? 'neo-button-primary' : 'neo-button'}`}
    >
      <span className={primary ? '' : 'text-primary'}>{icon}</span>
      {label}
    </button>
  );
}
