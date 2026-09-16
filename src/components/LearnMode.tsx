import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';
import { Card, CardContent } from './Card';

export function LearnModePanel() {
  const { ui, mvManager, history } = useStore(useShallow(state => ({ ui: state.ui, mvManager: state.mvManager, history: state.history })));

  if (!ui.learnMode) return null;

  const lastEntry = history[0];
  let message: { title: string; description: string; variant: 'info' | 'warning' | 'success' } | null = null;

  if (lastEntry) {
    if (lastEntry.status === 'STALE') {
      message = {
        title: 'Materialized View Became Stale',
        description: `The base table "${lastEntry.object}" was modified. The Materialized View still contains its previous stored result. Run REFRESH MATERIALIZED VIEW to update it.`,
        variant: 'warning',
      };
    } else if (lastEntry.status === 'REFRESHED') {
      message = {
        title: 'Materialized View Refreshed',
        description: `The Materialized View "${lastEntry.object}" has been refreshed and now reflects the current database state. Status: FRESH.`,
        variant: 'success',
      };
    } else if (lastEntry.operation === 'CREATE_VIEW') {
      message = {
        title: 'View Created',
        description: `A normal View does not store its result. Its defining query is evaluated against the current database state every time it's queried.`,
        variant: 'info',
      };
    } else if (lastEntry.operation === 'CREATE_MATERIALIZED_VIEW') {
      message = {
        title: 'Materialized View Created',
        description: `A Materialized View stores its result at creation time. It will not automatically update when base tables change. Use REFRESH MATERIALIZED VIEW to recompute.`,
        variant: 'info',
      };
    }
  }

  if (!message) {
    const mvCount = mvManager.getViewNames().length;
    const staleCount = Array.from(mvManager.getAllViews().values()).filter((v) => v.status === 'STALE').length;
    
    if (staleCount > 0) {
      message = {
        title: 'Stale Materialized Views Detected',
        description: `${staleCount} materialized view(s) are stale. Their stored results do not reflect recent changes to base tables.`,
        variant: 'warning',
      };
    } else if (mvCount > 0) {
      message = {
        title: 'Materialized Views Are Fresh',
        description: `All ${mvCount} materialized view(s) are FRESH. Their stored results match the current database state.`,
        variant: 'success',
      };
    }
  }

  if (!message) return null;

  const variantClasses = {
    info: 'border-blue-500/30 bg-blue-500/10',
    warning: 'border-orange-500/30 bg-orange-500/10',
    success: 'border-green-500/30 bg-green-500/10',
  };

  const iconClasses = {
    info: 'text-blue-400',
    warning: 'text-orange-400',
    success: 'text-green-400',
  };

  const icons = {
    info: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
    warning: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    success: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 animate-in slide-in-from-bottom-2 fade-in">
      <Card className={`${variantClasses[message.variant]} border`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 ${iconClasses[message.variant]}`}>
              {icons[message.variant]}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm">{message.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{message.description}</p>
            </div>
            <button
              onClick={() => useStore.getState().setUI({ learnMode: false })}
              className="text-muted-foreground hover:text-foreground"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}