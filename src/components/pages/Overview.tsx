import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';
import { Badge } from '../Badge';

export function Overview() {
  const { schema, viewManager, mvManager, history, setUI, version: _version } = useStore(useShallow(state => ({
    schema: state.schema,
    viewManager: state.viewManager,
    mvManager: state.mvManager,
    history: state.history,
    setUI: state.setUI,
    version: state.version,
  })));

  const tablesCount = schema?.tables.length || 0;
  const viewsCount = viewManager.getViewNames().length;
  
  const mvs = Array.from(mvManager.getAllViews().values());
  const mvsCount = mvs.length;
  const staleCount = mvs.filter(mv => mv.status === 'STALE').length;
  const freshCount = mvsCount - staleCount;

  const totalQueries = history.length;
  const successQueries = history.filter(h => h.status === 'SUCCESS').length;
  const errorQueries = history.filter(h => h.status === 'ERROR').length;

  return (
    <div className="p-6 flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">Understand what your database is actually doing.</h1>
          <p className="text-lg text-muted-foreground">
            ViewLab is an interactive SQL laboratory. Create views, materialize them, modify source data, and instantly visualize the dependency consequences.
          </p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatCard title="TABLES" value={tablesCount} icon="📋" />
          <StatCard title="VIEWS" value={viewsCount} icon="👁️" accent="purple" />
          <StatCard title="MVs FRESH" value={freshCount} icon="🟢" accent="green" />
          <StatCard title="MVs STALE" value={staleCount} icon="🟠" accent={staleCount > 0 ? 'orange' : undefined} />
          <StatCard title="QUERIES" value={totalQueries} icon="⚡" />
          <StatCard title="SUCCESS" value={successQueries} icon="✅" accent="green" />
          <StatCard title="ERRORS" value={errorQueries} icon="❌" accent={errorQueries > 0 ? 'red' : undefined} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className="neo-surface p-6 space-y-4">
            <h2 className="text-xl font-semibold">Quick Actions</h2>
            <div className="space-y-2">
              <ActionButton icon="⚡" label="Run Signature Demo" onClick={() => useStore.getState().runSignatureDemo()} primary />
              <ActionButton icon="▶" label="Open SQL Lab" onClick={() => setUI({ activePage: 'sql-lab' })} />
              <ActionButton icon="🧪" label="Run Simulator" onClick={() => setUI({ activePage: 'simulation' })} />
              <ActionButton icon="⚗" label="Explore Dependencies" onClick={() => setUI({ activePage: 'dependencies' })} />
              <ActionButton icon="⚔" label="Compare View vs MV" onClick={() => setUI({ activePage: 'compare' })} />
              <ActionButton icon="📚" label="Learn Tutorial" onClick={() => setUI({ activePage: 'learn' })} />
              <ActionButton icon="✓" label="Start a Lab" onClick={() => setUI({ activePage: 'labs' })} />
            </div>
          </div>

          {/* How it works */}
          <div className="neo-surface-inset p-6 space-y-6 flex flex-col justify-center">
            <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wider">How it works</h2>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="live">VIEW</Badge>
                <span className="text-sm font-semibold" style={{ color: 'hsl(var(--color-view))' }}>Virtual / Live</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="neo-surface px-3 py-1.5 rounded-lg text-xs font-medium">Query</span>
                <span className="text-primary">→</span>
                <span>Re-execute Definition</span>
                <span className="text-primary">→</span>
                <span className="text-foreground font-medium">Current Data ✓</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="fresh">MATERIALIZED VIEW</Badge>
                <span className="text-sm font-semibold" style={{ color: 'hsl(var(--color-mv))' }}>Physical / Stored</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="neo-surface px-3 py-1.5 rounded-lg text-xs font-medium">Query</span>
                <span className="text-primary">→</span>
                <span>Read Stored Table</span>
                <span className="text-primary">→</span>
                <span className="font-medium" style={{ color: 'hsl(var(--color-stale))' }}>May Be Stale ⚠</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border/20 space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key Insight</h3>
              <p className="text-sm text-muted-foreground">
                When a base table changes, <strong className="text-foreground">Views always reflect current data</strong>, 
                but <strong style={{ color: 'hsl(var(--color-stale))' }}>Materialized Views become STALE</strong> until refreshed.
              </p>
            </div>
          </div>
        </div>

        {/* Database Objects */}
        {(viewsCount > 0 || mvsCount > 0) && (
          <div className="neo-surface p-6 space-y-4">
            <h2 className="text-xl font-semibold">Current Database Objects</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Tables */}
              {schema?.tables.map(t => (
                <div key={t.name} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/10">
                  <Badge variant="default">TABLE</Badge>
                  <span className="font-mono text-sm">{t.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{t.rowCount} rows</span>
                </div>
              ))}
              {/* Views */}
              {viewManager.serialize().map(v => (
                <div key={v.name} className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                  <Badge variant="live">VIEW</Badge>
                  <span className="font-mono text-sm">{v.name}</span>
                </div>
              ))}
              {/* MVs */}
              {mvs.map(mv => (
                <div key={mv.name} className="flex items-center gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                  <Badge variant={mv.status === 'FRESH' ? 'fresh' : 'stale'}>{mv.status}</Badge>
                  <span className="font-mono text-sm">{mv.name}</span>
                  {mv.result && <span className="text-xs text-muted-foreground ml-auto">{mv.result.rowCount} rows</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, accent }: { title: string, value: string | number, icon: string, accent?: string }) {
  const accentColors: Record<string, string> = {
    purple: 'border-purple-500/20',
    green: 'border-green-500/20',
    orange: 'border-orange-500/30 animate-stale-flash',
    red: 'border-red-500/20',
  };

  return (
    <div className={`neo-surface p-4 flex flex-col justify-between ${accent ? accentColors[accent] || '' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">{title}</span>
        <span className="text-base">{icon}</span>
      </div>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}

function ActionButton({ icon, label, onClick, primary }: { icon: string, label: string, onClick: () => void, primary?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-all text-left text-sm ${primary ? 'neo-button-primary' : 'neo-button'}`}
    >
      <span className={primary ? '' : 'text-primary'}>{icon}</span>
      {label}
    </button>
  );
}
