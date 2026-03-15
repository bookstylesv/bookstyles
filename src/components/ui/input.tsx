/**
 * Input — Componente propio sin @base-ui.
 * Estilo profesional con borde teal en foco.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, style, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn('speeddan-input', className)}
      style={style}
      {...props}
    />
  );
}

export { Input };
