import { Badge } from './Badge';
import { ExecutionFlow } from '../types';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';

interface ExecutionFlowViewProps {
  flow: ExecutionFlow | null;
}


export function ExecutionFlowView({ flow }: ExecutionFlowViewProps) {
  const { setUI } = useStore(useShallow(state => ({
    setUI: state.setUI
  })));

  const handleOpenSource = () => {
    setUI({ activePage: 'sql-lab' });
  };

  const handleAskAI = () => {
    const event = new CustomEvent('toggle-ai-prompt', { detail: 'Please explain this query execution plan to me.' });
    document.dispatchEvent(event);
  };

  if (!flow) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-8 text-center flex-col gap-4">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/30">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <p>No execution plan yet.<br/>Run a SQL query to inspect how SQLite plans to execute it.</p>
      </div>
    );
  }

  const typeLabels = {
    view: 'Execution Plan',
    'materialized-view': 'Materialized View Execution',
    refresh: 'Materialized View Refresh',
    query: 'Query Execution',
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 bg-background">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h3 className="font-semibold text-lg">Query Plan</h3>
        <div className="flex items-center gap-4">
          <button onClick={handleOpenSource} className="text-xs text-muted-foreground hover:text-foreground">Open in SQL Lab</button>
          <button onClick={handleAskAI} className="text-xs text-primary hover:text-primary/80">Explain with AI</button>
          <Badge variant="live">{typeLabels[flow.type]}</Badge>
        </div>
      </div>
      <div className="relative pt-2">
        <div className="absolute left-4 top-4 bottom-8 w-px bg-border -z-10" />
        <div className="space-y-8">
          {flow.steps.map((step, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 bg-background border-primary text-primary shadow-[0_0_10px_rgba(var(--primary),0.2)]">
                {index + 1}
              </div>
              <div className="flex-1 bg-card border border-border p-3 rounded-lg shadow-sm">
                <div className="font-mono text-sm font-semibold text-primary mb-1 uppercase tracking-wider">{step.label}</div>
                <div className="text-sm text-foreground/80">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
