import { HTMLAttributes, forwardRef } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'fresh' | 'stale' | 'live' | 'error' | 'running' | 'success';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'border-transparent bg-muted text-muted-foreground',
      fresh: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      stale: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
      live: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
      error: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400',
      running: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
      success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';