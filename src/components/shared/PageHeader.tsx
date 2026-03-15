'use client';

/**
 * PageHeader — Encabezado de página reutilizable.
 * Título + descripción + botón de acción.
 *
 * Uso:
 *   <PageHeader
 *     title="Servicios"
 *     description="6 servicios activos"
 *     action={<Button onClick={openCreate}><PlusIcon /> Nuevo servicio</Button>}
 *   />
 */

import * as React from 'react';

type PageHeaderProps = {
  title: string;
  description?: string | React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, action, className = '' }: PageHeaderProps) {
  return (
    <div className={`speeddan-page-header ${className}`}>
      <div className="speeddan-page-header__text">
        <h1 className="speeddan-page-header__title">{title}</h1>
        {description && (
          <p className="speeddan-page-header__desc">{description}</p>
        )}
      </div>
      {action && (
        <div className="speeddan-page-header__action">{action}</div>
      )}
    </div>
  );
}

export default PageHeader;
