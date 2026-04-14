/**
 * upsertStockSucursal — actualiza el stock de un producto en una sucursal específica.
 * Siempre se llama DENTRO de una transacción Prisma para atomicidad.
 * - Si no existe el registro, lo crea con Math.max(0, delta).
 * - Si ya existe, incrementa (positivo) o decrementa (negativo) el stockActual.
 * - Clamp defensivo: nunca deja stockActual < 0.
 */

import { Prisma } from '@prisma/client';

export async function upsertStockSucursal(
  tx: Prisma.TransactionClient,
  params: {
    tenantId:   number;
    branchId:   number;
    productoId: number;
    delta:      number; // positivo = entrada, negativo = salida
  },
): Promise<void> {
  const { tenantId, branchId, productoId, delta } = params;

  await tx.barberStockSucursal.upsert({
    where: {
      branchId_productoId: { branchId, productoId },
    },
    create: {
      tenantId,
      branchId,
      productoId,
      stockActual: Math.max(0, delta),
    },
    update: {
      stockActual: { increment: delta },
    },
  });

  // Clamp defensivo: si el resultado fue negativo por concurrencia, lo fijamos a 0
  await tx.barberStockSucursal.updateMany({
    where: {
      branchId,
      productoId,
      stockActual: { lt: 0 },
    },
    data: { stockActual: 0 },
  });
}
