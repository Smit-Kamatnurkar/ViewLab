import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';
import { WorkspaceContextBar } from './WorkspaceContextBar';

export const QueryXRayWorkspace: React.FC = () => {
  const { lastResult, viewManager, mvManager, setUI, selectedView } = useStore(useShallow(state => ({
    lastResult: state.lastResult,
    viewManager: state.viewManager,
    mvManager: state.mvManager,
    setUI: state.setUI,
    selectedView: state.selectedView,
  })));

  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // Determine query target type
  const targetName = selectedView || (lastResult ? lastResult.sourceType || 'Query' : null);
  const isView = targetName ? viewManager.hasView(targetName) : false;
  const isMv = targetName ? mvManager.hasView(targetName) : false;
  const mvObj = isMv && targetName ? mvManager.getView(targetName) : null;
  const viewObj = isView && targetName ? viewManager.getView(targetName) : null;

  const buildSteps = () => {
    if (isView && viewObj) {
      return [
        { label: 'SQL SELECT Input', desc: `Client requested query against Virtual View '${viewObj.name}'`, detail: `SQL: SELECT * FROM ${viewObj.name};` },
        { label: 'Object Resolution', desc: `DBMS resolves '${viewObj.name}' as a VIRTUAL VIEW`, detail: `Virtual views do not store physical rows. The engine fetches its definition from the system catalog.` },
        { label: 'Definition Expansion', desc: `Inject stored SQL definition`, detail: `Definition: ${viewObj.definition}` },
        { label: 'Base Table Execution', desc: `Execute query against base table(s): ${viewObj.dependencies.join(', ')}`, detail: `Query engine scans base tables directly to evaluate current data.` },
        { label: 'Result Delivery', desc: `Returns 100% current live dataset`, detail: `Latency: ${lastResult?.executionTime.toFixed(1) ?? '1.2'}ms | Status: LIVE ✓` },
      ];
    }

    if (isMv && mvObj) {
      return [
        { label: 'SQL SELECT Input', desc: `Client requested query against Materialized View '${mvObj.name}'`, detail: `SQL: SELECT * FROM ${mvObj.name};` },
        { label: 'Object Resolution', desc: `DBMS resolves '${mvObj.name}' as a MATERIALIZED VIEW`, detail: `Materialized views store precomputed rows in a dedicated physical table.` },
        { label: 'Physical Table Scan', desc: `Read directly from stored physical table on disk`, detail: `Bypasses definition re-evaluation for rapid read latency.` },
        { label: 'Staleness Check', desc: `Evaluate dependency freshness`, detail: `Status: ${mvObj.status} ${mvObj.status === 'FRESH' ? '🟢' : '🟠 (Base tables changed since last refresh)'}` },
        { label: 'Result Delivery', desc: `Returns precomputed snapshot dataset`, detail: `Rows: ${mvObj.result?.rowCount ?? 0} | Latency: ${lastResult?.executionTime.toFixed(1) ?? '0.8'}ms` },
      ];
    }

    if (lastResult) {
      return [
        { label: 'SQL Input', desc: `Operation: ${lastResult.operation || 'DML/Query'}`, detail: `Target: ${lastResult.objectName || 'Database Table'}` },
        { label: 'Parser & Optimizer', desc: `Validate syntax & build SQLite EXPLAIN plan`, detail: lastResult.plan?.join('\n') || 'Table scan' },
        { label: 'Engine Execution', desc: `Execute query against SQLite engine`, detail: `Latency: ${lastResult.executionTime.toFixed(1)}ms` },
        { label: 'Result Set', desc: `Returned ${lastResult.rowCount} rows`, detail: `Columns: ${lastResult.columns.join(', ')}` },
      ];
    }

    return null;
  };

  const steps = buildSteps();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden">
      <WorkspaceContextBar />

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Canvas */}
        <div className="flex-1 min-h-0 flex flex-col border-r border-border/40 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">QUERY X-RAY</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">Internal Execution Pipeline Inspector</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-0.5">
                Query Execution X-Ray
              </h1>
            </div>

            <button
              onClick={() => setUI({ activePage: 'sql-lab' })}
              className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-lg text-xs font-semibold transition-all shadow-xs"
            >
              ⌘ Open SQL Lab
            </button>
          </div>

          {!steps ? (
            <div className="p-12 text-center bg-card border border-dashed border-border/60 rounded-2xl space-y-3 max-w-md mx-auto">
              <span className="text-4xl">⌕</span>
              <h3 className="text-base font-bold text-foreground">No Query Inspected Yet</h3>
              <p className="text-xs text-muted-foreground">
                Run any query in SQL Lab or select a registered View in Overview to inspect its complete execution path.
              </p>
              <button
                onClick={() => setUI({ activePage: 'sql-lab' })}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all"
              >
                Run Query in SQL Lab
              </button>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto w-full">
              
              {/* Query Summary Card */}
              <div className="p-4 bg-card border border-border/60 rounded-xl flex items-center justify-between shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Target Object</span>
                  <div className="font-mono text-sm font-bold text-foreground flex items-center gap-2">
                    {targetName || 'DML Query'}
                    {isView && <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-500 font-mono">VIRTUAL VIEW</span>}
                    {isMv && <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono">MATERIALIZED VIEW</span>}
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Execution Latency</span>
                  <div className="font-mono text-sm font-bold text-emerald-500">
                    {lastResult?.executionTime.toFixed(1) ?? '1.2'} ms
                  </div>
                </div>
              </div>

              {/* Vertical Visual Pipeline */}
              <div className="space-y-3 relative pl-4 border-l-2 border-primary/30 ml-3">
                {steps.map((st, idx) => {
                  const isExpanded = expandedStep === idx;

                  return (
                    <div
                      key={idx}
                      onClick={() => setExpandedStep(isExpanded ? null : idx)}
                      className={`p-4 bg-card border rounded-xl transition-all cursor-pointer shadow-xs ${
                        isExpanded ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-border/60 hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-extrabold text-xs flex items-center justify-center font-mono">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-xs text-foreground uppercase tracking-wide">
                            {st.label}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {isExpanded ? '▲ Collapse' : '▼ Inspect'}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2 pl-9">
                        {st.desc}
                      </p>

                      {isExpanded && (
                        <div className="mt-3 pl-9 pt-3 border-t border-border/30 text-xs font-mono text-foreground space-y-1 bg-muted/40 p-2.5 rounded-lg">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase">Internal Detail:</div>
                          <div>{st.detail}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Insights Sidebar */}
        <div className="w-full lg:w-80 p-4 bg-card/50 border-t lg:border-t-0 border-border/40 overflow-y-auto space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span>🧠</span> Query X-Ray Insights
          </h3>

          <div className="p-4 bg-card border border-border/60 rounded-xl space-y-3 text-xs text-muted-foreground leading-relaxed shadow-xs">
            <h4 className="font-bold text-foreground">Why inspect query plans?</h4>
            <p>
              Virtual Views add query transformation overhead because their SELECT definition must be parsed and evaluated against base tables on every execution.
            </p>
            <p>
              Materialized Views trade storage space for instant read performance by serving queries directly from a precomputed physical table on disk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
