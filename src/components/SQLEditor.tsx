import { useState, useRef, KeyboardEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';
import { Button } from './Button';
import { ResultGrid } from './ResultGrid';
import CodeMirror from '@uiw/react-codemirror';
import { basicSetup } from 'codemirror';
import { Badge } from './Badge';

const EXAMPLES = [
  {
    label: '1. Create Virtual View',
    sql: `CREATE VIEW expensive_artworks AS\nSELECT * FROM ARTWORK WHERE price > 100000;`,
  },
  {
    label: '2. Create Materialized View',
    sql: `CREATE MATERIALIZED VIEW expensive_artworks_mv AS\nSELECT * FROM ARTWORK WHERE price > 100000;`,
  },
  {
    label: '3. Update Base Table (Cause Staleness)',
    sql: `UPDATE ARTWORK SET price = 150000 WHERE artwork_id = 3;`,
  },
  {
    label: '4. Query Virtual View (Live Data)',
    sql: `SELECT * FROM expensive_artworks;`,
  },
  {
    label: '5. Query Materialized View (Stored Data)',
    sql: `SELECT * FROM expensive_artworks_mv;`,
  },
  {
    label: '6. Refresh Materialized View',
    sql: `REFRESH MATERIALIZED VIEW expensive_artworks_mv;`,
  },
];

const INITIAL_SQL = `CREATE VIEW expensive_artworks AS SELECT * FROM ARTWORK WHERE price > 100000;`;

export function SQLEditor() {
  const {
    runQuery,
    setUI,
    lastResult,
    running,
    resetDatabase,
    runSignatureDemo,
    setSimulationState,
    duplicateViewConflict,
    resolveDuplicateViewConflict,
  } = useStore(
    useShallow((state) => ({
      runQuery: state.runQuery,
      setUI: state.setUI,
      lastResult: state.lastResult,
      running: state.running,
      resetDatabase: state.resetDatabase,
      runSignatureDemo: state.runSignatureDemo,
      setSimulationState: state.setSimulationState,
      duplicateViewConflict: state.duplicateViewConflict,
      resolveDuplicateViewConflict: state.resolveDuplicateViewConflict,
    }))
  );

  const [sql, setSql] = useState(INITIAL_SQL);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const editorRef = useRef<any>(null);

  const handleRun = async () => {
    if (!sql.trim()) return;
    await runQuery(sql);
    setUI({ activePanel: 'result' });
  };

  const handleClear = () => {
    setSql('');
    setSimulationState({
      currentSQL: '',
      simulationSteps: [],
      simulationStepIndex: -1,
      isSimulationPlaying: false,
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  };

  const handleExampleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      setSql(val);
    }
  };

  const confirmReset = async () => {
    setShowResetConfirm(false);
    await resetDatabase();
  };

  return (
    <div className="flex flex-col h-full relative bg-background text-foreground">
      {/* Editor Header Bar */}
      <div className="flex flex-wrap items-center justify-between p-3 border-b border-border bg-muted/20 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">SQL Editor</span>
          <span className="text-[10px] text-muted-foreground font-mono">⌘/Ctrl+Enter to run</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Example Selector */}
          <select
            onChange={handleExampleSelect}
            defaultValue=""
            className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground hover:border-primary/50 transition-colors focus:outline-none"
          >
            <option value="" disabled>
              Load Example...
            </option>
            {EXAMPLES.map((ex) => (
              <option key={ex.label} value={ex.sql}>
                {ex.label}
              </option>
            ))}
          </select>

          {/* Signature Demo */}
          <Button variant="secondary" size="sm" onClick={() => runSignatureDemo()} disabled={running}>
            <span className="mr-1">⚡</span> Run Signature Demo
          </Button>

          {/* Reset Database */}
          <Button variant="secondary" size="sm" onClick={() => setShowResetConfirm(true)} disabled={running}>
            Reset Database
          </Button>

          {/* Clear */}
          <Button variant="secondary" size="sm" onClick={handleClear} disabled={running}>
            Clear
          </Button>

          {/* Run */}
          <Button size="sm" onClick={handleRun} disabled={running || !sql.trim()}>
            {running ? 'Running...' : 'Run'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-1">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 relative min-h-[160px]" onKeyDown={handleKeyDown}>
        <CodeMirror
          ref={editorRef}
          value={sql}
          onChange={setSql}
          extensions={[basicSetup]}
          height="100%"
          width="100%"
          className="cm-editor"
          placeholder="Write your SQL query here..."
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            tabSize: 2,
          }}
        />
      </div>

      {/* Result Footer Panel */}
      <div className="border-t border-border flex flex-col max-h-[320px] bg-muted/10">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Result Panel</span>
            {lastResult && lastResult.operation && (
              <Badge variant="live">{lastResult.operation}</Badge>
            )}
            {lastResult && lastResult.sourceType && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-semibold">
                Source: {lastResult.sourceType}
              </span>
            )}
            {lastResult && lastResult.mvStatus && (
              <Badge variant={lastResult.mvStatus === 'FRESH' ? 'fresh' : 'stale'}>
                {lastResult.mvStatus}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {lastResult && (
              <>
                <span>Rows: <strong className="text-foreground font-mono">{lastResult.rowCount}</strong></span>
                <span>Latency: <strong className="text-foreground font-mono">{lastResult.executionTime.toFixed(2)} ms</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Inline Grid / Error Output */}
        <div className="p-3 overflow-auto flex-1">
          {lastResult ? (
            lastResult.error ? (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-mono space-y-1">
                <div className="font-bold">⚠️ Error Executing Query</div>
                <div>{lastResult.error}</div>
              </div>
            ) : (
              <ResultGrid columns={lastResult.columns} rows={lastResult.rows} />
            )
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">Run a SQL query above to view results here.</p>
          )}
        </div>
      </div>

      {/* Modal 1: Reset Database Confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neo-surface p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl border border-primary/20 bg-background text-foreground">
            <h3 className="text-lg font-bold">Reset Database?</h3>
            <p className="text-sm text-muted-foreground">
              This action will permanently remove all user-created Views, Materialized Views, and custom table row modifications, restoring initial seed data.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={confirmReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Reset Database
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Duplicate View Conflict Handling */}
      {duplicateViewConflict && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neo-surface p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl border border-primary/20 bg-background text-foreground">
            <div className="flex items-center gap-2 text-orange-400 font-bold text-base">
              <span>⚠️</span>
              <h3>View Already Exists</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {duplicateViewConflict.type === 'MATERIALIZED_VIEW' ? 'Materialized view' : 'Virtual view'}{' '}
              <strong className="text-foreground">"{duplicateViewConflict.name}"</strong> is already registered in the database.
            </p>

            <div className="neo-surface-inset p-3 rounded-lg text-xs font-mono space-y-1">
              <div className="text-muted-foreground font-semibold">Existing Definition:</div>
              <div className="text-foreground">{duplicateViewConflict.existingDefinition || 'Registered in database'}</div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => resolveDuplicateViewConflict('cancel')}>
                Cancel
              </Button>
              <Button variant="secondary" size="sm" onClick={() => resolveDuplicateViewConflict('use')}>
                Use Existing View
              </Button>
              <Button size="sm" onClick={() => resolveDuplicateViewConflict('recreate')}>
                Drop & Recreate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}