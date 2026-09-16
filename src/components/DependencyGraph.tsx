import { useMemo, useEffect, useState } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  NodeProps,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  Handle,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { DependencyGraph } from '../types';

interface DependencyGraphViewProps {
  graph: DependencyGraph;
}

function TableNode({ data }: NodeProps<{ label: string; isHighlighted?: boolean; isDimmed?: boolean }>) {
  return (
    <div className={`px-4 py-3 bg-blue-500/10 border-2 rounded-xl text-blue-600 dark:text-blue-400 text-xs font-bold shadow-md transition-all ${
      data.isHighlighted
        ? 'border-blue-500 ring-4 ring-blue-500/20 scale-105 bg-blue-500/20'
        : data.isDimmed
        ? 'border-blue-500/20 opacity-30'
        : 'border-blue-500/40 hover:border-blue-500'
    }`}>
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <span>{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-blue-500 border-2 border-background" />
    </div>
  );
}

function ViewNode({ data }: NodeProps<{ label: string; isHighlighted?: boolean; isDimmed?: boolean }>) {
  return (
    <div className={`px-4 py-3 bg-purple-500/10 border-2 rounded-xl text-purple-600 dark:text-purple-400 text-xs font-bold shadow-md transition-all ${
      data.isHighlighted
        ? 'border-purple-500 ring-4 ring-purple-500/20 scale-105 bg-purple-500/20'
        : data.isDimmed
        ? 'border-purple-500/20 opacity-30'
        : 'border-purple-500/40 hover:border-purple-500'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-purple-500 border-2 border-background" />
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>{data.label}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-500 font-mono">
          LIVE
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-purple-500 border-2 border-background" />
    </div>
  );
}

function MaterializedViewNode({ data }: NodeProps<{ label: string; status?: 'FRESH' | 'STALE'; isHighlighted?: boolean; isDimmed?: boolean }>) {
  const status = data.status || 'FRESH';
  const isFresh = status === 'FRESH';
  return (
    <div
      className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border-2 shadow-md transition-all ${
        isFresh
          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
          : 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400 animate-pulse'
      } ${
        data.isHighlighted
          ? isFresh ? 'ring-4 ring-emerald-500/20 scale-105' : 'ring-4 ring-amber-500/20 scale-105'
          : data.isDimmed
          ? 'opacity-30'
          : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className={`w-3 h-3 border-2 border-background ${isFresh ? '!bg-emerald-500' : '!bg-amber-500'}`} />
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <ellipse cx="12" cy="6" rx="6" ry="3" />
        <path d="M6 6v12" />
        <path d="M18 6v12" />
        <ellipse cx="12" cy="18" rx="6" ry="3" />
      </svg>
      <span>{data.label}</span>
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${
          isFresh
            ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'border-amber-500/40 bg-amber-500/30 text-amber-600 dark:text-amber-400'
        }`}
      >
        {status}
      </span>
      <Handle type="source" position={Position.Bottom} className={`w-3 h-3 border-2 border-background ${isFresh ? '!bg-emerald-500' : '!bg-amber-500'}`} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  table: TableNode,
  view: ViewNode,
  'materialized-view': MaterializedViewNode,
};

export function DependencyGraphView({ graph }: DependencyGraphViewProps) {
  const { setUI, selectedGraphNode } = useStore(
    useShallow(state => ({
      setUI: state.setUI,
      selectedGraphNode: state.ui.selectedGraphNode,
    }))
  );

  const [activeSelected, setActiveSelected] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const effectiveSelected = activeSelected || selectedGraphNode;

  const onNodeClick = (_: any, node: any) => {
    setActiveSelected(node.id);
    setUI({ selectedGraphNode: node.id });
  };

  const handleOpenSqlLab = () => {
    if (!effectiveSelected) return;
    setUI({ activePage: 'sql-lab', selectedView: effectiveSelected });
  };

  const handleExplainAI = () => {
    if (!effectiveSelected) return;
    const event = new CustomEvent('toggle-ai-prompt', {
      detail: `Explain the dependencies, purpose, and structure of ${effectiveSelected}`,
    });
    document.dispatchEvent(event);
  };

  // Compute topological levels & positions for clean DAG layout
  const graphStr = JSON.stringify(graph);
  const layoutedNodes = useMemo(() => {
    const nodeLevelMap = new Map<string, number>();

    // 1. Assign Level 0 to base tables
    for (const node of graph.nodes) {
      if (node.type === 'table') {
        nodeLevelMap.set(node.id.toLowerCase(), 0);
      }
    }

    // 2. Iteratively compute topological level for views and MVs based on incoming edges
    let changed = true;
    let passes = 0;
    while (changed && passes < 10) {
      changed = false;
      passes++;
      for (const edge of graph.edges) {
        const srcLevel = nodeLevelMap.get(edge.source.toLowerCase()) ?? 0;
        const targetLower = edge.target.toLowerCase();
        const currentTargetLevel = nodeLevelMap.get(targetLower) ?? 0;
        const requiredLevel = srcLevel + 1;

        if (requiredLevel > currentTargetLevel) {
          nodeLevelMap.set(targetLower, requiredLevel);
          changed = true;
        }
      }
    }

    // Group nodes by calculated level
    const levelGroups = new Map<number, typeof graph.nodes>();
    for (const node of graph.nodes) {
      const lvl = nodeLevelMap.get(node.id.toLowerCase()) ?? (node.type === 'view' ? 1 : node.type === 'materialized-view' ? 2 : 0);
      if (!levelGroups.has(lvl)) {
        levelGroups.set(lvl, []);
      }
      levelGroups.get(lvl)!.push(node);
    }

    const resultNodes: any[] = [];
    const LEVEL_HEIGHT = 140;
    const NODE_WIDTH = 240;

    levelGroups.forEach((nodesInLevel, lvl) => {
      const count = nodesInLevel.length;
      nodesInLevel.forEach((node, idx) => {
        const xOffset = (idx - (count - 1) / 2) * NODE_WIDTH + 300;
        const yOffset = lvl * LEVEL_HEIGHT + 40;

        resultNodes.push({
          id: node.id,
          type: node.type,
          position: { x: xOffset, y: yOffset },
          data: {
            label: node.name,
            status: node.status,
          },
        });
      });
    });

    return resultNodes;
  }, [graphStr]);

  // Compute connected nodes for highlighting (upstream dependencies & downstream dependents)
  const focusTarget = hoveredNode || effectiveSelected;

  const connectedNodes = useMemo(() => {
    if (!focusTarget) return new Set<string>();

    const connected = new Set<string>([focusTarget.toLowerCase()]);

    // Upstream (traverse source edges backwards)
    const queueUp = [focusTarget.toLowerCase()];
    while (queueUp.length > 0) {
      const curr = queueUp.shift()!;
      for (const edge of graph.edges) {
        if (edge.target.toLowerCase() === curr && !connected.has(edge.source.toLowerCase())) {
          connected.add(edge.source.toLowerCase());
          queueUp.push(edge.source.toLowerCase());
        }
      }
    }

    // Downstream (traverse target edges forwards)
    const queueDown = [focusTarget.toLowerCase()];
    while (queueDown.length > 0) {
      const curr = queueDown.shift()!;
      for (const edge of graph.edges) {
        if (edge.source.toLowerCase() === curr && !connected.has(edge.target.toLowerCase())) {
          connected.add(edge.target.toLowerCase());
          queueDown.push(edge.target.toLowerCase());
        }
      }
    }

    return connected;
  }, [focusTarget, graphStr]);

  // Map nodes with highlight / dim state
  const styledNodes = useMemo(() => {
    return layoutedNodes.map((n) => {
      const lower = n.id.toLowerCase();
      const isFocused = focusTarget ? lower === focusTarget.toLowerCase() : false;
      const isConnected = focusTarget ? connectedNodes.has(lower) : false;
      const isDimmed = focusTarget ? !isConnected : false;

      return {
        ...n,
        data: {
          ...n.data,
          isHighlighted: isFocused || isConnected,
          isDimmed,
        },
      };
    });
  }, [layoutedNodes, focusTarget, connectedNodes]);

  // Map edges with arrowheads and highlight styling
  const layoutedEdges = useMemo(() => {
    return graph.edges.map((e) => {
      const srcLower = e.source.toLowerCase();
      const tgtLower = e.target.toLowerCase();
      const isEdgeHighlighted = focusTarget ? connectedNodes.has(srcLower) && connectedNodes.has(tgtLower) : false;

      // Find target node status for STALE edge styling
      const tgtNode = graph.nodes.find(n => n.id.toLowerCase() === tgtLower);
      const isStaleTarget = tgtNode?.type === 'materialized-view' && tgtNode.status === 'STALE';

      const strokeColor = isStaleTarget
        ? '#f59e0b'
        : isEdgeHighlighted
        ? 'hsl(var(--primary))'
        : 'hsl(var(--border))';

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: strokeColor,
          strokeWidth: isEdgeHighlighted || isStaleTarget ? 2.5 : 1.5,
          opacity: focusTarget && !isEdgeHighlighted ? 0.2 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
          color: strokeColor,
        },
      };
    });
  }, [graphStr, focusTarget, connectedNodes, graph.nodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(styledNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  useEffect(() => {
    setNodes(styledNodes);
  }, [styledNodes, setNodes]);

  useEffect(() => {
    setEdges(layoutedEdges);
  }, [layoutedEdges, setEdges]);

  return (
    <div className="flex-1 w-full relative h-full bg-background/50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={(_, node) => setHoveredNode(node.id)}
        onNodeMouseLeave={() => setHoveredNode(null)}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(var(--border))" gap={18} size={1} />
        <Controls className="!bg-card !border-border !text-foreground !rounded-xl !shadow-md" />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'table') return '#3b82f6';
            if (n.type === 'view') return '#a855f7';
            return '#10b981';
          }}
          className="!bg-card/80 !border-border/60 !rounded-xl"
        />
      </ReactFlow>

      {/* Floating Action Modal on Node Selection */}
      {effectiveSelected && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-md px-5 py-3 rounded-2xl flex items-center gap-4 shadow-xl border border-primary/30 z-20">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <div>
              <h4 className="text-xs font-bold font-mono text-foreground">{effectiveSelected}</h4>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Selected Node</p>
            </div>
          </div>
          <div className="h-6 w-px bg-border/60" />
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenSqlLab}
              className="px-3 py-1.5 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:bg-primary/90 transition-all shadow-xs"
            >
              ⌘ Query in SQL Lab
            </button>
            <button
              onClick={handleExplainAI}
              className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 font-bold text-xs rounded-lg hover:bg-primary/20 transition-all"
            >
              Ask AI Assistant
            </button>
          </div>
          <button
            onClick={() => {
              setActiveSelected(null);
              setUI({ selectedGraphNode: null });
            }}
            className="text-muted-foreground hover:text-foreground text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}