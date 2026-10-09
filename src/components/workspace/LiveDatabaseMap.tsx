import { useState } from 'react';
import { useStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import { Badge } from '../Badge';
import { Button } from '../Button';

interface SelectedObject {
  name: string;
  type: 'TABLE' | 'VIEW' | 'MATERIALIZED_VIEW';
  rowCount: number;
  definition?: string;
  dependencies?: string[];
  status?: 'LIVE' | 'FRESH' | 'STALE';
  lastRefreshedAt?: number;
}

export function LiveDatabaseMap() {
  const { schema, viewManager, mvManager, setUI } = useStore(
    useShallow((state) => ({
      schema: state.schema,
      viewManager: state.viewManager,
      mvManager: state.mvManager,
      setUI: state.setUI,
    }))
  );

  const [selected, setSelected] = useState<SelectedObject | null>(null);

  const tables = schema?.tables || [];
  const views = Array.from(viewManager.getAllViews().values());
  const mvs = Array.from(mvManager.getAllViews().values());

  const handleSelectTable = (tableName: string, rowCount: number) => {
    setSelected({
      name: tableName,
      type: 'TABLE',
      rowCount,
    });
  };

  const handleSelectView = (v: any) => {
    setSelected({
      name: v.name,
      type: 'VIEW',
      rowCount: 0,
      definition: v.definition,
      dependencies: v.dependencies,
      status: 'LIVE',
    });
  };

  const handleSelectMV = (mv: any) => {
    setSelected({
      name: mv.name,
      type: 'MATERIALIZED_VIEW',
      rowCount: mv.result?.rowCount || 0,
      definition: mv.definition,
      dependencies: mv.dependencies,
      status: mv.status,
      lastRefreshedAt: mv.lastRefreshedAt,
    });
  };

  return (
    <div className="neo-surface p-6 rounded-2xl space-y-6 bg-card text-card-foreground border border-border">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold tracking-tight">Live Database Schema Map</h3>
          <p className="text-xs text-muted-foreground">Interactive layout of current base tables, views, and materialized views</p>
        </div>
        <Badge variant="live">Live Database State</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {/* Column 1: Base Tables */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <span>📋</span> Base Tables ({tables.length})
          </div>
          <div className="space-y-2">
            {tables.map((t) => (
              <button
                key={t.name}
                onClick={() => handleSelectTable(t.name, t.rowCount)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selected?.name === t.name
                    ? 'border-blue-500 bg-blue-500/10 shadow-md ring-1 ring-blue-500/30'
                    : 'border-border/40 bg-muted/30 hover:bg-muted/60 hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-sm">
                  <span>{t.name}</span>
                  <span className="text-xs font-mono text-muted-foreground">{t.rowCount} rows</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 truncate">
                  {t.columns.map((c) => c.name).join(', ')}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Column 2: Virtual Views */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            <span>👁️</span> Virtual Views ({views.length})
          </div>
          <div className="space-y-2">
            {views.length === 0 ? (
              <div className="p-4 border border-dashed border-border/60 rounded-xl text-center text-xs text-muted-foreground">
                No virtual views created yet
              </div>
            ) : (
              views.map((v) => (
                <button
                  key={v.name}
                  onClick={() => handleSelectView(v)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selected?.name === v.name
                      ? 'border-purple-500 bg-purple-500/10 shadow-md ring-1 ring-purple-500/30'
                      : 'border-border/40 bg-muted/30 hover:bg-muted/60 hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-sm">
                    <span className="truncate">{v.name}</span>
                    <Badge variant="live">LIVE</Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-1 truncate">
                    Deps: {v.dependencies.join(', ') || 'None'}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Materialized Views */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <span>💾</span> Materialized Views ({mvs.length})
          </div>
          <div className="space-y-2">
            {mvs.length === 0 ? (
              <div className="p-4 border border-dashed border-border/60 rounded-xl text-center text-xs text-muted-foreground">
                No materialized views created yet
              </div>
            ) : (
              mvs.map((mv) => (
                <button
                  key={mv.name}
                  onClick={() => handleSelectMV(mv)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selected?.name === mv.name
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-1 ring-emerald-500/30'
                      : 'border-border/40 bg-muted/30 hover:bg-muted/60 hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-sm">
                    <span className="truncate">{mv.name}</span>
                    <Badge variant={mv.status === 'FRESH' ? 'fresh' : 'stale'}>
                      {mv.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-1 truncate">
                    {mv.result?.rowCount || 0} rows • Deps: {mv.dependencies.join(', ') || 'None'}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Selected Object Inspect Drawer */}
      {selected && (
        <div className="p-4 rounded-xl bg-muted/40 border border-primary/20 space-y-3 animate-fade-in-scale">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-base text-foreground">{selected.name}</h4>
              <Badge variant={selected.type === 'TABLE' ? 'default' : selected.type === 'VIEW' ? 'live' : selected.status === 'FRESH' ? 'fresh' : 'stale'}>
                {selected.type.replace(/_/g, ' ')}
              </Badge>
            </div>
            <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground font-bold">
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {selected.definition && (
              <div className="space-y-1 md:col-span-2">
                <span className="text-muted-foreground font-semibold">Query Definition:</span>
                <pre className="p-2 rounded bg-card border border-border/50 font-mono text-foreground overflow-x-auto">
                  {selected.definition}
                </pre>
              </div>
            )}
            {selected.dependencies && (
              <div>
                <span className="text-muted-foreground font-semibold">Source Dependencies:</span>
                <div className="font-mono text-foreground">{selected.dependencies.join(', ') || 'None'}</div>
              </div>
            )}
            {selected.lastRefreshedAt && selected.lastRefreshedAt > 0 && (
              <div>
                <span className="text-muted-foreground font-semibold">Last Refreshed:</span>
                <div className="font-mono text-foreground">{new Date(selected.lastRefreshedAt).toLocaleTimeString()}</div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => setUI({ activePage: 'sql-lab' })}
            >
              Query in SQL Lab
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
