import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';
import { WorkspaceContextBar } from './WorkspaceContextBar';
import { DependencyGraphView } from '../DependencyGraph';

export const DependenciesWorkspace: React.FC = () => {
  const { dependencyTracker, setUI, viewManager, mvManager, schema } = useStore(useShallow(state => ({
    dependencyTracker: state.dependencyTracker,
    setUI: state.setUI,
    viewManager: state.viewManager,
    mvManager: state.mvManager,
    schema: state.schema,
  })));

  const graph = dependencyTracker.getGraph();
  const selectedGraphNode = useStore(state => state.ui.selectedGraphNode);
  const activeNode = selectedGraphNode || (graph.nodes.length > 0 ? graph.nodes[0].name : null);

  const getInspectDetails = () => {
    if (!activeNode) return null;
    const viewObj = viewManager.getView(activeNode);
    const mvObj = mvManager.getView(activeNode);
    const tableObj = schema?.tables.find(t => t.name.toLowerCase() === activeNode.toLowerCase());

    if (tableObj) {
      return {
        name: tableObj.name,
        type: 'BASE TABLE',
        status: 'PRIMARY',
        definition: `CREATE TABLE ${tableObj.name} (...)`,
        rowCount: tableObj.rowCount,
        deps: [] as string[],
        dependents: dependencyTracker.getDependentViews(tableObj.name),
      };
    }

    if (viewObj) {
      return {
        name: viewObj.name,
        type: 'VIRTUAL VIEW',
        status: 'LIVE',
        definition: viewObj.definition,
        rowCount: 'Evaluates Dynamically',
        deps: viewObj.dependencies,
        dependents: dependencyTracker.getDependentViews(viewObj.name),
      };
    }

    if (mvObj) {
      return {
        name: mvObj.name,
        type: 'MATERIALIZED VIEW',
        status: mvObj.status,
        definition: mvObj.definition,
        rowCount: mvObj.result?.rowCount ?? 0,
        deps: mvObj.dependencies,
        dependents: dependencyTracker.getDependentViews(mvObj.name),
      };
    }

    return {
      name: activeNode,
      type: 'OBJECT',
      status: 'ACTIVE',
      definition: 'Registered schema object',
      rowCount: 'N/A',
      deps: [] as string[],
      dependents: [] as string[],
    };
  };

  const details = getInspectDetails();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden">
      <WorkspaceContextBar />

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Graph Canvas */}
        <div className="flex-1 min-h-0 flex flex-col border-r border-border/40 relative">
          <div className="p-3 bg-card border-b border-border/50 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <span className="text-primary font-mono font-black">◇</span> Dependency DAG Graph
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {graph.nodes.length} Nodes • {graph.edges.length} Edges
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setUI({ activePage: 'sql-lab' })}
                className="px-2.5 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-semibold hover:bg-primary/20 transition-all"
              >
                + Create View in SQL Lab
              </button>
            </div>
          </div>

          <div className="flex-1 relative bg-background/60">
            <DependencyGraphView graph={graph} />
          </div>
        </div>

        {/* Node Detail Drawer / Context Sidebar */}
        <div className="w-full lg:w-80 p-4 bg-card/50 border-t lg:border-t-0 border-border/40 overflow-y-auto space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span>🔍</span> Node Inspector
          </h3>

          {details ? (
            <div className="space-y-4">
              <div className="p-4 bg-card border border-border/60 rounded-xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-mono text-sm font-bold text-foreground">{details.name}</h4>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    details.status === 'FRESH' || details.status === 'LIVE'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : details.status === 'STALE'
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      : 'bg-primary/10 text-primary border border-primary/20'
                  }`}>
                    {details.status}
                  </span>
                </div>

                <div className="text-xs space-y-2 text-muted-foreground">
                  <div className="flex justify-between border-b border-border/20 py-1">
                    <span>Object Type:</span>
                    <strong className="text-foreground font-mono">{details.type}</strong>
                  </div>
                  <div className="flex justify-between border-b border-border/20 py-1">
                    <span>Row Count:</span>
                    <strong className="text-foreground font-mono">{details.rowCount}</strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Definition SQL:</span>
                  <code className="block p-2 bg-muted/40 rounded text-xs font-mono text-foreground break-all">
                    {details.definition}
                  </code>
                </div>

                {details.deps.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Upstream Dependencies:</span>
                    <div className="flex flex-wrap gap-1">
                      {details.deps.map(d => (
                        <span key={d} className="text-xs px-2 py-0.5 rounded bg-muted font-mono font-semibold text-foreground">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {details.dependents.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Downstream Dependents:</span>
                    <div className="flex flex-wrap gap-1">
                      {details.dependents.map(d => (
                        <span key={d} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-semibold">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setUI({ activePage: 'sql-lab', selectedView: details.name })}
                    className="flex-1 py-1.5 px-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 text-center transition-all"
                  >
                    Query in SQL Lab
                  </button>
                  {details.type === 'MATERIALIZED VIEW' && details.status === 'STALE' && (
                    <button
                      onClick={() => setUI({ activePage: 'compare' })}
                      className="py-1.5 px-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 text-center transition-all"
                    >
                      Refresh MV
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-card border border-dashed border-border/60 rounded-xl text-center space-y-2 text-muted-foreground">
              <span className="text-2xl">👆</span>
              <p className="text-xs font-medium">Click any node in the graph canvas to inspect its definition and dependency lineage.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
