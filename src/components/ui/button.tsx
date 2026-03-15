'use client';

/**
 * Button — Componente propio sin dependencia de @base-ui.
 * Variantes: default (teal gradient), outline, secondary, ghost, destructive, link.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap',
    'rounded-lg border border-transparent text-sm font-medium',
    'transition-all duration-150 cursor-pointer select-none outline-none',
    'focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-gradient-to-br from-[hsl(var(--brand-primary))] to-[hsl(var(--brand-primary-dark))]',
          'text-white border-transparent',
          'shadow-[0_2px_8px_hsl(var(--brand-primary)/0.28)]',
          'hover:shadow-[0_4px_16px_hsl(var(--brand-primary)/0.38)] hover:-translate-y-px',
          'active:translate-y-0 active:shadow-[0_1px_4px_hsl(var(--brand-primary)/0.2)]',
          'focus-visible:ring-[hsl(var(--brand-primary)/0.4)]',
        ],
        outline: [
          'bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))]',
          'border-[hsl(var(--border-default))]',
          'hover:bg-[hsl(var(--bg-subtle))] hover:border-[hsl(var(--border-strong))]',
          'focus-visible:ring-[hsl(var(--brand-primary)/0.3)]',
        ],
        secondary: [
          'bg-[hsl(var(--bg-subtle))] text-[hsl(var(--text-primary))]',
          'border-[hsl(var(--border-default))]',
          'hover:bg-[hsl(var(--bg-muted))]',
        ],
        ghost: [
          'bg-transparent text-[hsl(var(--text-secondary))]',
          'hover:bg-[hsl(var(--bg-subtle))] hover:text-[hsl(var(--text-primary))]',
        ],
        destructive: [
          'bg-[hsl(var(--status-error)/0.08)] text-[hsl(var(--status-error))]',
          'border-[hsl(var(--status-error)/0.2)]',
          'hover:bg-[hsl(var(--status-error)/0.14)]',
          'focus-visible:ring-[hsl(var(--status-error)/0.3)]',
        ],
        link: 'text-[hsl(var(--brand-primary))] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-3.5',
        xs:      'h-6 px-2 text-xs rounded-md [&_svg:not([class*=\'size-\'])]:size-3',
        sm:      'h-8 px-3 text-[0.8rem] [&_svg:not([class*=\'size-\'])]:size-3.5',
        lg:      'h-10 px-5 text-base',
        icon:    'size-9',
        'icon-xs': 'size-6 rounded-md [&_svg:not([class*=\'size-\'])]:size-3',
        'icon-sm': 'size-8 [&_svg:not([class*=\'size-\'])]:size-3.5',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
