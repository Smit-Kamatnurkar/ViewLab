import { useState, useRef, KeyboardEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';
import { Button } from './Button';

import { ResultGrid } from './ResultGrid';
import CodeMirror from '@uiw/react-codemirror';
import { basicSetup } from 'codemirror';

const PLACEHOLDER = `-- Try the signature demo:
-- CREATE VIEW expensive_artworks AS SELECT * FROM ARTWORK WHERE price > 100000;
-- CREATE MATERIALIZED VIEW expensive_artworks_mv AS SELECT * FROM ARTWORK WHERE price > 100000;
-- UPDATE ARTWORK SET price = 150000 WHERE artwork_id = 3;
-- SELECT * FROM expensive_artworks;     -- live, reflects the update
-- SELECT * FROM expensive_artworks_mv;  -- stored, STALE
-- REFRESH MATERIALIZED VIEW expensive_artworks_mv;`;

export function SQLEditor() {
  const { runQuery, setUI, lastResult, running } = useStore(useShallow(state => ({ runQuery: state.runQuery, setUI: state.setUI, lastResult: state.lastResult, running: state.running })));
  const [sql, setSql] = useState(PLACEHOLDER);
  const editorRef = useRef<any>(null);

  const handleRun = async () => {
    if (!sql.trim()) return;
    await runQuery(sql);
    setUI({ activePanel: 'result' });

    // Mirror inline result panel in the editor as well
  };

  const handleClear = () => {
    setSql('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  };

  const insertTemplate = (snippet: string) => {
    setSql((prev) => (prev.trim() ? `${prev.trim()}\n${snippet}` : snippet));
    editorRef.current?.focus?.();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">SQL Editor</span>
          <span className="text-[10px] text-muted-foreground/70 font-mono">⌘/Ctrl+Enter to run</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleClear} disabled={running}>
            Clear
          </Button>
          <Button size="sm" onClick={handleRun} disabled={running || !sql.trim()}>
            {running ? 'Running...' : 'Run'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-1">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="flex-1 relative" onKeyDown={handleKeyDown}>
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

      <div className="border-t border-border">
        <div className="flex items-center justify-between p-2 bg-muted/50">
          <span className="text-[11px] font-medium text-muted-foreground px-1">Inline Result</span>
          <div className="flex items-center gap-1 pr-1">
            <QuickAction label="+ View" onClick={() => insertTemplate(`CREATE VIEW expensive_artworks AS\nSELECT * FROM ARTWORK WHERE price > 100000;`)} />
            <QuickAction label="+ Materialized View" onClick={() => insertTemplate(`CREATE MATERIALIZED VIEW expensive_artworks_mv AS\nSELECT * FROM ARTWORK WHERE price > 100000;`)} />
            <QuickAction label="Update" onClick={() => insertTemplate(`UPDATE ARTWORK SET price = 150000 WHERE artwork_id = 3;`)} />
            <QuickAction label="Refresh" onClick={() => insertTemplate(`REFRESH MATERIALIZED VIEW expensive_artworks_mv;`)} />
          </div>
        </div>
        <div className="p-3 max-h-48 overflow-auto">
          {lastResult ? (
            lastResult.error ? (
              <div className="text-red-400 p-3 bg-red-500/10 rounded text-sm">{lastResult.error}</div>
            ) : (
              <ResultGrid columns={lastResult.columns} rows={lastResult.rows} />
            )
          ) : (
            <p className="text-xs text-muted-foreground">Run a query to see the result here.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      {label}
    </button>
  );
}