import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';
import { ActivePage } from '../../types';

export const RecentActivity: React.FC = () => {
  const { history, setUI } = useStore(useShallow(state => ({
    history: state.history,
    setUI: state.setUI,
  })));

  const recentHistory = history.slice(0, 6);

  const getOpBadge = (op: string) => {
    const upper = op.toUpperCase();
    if (upper.includes('CREATE VIEW')) return { bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20', label: 'CREATE VIEW', page: 'dependencies' as ActivePage };
    if (upper.includes('CREATE MATERIALIZED') || upper.includes('CREATE MV')) return { bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', label: 'CREATE MV', page: 'dependencies' as ActivePage };
    if (upper.includes('REFRESH')) return { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', label: 'REFRESH', page: 'compare' as ActivePage };
    if (upper.includes('UPDATE') || upper.includes('INSERT') || upper.includes('DELETE')) return { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', label: 'DML DATA', page: 'simulation' as ActivePage };
    return { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', label: 'SELECT', page: 'sql-lab' as ActivePage };
  };

  if (recentHistory.length === 0) {
    return (
      <div className="p-6 text-center border border-dashed border-border/60 rounded-xl bg-card/50">
        <p className="text-sm text-muted-foreground font-medium mb-2">No recent database activity</p>
        <button
          onClick={() => setUI({ activePage: 'sql-lab' })}
          className="text-xs px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-sm"
        >
          Run SQL Query
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Recent Database Operations
        </h3>
        <button
          onClick={() => setUI({ activePage: 'history' })}
          className="text-xs text-primary hover:underline font-semibold"
        >
          View All History →
        </button>
      </div>

      <div className="space-y-1.5">
        {recentHistory.map((item) => {
          const sqlText = item.sql || `${item.operation} ${item.object}`;
          const badge = getOpBadge(item.operation || sqlText);
          const isSuccess = item.status === 'SUCCESS';
          const execTime = item.executionTime ?? 0;

          return (
            <div
              key={item.id}
              onClick={() => setUI({ activePage: badge.page })}
              className="group flex items-center justify-between p-3 bg-card border border-border/50 rounded-xl hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold shrink-0 ${badge.bg}`}>
                  {badge.label}
                </span>
                <code className="text-xs text-foreground font-mono truncate max-w-[280px] sm:max-w-[400px]">
                  {sqlText}
                </code>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-xs">
                <span className="text-muted-foreground text-[11px] font-mono hidden sm:inline">
                  {execTime.toFixed(1)}ms
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  isSuccess ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                }`}>
                  {isSuccess ? '✓ Success' : '✕ Error'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
