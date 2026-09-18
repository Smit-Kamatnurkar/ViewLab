import { useStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import { Badge } from '../Badge';

export function WorkspaceContextBar() {
  const { schema, viewManager, mvManager, resetDatabase, runSignatureDemo, databases, activeDatabaseId } = useStore(
    useShallow((state) => ({
      schema: state.schema,
      viewManager: state.viewManager,
      mvManager: state.mvManager,
      resetDatabase: state.resetDatabase,
      runSignatureDemo: state.runSignatureDemo,
      databases: state.databases,
      activeDatabaseId: state.activeDatabaseId,
    }))
  );

  const tablesCount = schema?.tables.length || 0;
  const viewsCount = viewManager.getViewNames().length;
  const mvs = Array.from(mvManager.getAllViews().values());
  const mvsCount = mvs.length;
  const staleCount = mvs.filter((mv) => mv.status === 'STALE').length;

  const activeDb = databases[activeDatabaseId];
  const activeDbName = activeDb?.metadata?.name || 'No Database';

  return (
    <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-card/60 border-b border-border/50 text-xs font-mono text-muted-foreground backdrop-blur-sm gap-3">
      {/* Database Status Info */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{activeDbName}</span>
        </div>

        <div className="h-3 w-px bg-border/60" />

        <div className="flex items-center gap-1">
          <span>Tables:</span>
          <span className="font-bold text-foreground">{tablesCount}</span>
        </div>

        <div className="flex items-center gap-1">
          <span>Views:</span>
          <span className="font-bold text-purple-600 dark:text-purple-400">{viewsCount}</span>
        </div>

        <div className="flex items-center gap-1">
          <span>MVs:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{mvsCount}</span>
          {staleCount > 0 && (
            <Badge variant="stale" className="ml-1 px-1.5 py-0 text-[10px]">
              {staleCount} STALE
            </Badge>
          )}
        </div>
      </div>

      {/* Shortcuts */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => runSignatureDemo()}
          className="px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-semibold flex items-center gap-1 text-[11px]"
          title="Run 11-Step Signature View vs MV Demo"
        >
          <span>⚡</span> Run Signature Demo
        </button>
        <button
          onClick={() => resetDatabase()}
          className="px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-[11px]"
          title="Reset database schema and seed data"
        >
          Reset DB
        </button>
      </div>
    </div>
  );
}
