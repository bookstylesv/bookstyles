/**
 * Badge — Componente propio sin @base-ui.
 * Variantes: default (teal), secondary, destructive, outline, success, warning.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-colors',
  {
    variants: {
      variant: {
        default: [
          'bg-[hsl(var(--brand-primary)/0.12)] text-[hsl(var(--brand-primary-dark))]',
          'border-[hsl(var(--brand-primary)/0.25)]',
        ],
        secondary: [
          'bg-[hsl(var(--bg-subtle))] text-[hsl(var(--text-secondary))]',
          'border-[hsl(var(--border-default))]',
        ],
        destructive: [
          'bg-[hsl(var(--status-error)/0.10)] text-[hsl(var(--status-error))]',
          'border-[hsl(var(--status-error)/0.25)]',
        ],
        outline: [
          'bg-transparent text-[hsl(var(--text-primary))]',
          'border-[hsl(var(--border-default))]',
        ],
        success: [
          'bg-[hsl(var(--status-success)/0.10)] text-[hsl(var(--status-success))]',
          'border-[hsl(var(--status-success)/0.25)]',
        ],
        warning: [
          'bg-[hsl(var(--status-warning)/0.10)] text-[hsl(var(--status-warning))]',
          'border-[hsl(var(--status-warning)/0.25)]',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
