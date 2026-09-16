import { HTMLAttributes, forwardRef } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'fresh' | 'stale' | 'live' | 'error' | 'running' | 'success';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'border-transparent bg-muted text-muted-foreground',
      fresh: 'border-green-500/30 bg-green-500/10 text-green-400',
      stale: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
      live: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
      error: 'border-red-500/30 bg-red-500/10 text-red-400',
      running: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
      success: 'border-green-500/30 bg-green-500/10 text-green-400',
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