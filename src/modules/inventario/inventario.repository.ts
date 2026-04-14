/**
 * inventario.repository.ts — Transferencias de stock entre sucursales.
 * Una transferencia genera dos entradas de kardex (SALIDA en origen, ENTRADA en destino)
 * y actualiza BarberStockSucursal en ambas sucursales.
 * BarberProducto.stockActual NO cambia (transferencia es zero-sum).
 */

import { prisma } from '@/lib/prisma';
import { upsertStockSucursal } from '@/lib/stock-sucursal';

export type TransferenciaCreateInput = {
  productoId:   number;
  fromBranchId: number;
  toBranchId:   number;
  cantidad:     number;
  notas?:       string;
};

const TRANSFERENCIA_INCLUDE = {
  producto:   { select: { codigo: true, nombre: true, unidadMedida: true } },
  fromBranch: { select: { id: true, name: true } },
  toBranch:   { select: { id: true, name: true } },
} as const;

export async function createTransferencia(tenantId: number, data: TransferenciaCreateInput) {
  return prisma.$transaction(async (tx) => {
    // 1. Verificar stock en sucursal origen
    const stockOrigen = await tx.barberStockSucursal.findUnique({
      where: {
        branchId_productoId: { branchId: data.fromBranchId, productoId: data.productoId },
      },
    });
    const stockDisponible = Number(stockOrigen?.stockActual ?? 0);
    if (stockDisponible < data.cantidad) {
      throw new Error(
        `Stock insuficiente en sucursal origen: disponible ${stockDisponible}, solicitado ${data.cantidad}`,
      );
    }

    // 2. Obtener costoPromedio del producto
    const producto = await tx.barberProducto.findFirst({
      where: { id: data.productoId, tenantId },
      select: { costoPromedio: true, stockActual: true },
    });
    if (!producto) throw new Error('Producto no encontrado');
    const costoUnitario = Number(producto.costoPromedio);
    const stockGlobal   = Number(producto.stockActual);

    // 3. Kardex SALIDA en origen
    await tx.barberKardex.create({
      data: {
        tenantId,
        branchId:      data.fromBranchId,
        productoId:    data.productoId,
        tipoMovimiento: 'SALIDA',
        referencia:    `TRANSFERENCIA-${data.fromBranchId}->${data.toBranchId}`,
        cantidad:      data.cantidad,
        costoUnitario,
        costoTotal:    data.cantidad * costoUnitario,
        stockAnterior: stockGlobal,
        stockNuevo:    stockGlobal, // global no cambia
        notas:         data.notas ?? 'Transferencia entre sucursales',
        fecha:         new Date(),
      },
    });

    // 4. Kardex ENTRADA en destino
    await tx.barberKardex.create({
      data: {
        tenantId,
        branchId:      data.toBranchId,
        productoId:    data.productoId,
        tipoMovimiento: 'ENTRADA',
        referencia:    `TRANSFERENCIA-${data.fromBranchId}->${data.toBranchId}`,
        cantidad:      data.cantidad,
        costoUnitario,
        costoTotal:    data.cantidad * costoUnitario,
        stockAnterior: stockGlobal,
        stockNuevo:    stockGlobal, // global no cambia
        notas:         data.notas ?? 'Transferencia entre sucursales',
        fecha:         new Date(),
      },
    });

    // 5. Actualizar stock por sucursal (zero-sum — global no cambia)
    await upsertStockSucursal(tx, {
      tenantId,
      branchId:   data.fromBranchId,
      productoId: data.productoId,
      delta:      -data.cantidad,
    });
    await upsertStockSucursal(tx, {
      tenantId,
      branchId:   data.toBranchId,
      productoId: data.productoId,
      delta:      +data.cantidad,
    });

    // 6. Crear registro de transferencia
    return tx.barberTransferencia.create({
      data: {
        tenantId,
        productoId:   data.productoId,
        fromBranchId: data.fromBranchId,
        toBranchId:   data.toBranchId,
        cantidad:     data.cantidad,
        costoUnitario,
        notas:        data.notas ?? null,
        estado:       'COMPLETADA',
      },
      include: TRANSFERENCIA_INCLUDE,
    });
  });
}

export async function findAllTransferencias(
  tenantId: number,
  filters: { branchId?: number | null; page?: number; limit?: number },
) {
  const { page = 1, limit = 20, branchId } = filters;
  const skip = (page - 1) * limit;

  const where = {
    tenantId,
    ...(branchId != null
      ? { OR: [{ fromBranchId: branchId }, { toBranchId: branchId }] }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.barberTransferencia.findMany({
      where,
      include:  TRANSFERENCIA_INCLUDE,
      orderBy:  { fecha: 'desc' },
      skip,
      take:     limit,
    }),
    prisma.barberTransferencia.count({ where }),
  ]);

  return { items, total };
}
