import { DependencyGraph, DependencyNode, MaterializedViewInfo, ViewInfo } from '../types';
import { extractTableNames } from '../sql/parser';

export class DependencyTracker {
  private graph: DependencyGraph = { nodes: [], edges: [] };
  private tableToViews = new Map<string, Set<string>>();
  private viewToViews = new Map<string, Set<string>>();
  public version = 0;

  extractDependencies(
    definition: string,
    _existingViews?: Map<string, ViewInfo>,
    _existingMVs?: Map<string, MaterializedViewInfo>
  ): string[] {
    // Extract direct table/view references from SQL
    return extractTableNames(definition);
  }

  registerView(name: string, type: 'table' | 'view' | 'materialized-view', dependencies: string[]): void {
    const node: DependencyNode = {
      id: name,
      name,
      type: type,
    };

    const existingIndex = this.graph.nodes.findIndex(n => n.id.toLowerCase() === name.toLowerCase());
    if (existingIndex >= 0) {
      this.graph.nodes[existingIndex] = node;
    } else {
      this.graph.nodes.push(node);
    }
    this.version++;

    for (const rawDep of dependencies) {
      // Normalize source node ID against existing graph nodes (case-insensitive)
      const existingDepNode = this.graph.nodes.find(n => n.id.toLowerCase() === rawDep.toLowerCase());
      const normalizedSource = existingDepNode ? existingDepNode.id : rawDep;

      this.addEdge(normalizedSource, name);

      if (!this.tableToViews.has(normalizedSource)) {
        this.tableToViews.set(normalizedSource, new Set());
      }
      this.tableToViews.get(normalizedSource)!.add(name);

      if (!this.viewToViews.has(normalizedSource)) {
        this.viewToViews.set(normalizedSource, new Set());
      }
      this.viewToViews.get(normalizedSource)!.add(name);
    }

    this.ensureTableNodes(dependencies);
  }

  private ensureTableNodes(dependencies: string[]): void {
    for (const dep of dependencies) {
      if (!this.graph.nodes.some(n => n.id.toLowerCase() === dep.toLowerCase())) {
        this.version++;
        this.graph.nodes.push({
          id: dep,
          name: dep,
          type: 'table',
        });
      }
    }
  }

  private addEdge(source: string, target: string): void {
    const edgeId = `${source}->${target}`;
    if (!this.graph.edges.some(e => e.id === edgeId || (e.source.toLowerCase() === source.toLowerCase() && e.target.toLowerCase() === target.toLowerCase()))) {
      this.version++;
      this.graph.edges.push({ id: edgeId, source, target });
    }
  }

  removeView(name: string): void {
    this.version++;
    const targetName = name.toLowerCase();
    this.graph.nodes = this.graph.nodes.filter(n => n.id.toLowerCase() !== targetName);
    this.graph.edges = this.graph.edges.filter(e => e.source.toLowerCase() !== targetName && e.target.toLowerCase() !== targetName);

    for (const [, views] of this.tableToViews.entries()) {
      views.delete(name);
    }
    for (const [, views] of this.viewToViews.entries()) {
      views.delete(name);
    }
  }

  markStale(tableName: string): void {
    const affectedViews = this.getDependentViews(tableName);
    for (const viewName of affectedViews) {
      const node = this.graph.nodes.find(n => n.id.toLowerCase() === viewName.toLowerCase());
      if (node && node.type === 'materialized-view' && node.status !== 'STALE') {
        node.status = 'STALE';
        this.version++;
      }
    }
  }

  getDependentViews(tableName: string): string[] {
    const targetName = tableName.toLowerCase();
    let direct = new Set<string>();

    for (const [key, valSet] of this.tableToViews.entries()) {
      if (key.toLowerCase() === targetName) {
        valSet.forEach(v => direct.add(v));
      }
    }

    const indirect = new Set<string>();
    for (const view of direct) {
      this.collectTransitiveDependents(view, indirect);
    }

    return Array.from(new Set([...direct, ...indirect]));
  }

  private collectTransitiveDependents(viewName: string, result: Set<string>): void {
    const targetName = viewName.toLowerCase();
    for (const [key, valSet] of this.viewToViews.entries()) {
      if (key.toLowerCase() === targetName) {
        for (const dep of valSet) {
          if (!result.has(dep)) {
            result.add(dep);
            this.collectTransitiveDependents(dep, result);
          }
        }
      }
    }
  }

  refreshView(name: string): void {
    const node = this.graph.nodes.find(n => n.id.toLowerCase() === name.toLowerCase());
    if (node && node.type === 'materialized-view') {
      node.status = 'FRESH';
      this.version++;
    }
  }

  setNodeStatus(name: string, status: 'FRESH' | 'STALE'): void {
    const node = this.graph.nodes.find(n => n.id.toLowerCase() === name.toLowerCase());
    if (node) {
      node.status = status;
      this.version++;
    }
  }

  getGraph(): DependencyGraph {
    return {
      nodes: [...this.graph.nodes.map(n => ({ ...n }))],
      edges: [...this.graph.edges.map(e => ({ ...e }))],
    };
  }

  getTableToViews(): Map<string, Set<string>> {
    const copy = new Map<string, Set<string>>();
    for (const [k, v] of this.tableToViews.entries()) {
      copy.set(k, new Set(v));
    }
    return copy;
  }

  getViewToViews(): Map<string, Set<string>> {
    const copy = new Map<string, Set<string>>();
    for (const [k, v] of this.viewToViews.entries()) {
      copy.set(k, new Set(v));
    }
    return copy;
  }

  clear(): void {
    this.graph = { nodes: [], edges: [] };
    this.version++;
    this.tableToViews.clear();
    this.viewToViews.clear();
  }

  loadGraph(graph: DependencyGraph): void {
    this.graph = graph;
    this.version++;
    this.tableToViews.clear();
    this.viewToViews.clear();

    for (const edge of graph.edges) {
      if (!this.tableToViews.has(edge.source)) {
        this.tableToViews.set(edge.source, new Set());
      }
      this.tableToViews.get(edge.source)!.add(edge.target);

      if (!this.viewToViews.has(edge.source)) {
        this.viewToViews.set(edge.source, new Set());
      }
      this.viewToViews.get(edge.source)!.add(edge.target);
    }
  }
}