import React, { useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';
import { WorkspaceContextBar } from './WorkspaceContextBar';
import { ResultGrid } from '../ResultGrid';
import { Badge } from '../Badge';

export const CompareWorkspace: React.FC = () => {
  const { db, mvManager, runQuery, setUI, version } = useStore(useShallow(state => ({
    db: state.db,
    mvManager: state.mvManager,
    runQuery: state.runQuery,
    setUI: state.setUI,
    version: state.version,
  })));

  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [viewResult, setViewResult] = useState<{ columns: string[]; rows: unknown[][] } | null>(null);
  const [mvStoredResult, setMvStoredResult] = useState<{ columns: string[]; rows: unknown[][] } | null>(null);
  const [mvStatus, setMvStatus] = useState<'FRESH' | 'STALE'>('FRESH');

  const allMVs = useMemo(() => mvManager.serialize(), [version, mvManager]);

  useEffect(() => {
    if (!selectedPair && allMVs.length > 0) {
      setSelectedPair(allMVs[0].name);
    }
  }, [allMVs, selectedPair]);

  useEffect(() => {
    if (!selectedPair || !db) return;

    const mv = mvManager.getView(selectedPair);
    if (mv) {
      setMvStatus(mv.status);
      if (mv.result) {
        setMvStoredResult({ columns: mv.result.columns, rows: mv.result.rows });
      }

      // Execute view definition against live database state
      try {
        const liveRes = db.exec(mv.definition);
        if (liveRes.length > 0) {
          setViewResult({ columns: liveRes[0].columns, rows: liveRes[0].values });
        } else {
          setViewResult({ columns: [], rows: [] });
        }
      } catch {
        setViewResult(null);
      }
    }
  }, [selectedPair, db, version]);

  const handleRefresh = async () => {
    if (selectedPair) {
      await runQuery(`REFRESH MATERIALIZED VIEW ${selectedPair};`);
    }
  };

  const handleModifySourceData = async () => {
    // Modify artwork_id = 3 to trigger stale state
    await runQuery(`UPDATE ARTWORK SET price = 150000 WHERE artwork_id = 3;`);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden">
      <WorkspaceContextBar />

      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">COMPARE WORKSPACE</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">Virtual View vs Materialized View</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-0.5">
              Live vs Stored Data Comparison
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {allMVs.length > 0 && (
              <select
                value={selectedPair || ''}
                onChange={(e) => setSelectedPair(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border border-border bg-card text-foreground font-semibold hover:border-primary/40 focus:outline-none transition-all"
              >
                {allMVs.map(mv => (
                  <option key={mv.name} value={mv.name}>{mv.name}</option>
                ))}
              </select>
            )}

            <button
              onClick={handleModifySourceData}
              className="px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>⚡</span> Modify Source Data (DML)
            </button>

            <button
              onClick={handleRefresh}
              disabled={!selectedPair}
              className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-40 flex items-center gap-1.5"
            >
              <span>↻</span> Refresh MV
            </button>
          </div>
        </div>

        {allMVs.length === 0 ? (
          <div className="p-12 text-center bg-card border border-dashed border-border/60 rounded-2xl space-y-4 max-w-lg mx-auto">
            <span className="text-4xl">⇄</span>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-foreground">No Materialized View Created Yet</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Create a Materialized View in SQL Lab to compare live virtual view evaluation against stored physical data snapshots.
              </p>
            </div>
            <button
              onClick={() => setUI({ activePage: 'sql-lab' })}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all shadow-sm"
            >
              Open SQL Lab
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Side-by-side comparison cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Virtual View Panel */}
              <div className="p-5 bg-card border border-purple-500/30 rounded-2xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="live">VIRTUAL VIEW</Badge>
                    <span className="text-sm font-bold text-foreground font-mono">{selectedPair}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                    LIVE evaluation
                  </span>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• Re-runs stored query definition against live database</div>
                  <div>• Storage: <strong>0 rows precomputed</strong></div>
                  <div>• Freshness: <strong className="text-emerald-500 font-bold">Always Current ✓</strong></div>
                </div>

                <div className="pt-2 border-t border-border/30">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground mb-2">
                    <span>Evaluated Live Dataset</span>
                    <span className="font-mono text-muted-foreground">{viewResult?.rows.length ?? 0} rows</span>
                  </div>
                  <div className="max-h-64 overflow-auto border border-border/40 rounded-xl">
                    {viewResult ? (
                      <ResultGrid columns={viewResult.columns} rows={viewResult.rows} />
                    ) : (
                      <div className="p-4 text-xs text-muted-foreground text-center">Loading live evaluation...</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Materialized View Panel */}
              <div className={`p-5 bg-card border rounded-2xl space-y-4 shadow-sm ${
                mvStatus === 'STALE' ? 'border-amber-500/40 bg-amber-500/5' : 'border-emerald-500/30'
              }`}>
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={mvStatus === 'FRESH' ? 'fresh' : 'stale'}>
                      {mvStatus === 'FRESH' ? '🟢 FRESH' : '🟠 STALE'}
                    </Badge>
                    <span className="text-sm font-bold text-foreground font-mono">{selectedPair}</span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${mvStatus === 'STALE' ? 'text-amber-500 animate-pulse' : 'text-emerald-500'}`}>
                    {mvStatus === 'STALE' ? '⚠️ Base table changed!' : 'Stored physical snapshot'}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• Reads precomputed SQLite table directly</div>
                  <div>• Storage: <strong>Physical table on disk</strong></div>
                  <div>• Status: <strong className={mvStatus === 'STALE' ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'}>{mvStatus}</strong></div>
                </div>

                <div className="pt-2 border-t border-border/30">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground mb-2">
                    <span>Stored Physical Dataset</span>
                    <span className="font-mono text-muted-foreground">{mvStoredResult?.rows.length ?? 0} rows</span>
                  </div>
                  <div className="max-h-64 overflow-auto border border-border/40 rounded-xl">
                    {mvStoredResult ? (
                      <ResultGrid columns={mvStoredResult.columns} rows={mvStoredResult.rows} />
                    ) : (
                      <div className="p-4 text-xs text-muted-foreground text-center">Loading stored snapshot...</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Educational staleness explanation banner */}
            {mvStatus === 'STALE' && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <span>⚠️</span> Staleness Detected
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The underlying base table <strong className="text-foreground">ARTWORK</strong> was modified. The Virtual View dynamically updated to reflect current data, but the Materialized View remains <strong className="text-amber-500">STALE</strong> until you run REFRESH.
                  </p>
                </div>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-amber-500 text-white font-bold text-xs rounded-xl hover:bg-amber-600 transition-all shrink-0 shadow-sm"
                >
                  Refresh Materialized View Now
                </button>
              </div>
            )}

            {/* Properties Comparison Table */}
            <div className="p-5 bg-card border border-border/60 rounded-2xl space-y-3 shadow-xs">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Technical Property Comparison
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground font-semibold">
                      <th className="py-2 px-3">PROPERTY</th>
                      <th className="py-2 px-3 text-purple-600 dark:text-purple-400">VIRTUAL VIEW</th>
                      <th className="py-2 px-3 text-emerald-600 dark:text-emerald-400">MATERIALIZED VIEW</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 text-foreground font-medium">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-muted-foreground">Storage Model</td>
                      <td className="py-2.5 px-3">0 bytes (Stores query text only)</td>
                      <td className="py-2.5 px-3">Physical table precomputed on disk</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-muted-foreground">Query Execution</td>
                      <td className="py-2.5 px-3">Re-evaluates definition on every SELECT</td>
                      <td className="py-2.5 px-3">Scans precomputed physical table</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-muted-foreground">Data Freshness</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-500">Always 100% Live</td>
                      <td className="py-2.5 px-3">
                        <span className={mvStatus === 'STALE' ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'}>
                          {mvStatus} (Can become stale on DML)
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-muted-foreground">Maintenance Required</td>
                      <td className="py-2.5 px-3">None</td>
                      <td className="py-2.5 px-3">Explicit REFRESH command required</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
