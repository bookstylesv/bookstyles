/**
 * compras.repository.ts — Capa de datos para BarberCompra.
 * Todas las queries filtran por tenantId.
 * Las compras de tipo PRODUCTO actualizan inventario (costo promedio ponderado)
 * y generan entradas en BarberKardex.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { branchWhere } from '@/lib/branch-filter';
import { upsertStockSucursal } from '@/lib/stock-sucursal';

// ── Tipos ────────────────────────────────────────────────────────────────────

export type CompraFilters = {
  search?: string;         // número documento o nombre proveedor
  tipoCompra?: string;     // PRODUCTO | GASTO_SERVICIO
  estado?: string;         // REGISTRADA | PAGADA | ANULADA
  condicionPago?: string;  // CONTADO | CREDITO
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
  branchId?: number | null;
};

export type DetalleInput = {
  productoId?: number | null;
  descripcion?: string | null;
  cantidad: number;
  costoUnitario: number;
  descuento: number;
  subtotal: number;
};

export type CompraCreateInput = {
  proveedorId?: number | null;
  numeroDocumento: string;
  tipoDocumento: string;
  tipoCompra: string;
  condicionPago: string;
  fecha: Date;
  subtotal: number;
  iva: number;
  total: number;
  notas?: string | null;
  detalles: DetalleInput[];
};

// ── Includes reutilizables ───────────────────────────────────────────────────

const COMPRA_INCLUDE = {
  proveedor: {
    select: { id: true, nombre: true, nit: true, correo: true, telefono: true },
  },
  detalles: {
    include: {
      producto: {
        select: { id: true, codigo: true, nombre: true, unidadMedida: true, unidadCompra: true, factorConversion: true },
      },
    },
  },
} as const;

// ── Queries ──────────────────────────────────────────────────────────────────

export async function findAll(tenantId: number, filters: CompraFilters = {}) {
  const {
    search,
    tipoCompra,
    estado,
    condicionPago,
    from,
    to,
    page = 1,
    limit = 20,
  } = filters;

  const skip = (page - 1) * limit;

  const where: Prisma.BarberCompraWhereInput = {
    tenantId,
    ...branchWhere(filters.branchId),
    ...(tipoCompra && { tipoCompra }),
    ...(estado && { estado }),
    ...(condicionPago && { condicionPago }),
    ...((from || to) && {
      fecha: {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      },
    }),
    ...(search && {
      OR: [
        { numeroDocumento: { contains: search, mode: 'insensitive' } },
        {
          proveedor: {
            nombre: { contains: search, mode: 'insensitive' },
          },
        },
      ],
    }),
  };

  const [compras, total] = await Promise.all([
    prisma.barberCompra.findMany({
      where,
      include: COMPRA_INCLUDE,
      orderBy: { fecha: 'desc' },
      skip,
      take: limit,
    }),
    prisma.barberCompra.count({ where }),
  ]);

  return { compras, total };
}

export async function findById(id: number, tenantId: number) {
  return prisma.barberCompra.findFirst({
    where: { id, tenantId },
    include: COMPRA_INCLUDE,
  });
}

export async function create(tenantId: number, data: CompraCreateInput) {
  return prisma.$transaction(async (tx) => {
    // 1. Crear la compra con sus detalles
    const compra = await tx.barberCompra.create({
      data: {
        tenantId,
        proveedorId:     data.proveedorId ?? null,
        numeroDocumento: data.numeroDocumento,
        tipoDocumento:   data.tipoDocumento,
        tipoCompra:      data.tipoCompra,
        condicionPago:   data.condicionPago,
        fecha:           data.fecha,
        subtotal:        data.subtotal,
        iva:             data.iva,
        total:           data.total,
        estado:          'REGISTRADA',
        notas:           data.notas ?? null,
        detalles: {
          create: data.detalles.map((d) => ({
            productoId:    d.productoId ?? null,
            descripcion:   d.descripcion ?? null,
            cantidad:      d.cantidad,
            costoUnitario: d.costoUnitario,
            descuento:     d.descuento,
            subtotal:      d.subtotal,
          })),
        },
      },
      include: COMPRA_INCLUDE,
    });

    // 2. Si es PRODUCTO: actualizar inventario + kardex por cada línea con productoId
    if (data.tipoCompra === 'PRODUCTO') {
      for (const det of data.detalles) {
        if (!det.productoId) continue;

        const producto = await tx.barberProducto.findUnique({
          where: { id: det.productoId },
          select: {
            stockActual: true, costoPromedio: true,
            unidadCompra: true, factorConversion: true,
            unidadVenta: { select: { nombre: true } },
          },
        });

        if (!producto) continue;

        const stockAnterior = Number(producto.stockActual);
        const costoAnterior = Number(producto.costoPromedio);
        const factor = Number(producto.factorConversion ?? 1);

        // La compra viene en unidadCompra → convertir a unidadVenta para el stock
        // El usuario ingresa costo por unidadCompra (ej: $100/Unidad con factor 10)
        // → costo por unidadVenta = $100 / 10 = $10/Arroba
        const cantidadEnUnidadVenta = det.cantidad * factor;
        const costoNuevo = factor > 1 ? det.costoUnitario / factor : det.costoUnitario;

        // Costo promedio ponderado (en unidad de venta):
        const totalValorAnterior = stockAnterior * costoAnterior;
        const totalValorNuevo = cantidadEnUnidadVenta * costoNuevo;
        const stockNuevo = stockAnterior + cantidadEnUnidadVenta;
        const costoPromedioNuevo =
          stockNuevo > 0
            ? (totalValorAnterior + totalValorNuevo) / stockNuevo
            : costoNuevo;

        // Nota de conversión si aplica
        const notaConversion = factor > 1
          ? `${det.cantidad} ${producto.unidadCompra} × ${factor} = ${cantidadEnUnidadVenta} ${producto.unidadVenta?.nombre ?? 'uds'}`
          : (data.notas ?? null);

        // Actualizar producto
        await tx.barberProducto.update({
          where: { id: det.productoId },
          data: {
            stockActual:   new Prisma.Decimal(stockNuevo),
            costoPromedio: new Prisma.Decimal(costoPromedioNuevo),
          },
        });

        // Crear entrada en kardex
        await tx.barberKardex.create({
          data: {
            tenantId,
            branchId:      compra.branchId ?? null,
            productoId:    det.productoId,
            tipoMovimiento: 'COMPRA',
            referencia:    `COMPRA-${compra.id} / ${data.numeroDocumento}`,
            cantidad:      new Prisma.Decimal(cantidadEnUnidadVenta),
            costoUnitario: new Prisma.Decimal(costoNuevo),
            costoTotal:    new Prisma.Decimal(cantidadEnUnidadVenta * costoNuevo),
            stockAnterior: new Prisma.Decimal(stockAnterior),
            stockNuevo:    new Prisma.Decimal(stockNuevo),
            notas:         notaConversion,
            fecha:         data.fecha,
          },
        });

        // Actualizar stock por sucursal
        if (compra.branchId != null) {
          await upsertStockSucursal(tx, {
            tenantId,
            branchId:   compra.branchId,
            productoId: det.productoId,
            delta:      cantidadEnUnidadVenta,
          });
        }
      }
    }

    return compra;
  });
}

export async function anular(id: number, tenantId: number, motivo: string) {
  return prisma.$transaction(async (tx) => {
    const compra = await tx.barberCompra.findFirst({
      where: { id, tenantId },
      include: { detalles: true },
    });

    if (!compra) return null;

    // Si era PRODUCTO, revertir el inventario
    if (compra.tipoCompra === 'PRODUCTO') {
      for (const det of compra.detalles) {
        if (!det.productoId) continue;

        const producto = await tx.barberProducto.findUnique({
          where: { id: det.productoId },
          select: { stockActual: true, costoPromedio: true },
        });

        if (!producto) continue;

        const stockAnterior = Number(producto.stockActual);
        const cantidadSalida = Number(det.cantidad);
        const stockNuevo = Math.max(0, stockAnterior - cantidadSalida);

        await tx.barberProducto.update({
          where: { id: det.productoId },
          data: {
            stockActual: new Prisma.Decimal(stockNuevo),
            // El costoPromedio no cambia al anular — es solo ajuste de stock
          },
        });

        await tx.barberKardex.create({
          data: {
            tenantId,
            branchId:       compra.branchId ?? null,
            productoId:     det.productoId,
            tipoMovimiento: 'ANULACION',
            referencia:     `ANULACION-COMPRA-${id}`,
            cantidad:       new Prisma.Decimal(-cantidadSalida),
            costoUnitario:  det.costoUnitario,
            costoTotal:     new Prisma.Decimal(-Number(det.costoUnitario) * cantidadSalida),
            stockAnterior:  new Prisma.Decimal(stockAnterior),
            stockNuevo:     new Prisma.Decimal(stockNuevo),
            notas:          motivo,
            fecha:          new Date(),
          },
        });

        // Revertir stock por sucursal
        if (compra.branchId != null) {
          await upsertStockSucursal(tx, {
            tenantId,
            branchId:   compra.branchId,
            productoId: det.productoId,
            delta:      -cantidadSalida,
          });
        }
      }
    }

    return tx.barberCompra.update({
      where: { id },
      data: { estado: 'ANULADA', notas: compra.notas ? `${compra.notas} | ANULADA: ${motivo}` : `ANULADA: ${motivo}` },
      include: COMPRA_INCLUDE,
    });
  });
}

// ── Pagos CxP ────────────────────────────────────────────────────────────────

export type PagoCxPInput = {
  monto:       number;
  metodoPago:  string;
  referencia?: string;
  notas?:      string;
};

export async function registrarPago(tenantId: number, compraId: number, data: PagoCxPInput) {
  return prisma.$transaction(async (tx) => {
    const compra = await tx.barberCompra.findFirst({
      where:   { id: compraId, tenantId },
      include: { pagos: { select: { monto: true } } },
    });
    if (!compra) return null;

    const totalPagado = compra.pagos.reduce((s, p) => s + Number(p.monto), 0);
    const saldo = Number(compra.total) - totalPagado;

    if (data.monto > saldo + 0.001) return null; // sobre-pago

    const pago = await tx.barberPagoCxP.create({
      data: {
        tenantId,
        compraId,
        monto:      data.monto,
        metodoPago: data.metodoPago,
        referencia: data.referencia ?? null,
        notas:      data.notas      ?? null,
        fecha:      new Date(),
      },
    });

    // Si saldo queda en 0, marcar compra como PAGADA
    const nuevoSaldo = saldo - data.monto;
    if (nuevoSaldo <= 0.001) {
      await tx.barberCompra.update({
        where: { id: compraId },
        data:  { estado: 'PAGADA' },
      });
    }

    return pago;
  });
}

export async function getHistorialPagos(tenantId: number, compraId: number) {
  return prisma.barberPagoCxP.findMany({
    where:   { tenantId, compraId },
    orderBy: { fecha: 'desc' },
  });
}

// ── KPIs / Stats ─────────────────────────────────────────────────────────────

export async function getStats(tenantId: number, branchId?: number | null) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mesStart   = new Date(now.getFullYear(), now.getMonth(), 1);
  const mesEnd     = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const bWhere     = branchWhere(branchId);

  const [hoyAgg, mesAgg, creditosPendientes, productosMes, gastosMes] = await Promise.all([
    // Compras del día (no anuladas)
    prisma.barberCompra.aggregate({
      where: {
        tenantId, ...bWhere,
        fecha:  { gte: todayStart, lt: todayEnd },
        estado: { not: 'ANULADA' },
      },
      _sum: { total: true },
    }),
    // Compras del mes (no anuladas)
    prisma.barberCompra.aggregate({
      where: {
        tenantId, ...bWhere,
        fecha:  { gte: mesStart, lt: mesEnd },
        estado: { not: 'ANULADA' },
      },
      _sum: { total: true },
    }),
    // Créditos pendientes (CREDITO + REGISTRADA)
    prisma.barberCompra.count({
      where: {
        tenantId, ...bWhere,
        condicionPago: 'CREDITO',
        estado:        'REGISTRADA',
      },
    }),
    // Total en productos del mes
    prisma.barberCompra.aggregate({
      where: {
        tenantId, ...bWhere,
        tipoCompra: 'PRODUCTO',
        fecha:      { gte: mesStart, lt: mesEnd },
        estado:     { not: 'ANULADA' },
      },
      _sum: { total: true },
    }),
    // Total en gastos/servicios del mes
    prisma.barberCompra.aggregate({
      where: {
        tenantId, ...bWhere,
        tipoCompra: 'GASTO_SERVICIO',
        fecha:      { gte: mesStart, lt: mesEnd },
        estado:     { not: 'ANULADA' },
      },
      _sum: { total: true },
    }),
  ]);

  return {
    comprasHoy:       hoyAgg._sum.total?.toNumber()       ?? 0,
    comprasMes:       mesAgg._sum.total?.toNumber()        ?? 0,
    pendientesCobro:  creditosPendientes,
    totalProductosMes: productosMes._sum.total?.toNumber() ?? 0,
    totalGastosMes:   gastosMes._sum.total?.toNumber()     ?? 0,
  };
}
