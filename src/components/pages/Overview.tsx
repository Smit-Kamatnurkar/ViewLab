import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';
import { WorkspaceContextBar } from '../workspace/WorkspaceContextBar';
import { LiveDatabaseMap } from '../workspace/LiveDatabaseMap';
import { RecentActivity } from '../workspace/RecentActivity';

export function Overview() {
  const { schema, viewManager, mvManager, history, setUI, runSignatureDemo } = useStore(useShallow(state => ({
    schema: state.schema,
    viewManager: state.viewManager,
    mvManager: state.mvManager,
    history: state.history,
    setUI: state.setUI,
    runSignatureDemo: state.runSignatureDemo,
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
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-y-auto">
      {/* Top Workspace Context Bar */}
      <WorkspaceContextBar />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-primary uppercase">VIEWLAB</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground font-medium">DBMS Workspace</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-0.5">
              Live Database State
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => runSignatureDemo()}
              className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>✨</span> Run 7-Step Demo
            </button>
            <button
              onClick={() => setUI({ activePage: 'sql-lab' })}
              className="px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>⌘</span> Open SQL Lab
            </button>
          </div>
        </div>

        {/* Compact Status Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <CompactStat title="BASE TABLES" value={tablesCount} icon="📋" />
          <CompactStat title="VIEWS" value={viewsCount} icon="👁" color="text-cyan-500" />
          <CompactStat title="MV TOTAL" value={mvsCount} icon="◇" color="text-purple-500" />
          <CompactStat title="FRESH MVS" value={freshCount} icon="🟢" color="text-emerald-500" />
          <CompactStat title="STALE MVS" value={staleCount} icon="🟠" color={staleCount > 0 ? "text-amber-500 animate-pulse" : "text-muted-foreground"} />
          <CompactStat title="QUERIES" value={totalQueries} icon="⚡" />
          <CompactStat title="SUCCESSFUL" value={successQueries} icon="✓" color="text-emerald-500" />
          <CompactStat title="FAILED" value={errorQueries} icon="✕" color={errorQueries > 0 ? "text-red-500" : "text-muted-foreground"} />
        </div>

        {/* Main Grid: Live DB Map & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <LiveDatabaseMap />
          </div>

          <div className="space-y-6 flex flex-col">
            <div className="p-4 bg-card border border-border/60 rounded-xl space-y-4 shadow-sm">
              <RecentActivity />
            </div>

            {/* Educational concept card */}
            <div className="p-4 bg-muted/30 border border-border/40 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <span>💡</span> DBMS Architecture Insight
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Normal Views</strong> do not store physical rows — they dynamically re-run their stored query definition. <strong className="text-foreground">Materialized Views</strong> precompute and store results on disk for rapid reads, but become <strong className="text-amber-500">STALE</strong> when base tables are mutated until explicitly refreshed.
              </p>
              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                <button
                  onClick={() => setUI({ activePage: 'compare' })}
                  className="text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  <span>⇄</span> Compare View vs MV →
                </button>
                <button
                  onClick={() => setUI({ activePage: 'simulation' })}
                  className="text-muted-foreground hover:text-foreground font-medium"
                >
                  Visual Simulator →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactStat({ title, value, icon, color }: { title: string; value: number; icon: string; color?: string }) {
  return (
    <div className="p-3 bg-card border border-border/60 rounded-xl flex flex-col justify-between shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">{title}</span>
        <span className={`text-sm ${color || 'text-foreground'}`}>{icon}</span>
      </div>
      <div className="mt-1 flex items-baseline justify-between">
        <span className={`text-xl font-extrabold font-mono ${color || 'text-foreground'}`}>{value}</span>
      </div>
    </div>
  );
}
