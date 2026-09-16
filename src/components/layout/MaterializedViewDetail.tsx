import { useState } from 'react';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../Card';
import { Separator } from '../Separator';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';
import { MaterializedViewInfo } from '../../types';
import { ResultGrid } from '../ResultGrid';

interface MaterializedViewDetailProps {
  view: MaterializedViewInfo;
  onClose: () => void;
}

export function MaterializedViewDetail({ view, onClose }: MaterializedViewDetailProps) {
  const { db, mvManager } = useStore(useShallow(state => ({ db: state.db, mvManager: state.mvManager })));
  const [result, setResult] = useState<{ columns: string[]; rows: unknown[][] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleQuery = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const res = db.exec(view.definition);
      if (res.length > 0) {
        setResult({ columns: res[0].columns, rows: res[0].values });
      } else {
        setResult({ columns: [], rows: [] });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!db) return;
    setRefreshing(true);
    try {
      await mvManager.refreshMaterializedView(db, view.name);
      const res = db.exec(view.definition);
      if (res.length > 0) {
        setResult({ columns: res[0].columns, rows: res[0].values });
      }
    } finally {
      setRefreshing(false);
    }
  };

  const statusVariant = view.status === 'FRESH' ? 'fresh' : 'stale';

  return (
    <Card className="mt-2 animate-in fade-in slide-in-from-top-2">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant}>{view.status}</Badge>
            <CardTitle className="text-sm font-mono">{view.name}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </Button>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-3 pt-2 space-y-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Definition</div>
          <pre className="text-xs font-mono bg-muted p-2 rounded max-h-32 overflow-auto">{view.definition}</pre>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Dependencies</div>
          <div className="flex flex-wrap gap-1">
            {view.dependencies.length > 0 ? (
              view.dependencies.map((dep) => (
                <Badge key={dep} variant="default">{dep}</Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">none</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleQuery} disabled={loading} size="sm">
            {loading ? 'Running...' : 'Query MV'}
          </Button>
          <Button onClick={handleRefresh} disabled={refreshing} size="sm" variant="secondary">
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          Last refreshed: {new Date(view.lastRefreshedAt).toLocaleString()}
        </div>
        {view.result && (
          <div>
            <ResultGrid columns={view.result.columns} rows={view.result.rows} />
            <div className="text-xs text-muted-foreground mt-1">
              Stored result: {view.result.rowCount} rows
            </div>
          </div>
        )}
        {result && (
          <div>
            <ResultGrid columns={result.columns} rows={result.rows} />
            <div className="text-xs text-muted-foreground mt-1">
              Current query result: {result.rows.length} rows
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}