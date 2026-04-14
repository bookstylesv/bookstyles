/**
 * branch-filter.ts — Helper para filtrar queries por sucursal.
 *
 * Uso en repositories:
 *   where: { tenantId, ...branchWhere(branchId) }
 *
 * Cuando branchId es null (OWNER vista consolidada) el spread
 * produce {} y no agrega ningún filtro — comportamiento idéntico
 * al actual antes de implementar sucursales.
 */

export function branchWhere(branchId: number | null | undefined): { branchId?: number } {
  return branchId != null ? { branchId } : {};
}
