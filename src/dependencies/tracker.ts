import { DependencyGraph, DependencyNode, MaterializedViewInfo, ViewInfo } from '../types';
import { extractDependencies } from '../sql/parser';

export class DependencyTracker {
  private graph: DependencyGraph = { nodes: [], edges: [] };
  private tableToViews = new Map<string, Set<string>>();
  private viewToViews = new Map<string, Set<string>>();
  public version = 0;

  extractDependencies(
    definition: string,
    existingViews: Map<string, ViewInfo>,
    existingMVs: Map<string, MaterializedViewInfo>
  ): string[] {
    return extractDependencies(definition, existingViews, existingMVs);
  }

  registerView(name: string, type: 'table' | 'view' | 'materialized-view', dependencies: string[]): void {
    const node: DependencyNode = {
      id: name,
      name,
      type: type,
    };

    const existingIndex = this.graph.nodes.findIndex(n => n.id === name);
    if (existingIndex >= 0) {
      this.graph.nodes[existingIndex] = node;
    this.version++;
    } else {
      this.graph.nodes.push(node);
    this.version++;
    }

    for (const dep of dependencies) {
      this.addEdge(dep, name);

      if (!this.tableToViews.has(dep)) {
        this.tableToViews.set(dep, new Set());
      }
      this.tableToViews.get(dep)!.add(name);

      if (!this.viewToViews.has(dep)) {
        this.viewToViews.set(dep, new Set());
      }
      this.viewToViews.get(dep)!.add(name);
    }

    this.ensureTableNodes(dependencies);
  }

  private ensureTableNodes(dependencies: string[]): void {
    for (const dep of dependencies) {
      if (!this.graph.nodes.some(n => n.id === dep)) {
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
    if (!this.graph.edges.some(e => e.id === edgeId)) {
      this.version++;
    this.graph.edges.push({ id: edgeId, source, target });
    }
  }

  removeView(name: string): void {
    this.version++;
    this.graph.nodes = this.graph.nodes.filter(n => n.id !== name);
    this.graph.edges = this.graph.edges.filter(e => e.source !== name && e.target !== name);

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
      const node = this.graph.nodes.find(n => n.id === viewName);
      if (node && node.type === 'materialized-view' && node.status !== 'STALE') {
        node.status = 'STALE';
        this.version++;
      }
    }
  }

  getDependentViews(tableName: string): string[] {
    const direct = this.tableToViews.get(tableName) || new Set();
    const indirect = new Set<string>();

    for (const view of direct) {
      this.collectTransitiveDependents(view, indirect);
    }

    return Array.from(new Set([...direct, ...indirect]));
  }

  private collectTransitiveDependents(viewName: string, result: Set<string>): void {
    const dependents = this.viewToViews.get(viewName) || new Set();
    for (const dep of dependents) {
      if (!result.has(dep)) {
        result.add(dep);
        this.collectTransitiveDependents(dep, result);
      }
    }
  }

  refreshView(name: string): void {
    const node = this.graph.nodes.find(n => n.id === name);
    if (node && node.type === 'materialized-view') {
      node.status = 'FRESH';
      this.version++;
    }
  }

  setNodeStatus(name: string, status: 'FRESH' | 'STALE'): void {
    const node = this.graph.nodes.find(n => n.id === name);
    if (node) {
      node.status = status;
      this.version++;
    }
  }

  getGraph(): DependencyGraph {
    return { ...this.graph, nodes: [...this.graph.nodes], edges: [...this.graph.edges] };
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