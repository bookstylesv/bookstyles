/**
 * Textarea — Componente propio sin @base-ui.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn('speeddan-input', 'min-h-[80px] resize-none py-2.5', className)}
      {...props}
    />
  );
}

export { Textarea };
