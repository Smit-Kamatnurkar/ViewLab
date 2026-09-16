import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Badge } from './Badge';
import { ResultGrid } from './ResultGrid';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';

interface ComparisonViewProps {
  viewResult: { columns: string[]; rows: unknown[][] } | null;
  mvResult: { columns: string[]; rows: unknown[][] } | null;
  mvStatus: 'FRESH' | 'STALE';
  mvName?: string;
}

export function ComparisonView({ viewResult, mvResult, mvStatus, mvName }: ComparisonViewProps) {
  const { setUI, runQuery } = useStore(useShallow(state => ({
    setUI: state.setUI,
    runQuery: state.runQuery
  })));

  const handleRefresh = async () => {
    if (mvName) {
      await runQuery(`REFRESH MATERIALIZED VIEW ${mvName};`);
    }
  };

  const handleOpenSource = () => {
    setUI({ activePage: 'sql-lab' });
  };

  const handleAskAI = () => {
    const event = new CustomEvent('toggle-ai-prompt', { detail: 'Why are these results different, and what does the Stale status mean?' });
    document.dispatchEvent(event);
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      <div className="flex items-center gap-4 bg-muted/20 p-3 rounded-lg border border-border/10">
        <span className="text-sm font-semibold">Comparison Actions:</span>
        <button onClick={handleRefresh} disabled={!mvName} className="neo-button px-3 py-1.5 text-xs text-primary border-primary/20">Refresh Materialized View</button>
        <button onClick={handleOpenSource} className="neo-button px-3 py-1.5 text-xs">Open Source Query</button>
        <button onClick={handleAskAI} className="neo-button px-3 py-1.5 text-xs text-purple-400 border-purple-500/20">Explain Difference (AI)</button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center gap-2">
              <Badge variant="live">LIVE VIEW</Badge>
              <CardTitle className="text-base">Always Current</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            {viewResult ? (
              <ResultGrid columns={viewResult.columns} rows={viewResult.rows} />
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Run the view to see results</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center gap-2">
              <Badge variant={mvStatus === 'FRESH' ? 'fresh' : 'stale'}>
                MATERIALIZED VIEW
              </Badge>
              <CardTitle className="text-base">{mvStatus === 'FRESH' ? 'Fresh' : 'Stale'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            {mvResult ? (
              <ResultGrid columns={mvResult.columns} rows={mvResult.rows} />
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Run the materialized view to see results</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-base">Key Differences</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left p-1 font-medium text-muted-foreground border-b border-border">Property</th>
                  <th className="text-left p-1 font-medium text-muted-foreground border-b border-border">View</th>
                  <th className="text-left p-1 font-medium text-muted-foreground border-b border-border">Materialized View</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-accent/50">
                  <td className="p-1 border-b border-border/50">Stores Result</td>
                  <td className="p-1 border-b border-border/50">No</td>
                  <td className="p-1 border-b border-border/50">Yes</td>
                </tr>
                <tr className="hover:bg-accent/50">
                  <td className="p-1 border-b border-border/50">Reflects Base Changes Immediately</td>
                  <td className="p-1 border-b border-border/50">Yes</td>
                  <td className="p-1 border-b border-border/50">No</td>
                </tr>
                <tr className="hover:bg-accent/50">
                  <td className="p-1 border-b border-border/50">Can Become Stale</td>
                  <td className="p-1 border-b border-border/50">No</td>
                  <td className="p-1 border-b border-border/50">Yes</td>
                </tr>
                <tr className="hover:bg-accent/50">
                  <td className="p-1 border-b border-border/50">Requires Refresh</td>
                  <td className="p-1 border-b border-border/50">No</td>
                  <td className="p-1 border-b border-border/50">Yes</td>
                </tr>
                <tr className="hover:bg-accent/50">
                  <td className="p-1 border-b border-border/50">Reads Stored Result</td>
                  <td className="p-1 border-b border-border/50">No</td>
                  <td className="p-1 border-b border-border/50">Yes</td>
                </tr>
                <tr className="hover:bg-accent/50">
                  <td className="p-1 border-b border-border/50">Storage Cost</td>
                  <td className="p-1 border-b border-border/50">None</td>
                  <td className="p-1 border-b border-border/50">Proportional to Result Size</td>
                </tr>
                <tr className="hover:bg-accent/50">
                  <td className="p-1 border-b border-border/50">Query Performance</td>
                  <td className="p-1 border-b border-border/50">Re-executes Each Time</td>
                  <td className="p-1 border-b border-border/50">Reads Pre-computed Result</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
