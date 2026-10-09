import { Button } from '../Button';
import { Card, CardHeader, CardTitle, CardContent } from '../Card';
import { Separator } from '../Separator';

interface TablePreviewProps {
  tableName: string;
  columns: string[];
  rows: unknown[][];
  onClose: () => void;
}

export function TablePreview({ tableName, columns, rows, onClose }: TablePreviewProps) {
  return (
    <Card className="mt-2 animate-in fade-in slide-in-from-top-2">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono">{tableName}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </Button>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-3 pt-2">
        <div className="overflow-auto max-h-64">
          <table className="w-full text-xs">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col} className="text-left p-1 font-medium text-muted-foreground border-b border-border">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-accent/50">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="p-1 font-mono border-b border-border/50">
                      {cell === null ? (
                        <span className="text-muted-foreground italic">NULL</span>
                      ) : (
                        String(cell)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {rows.length} row{rows.length !== 1 ? 's' : ''} shown
        </div>
      </CardContent>
    </Card>
  );
}