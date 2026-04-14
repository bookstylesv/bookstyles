/**
 * inventario.service.ts — Lógica de negocio para transferencias de stock entre sucursales.
 */

import { prisma } from '@/lib/prisma';
import * as repo from './inventario.repository';

export type TransferenciaSerialized = {
  id:           number;
  productoId:   number;
  fromBranchId: number;
  toBranchId:   number;
  cantidad:     number;
  costoUnitario: number;
  notas:        string | null;
  estado:       string;
  fecha:        string;
  producto:     { codigo: string; nombre: string; unidadMedida: string } | null;
  fromBranch:   { id: number; name: string } | null;
  toBranch:     { id: number; name: string } | null;
};

function serialize(t: Awaited<ReturnType<typeof repo.createTransferencia>>): TransferenciaSerialized {
  return {
    id:            t.id,
    productoId:    t.productoId,
    fromBranchId:  t.fromBranchId,
    toBranchId:    t.toBranchId,
    cantidad:      Number(t.cantidad),
    costoUnitario: Number(t.costoUnitario),
    notas:         t.notas,
    estado:        t.estado,
    fecha:         t.fecha.toISOString(),
    producto:      t.producto ?? null,
    fromBranch:    t.fromBranch ?? null,
    toBranch:      t.toBranch ?? null,
  };
}

export async function transferirStock(tenantId: number, body: unknown): Promise<TransferenciaSerialized> {
  const b = body as Record<string, unknown>;

  const productoId   = Number(b.productoId);
  const fromBranchId = Number(b.fromBranchId);
  const toBranchId   = Number(b.toBranchId);
  const cantidad     = Number(b.cantidad);
  const notas        = b.notas ? String(b.notas).trim().slice(0, 300) : undefined;

  if (!productoId   || productoId   <= 0) throw new Error('productoId inválido');
  if (!fromBranchId || fromBranchId <= 0) throw new Error('fromBranchId inválido');
  if (!toBranchId   || toBranchId   <= 0) throw new Error('toBranchId inválido');
  if (!cantidad     || cantidad     <= 0) throw new Error('cantidad debe ser mayor a 0');
  if (fromBranchId === toBranchId)        throw new Error('La sucursal origen y destino no pueden ser la misma');

  // Verificar que ambas sucursales pertenecen al tenant
  const [from, to] = await Promise.all([
    prisma.barberBranch.findFirst({ where: { id: fromBranchId, tenantId, status: 'ACTIVE' } }),
    prisma.barberBranch.findFirst({ where: { id: toBranchId,   tenantId, status: 'ACTIVE' } }),
  ]);
  if (!from) throw new Error('Sucursal origen no encontrada o inactiva');
  if (!to)   throw new Error('Sucursal destino no encontrada o inactiva');

  const transferencia = await repo.createTransferencia(tenantId, {
    productoId, fromBranchId, toBranchId, cantidad, notas,
  });

  return serialize(transferencia);
}

export async function listTransferencias(
  tenantId: number,
  query: Record<string, string>,
): Promise<{ items: TransferenciaSerialized[]; total: number }> {
  const branchId = query.branchId ? Number(query.branchId) : undefined;
  const page     = Number(query.page  ?? '1');
  const limit    = Number(query.limit ?? '20');

  const { items, total } = await repo.findAllTransferencias(tenantId, { branchId, page, limit });

  return {
    total,
    items: items.map(t => serialize(t as Parameters<typeof serialize>[0])),
  };
}

// ── Stock por sucursal ─────────────────────────────────────────────────────────

import * as prodRepo from '@/modules/productos/productos.repository';

export type StockSucursalItem = {
  productoId:  number;
  branchId:    number;
  branchName:  string;
  isHQ:        boolean;
  stockActual: number;
  stockMinimo: number;
  stockBajo:   boolean;
  producto:    { codigo: string; nombre: string; unidadMedida: string };
};

export async function getStockPorSucursal(
  tenantId: number,
  branchId?: number | null,
): Promise<{ items: StockSucursalItem[] }> {
  const rows = await prodRepo.getStockSucursal(tenantId, branchId);

  const items: StockSucursalItem[] = rows.map(r => ({
    productoId:  r.productoId,
    branchId:    r.branchId,
    branchName:  r.branch.name,
    isHQ:        r.branch.isHeadquarters,
    stockActual: Number(r.stockActual),
    stockMinimo: Number(r.producto.stockMinimo),
    stockBajo:   Number(r.stockActual) <= Number(r.producto.stockMinimo),
    producto: {
      codigo:       r.producto.codigo,
      nombre:       r.producto.nombre,
      unidadMedida: r.producto.unidadMedida,
    },
  }));

  return { items };
}
