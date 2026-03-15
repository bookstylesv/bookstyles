'use client';

/**
 * EmptyState — Estado vacío reutilizable para tablas y grids.
 *
 * Uso:
 *   <EmptyState
 *     icon={<ScissorsIcon size={36} />}
 *     title="Sin servicios"
 *     description="Crea el primer servicio para tu barbería"
 *     action={<Button onClick={openCreate}>Nuevo servicio</Button>}
 *   />
 */

import * as React from 'react';

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="speeddan-empty-state">
      {icon && (
        <div className="speeddan-empty-state__icon">{icon}</div>
      )}
      <h3 className="speeddan-empty-state__title">{title}</h3>
      {description && (
        <p className="speeddan-empty-state__desc">{description}</p>
      )}
      {action && (
        <div className="speeddan-empty-state__action">{action}</div>
      )}
    </div>
  );
}

export default EmptyState;
