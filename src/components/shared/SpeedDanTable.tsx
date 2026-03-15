'use client';

/**
 * SpeedDanTable — Tabla genérica réplica fiel de DataTable.tsx del ERP DTE.
 *
 * Características:
 *  • Header: gradiente #fafbfd→#f4f5f8, uppercase 11px bold
 *  • Filas: zebra-stripe, hover #fafafa
 *  • Acciones: ocultas por defecto → visibles al hover de la fila
 *  • Skeleton shimmer mientras loading=true
 *  • Estado vacío con icono circulado
 *  • Columna # automática
 *
 * Uso:
 *   <SpeedDanTable
 *     items={clients}
 *     columns={[
 *       { key: 'fullName', label: 'Cliente', render: c => <b>{c.fullName}</b> },
 *       { key: 'phone',    label: 'Teléfono', muted: true },
 *     ]}
 *     loading={loading}
 *     emptyIcon={<UserCircle size={36} />}
 *     emptyTitle="Sin clientes"
 *     onEdit={openEdit}
 *     onDelete={handleDelete}
 *   />
 */

import React from 'react';
import { PencilSimple, Trash } from '@phosphor-icons/react';

// ── CSS inyectado — idéntico a TABLE_STYLES del DTE ──────────────────────
const TABLE_STYLES = `
  @keyframes speeddan-shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  .sk-cell {
    background: linear-gradient(90deg, #efefef 25%, #e2e2e2 50%, #efefef 75%);
    background-size: 600px 100%;
    animation: speeddan-shimmer 1.4s ease-in-out infinite;
    border-radius: 5px;
    display: block;
  }
  .tbl-row { transition: background 0.12s; }
  .tbl-row:hover { background: #fafafa !important; }
  .tbl-row:hover .tbl-actions { opacity: 1 !important; }
  .tbl-actions { opacity: 0; transition: opacity 0.15s ease; }
  .btn-edit:hover {
    background: rgba(128,128,128,0.12) !important;
    border-color: rgba(128,128,128,0.30) !important;
  }
  .btn-del:hover {
    background: rgba(239,68,68,0.10) !important;
    border-color: rgba(239,68,68,0.35) !important;
  }
`;

// ── Types ─────────────────────────────────────────────────────────────────

export type SpeedDanColumn<T> = {
  key:     string;
  label:   string;
  muted?:  boolean;
  width?:  string;
  align?:  'left' | 'center' | 'right';
  render?: (item: T) => React.ReactNode;
};

type Props<T extends { id: number }> = {
  items:       T[];
  columns:     SpeedDanColumn<T>[];
  loading?:    boolean;
  emptyIcon?:  React.ReactNode;
  emptyTitle?: string;
  emptyDesc?:  string;
  onEdit?:     (item: T) => void;
  onDelete?:   (item: T) => void;
};

// ── Estilos inline (copiados 1:1 de DataTable.tsx) ───────────────────────

const thStyle: React.CSSProperties = {
  padding:       '13px 20px',
  textAlign:     'left',
  fontSize:      '11px',
  fontWeight:    700,
  color:         'hsl(var(--text-muted))',
  textTransform: 'uppercase',
  letterSpacing: '0.65px',
  background:    'linear-gradient(to bottom, #fafbfd, #f4f5f8)',
  borderBottom:  '2px solid hsl(var(--border-default))',
  whiteSpace:    'nowrap',
  userSelect:    'none',
};

const tdStyle: React.CSSProperties = {
  padding:        '15px 20px',
  fontSize:       '14px',
  color:          'hsl(var(--text-primary))',
  borderBottom:   '1px solid #f0f0f4',
  verticalAlign:  'middle',
};

const tdMutedStyle: React.CSSProperties = {
  ...tdStyle,
  fontSize: '13px',
  color:    'hsl(var(--text-muted))',
};

const actionBtnBase: React.CSSProperties = {
  width:          '30px',
  height:         '30px',
  display:        'inline-flex',
  alignItems:     'center',
  justifyContent: 'center',
  borderRadius:   '8px',
  border:         '1px solid hsl(var(--border-default))',
  background:     'hsl(var(--bg-surface))',
  cursor:         'pointer',
  transition:     'background 0.15s, border-color 0.15s',
  padding:        0,
};

// ── Componente ────────────────────────────────────────────────────────────

function SpeedDanTable<T extends { id: number }>({
  items,
  columns,
  loading    = false,
  emptyIcon,
  emptyTitle = 'Sin registros',
  emptyDesc,
  onEdit,
  onDelete,
}: Props<T>) {
  const hasActions = Boolean(onEdit || onDelete);
  const colCount   = 1 + columns.length + (hasActions ? 1 : 0);

  return (
    <>
      <style suppressHydrationWarning>{TABLE_STYLES}</style>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>

          {/* ── Cabecera ─────────────────────────────── */}
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '48px', textAlign: 'center' }}>#</th>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{ ...thStyle, width: col.width, textAlign: col.align ?? 'left' }}
                >
                  {col.label}
                </th>
              ))}
              {hasActions && (
                <th style={{ ...thStyle, width: '90px', textAlign: 'center' }}>
                  Acciones
                </th>
              )}
            </tr>
          </thead>

          <tbody>

            {/* ── Skeleton shimmer ─────────────────── */}
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr
                key={`sk-${i}`}
                style={{ background: i % 2 === 0 ? '#ffffff' : '#fafafc' }}
              >
                {Array.from({ length: colCount }).map((__, j) => (
                  <td key={j} style={tdStyle}>
                    <span
                      className="sk-cell"
                      style={{
                        width:  j === 0 ? '28px' : j === 1 ? '130px' : j % 3 === 0 ? '100px' : '75px',
                        height: '13px',
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}

            {/* ── Estado vacío ─────────────────────── */}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={colCount}>
                  <div style={{ padding: '72px 24px', textAlign: 'center' }}>
                    {emptyIcon && (
                      <div style={{
                        display:        'inline-flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        width:          '80px',
                        height:         '80px',
                        borderRadius:   '50%',
                        background:     'linear-gradient(135deg, #f0f0f0, #e8e8e8)',
                        color:          'hsl(var(--text-muted))',
                        marginBottom:   '20px',
                      }}>
                        {emptyIcon}
                      </div>
                    )}
                    <p style={{ fontWeight: 700, color: 'hsl(var(--text-secondary))', margin: '0 0 6px', fontSize: '15px' }}>
                      {emptyTitle}
                    </p>
                    <p style={{ fontSize: '13px', color: 'hsl(var(--text-muted))', margin: 0 }}>
                      {emptyDesc ?? 'Usa el botón + Nuevo para agregar el primer registro.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}

            {/* ── Filas de datos ───────────────────── */}
            {!loading && items.map((item, idx) => (
              <tr
                key={item.id}
                className="tbl-row"
                style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafafc' }}
              >
                {/* # */}
                <td style={{
                  ...tdStyle,
                  textAlign:          'center',
                  color:              'hsl(var(--text-muted))',
                  fontSize:           '12px',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {idx + 1}
                </td>

                {/* Celdas */}
                {columns.map(col => (
                  <td
                    key={col.key}
                    style={{ ...(col.muted ? tdMutedStyle : tdStyle), textAlign: col.align ?? 'left' }}
                  >
                    {col.render
                      ? col.render(item)
                      : (
                          String((item as Record<string, unknown>)[col.key] ?? '').trim() ||
                          <span style={{ color: '#d0d0d0' }}>—</span>
                        )
                    }
                  </td>
                ))}

                {/* Acciones */}
                {hasActions && (
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <div className="tbl-actions" style={{ display: 'inline-flex', gap: '6px' }}>
                      {onEdit && (
                        <button
                          type="button"
                          className="btn-edit"
                          style={actionBtnBase}
                          title="Editar"
                          onClick={() => onEdit(item)}
                        >
                          <PencilSimple size={13} color="hsl(var(--text-secondary))" weight="bold" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          className="btn-del"
                          style={actionBtnBase}
                          title="Eliminar"
                          onClick={() => onDelete(item)}
                        >
                          <Trash size={13} color="#ef4444" weight="bold" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}

          </tbody>
        </table>
      </div>
    </>
  );
}

export { SpeedDanTable };
export default SpeedDanTable;
