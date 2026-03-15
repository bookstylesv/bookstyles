'use client';

/**
 * Dialog/Modal — Implementación propia con createPortal. Sin @base-ui/react/dialog.
 * API compatible con el uso existente: Dialog, DialogContent, DialogHeader,
 * DialogFooter, DialogTitle, DialogDescription, DialogClose, DialogTrigger, DialogPortal.
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Context ────────────────────────────────────────────────────────────────

type DialogCtx = { open: boolean; onClose: () => void };
const DialogContext = React.createContext<DialogCtx>({ open: false, onClose: () => {} });

// ── Root ───────────────────────────────────────────────────────────────────

type DialogRootProps = {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

function Dialog({ open: openProp, onOpenChange, defaultOpen = false, children }: DialogRootProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const onClose = React.useCallback(() => {
    if (isControlled) onOpenChange?.(false);
    else setInternalOpen(false);
  }, [isControlled, onOpenChange]);

  return (
    <DialogContext.Provider value={{ open, onClose }}>
      {children}
    </DialogContext.Provider>
  );
}

// ── Trigger ────────────────────────────────────────────────────────────────

function DialogTrigger({ children }: { children: React.ReactNode; asChild?: boolean }) {
  return <>{children}</>;
}

// ── Portal ─────────────────────────────────────────────────────────────────

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ── Close ──────────────────────────────────────────────────────────────────

function DialogClose({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) {
  const { onClose } = React.useContext(DialogContext);
  return (
    <button
      type="button"
      onClick={onClose}
      className={cn('speeddan-dialog-close-btn', className)}
      data-slot="dialog-close"
      {...props}
    >
      {children}
    </button>
  );
}

// ── Overlay ────────────────────────────────────────────────────────────────

function DialogOverlay({ className }: { className?: string }) {
  const { onClose } = React.useContext(DialogContext);
  return (
    <div
      data-slot="dialog-overlay"
      className={cn('speeddan-dialog-overlay', className)}
      onClick={onClose}
      aria-hidden
    />
  );
}

// ── Content ────────────────────────────────────────────────────────────────

type DialogContentProps = React.HTMLAttributes<HTMLDivElement> & {
  showCloseButton?: boolean;
  children: React.ReactNode;
};

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogContentProps) {
  const { open, onClose } = React.useContext(DialogContext);

  React.useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  React.useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  if (typeof window === 'undefined') return null;

  return createPortal(
    <>
      <DialogOverlay />
      <div
        data-slot="dialog-content"
        role="dialog"
        aria-modal="true"
        className={cn('speeddan-dialog', className)}
        onClick={e => e.stopPropagation()}
        {...props}
      >
        {children}
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="speeddan-dialog-x"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        )}
      </div>
    </>,
    document.body,
  );
}

// ── Header ─────────────────────────────────────────────────────────────────

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('speeddan-dialog-header', className)}
      {...props}
    />
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────

function DialogFooter({
  className,
  showCloseButton,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { showCloseButton?: boolean }) {
  const { onClose } = React.useContext(DialogContext);
  return (
    <div
      data-slot="dialog-footer"
      className={cn('speeddan-dialog-footer', className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <button type="button" className="speeddan-btn speeddan-btn--outline" onClick={onClose}>
          Cerrar
        </button>
      )}
    </div>
  );
}

// ── Title / Description ────────────────────────────────────────────────────

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      data-slot="dialog-title"
      className={cn('speeddan-dialog-title', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="dialog-description"
      className={cn('text-sm text-[hsl(var(--text-muted))] mt-0.5', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
