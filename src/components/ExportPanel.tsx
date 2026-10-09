import { useState } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';

export function ExportPanel() {
  const { viewManager, mvManager, history, lastResult, schema } = useStore(
    useShallow(state => ({
      viewManager: state.viewManager,
      mvManager: state.mvManager,
      history: state.history,
      lastResult: state.lastResult,
      schema: state.schema,
    }))
  );

  const [copied, setCopied] = useState(false);

  // Helper to trigger file download
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export last query result to CSV
  const exportLastResultCSV = () => {
    if (!lastResult || !lastResult.columns || lastResult.columns.length === 0) return;
    const header = lastResult.columns.join(',');
    const rows = lastResult.rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...rows].join('\n');
    downloadFile(csv, `viewlab_result_${Date.now()}.csv`, 'text/csv');
  };

  // Export SQL history to CSV
  const exportHistoryCSV = () => {
    if (history.length === 0) return;
    const header = 'ID,Timestamp,Status,ExecutionTimeMs,RowsAffected,SQL';
    const rows = history.map(h => [
      h.id,
      new Date(h.timestamp).toISOString(),
      h.status,
      h.executionTime ?? 0,
      h.rowsAffected ?? 0,
      `"${(h.sql || '').replace(/"/g, '""')}"`
    ].join(','));
    const csv = [header, ...rows].join('\n');
    downloadFile(csv, `viewlab_history_${Date.now()}.csv`, 'text/csv');
  };

  // Export complete JSON state report
  const exportFullReportJSON = () => {
    const report = {
      timestamp: new Date().toISOString(),
      views: viewManager.serialize(),
      materializedViews: mvManager.serialize(),
      tables: schema?.tables.map(t => ({ name: t.name, rowCount: t.rowCount })) || [],
      history: history.slice(0, 50),
    };
    downloadFile(JSON.stringify(report, null, 2), `viewlab_report_${Date.now()}.json`, 'application/json');
  };

  // Copy Markdown summary report to clipboard
  const copyMarkdownReport = () => {
    const views = viewManager.serialize();
    const mvs = mvManager.serialize();

    let md = `# ViewLab Database Simulation Report\n`;
    md += `*Generated at: ${new Date().toLocaleString()}*\n\n`;
    md += `## Base Tables (${schema?.tables.length || 0})\n`;
    schema?.tables.forEach(t => {
      md += `- **${t.name}**: ${t.rowCount} rows (${t.columns.map(c => c.name).join(', ')})\n`;
    });

    md += `\n## Views (${views.length})\n`;
    views.forEach(v => {
      md += `### \`${v.name}\` (Virtual View)\n`;
      md += `\`\`\`sql\n${v.definition}\n\`\`\`\n`;
      md += `- Dependencies: ${v.dependencies.join(', ')}\n\n`;
    });

    md += `## Materialized Views (${mvs.length})\n`;
    mvs.forEach(mv => {
      md += `### \`${mv.name}\` (Status: ${mv.status})\n`;
      md += `\`\`\`sql\n${mv.definition}\n\`\`\`\n`;
      md += `- Status: **${mv.status}**\n`;
      md += `- Last Refreshed: ${mv.lastRefreshedAt ? new Date(mv.lastRefreshedAt).toLocaleString() : 'Never'}\n`;
      md += `- Dependencies: ${mv.dependencies.join(', ')}\n\n`;
    });

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 flex-1 overflow-y-auto space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Export & Reports</h2>
        <p className="text-muted-foreground text-sm">Download query results, schema states, execution logs, or educational markdown reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="neo-surface">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span>📊</span> Query Results (CSV)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Download the result set of the last executed query as a CSV spreadsheet.
            </p>
            <Button
              size="sm"
              onClick={exportLastResultCSV}
              disabled={!lastResult || !lastResult.columns || lastResult.columns.length === 0}
            >
              Export Last Result CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="neo-surface">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span>📜</span> SQL Execution Logs (CSV)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Download complete execution history with timestamps, latency, and query status.
            </p>
            <Button size="sm" onClick={exportHistoryCSV} disabled={history.length === 0}>
              Export History CSV ({history.length} records)
            </Button>
          </CardContent>
        </Card>

        <Card className="neo-surface">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span>📦</span> Full Database Snapshot (JSON)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Export full state: view definitions, MV stale statuses, table schemas, and history.
            </p>
            <Button size="sm" variant="secondary" onClick={exportFullReportJSON}>
              Export Snapshot JSON
            </Button>
          </CardContent>
        </Card>

        <Card className="neo-surface">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span>📝</span> Educational Markdown Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Copy a formatted Markdown report summarizing current Views, MVs, and dependency statuses.
            </p>
            <Button size="sm" variant="secondary" onClick={copyMarkdownReport}>
              {copied ? 'Copied to Clipboard! ✓' : 'Copy Markdown Report'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
