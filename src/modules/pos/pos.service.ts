import { prisma } from '@/lib/prisma'
import * as repo from './pos.repository'
import { buildDTE, saveDTEJson, DTEItem, DTEPago } from './dte-builder.service'
import { getNextCorrelativo } from './correlativo.service'

// ─── Configuración del tenant ─────────────────────────────────────────────────

async function getTenantConfig(tenantId: number) {
  const tenant = await prisma.barberTenant.findFirst({ where: { id: tenantId } })
  if (!tenant) throw new Error('Tenant no encontrado')

  const modules = (tenant.modules as Record<string, unknown>) || {}
  const esContribuyente = (modules.esContribuyente as boolean) || false
  const usarCitas = (modules.appointments as boolean) !== false

  return {
    nombre: tenant.name,
    email: tenant.email || '',
    telefono: tenant.phone || '',
    direccion: tenant.address || '',
    esContribuyente,
    usarCitas,
  }
}

// ─── TURNO ────────────────────────────────────────────────────────────────────

export async function getTurnoActivo(tenantId: number) {
  const turno = await repo.getTurnoActivo(tenantId)
  if (!turno) return null

  const barberosHoy = await repo.getBarberosHoy(tenantId, turno.id)

  return {
    id: turno.id,
    fechaApertura: turno.fechaApertura.toISOString(),
    montoInicial: turno.montoInicial.toNumber(),
    usuarioApertura: turno.usuarioApertura.fullName,
    totalVentas: turno._count.ventas,
    barberosHoy,
  }
}

export async function abrirTurno(tenantId: number, usuarioId: number, montoInicial: number) {
  const existe = await repo.getTurnoActivo(tenantId)
  if (existe) throw new Error('Ya existe un turno abierto. Ciérralo primero.')
  return repo.abrirTurno(tenantId, usuarioId, montoInicial)
}

export async function cerrarTurno(
  turnoId: number,
  tenantId: number,
  usuarioId: number,
  montoContado: number,
  arqueoCaja: object,
  notasCierre?: string
) {
  const turno = await repo.getTurnoActivo(tenantId)
  if (!turno || turno.id !== turnoId) throw new Error('Turno no encontrado o ya cerrado')
  return repo.cerrarTurno(turnoId, tenantId, usuarioId, { montoContado, arqueoCaja, notasCierre })
}

export async function getTurnos(tenantId: number, page = 1) {
  const result = await repo.getTurnos(tenantId, page)
  return {
    ...result,
    items: result.items.map(t => ({
      id: t.id,
      fechaApertura: t.fechaApertura.toISOString(),
      fechaCierre: t.fechaCierre?.toISOString() || null,
      estado: t.estado,
      montoInicial: t.montoInicial.toNumber(),
      totalEfectivo: t.totalEfectivo.toNumber(),
      totalTarjeta: t.totalTarjeta.toNumber(),
      totalTransferencia: t.totalTransferencia.toNumber(),
      totalQR: t.totalQR.toNumber(),
      totalVentas: t.totalVentas.toNumber(),
      cantidadServicios: t.cantidadServicios,
      montoEsperado: t.montoEsperado?.toNumber() || null,
      montoContado: t.montoContado?.toNumber() || null,
      diferencia: t.diferencia?.toNumber() || null,
      arqueoCaja: t.arqueoCaja,
      notasCierre: t.notasCierre,
      usuarioApertura: t.usuarioApertura.fullName,
      usuarioCierre: t.usuarioCierre?.fullName || null,
      totalVentasCount: t._count.ventas,
    })),
  }
}

// ─── VENTA ────────────────────────────────────────────────────────────────────

export interface CreateVentaInput {
  turnoId: number
  tipoDte: '01' | '03'
  clienteNombre?: string
  clienteDocumento?: string
  clienteNrc?: string
  clienteId?: number
  appointmentId?: number
  items: Array<{
    barberoId?: number
    servicioId?: number
    productoId?: number
    descripcion: string
    cantidad: number
    precioUnitario: number
    descuento?: number
    esGravado?: boolean
  }>
  pagos: Array<{
    metodo: 'CASH' | 'CARD' | 'TRANSFER' | 'QR'
    monto: number
    recibido?: number
    vuelto?: number
    referencia?: string
  }>
}

export async function createVenta(tenantId: number, input: CreateVentaInput) {
  // Validaciones básicas
  if (!input.items || input.items.length === 0) throw new Error('La venta debe tener al menos un ítem')
  if (!input.pagos || input.pagos.length === 0) throw new Error('Debe especificar al menos una forma de pago')

  // Barbero obligatorio para ítems de servicio
  for (const item of input.items) {
    if (!item.productoId && !item.barberoId) throw new Error(`El ítem "${item.descripcion}" es un servicio y requiere barbero asignado`)
  }

  // Nota: la validación de stock se realiza DENTRO de la transacción en pos.repository.ts
  // para evitar race conditions entre requests simultáneos.

  const turnoActivo = await repo.getTurnoActivo(tenantId)
  if (!turnoActivo || turnoActivo.id !== input.turnoId) throw new Error('No hay turno activo o el turnoId no coincide')

  const config = await getTenantConfig(tenantId)

  // Número correlativo interno
  const numero = await repo.getNextNumeroVenta(tenantId)

  // DTE
  const now = new Date()
  const fecEmi = now.toISOString().slice(0, 10)
  const horEmi = now.toTimeString().slice(0, 8)

  const { siguiente: numCorrelativo, numeroControl } = await getNextCorrelativo(tenantId, input.tipoDte)
  void numCorrelativo

  // Barberos para snapshot (solo ítems con barbero)
  const barberIds = [...new Set(input.items.filter(i => i.barberoId).map(i => i.barberoId!))]
  const barbers = await prisma.barber.findMany({
    where: { id: { in: barberIds } },
    include: { user: { select: { fullName: true } } },
  })
  const barberMap = new Map(barbers.map(b => [b.id, b.user.fullName]))

  // Calcular comisiones por línea según comisionTipo del servicio/producto
  const comisionesPorItem: number[] = await Promise.all(input.items.map(async (item) => {
    const subtotalItem = item.precioUnitario * item.cantidad - (item.descuento || 0)
    if (item.productoId) {
      const prod = await prisma.barberProducto.findFirst({ where: { id: item.productoId, tenantId } })
      if (!prod || prod.comisionTipo === 'NINGUNA') return 0
      if (prod.comisionTipo === 'PORCENTAJE')
        return parseFloat((subtotalItem * Number(prod.precioComision ?? 0) / 100).toFixed(2))
      return parseFloat((Number(prod.precioComision ?? 0) * item.cantidad).toFixed(2))
    } else if (item.servicioId) {
      const svc = await prisma.barberService.findFirst({ where: { id: item.servicioId, tenantId } })
      if (!svc || svc.comisionTipo === 'NINGUNA') return 0
      if (svc.comisionTipo === 'PORCENTAJE')
        return parseFloat((subtotalItem * Number(svc.comisionBarbero ?? 0) / 100).toFixed(2))
      return parseFloat((Number(svc.comisionBarbero ?? 0) * item.cantidad).toFixed(2))
    }
    return 0
  }))

  // Calcular totales
  const dteItems: DTEItem[] = input.items.map((item, idx) => ({
    numItem: idx + 1,
    descripcion: item.descripcion,
    barberoNombre: item.barberoId ? (barberMap.get(item.barberoId) || '') : '',
    cantidad: item.cantidad,
    precioUni: item.precioUnitario,
    montoDescu: item.descuento || 0,
    esGravado: config.esContribuyente ? (item.esGravado !== false) : false,
  }))

  const metodoCodigo = { CASH: '01', CARD: '02', TRANSFER: '03', QR: '04' } as const
  const dtePagos: DTEPago[] = input.pagos.map(p => ({
    codigo: metodoCodigo[p.metodo],
    montoPago: p.monto,
    vuelto: p.vuelto,
    referencia: p.referencia,
  }))

  const dte = buildDTE({
    tipoDte: input.tipoDte,
    numeroControl,
    fecEmi,
    horEmi,
    emisor: {
      nombre: config.nombre,
      telefono: config.telefono,
      email: config.email,
      direccion: config.direccion,
    },
    receptor: {
      nombre: input.clienteNombre || 'Consumidor Final',
      tipoDocumento: input.clienteDocumento ? (input.tipoDte === '03' ? '36' : '13') : null,
      numDocumento: input.clienteDocumento || null,
      nrc: input.clienteNrc || null,
    },
    items: dteItems,
    pagos: dtePagos,
    esContribuyente: config.esContribuyente,
    simulada: true,
  })

  // DTE JSON se guarda en la base de datos (no en disco — incompatible con Vercel serverless)

  // Calcular totales para BD
  let subtotal = 0, totalGravado = 0, totalExento = 0, totalIva = 0, totalDescuento = 0
  const detallesBD = input.items.map((item, idx) => {
    const dteItem = dte.cuerpoDocumento[idx]
    const sub = dteItem.ventaExenta + dteItem.ventaGravada
    subtotal += sub
    totalGravado += dteItem.ventaGravada
    totalExento += dteItem.ventaExenta
    totalIva += dteItem.ivaItem
    totalDescuento += dteItem.montoDescu
    return {
      numItem: idx + 1,
      barberoId: item.barberoId,
      servicioId: item.servicioId,
      productoId: item.productoId,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      descuento: dteItem.montoDescu,
      subtotal: parseFloat(sub.toFixed(2)),
      esGravado: dteItem.esGravado,
      ivaItem: dteItem.ivaItem,
      comisionLinea: comisionesPorItem[idx] ?? 0,
    }
  })

  const total = dte.resumen.totalPagar

  const venta = await repo.createVenta(tenantId, input.turnoId, {
    numero,
    codigoGeneracion: dte.identificacion.codigoGeneracion,
    numeroControl,
    tipoDte: input.tipoDte,
    clienteId: input.clienteId,
    clienteNombre: input.clienteNombre || 'Consumidor Final',
    clienteDocumento: input.clienteDocumento,
    clienteNrc: input.clienteNrc,
    subtotal: parseFloat(subtotal.toFixed(2)),
    descuentoTotal: parseFloat(totalDescuento.toFixed(2)),
    totalGravado: parseFloat(totalGravado.toFixed(2)),
    totalExento: parseFloat(totalExento.toFixed(2)),
    iva: parseFloat(totalIva.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    appointmentId: input.appointmentId,
    simulada: true,
    dteJson: dte as object,
    detalles: detallesBD,
    pagos: input.pagos,
  })

  return { venta: serializeVenta(venta), dte }
}

export async function getVentas(tenantId: number, filters: {
  estado?: string
  tipoDte?: string
  turnoId?: number
  desde?: string
  hasta?: string
  page?: number
}) {
  const result = await repo.getVentas(tenantId, {
    ...filters,
    desde: filters.desde ? new Date(filters.desde) : undefined,
    hasta: filters.hasta ? new Date(filters.hasta) : undefined,
  })
  return { ...result, items: result.items.map(serializeVenta) }
}

export async function getVentaById(id: number, tenantId: number) {
  const v = await repo.getVentaById(id, tenantId)
  if (!v) throw new Error('Venta no encontrada')
  return serializeVenta(v)
}

export async function anularVenta(id: number, tenantId: number, motivo: string) {
  const v = await repo.getVentaById(id, tenantId)
  if (!v) throw new Error('Venta no encontrada')
  if (v.estado === 'ANULADA') throw new Error('La venta ya está anulada')
  return repo.anularVenta(id, tenantId, motivo)
}

// ─── BARBEROS HOY ─────────────────────────────────────────────────────────────

export async function getBarberosHoy(tenantId: number) {
  return repo.getBarberosHoy(tenantId)
}

// ─── STATS ────────────────────────────────────────────────────────────────────

export async function getPosStats(tenantId: number) {
  return repo.getPosStats(tenantId)
}

// ─── NOTAS DE CRÉDITO ─────────────────────────────────────────────────────────

export async function createNotaCredito(tenantId: number, ventaId: number, motivo: string) {
  const venta = await repo.getVentaById(ventaId, tenantId)
  if (!venta) throw new Error('Venta no encontrada')
  if (venta.estado === 'ANULADA') throw new Error('No se puede hacer NC sobre una venta anulada')

  const { siguiente: numCorrelativo, numeroControl } = await getNextCorrelativo(tenantId, '05')
  void numCorrelativo

  const config = await getTenantConfig(tenantId)
  const now = new Date()

  const dte = buildDTE({
    tipoDte: '05',
    numeroControl,
    fecEmi: now.toISOString().slice(0, 10),
    horEmi: now.toTimeString().slice(0, 8),
    emisor: { nombre: config.nombre, telefono: config.telefono, email: config.email, direccion: config.direccion },
    receptor: { nombre: venta.clienteNombre || 'Consumidor Final', numDocumento: venta.clienteDocumento || null },
    items: venta.detalles.map((d, idx) => ({
      numItem: idx + 1,
      descripcion: d.descripcion,
      barberoNombre: (d as any).barbero?.user?.fullName || '',
      cantidad: d.cantidad,
      precioUni: d.precioUnitario.toNumber(),
      montoDescu: 0,
      esGravado: d.esGravado,
    })),
    pagos: [{ codigo: '01', montoPago: venta.total.toNumber() }],
    esContribuyente: config.esContribuyente,
    simulada: true,
    ventaOriginal: {
      numeroControl: venta.numeroControl || '',
      codigoGeneracion: venta.codigoGeneracion,
      fecEmi: venta.createdAt.toISOString().slice(0, 10),
    },
  })

  return repo.createNotaCredito({
    tenantId,
    ventaOriginalId: ventaId,
    codigoGeneracion: dte.identificacion.codigoGeneracion,
    numeroControl,
    motivo,
    total: venta.total.toNumber(),
    simulada: true,
  })
}

export async function getNotasCredito(tenantId: number) {
  const ncs = await repo.getNotasCredito(tenantId)
  return ncs.map(nc => ({
    ...nc,
    total: nc.total.toNumber(),
    createdAt: nc.createdAt.toISOString(),
    ventaOriginal: nc.ventaOriginal ? {
      numero: nc.ventaOriginal.numero,
      numeroControl: nc.ventaOriginal.numeroControl,
      total: nc.ventaOriginal.total.toNumber(),
    } : null,
  }))
}

// ─── Serializer ───────────────────────────────────────────────────────────────

function serializeVenta(v: any) {
  return {
    id: v.id,
    numero: v.numero,
    codigoGeneracion: v.codigoGeneracion,
    numeroControl: v.numeroControl,
    tipoDte: v.tipoDte,
    clienteNombre: v.clienteNombre,
    clienteDocumento: v.clienteDocumento,
    clienteNrc: v.clienteNrc,
    subtotal: v.subtotal?.toNumber?.() ?? v.subtotal,
    descuentoTotal: v.descuentoTotal?.toNumber?.() ?? v.descuentoTotal,
    totalGravado: v.totalGravado?.toNumber?.() ?? v.totalGravado,
    totalExento: v.totalExento?.toNumber?.() ?? v.totalExento,
    iva: v.iva?.toNumber?.() ?? v.iva,
    total: v.total?.toNumber?.() ?? v.total,
    estado: v.estado,
    motivoAnulacion: v.motivoAnulacion,
    simulada: v.simulada,
    createdAt: v.createdAt?.toISOString?.() ?? v.createdAt,
    turnoId: v.turnoId,
    detalles: (v.detalles || []).map((d: any) => ({
      id: d.id,
      numItem: d.numItem,
      descripcion: d.descripcion,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario?.toNumber?.() ?? d.precioUnitario,
      descuento: d.descuento?.toNumber?.() ?? d.descuento,
      subtotal: d.subtotal?.toNumber?.() ?? d.subtotal,
      esGravado: d.esGravado,
      ivaItem: d.ivaItem?.toNumber?.() ?? d.ivaItem,
      barberoId: d.barberoId,
      barberoNombre: d.barbero?.user?.fullName || '',
      servicioId: d.servicioId,
      servicioNombre: d.servicio?.name || d.descripcion,
      productoId: d.productoId,
    })),
    pagos: (v.pagos || []).map((p: any) => ({
      id: p.id,
      metodo: p.metodo,
      monto: p.monto?.toNumber?.() ?? p.monto,
      recibido: p.recibido?.toNumber?.() ?? p.recibido,
      vuelto: p.vuelto?.toNumber?.() ?? p.vuelto,
      referencia: p.referencia,
    })),
  }
}
