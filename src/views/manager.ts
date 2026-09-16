import { ViewInfo } from '../types';

export class ViewManager {
  private views = new Map<string, ViewInfo>();

  createView(name: string, definition: string, dependencies: string[]): void {
    this.views.set(name, {
      name,
      definition,
      dependencies,
      status: 'LIVE',
      createdAt: Date.now(),
    });
  }

  dropView(name: string): boolean {
    return this.views.delete(name);
  }

  getView(name: string): ViewInfo | undefined {
    return this.views.get(name);
  }

  getAllViews(): Map<string, ViewInfo> {
    return new Map(this.views);
  }

  getViewNames(): string[] {
    return Array.from(this.views.keys());
  }

  hasView(name: string): boolean {
    return this.views.has(name);
  }

  clear(): void {
    this.views.clear();
  }

  loadViews(views: ViewInfo[]): void {
    this.views.clear();
    for (const view of views) {
      this.views.set(view.name, view);
    }
  }

  serialize(): ViewInfo[] {
    return Array.from(this.views.values());
  }
}