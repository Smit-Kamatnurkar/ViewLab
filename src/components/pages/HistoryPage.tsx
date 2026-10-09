import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';
import { Badge } from '../Badge';
import { Button } from '../Button';

export function HistoryPage() {
  const { history, clearHistory, deleteHistoryEntry, runQuery, setUI } = useStore(useShallow(state => ({
    history: state.history,
    clearHistory: state.clearHistory,
    deleteHistoryEntry: state.deleteHistoryEntry,
    runQuery: state.runQuery,
    setUI: state.setUI,
  })));

  const handleReRun = async (sql: string) => {
    setUI({ activePage: 'sql-lab' });
    setTimeout(async () => {
      document.dispatchEvent(new CustomEvent('set-sql', { detail: sql }));
      await runQuery(sql);
    }, 100);
  };

  const handleCopySQL = (sql: string) => {
    navigator.clipboard.writeText(sql);
  };

  const successCount = history.filter(e => e.status === 'SUCCESS').length;
  const errorCount = history.filter(e => e.status === 'ERROR').length;

  return (
    <div className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
      <div className="neo-surface flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <h2 className="text-lg font-bold">Query History</h2>
            <Badge variant="default">{history.length} entries</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="success">{successCount} success</Badge>
              <Badge variant="error">{errorCount} errors</Badge>
            </div>
            <Button variant="secondary" size="sm" onClick={clearHistory} disabled={history.length === 0}>
              Clear All
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/30">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <p className="text-sm">No queries executed yet</p>
              <Button size="sm" onClick={() => setUI({ activePage: 'sql-lab' })}>Open SQL Lab</Button>
            </div>
          ) : (
            history.map((entry) => {
              const statusVariant = {
                SUCCESS: 'success' as const,
                ERROR: 'error' as const,
                STALE: 'stale' as const,
                REFRESHED: 'fresh' as const,
              }[entry.status];

              const opColors: Record<string, string> = {
                SELECT: 'text-blue-600 dark:text-blue-400',
                INSERT: 'text-emerald-600 dark:text-emerald-400',
                UPDATE: 'text-amber-600 dark:text-amber-400',
                DELETE: 'text-rose-600 dark:text-rose-400',
                CREATE_VIEW: 'text-purple-600 dark:text-purple-400',
                CREATE_MATERIALIZED_VIEW: 'text-emerald-600 dark:text-emerald-400',
                DROP_VIEW: 'text-rose-600 dark:text-rose-400',
                DROP_MATERIALIZED_VIEW: 'text-rose-600 dark:text-rose-400',
                REFRESH_MATERIALIZED_VIEW: 'text-blue-600 dark:text-blue-400',
              };

              return (
                <div key={entry.id} className="p-4 rounded-lg bg-card border border-border/20 hover:border-border/40 transition-colors group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant={statusVariant}>{entry.status}</Badge>
                        <span className={`text-xs font-mono font-semibold ${opColors[entry.operation] || 'text-muted-foreground'}`}>
                          {entry.operation.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground">on</span>
                        <span className="text-xs font-mono text-primary font-bold">{entry.object}</span>
                        <span className="text-xs text-muted-foreground ml-auto font-mono">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {entry.sql && (
                        <pre className="text-xs font-mono text-foreground bg-muted/50 p-2 rounded mt-1 max-h-16 overflow-hidden whitespace-pre-wrap border border-border/40">
                          {entry.sql}
                        </pre>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground font-mono">
                        {entry.executionTime != null && (
                          <span>⏱ {entry.executionTime.toFixed(1)}ms</span>
                        )}
                        {entry.rowsAffected != null && entry.rowsAffected > 0 && (
                          <span>📊 {entry.rowsAffected} rows</span>
                        )}
                        {entry.details && (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold truncate max-w-xs">{entry.details}</span>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {entry.sql && (
                        <>
                          <button
                            onClick={() => handleReRun(entry.sql!)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Re-run"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleCopySQL(entry.sql!)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy SQL"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteHistoryEntry(entry.id)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
