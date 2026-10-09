import { Button } from './Button';

interface ResultGridProps {
  columns: string[];
  rows: unknown[][];
}

export function ResultGrid({ columns, rows }: ResultGridProps) {
  const copyToClipboard = () => {
    const header = columns.join('\t');
    const data = rows.map((row) => row.map((cell) => (cell === null ? 'NULL' : String(cell))).join('\t')).join('\n');
    navigator.clipboard.writeText(`${header}\n${data}`);
  };

  if (columns.length === 0 && rows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No results
      </div>
    );
  }

  return (
    <div className="overflow-auto border border-border rounded-lg max-h-96">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
        <span className="text-xs text-muted-foreground">{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
        <Button variant="ghost" size="sm" onClick={copyToClipboard}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy
        </Button>
      </div>
      <table className="result-grid">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="font-mono text-sm">
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
  );
}