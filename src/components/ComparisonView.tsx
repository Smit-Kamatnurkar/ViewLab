import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { ResultGrid } from './ResultGrid';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';

export function ComparisonView() {
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
  const [mvLastRefreshed, setMvLastRefreshed] = useState<number>(0);

  // Gather all MVs
  const allMVs = useMemo(() => mvManager.serialize(), [version, mvManager]);

  // Auto-select first available MV
  useEffect(() => {
    if (!selectedPair && allMVs.length > 0) {
      setSelectedPair(allMVs[0].name);
    }
  }, [allMVs, selectedPair]);

  // Query live view result and MV stored result when selection changes
  useEffect(() => {
    if (!selectedPair || !db) return;

    const mv = mvManager.getView(selectedPair);
    if (mv) {
      setMvStatus(mv.status);
      setMvLastRefreshed(mv.lastRefreshedAt);
      if (mv.result) {
        setMvStoredResult({ columns: mv.result.columns, rows: mv.result.rows });
      }

      // Execute the view definition to get live result
      try {
        const liveResult = db.exec(mv.definition);
        if (liveResult.length > 0) {
          setViewResult({ columns: liveResult[0].columns, rows: liveResult[0].values });
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

  const handleAskAI = () => {
    const event = new CustomEvent('toggle-ai-prompt', { detail: `Why are the View and Materialized View "${selectedPair}" showing different results? What does the ${mvStatus} status mean?` });
    document.dispatchEvent(event);
  };

  const timeSinceRefresh = mvLastRefreshed > 0 ? Math.round((Date.now() - mvLastRefreshed) / 1000) : null;

  return (
    <div className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
      <div className="neo-surface flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
              <path d="M9 17l-5-5 5-5"/><path d="M15 7l5 5-5 5"/>
            </svg>
            <h2 className="text-lg font-bold">View vs Materialized View</h2>
          </div>
          <div className="flex items-center gap-2">
            {allMVs.length > 0 && (
              <select
                value={selectedPair || ''}
                onChange={e => setSelectedPair(e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50"
              >
                {allMVs.map(mv => (
                  <option key={mv.name} value={mv.name}>{mv.name}</option>
                ))}
              </select>
            )}
            <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={!selectedPair}>
              Refresh MV
            </Button>
            <button onClick={handleAskAI} className="neo-button px-3 py-1.5 text-xs text-primary">Explain (AI)</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {allMVs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/30">
                <path d="M9 17l-5-5 5-5"/><path d="M15 7l5 5-5 5"/>
              </svg>
              <p className="text-sm text-center">Create a View and a Materialized View with the same definition<br/>to compare their behavior.</p>
              <Button size="sm" onClick={() => setUI({ activePage: 'sql-lab' })}>Open SQL Lab</Button>
            </div>
          ) : (
            <>
              {/* Side-by-side panels */}
              <div className="grid grid-cols-2 gap-4">
                {/* View Panel */}
                <Card className="border-purple-500/20">
                  <CardHeader className="p-4 pb-2 bg-purple-500/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="live">LIVE VIEW</Badge>
                        <CardTitle className="text-base">Always Current</CardTitle>
                      </div>
                      <span className="text-lg">⚡</span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div>🟣 Query Definition — re-executes each time</div>
                      <div>❌ Does not store result</div>
                      <div>✅ Always reflects current data</div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {viewResult ? (
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">{viewResult.rows.length} rows (live)</div>
                        <ResultGrid columns={viewResult.columns} rows={viewResult.rows} />
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-8">Select a materialized view to compare</p>
                    )}
                  </CardContent>
                </Card>

                {/* MV Panel */}
                <Card className={`${mvStatus === 'STALE' ? 'border-orange-500/30' : 'border-green-500/20'} transition-colors`}>
                  <CardHeader className={`p-4 pb-2 ${mvStatus === 'STALE' ? 'bg-orange-500/5' : 'bg-green-500/5'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={mvStatus === 'FRESH' ? 'fresh' : 'stale'}>
                          {mvStatus === 'FRESH' ? '🟢 FRESH' : '🟠 STALE'}
                        </Badge>
                        <CardTitle className="text-base">Materialized View</CardTitle>
                      </div>
                      <span className="text-lg">{mvStatus === 'STALE' ? '⚠️' : '🚀'}</span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div>🟢 Stored Result — reads precomputed data</div>
                      <div>⚠ Can become stale</div>
                      <div>🔄 Requires REFRESH to sync</div>
                      {timeSinceRefresh != null && (
                        <div className="text-[11px]">Last refreshed: {timeSinceRefresh < 60 ? `${timeSinceRefresh}s ago` : `${Math.round(timeSinceRefresh / 60)}m ago`}</div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {mvStoredResult ? (
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">{mvStoredResult.rows.length} rows (stored)</div>
                        <ResultGrid columns={mvStoredResult.columns} rows={mvStoredResult.rows} />
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-8">No stored result available</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Stale warning */}
              {mvStatus === 'STALE' && (
                <div className="p-4 rounded-xl border-2 border-dashed border-orange-500/30 bg-orange-500/5 animate-stale-flash">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="font-bold text-orange-400 mb-1">Materialized View is STALE</h4>
                      <p className="text-sm text-muted-foreground">
                        The source table changed after this materialized view was last refreshed. 
                        The stored result still contains the previous data. 
                        Run <code className="text-primary font-mono text-xs bg-primary/10 px-1 py-0.5 rounded">REFRESH MATERIALIZED VIEW {selectedPair}</code> to update it.
                      </p>
                      <Button size="sm" onClick={handleRefresh} className="mt-3">
                        Refresh Now
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Row count comparison */}
              {viewResult && mvStoredResult && viewResult.rows.length !== mvStoredResult.rows.length && (
                <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                  <h4 className="font-semibold text-sm text-red-400 mb-1">⚡ Row Count Mismatch Detected</h4>
                  <p className="text-sm text-muted-foreground">
                    Live View: <strong className="text-purple-400">{viewResult.rows.length} rows</strong> — 
                    Stored MV: <strong className="text-green-400">{mvStoredResult.rows.length} rows</strong>
                  </p>
                </div>
              )}

              {/* Properties comparison table */}
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">Key Differences</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left p-2 font-medium text-muted-foreground border-b border-border">Property</th>
                          <th className="text-left p-2 font-medium text-purple-400 border-b border-border">View</th>
                          <th className="text-left p-2 font-medium text-green-400 border-b border-border">Materialized View</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['Storage', 'None — query only', 'Physical table'],
                          ['Execution', 'Re-runs query each time', 'Reads stored result'],
                          ['Freshness', '✅ Always current', mvStatus === 'STALE' ? '🟠 STALE' : '🟢 FRESH'],
                          ['Refresh Required', 'No', 'Yes — REFRESH command'],
                          ['Performance', 'Slower (re-computes)', 'Faster (precomputed)'],
                          ['Dependencies', 'Transparent', 'Must track manually'],
                          ['Staleness Risk', 'None', 'High after base changes'],
                          ['Use Case', 'Security, simplification', 'Dashboards, analytics'],
                        ].map(([prop, view, mv]) => (
                          <tr key={prop} className="hover:bg-accent/50">
                            <td className="p-2 border-b border-border/50 font-medium">{prop}</td>
                            <td className="p-2 border-b border-border/50">{view}</td>
                            <td className="p-2 border-b border-border/50">{mv}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
