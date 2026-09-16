import { Button } from '../Button';
import { Badge } from '../Badge';
import { CardTitle } from '../Card';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';
import { HistoryEntry } from '../../types';

interface HistoryPanelProps {
  entries: HistoryEntry[];
}

export function HistoryPanel({ entries }: HistoryPanelProps) {
  const { clearHistory } = useStore(useShallow(state => ({ clearHistory: state.clearHistory })));

  if (entries.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No history yet
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <CardTitle className="text-base">Query History</CardTitle>
        <Button variant="ghost" size="sm" onClick={clearHistory}>
          Clear
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-2">
          {entries.map((entry) => (
            <HistoryEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HistoryEntryCard({ entry }: { entry: HistoryEntry }) {
  const statusVariant = {
    SUCCESS: 'success',
    ERROR: 'error',
    STALE: 'stale',
    REFRESHED: 'fresh',
  }[entry.status];

  return (
    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant as any}>{entry.status}</Badge>
            <span className="text-xs text-muted-foreground font-mono">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className="font-medium">{entry.operation}</span>
            <span className="text-muted-foreground">on</span>
            <span className="font-mono text-primary">{entry.object}</span>
          </div>
          {entry.details && (
            <div className="mt-1 text-xs text-muted-foreground font-mono">{entry.details}</div>
          )}
        </div>
      </div>
    </div>
  );
}