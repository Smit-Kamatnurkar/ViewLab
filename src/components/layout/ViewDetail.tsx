import { useState } from 'react';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../Card';
import { Separator } from '../Separator';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';
import { ViewInfo } from '../../types';
import { ResultGrid } from '../ResultGrid';

interface ViewDetailProps {
  view: ViewInfo;
  onClose: () => void;
}

export function ViewDetail({ view, onClose }: ViewDetailProps) {
  const { db, setUI } = useStore(useShallow(state => ({ db: state.db, setUI: state.setUI })));
  const [result, setResult] = useState<{ columns: string[]; rows: unknown[][] } | null>(null);
  const [loading, setLoading] = useState(false);

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
      setUI({ activePanel: 'result' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-2 animate-in fade-in slide-in-from-top-2">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="live">LIVE</Badge>
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
        <Button onClick={handleQuery} disabled={loading} size="sm">
          {loading ? 'Running...' : 'Run View'}
        </Button>
        {result && (
          <div>
            <ResultGrid columns={result.columns} rows={result.rows} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}