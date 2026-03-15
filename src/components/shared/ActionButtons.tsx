'use client';

/**
 * ActionButtons — Botones editar/eliminar para filas de tabla.
 * Reutilizable en Clients, Services, Billing, etc.
 *
 * Uso:
 *   <ActionButtons
 *     onEdit={() => openEdit(row)}
 *     onDelete={() => handleDelete(row)}
 *     editLabel="Editar"
 *     deleteLabel="Eliminar"
 *   />
 */

import * as React from 'react';
import { PencilSimple, Trash } from '@phosphor-icons/react';

type ActionButtonsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  extraActions?: React.ReactNode;
};

export function ActionButtons({
  onEdit,
  onDelete,
  editLabel  = 'Editar',
  deleteLabel = 'Eliminar',
  extraActions,
}: ActionButtonsProps) {
  return (
    <div className="speeddan-action-btns">
      {extraActions}
      {onEdit && (
        <button
          type="button"
          className="speeddan-icon-btn speeddan-icon-btn--edit"
          onClick={onEdit}
          title={editLabel}
          aria-label={editLabel}
        >
          <PencilSimple size={15} weight="bold" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="speeddan-icon-btn speeddan-icon-btn--delete"
          onClick={onDelete}
          title={deleteLabel}
          aria-label={deleteLabel}
        >
          <Trash size={15} weight="bold" />
        </button>
      )}
    </div>
  );
}

export default ActionButtons;
