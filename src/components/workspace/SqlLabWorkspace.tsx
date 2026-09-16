import React, { useState, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';
import { WorkspaceContextBar } from './WorkspaceContextBar';
import CodeMirror from '@uiw/react-codemirror';
import { basicSetup } from 'codemirror';
import { ResultGrid } from '../ResultGrid';
import { Badge } from '../Badge';
import { Button } from '../Button';

const EXAMPLES = [
  { label: '1. Simple SELECT', sql: `SELECT * FROM ARTWORK;` },
  { label: '2. Create Virtual View', sql: `CREATE VIEW expensive_artworks AS\nSELECT * FROM ARTWORK WHERE price > 100000;` },
  { label: '3. Create Materialized View', sql: `CREATE MATERIALIZED VIEW expensive_artworks_mv AS\nSELECT * FROM ARTWORK WHERE price > 100000;` },
  { label: '4. Update Source Data (Cause Staleness)', sql: `UPDATE ARTWORK SET price = 150000 WHERE artwork_id = 3;` },
  { label: '5. Query Virtual View', sql: `SELECT * FROM expensive_artworks;` },
  { label: '6. Query Materialized View', sql: `SELECT * FROM expensive_artworks_mv;` },
  { label: '7. Refresh Materialized View', sql: `REFRESH MATERIALIZED VIEW expensive_artworks_mv;` },
];

const INITIAL_SQL = `CREATE VIEW expensive_artworks AS SELECT * FROM ARTWORK WHERE price > 100000;`;

export const SqlLabWorkspace: React.FC = () => {
  const {
    runQuery,
    lastResult,
    running,
    resetDatabase,
    runSignatureDemo,
    schema,
    duplicateViewConflict,
    resolveDuplicateViewConflict,
  } = useStore(useShallow(state => ({
    runQuery: state.runQuery,
    lastResult: state.lastResult,
    running: state.running,
    resetDatabase: state.resetDatabase,
    runSignatureDemo: state.runSignatureDemo,
    schema: state.schema,
    duplicateViewConflict: state.duplicateViewConflict,
    resolveDuplicateViewConflict: state.resolveDuplicateViewConflict,
  })));

  const [sql, setSql] = useState(INITIAL_SQL);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [executionPhase, setExecutionPhase] = useState<string | null>(null);
  const editorRef = useRef<any>(null);

  // Fast visual animation on execution
  const handleRun = async () => {
    if (!sql.trim() || running) return;
    
    // Quick 4-stage visual animation sequence (~400ms total)
    setExecutionPhase('Parsing SQL...');
    await new Promise(r => setTimeout(r, 100));
    setExecutionPhase('Validating Schema...');
    await new Promise(r => setTimeout(r, 100));
    setExecutionPhase('Executing Query...');
    await new Promise(r => setTimeout(r, 100));
    
    await runQuery(sql);
    setExecutionPhase('Updating Database State...');
    await new Promise(r => setTimeout(r, 100));
    setExecutionPhase(null);
  };

  const handleClear = () => {
    setSql('');
  };

  const handleFormat = () => {
    if (!sql) return;
    // Simple SQL formatter for readability
    const formatted = sql
      .replace(/\s+/g, ' ')
      .replace(/SELECT/gi, 'SELECT')
      .replace(/FROM/gi, '\nFROM')
      .replace(/WHERE/gi, '\nWHERE')
      .replace(/JOIN/gi, '\nJOIN')
      .replace(/GROUP BY/gi, '\nGROUP BY')
      .replace(/ORDER BY/gi, '\nORDER BY')
      .replace(/CREATE VIEW/gi, 'CREATE VIEW')
      .replace(/CREATE MATERIALIZED VIEW/gi, 'CREATE MATERIALIZED VIEW')
      .trim();
    setSql(formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  };

  const detectedOperation = React.useMemo(() => {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith('CREATE MATERIALIZED VIEW') || trimmed.startsWith('CREATE MV')) return 'CREATE MATERIALIZED VIEW';
    if (trimmed.startsWith('CREATE VIEW')) return 'CREATE VIEW';
    if (trimmed.startsWith('REFRESH')) return 'REFRESH MV';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    if (trimmed.startsWith('DROP')) return 'DROP';
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    return 'DML/SQL';
  }, [sql]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden">
      <WorkspaceContextBar />

      {/* Main Workspace Body */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Left/Center Column: Toolbar + Editor + Results */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-border/40">
          
          {/* Top SQL Toolbar */}
          <div className="p-3 bg-card border-b border-border/50 flex flex-wrap items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <span className="text-primary font-mono font-black">⌘</span> SQL Lab
              </span>

              {/* Example Dropdown */}
              <select
                onChange={(e) => e.target.value && setSql(e.target.value)}
                defaultValue=""
                className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground hover:border-primary/40 focus:outline-none transition-all cursor-pointer font-medium"
              >
                <option value="" disabled>Load Example Query...</option>
                {EXAMPLES.map((ex) => (
                  <option key={ex.label} value={ex.sql}>
                    {ex.label}
                  </option>
                ))}
              </select>

              <button
                onClick={handleFormat}
                title="Format SQL text"
                className="px-2.5 py-1.5 bg-muted/60 hover:bg-muted text-foreground border border-border/50 rounded-lg text-xs font-semibold transition-all"
              >
                Format
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => runSignatureDemo()}
                disabled={running}
                className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-lg text-xs font-semibold transition-all"
              >
                ⚡ 7-Step Demo
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                disabled={running}
                className="px-2.5 py-1.5 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 rounded-lg text-xs font-semibold transition-all"
              >
                Reset DB
              </button>
              <button
                onClick={handleClear}
                disabled={running}
                className="px-2.5 py-1.5 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 rounded-lg text-xs font-semibold transition-all"
              >
                Clear
              </button>
              <Button
                size="sm"
                onClick={handleRun}
                disabled={running || !!executionPhase || !sql.trim()}
                className="px-4 py-1.5 font-bold shadow-sm flex items-center gap-1.5"
              >
                {executionPhase ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                    <span>Executing...</span>
                  </span>
                ) : (
                  <>
                    <span>Run</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Operation Status Sub-bar */}
          <div className="px-4 py-2 bg-muted/30 border-b border-border/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Operation Detected:</span>
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono font-bold">
                {detectedOperation}
              </span>
            </div>
            {executionPhase ? (
              <div className="flex items-center gap-2 text-primary font-mono animate-pulse">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>{executionPhase}</span>
              </div>
            ) : (
              <span className="text-muted-foreground font-mono text-[11px]">
                Press ⌘/Ctrl + Enter to execute
              </span>
            )}
          </div>

          {/* CodeMirror SQL Editor */}
          <div className="flex-1 relative min-h-[220px]" onKeyDown={handleKeyDown}>
            <CodeMirror
              ref={editorRef}
              value={sql}
              onChange={setSql}
              extensions={[basicSetup]}
              height="100%"
              width="100%"
              className="cm-editor text-sm font-mono"
              placeholder="Write SQL query here..."
              basicSetup={{
                lineNumbers: true,
                highlightActiveLine: true,
                tabSize: 2,
              }}
            />
          </div>

          {/* Bottom Results Panel */}
          <div className="border-t border-border/60 flex flex-col h-[320px] bg-card">
            <div className="px-4 py-2 bg-muted/40 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <span>📊</span> Results
                </span>
                {lastResult && (
                  <>
                    <Badge variant={lastResult.error ? 'error' : 'live'}>
                      {lastResult.operation || 'QUERY'}
                    </Badge>
                    {lastResult.mvStatus && (
                      <Badge variant={lastResult.mvStatus === 'FRESH' ? 'fresh' : 'stale'}>
                        {lastResult.mvStatus}
                      </Badge>
                    )}
                  </>
                )}
              </div>

              {lastResult && !lastResult.error && (
                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                  <span>Latency: <strong className="text-foreground">{lastResult.executionTime.toFixed(1)} ms</strong></span>
                  <span>Rows: <strong className="text-foreground">{lastResult.rowCount}</strong></span>
                </div>
              )}
            </div>

            {/* Results Grid or Error */}
            <div className="p-3 flex-1 overflow-auto bg-background/50">
              {lastResult ? (
                lastResult.error ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 font-mono text-xs space-y-2">
                    <div className="font-bold flex items-center gap-2">
                      <span>⚠️</span> Execution Failed
                    </div>
                    <div>{lastResult.error}</div>
                  </div>
                ) : (
                  <ResultGrid columns={lastResult.columns} rows={lastResult.rows} />
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-2">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                  <p className="text-xs font-medium">Write or select a SQL query and click Run to see the dataset output.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Context & Schema Side Panel */}
        <div className="w-full lg:w-80 p-4 bg-card/50 border-t lg:border-t-0 border-border/40 overflow-y-auto space-y-5">
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>🗄</span> Database Schema
            </h3>
            <div className="space-y-2">
              {schema?.tables.map((tbl) => (
                <div key={tbl.name} className="p-2.5 bg-card border border-border/50 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="font-mono text-primary">{tbl.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{tbl.rowCount} rows</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">
                    {tbl.columns.map(c => c.name).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-border/40 space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span>🧠</span> Query Syntax Guide
            </h3>
            <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg space-y-1">
                <span className="font-bold text-purple-600 dark:text-purple-400">Virtual View Syntax:</span>
                <code className="block text-[11px] font-mono text-foreground">CREATE VIEW v_name AS SELECT ...;</code>
              </div>
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-1">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Materialized View Syntax:</span>
                <code className="block text-[11px] font-mono text-foreground">CREATE MATERIALIZED VIEW mv_name AS SELECT ...;</code>
              </div>
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1">
                <span className="font-bold text-amber-600 dark:text-amber-400">Refresh MV Syntax:</span>
                <code className="block text-[11px] font-mono text-foreground">REFRESH MATERIALIZED VIEW mv_name;</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl border border-border bg-card text-card-foreground">
            <h3 className="text-lg font-bold">Reset Database?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This action will reset the database to initial seed data, dropping all custom Views and Materialized Views.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowResetConfirm(false);
                  await resetDatabase();
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
              >
                Reset Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate View Conflict Modal */}
      {duplicateViewConflict && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl border border-primary/20 bg-card text-card-foreground">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-base">
              <span>⚠️</span>
              <h3>View Already Exists</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The object <strong className="text-foreground">"{duplicateViewConflict.name}"</strong> already exists in the database schema.
            </p>
            <div className="p-3 bg-muted/40 rounded-lg text-xs font-mono text-foreground">
              {duplicateViewConflict.existingDefinition || 'Registered database object'}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => resolveDuplicateViewConflict('cancel')}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveDuplicateViewConflict('use')}
                className="px-3 py-1.5 rounded-lg border border-primary text-primary text-xs font-semibold hover:bg-primary/10"
              >
                Use Existing
              </button>
              <button
                onClick={() => resolveDuplicateViewConflict('recreate')}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
              >
                Drop & Recreate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
