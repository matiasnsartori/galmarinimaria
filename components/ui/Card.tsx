import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-xl bg-surface border border-border p-6 shadow-sm', className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';
