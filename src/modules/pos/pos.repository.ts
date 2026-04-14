import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { branchWhere } from '@/lib/branch-filter'

// ─── TURNOS ───────────────────────────────────────────────────────────────────

export async function getTurnoActivo(tenantId: number, branchId?: number | null) {
  return prisma.barberTurno.findFirst({
    where: { tenantId, ...branchWhere(branchId), estado: 'ABIERTO' },
    include: {
      usuarioApertura: { select: { fullName: true } },
      _count: { select: { ventas: true } },
    },
    orderBy: { fechaApertura: 'desc' },
  })
}

export async function abrirTurno(tenantId: number, usuarioId: number, montoInicial: number) {
  return prisma.barberTurno.create({
    data: { tenantId, usuarioAperturaId: usuarioId, montoInicial },
  })
}

export async function cerrarTurno(
  turnoId: number,
  tenantId: number,
  usuarioId: number,
  data: {
    montoContado: number
    arqueoCaja: object
    notasCierre?: string
  }
) {
  // Calcular totales del turno
  const ventas = await prisma.barberVenta.findMany({
    where: { turnoId, tenantId, estado: 'ACTIVA' },
    include: { pagos: true, detalles: true },
  })

  let totalEfectivo = 0, totalTarjeta = 0, totalTransferencia = 0, totalQR = 0
  let cantidadServicios = 0

  for (const v of ventas) {
    cantidadServicios += v.detalles.length
    for (const p of v.pagos) {
      const monto = p.monto.toNumber()
      if (p.metodo === 'CASH') totalEfectivo += monto
      else if (p.metodo === 'CARD') totalTarjeta += monto
      else if (p.metodo === 'TRANSFER') totalTransferencia += monto
      else if (p.metodo === 'QR') totalQR += monto
    }
  }

  const turno = await prisma.barberTurno.findFirst({ where: { id: turnoId, tenantId } })
  const montoInicial = turno?.montoInicial.toNumber() || 0
  const totalVentas = totalEfectivo + totalTarjeta + totalTransferencia + totalQR
  const montoEsperado = parseFloat((montoInicial + totalEfectivo).toFixed(2))
  const diferencia = parseFloat((data.montoContado - montoEsperado).toFixed(2))

  return prisma.barberTurno.update({
    where: { id: turnoId },
    data: {
      estado: 'CERRADO',
      fechaCierre: new Date(),
      usuarioCierreId: usuarioId,
      totalEfectivo: parseFloat(totalEfectivo.toFixed(2)),
      totalTarjeta: parseFloat(totalTarjeta.toFixed(2)),
      totalTransferencia: parseFloat(totalTransferencia.toFixed(2)),
      totalQR: parseFloat(totalQR.toFixed(2)),
      totalVentas: parseFloat(totalVentas.toFixed(2)),
      cantidadServicios,
      montoEsperado,
      montoContado: data.montoContado,
      diferencia,
      arqueoCaja: data.arqueoCaja as Prisma.InputJsonValue,
      notasCierre: data.notasCierre,
    },
  })
}

export async function getTurnos(tenantId: number, page = 1, limit = 20, branchId?: number | null) {
  const skip = (page - 1) * limit
  const bWhere = branchWhere(branchId)
  const [items, total] = await Promise.all([
    prisma.barberTurno.findMany({
      where: { tenantId, ...bWhere },
      include: {
        usuarioApertura: { select: { fullName: true } },
        usuarioCierre: { select: { fullName: true } },
        _count: { select: { ventas: true } },
      },
      orderBy: { fechaApertura: 'desc' },
      skip,
      take: limit,
    }),
    prisma.barberTurno.count({ where: { tenantId, ...bWhere } }),
  ])
  return { items, total, page, limit }
}

// ─── BARBEROS HOY ─────────────────────────────────────────────────────────────

export async function getBarberosHoy(tenantId: number, turnoId?: number) {
  const whereVenta: Prisma.BarberVentaWhereInput = {
    tenantId,
    estado: 'ACTIVA',
    ...(turnoId ? { turnoId } : {
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    }),
  }

  const detalles = await prisma.barberDetalleVenta.findMany({
    where: { venta: whereVenta, barberoId: { not: null } },
    include: {
      barbero: { include: { user: { select: { fullName: true } } } },
      servicio: { select: { name: true } },
      venta: { select: { createdAt: true } },
    },
  })

  // Agrupar por barbero (solo líneas con barbero asignado)
  const mapa = new Map<number, {
    barberoId: number
    nombre: string
    servicios: number
    total: number
    desglose: Map<string, { cantidad: number; subtotal: number }>
  }>()

  for (const d of detalles) {
    if (!d.barberoId || !d.barbero) continue
    const bid = d.barberoId
    const nombre = d.barbero.user.fullName
    if (!mapa.has(bid)) {
      mapa.set(bid, { barberoId: bid, nombre, servicios: 0, total: 0, desglose: new Map() })
    }
    const entry = mapa.get(bid)!
    entry.servicios++
    const sub = d.subtotal.toNumber()
    entry.total += sub

    const key = d.descripcion + ':' + d.precioUnitario.toNumber().toFixed(2)
    const desc = entry.desglose.get(key)
    if (desc) { desc.cantidad++; desc.subtotal += sub }
    else entry.desglose.set(key, { cantidad: 1, subtotal: sub })
  }

  return Array.from(mapa.values()).map(b => ({
    barberoId: b.barberoId,
    nombre: b.nombre,
    servicios: b.servicios,
    total: parseFloat(b.total.toFixed(2)),
    desglose: Array.from(b.desglose.entries()).map(([k, v]) => {
      const [desc, precio] = k.split(':')
      return { descripcion: desc, precioUnitario: parseFloat(precio), ...v, subtotal: parseFloat(v.subtotal.toFixed(2)) }
    }),
  })).sort((a, b) => b.total - a.total)
}

export async function findProductoById(id: number, tenantId: number) {
  return prisma.barberProducto.findFirst({ where: { id, tenantId, activo: true } })
}

// ─── VENTAS ───────────────────────────────────────────────────────────────────

export async function getNextNumeroVenta(tenantId: number): Promise<number> {
  const last = await prisma.barberVenta.findFirst({
    where: { tenantId },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  })
  return (last?.numero || 0) + 1
}

export async function createVenta(
  tenantId: number,
  turnoId: number,
  data: {
    numero: number
    codigoGeneracion: string
    numeroControl?: string
    tipoDte: string
    clienteId?: number
    clienteNombre?: string
    clienteDocumento?: string
    clienteNrc?: string
    subtotal: number
    descuentoTotal: number
    totalGravado: number
    totalExento: number
    iva: number
    total: number
    appointmentId?: number
    simulada: boolean
    dteJson?: object
    detalles: Array<{
      numItem: number
      barberoId?: number
      servicioId?: number
      productoId?: number
      descripcion: string
      cantidad: number
      precioUnitario: number
      descuento: number
      subtotal: number
      esGravado: boolean
      ivaItem: number
      comisionLinea?: number
    }>
    pagos: Array<{
      metodo: 'CASH' | 'CARD' | 'TRANSFER' | 'QR'
      monto: number
      recibido?: number
      vuelto?: number
      referencia?: string
    }>
  }
) {
  return prisma.$transaction(async (tx) => {
    const venta = await tx.barberVenta.create({
      data: {
        tenantId,
        turnoId,
        numero: data.numero,
        codigoGeneracion: data.codigoGeneracion,
        numeroControl: data.numeroControl,
        tipoDte: data.tipoDte,
        clienteId: data.clienteId,
        clienteNombre: data.clienteNombre,
        clienteDocumento: data.clienteDocumento,
        clienteNrc: data.clienteNrc,
        subtotal: data.subtotal,
        descuentoTotal: data.descuentoTotal,
        totalGravado: data.totalGravado,
        totalExento: data.totalExento,
        iva: data.iva,
        total: data.total,
        appointmentId: data.appointmentId,
        simulada: data.simulada,
        dteJson: data.dteJson as Prisma.InputJsonValue ?? Prisma.JsonNull,
        detalles: {
          create: data.detalles.map(d => ({
            numItem: d.numItem,
            barberoId: d.barberoId ?? null,
            servicioId: d.servicioId,
            productoId: d.productoId,
            descripcion: d.descripcion,
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
            descuento: d.descuento,
            subtotal: d.subtotal,
            esGravado: d.esGravado,
            ivaItem: d.ivaItem,
            comisionLinea: d.comisionLinea ?? 0,
          })),
        },
        pagos: {
          create: data.pagos.map(p => ({
            metodo: p.metodo,
            monto: p.monto,
            recibido: p.recibido,
            vuelto: p.vuelto,
            referencia: p.referencia,
          })),
        },
      },
      include: {
        detalles: { include: { barbero: { include: { user: { select: { fullName: true } } } }, servicio: true, producto: true } },
        pagos: true,
      },
    })

    // Descontar stock de productos vendidos (validación DENTRO de la transacción previene race conditions)
    for (const d of data.detalles) {
      if (!d.productoId) continue
      const prod = await tx.barberProducto.findFirst({ where: { id: d.productoId, tenantId } })
      if (!prod) throw new Error(`Producto no encontrado (id: ${d.productoId})`)
      if (Number(prod.stockActual) < d.cantidad) {
        throw new Error(`Stock insuficiente para "${prod.nombre}": disponible ${Number(prod.stockActual)}, solicitado ${d.cantidad}`)
      }
      const stockAnterior = Number(prod.stockActual)
      const stockNuevo = parseFloat((stockAnterior - d.cantidad).toFixed(4))
      await tx.barberKardex.create({
        data: {
          tenantId,
          productoId: d.productoId,
          tipoMovimiento: 'SALIDA',
          referencia: `VENTA-${venta.numero}`,
          cantidad: d.cantidad,
          costoUnitario: Number(prod.costoPromedio),
          costoTotal: parseFloat((d.cantidad * Number(prod.costoPromedio)).toFixed(4)),
          stockAnterior,
          stockNuevo,
          notas: `POS venta #${venta.numero}`,
          fecha: new Date(),
        },
      })
      await tx.barberProducto.update({
        where: { id: d.productoId },
        data: { stockActual: stockNuevo },
      })
    }

    return venta
  })
}

export async function getVentas(tenantId: number, filters: {
  estado?: string
  tipoDte?: string
  turnoId?: number
  desde?: Date
  hasta?: Date
  page?: number
  limit?: number
  branchId?: number | null
}) {
  const { page = 1, limit = 20 } = filters
  const skip = (page - 1) * limit

  const where: Prisma.BarberVentaWhereInput = {
    tenantId,
    ...branchWhere(filters.branchId),
    ...(filters.estado && { estado: filters.estado as 'ACTIVA' | 'ANULADA' }),
    ...(filters.tipoDte && { tipoDte: filters.tipoDte }),
    ...(filters.turnoId && { turnoId: filters.turnoId }),
    ...(filters.desde || filters.hasta ? {
      createdAt: {
        ...(filters.desde && { gte: filters.desde }),
        ...(filters.hasta && { lte: filters.hasta }),
      }
    } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.barberVenta.findMany({
      where,
      include: {
        detalles: {
          include: {
            barbero: { include: { user: { select: { fullName: true } } } },
            servicio: { select: { name: true } },
          },
        },
        pagos: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.barberVenta.count({ where }),
  ])

  return { items, total, page, limit }
}

export async function getVentaById(id: number, tenantId: number) {
  return prisma.barberVenta.findFirst({
    where: { id, tenantId },
    include: {
      detalles: {
        include: {
          barbero: { include: { user: { select: { fullName: true } } } },
          servicio: true,
        },
      },
      pagos: true,
      turno: true,
    },
  })
}

export async function anularVenta(id: number, tenantId: number, motivo: string) {
  return prisma.$transaction(async (tx) => {
    const venta = await tx.barberVenta.findFirst({
      where: { id, tenantId },
      include: { detalles: true },
    })
    if (!venta) throw new Error('Venta no encontrada')

    // Restaurar stock de cada producto incluido en la venta
    for (const d of venta.detalles) {
      if (!d.productoId) continue
      const prod = await tx.barberProducto.findFirst({ where: { id: d.productoId, tenantId } })
      if (!prod) continue
      const stockAnterior = Number(prod.stockActual)
      const stockNuevo = parseFloat((stockAnterior + Number(d.cantidad)).toFixed(4))
      await tx.barberKardex.create({
        data: {
          tenantId,
          productoId: d.productoId,
          tipoMovimiento: 'ENTRADA',
          referencia: `ANULACION-${venta.numero}`,
          cantidad: Number(d.cantidad),
          costoUnitario: Number(prod.costoPromedio),
          costoTotal: parseFloat((Number(d.cantidad) * Number(prod.costoPromedio)).toFixed(4)),
          stockAnterior,
          stockNuevo,
          notas: `Anulación de venta #${venta.numero}: ${motivo}`,
          fecha: new Date(),
        },
      })
      await tx.barberProducto.update({
        where: { id: d.productoId },
        data: { stockActual: stockNuevo },
      })
    }

    return tx.barberVenta.update({
      where: { id },
      data: { estado: 'ANULADA', motivoAnulacion: motivo },
    })
  })
}

// ─── NOTAS DE CRÉDITO ─────────────────────────────────────────────────────────

export async function createNotaCredito(data: {
  tenantId: number
  ventaOriginalId: number
  codigoGeneracion: string
  numeroControl?: string
  motivo: string
  total: number
  simulada: boolean
}) {
  return prisma.barberNotaCredito.create({ data })
}

export async function getNotasCredito(tenantId: number) {
  return prisma.barberNotaCredito.findMany({
    where: { tenantId },
    include: { ventaOriginal: { select: { numero: true, numeroControl: true, total: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

// ─── STATS POS ────────────────────────────────────────────────────────────────

export async function getPosStats(tenantId: number, branchId?: number | null) {
  const hoy = new Date()
  const inicioHoy = new Date(hoy.setHours(0, 0, 0, 0))
  const finHoy = new Date(new Date().setHours(23, 59, 59, 999))
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const bWhere = branchWhere(branchId)

  const [ventasHoy, ventasMes, turnoActivo, totalVentasHoy] = await Promise.all([
    prisma.barberVenta.count({ where: { tenantId, ...bWhere, estado: 'ACTIVA', createdAt: { gte: inicioHoy, lte: finHoy } } }),
    prisma.barberVenta.count({ where: { tenantId, ...bWhere, estado: 'ACTIVA', createdAt: { gte: inicioMes } } }),
    prisma.barberTurno.findFirst({ where: { tenantId, ...bWhere, estado: 'ABIERTO' }, select: { id: true, fechaApertura: true, montoInicial: true } }),
    prisma.barberVenta.aggregate({
      where: { tenantId, ...bWhere, estado: 'ACTIVA', createdAt: { gte: inicioHoy, lte: finHoy } },
      _sum: { total: true },
    }),
  ])

  return {
    ventasHoy,
    ventasMes,
    ingresoHoy: totalVentasHoy._sum.total?.toNumber() || 0,
    turnoActivo,
  }
}
