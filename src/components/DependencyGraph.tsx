import { useMemo, useEffect, useState } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  NodeProps,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { DependencyGraph } from '../types';

interface DependencyGraphViewProps {
  graph: DependencyGraph;
}

function TableNode({ data }: NodeProps<{ label: string }>) {
  return (
    <div className="px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium">
      <div className="flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
        {data.label}
      </div>
    </div>
  );
}

function ViewNode({ data }: NodeProps<{ label: string }>) {
  return (
    <div className="px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 text-sm font-medium">
      <div className="flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        {data.label}
      </div>
    </div>
  );
}

function MaterializedViewNode({ data }: NodeProps<{ label: string; status?: 'FRESH' | 'STALE' }>) {
  const status = data.status || 'FRESH';
  return (
    <div className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${status === 'FRESH' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-orange-500/10 border border-orange-500/30 text-orange-400'}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="6" rx="6" ry="3" />
        <path d="M6 6v12" />
        <path d="M18 6v12" />
        <ellipse cx="12" cy="18" rx="6" ry="3" />
      </svg>
      <span>{data.label}</span>
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${status === 'FRESH' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-orange-500/30 bg-orange-500/10 text-orange-400'}`}>
        {status}
      </span>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  table: TableNode,
  view: ViewNode,
  'materialized-view': MaterializedViewNode,
};

export function DependencyGraphView({ graph }: DependencyGraphViewProps) {

  const { setUI } = useStore(useShallow(state => ({
    setUI: state.setUI,
     
     
  })));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const onNodeClick = (_: any, node: any) => {
    setSelectedNode(node.id);
  };
  
  const handleOpenSqlLab = () => {
    if (!selectedNode) return;
    setUI({ activePage: 'sql-lab', selectedView: selectedNode });
  };
  
  const handleExplainAI = () => {
    if (!selectedNode) return;
    const event = new CustomEvent('toggle-ai-prompt', { detail: `Explain the dependencies and purpose of ${selectedNode}` });
    document.dispatchEvent(event);
  };

  // Simple layered layout: tables on the left, dependents staggered right.
  const graphStr = JSON.stringify(graph);
  const layoutedNodes = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const xByType = { table: 0, view: 260, 'materialized-view': 520 };
    const yCounters: Record<string, number> = { table: 0, view: 0, 'materialized-view': 0 };

    for (const node of graph.nodes) {
      if (node.position) {
        positions.set(node.id, node.position);
      } else {
        const type = node.type;
        positions.set(node.id, { x: xByType[type], y: yCounters[type] * 80 });
        yCounters[type] += 1;
      }
    }

    return graph.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: positions.get(n.id) ?? { x: 0, y: 0 },
      data: { label: n.name, status: n.status },
    }));
  }, [graphStr]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const layoutedEdges = useMemo(
      () =>
        graph.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1.5 },
        })),
      [graphStr]
    );
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  useEffect(() => {
    setNodes(layoutedNodes);
  }, [layoutedNodes, setNodes]);

  useEffect(() => {
    setEdges(layoutedEdges);
  }, [layoutedEdges, setEdges]);

  return (
    <div className="flex-1 w-full relative h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(var(--border))" gap={16} />
        <Controls />
        <MiniMap />
      
      </ReactFlow>
      {selectedNode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 neo-surface px-6 py-4 rounded-xl flex items-center gap-6 shadow-xl border border-primary/20 z-10">
          <div>
            <h4 className="text-sm font-bold text-foreground">{selectedNode}</h4>
            <p className="text-xs text-muted-foreground">Selected Node</p>
          </div>
          <div className="h-8 w-px bg-border/50"></div>
          <div className="flex gap-2">
            <button onClick={handleOpenSqlLab} className="neo-button px-3 py-1.5 text-xs">Open in SQL Lab</button>
            <button onClick={handleExplainAI} className="neo-button px-3 py-1.5 text-xs text-primary border-primary/20">Ask AI</button>
          </div>
          <button onClick={() => setSelectedNode(null)} className="ml-2 text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}
    </div>

  );
}