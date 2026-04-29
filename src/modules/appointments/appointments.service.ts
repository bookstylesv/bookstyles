/**
 * appointments.service.ts — Lógica de negocio para citas.
 */

import { NotFoundError, ValidationError, ConflictError } from '@/lib/errors';
import { addMinutes } from 'date-fns';
import * as repo from './appointments.repository';
import type { BarberAppointmentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function listAppointments(tenantId: number, query: Record<string, string> = {}) {
  const filters: repo.AppointmentFilters = {};
  if (query.status) filters.status = query.status as BarberAppointmentStatus;
  if (query.barberId) filters.barberId = Number(query.barberId);
  if (query.from) filters.from = new Date(query.from);
  if (query.to) filters.to = new Date(query.to);

  const appointments = await repo.findAllAppointments(tenantId, filters);
  return appointments.map(serializeAppointment);
}

export async function getAppointment(id: number, tenantId: number) {
  const appt = await repo.findAppointmentById(id, tenantId);
  if (!appt) throw new NotFoundError('Cita');
  return serializeAppointment(appt);
}

export async function createAppointment(tenantId: number, body: unknown) {
  const b = body as Record<string, unknown>;
  if (!b.clientId || !b.barberId || !b.serviceId || !b.startTime) {
    throw new ValidationError('clientId, barberId, serviceId y startTime son requeridos');
  }

  const service = await prisma.barberService.findFirst({
    where: { id: Number(b.serviceId), tenantId },
  });
  if (!service) throw new NotFoundError('Servicio');

  const startTime = new Date(b.startTime as string);
  const endTime = addMinutes(startTime, service.duration);

  // Verificar solapamiento: el endpoint público ya lo hace; aquí lo aplicamos también al dashboard
  const conflict = await prisma.barberAppointment.findFirst({
    where: {
      tenantId,
      barberId: Number(b.barberId),
      status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });
  if (conflict) throw new ConflictError('El barbero ya tiene una cita en ese horario');

  const appt = await repo.createAppointment(tenantId, {
    clientId: Number(b.clientId),
    barberId: Number(b.barberId),
    serviceId: Number(b.serviceId),
    startTime,
    endTime,
    notes: b.notes as string | undefined,
  });
  return serializeAppointment(appt);
}

export async function updateAppointment(id: number, tenantId: number, body: unknown) {
  const existing = await repo.findAppointmentById(id, tenantId);
  if (!existing) throw new NotFoundError('Cita');

  const b = body as Record<string, unknown>;
  const data: Partial<repo.AppointmentCreateInput> = {};
  if (b.startTime) {
    data.startTime = new Date(b.startTime as string);
    const service = await prisma.barberService.findFirst({
      where: { id: existing.serviceId, tenantId },
    });
    data.endTime = addMinutes(data.startTime, service?.duration ?? 30);
  }
  if (b.barberId) data.barberId = Number(b.barberId);
  if (b.serviceId) data.serviceId = Number(b.serviceId);
  if (b.notes !== undefined) data.notes = b.notes as string;

  // Si cambia horario o barbero, verificar que no haya solapamiento
  if (data.startTime || data.barberId) {
    const checkBarberId = data.barberId ?? existing.barberId;
    const checkStart = data.startTime ?? existing.startTime;
    const checkEnd = data.endTime ?? existing.endTime;
    const conflict = await prisma.barberAppointment.findFirst({
      where: {
        tenantId,
        barberId: checkBarberId,
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        startTime: { lt: checkEnd },
        endTime: { gt: checkStart },
        NOT: { id },
      },
    });
    if (conflict) throw new ConflictError('El barbero ya tiene una cita en ese horario');
  }

  const updated = await repo.updateAppointment(id, tenantId, data);
  return serializeAppointment(updated);
}

export async function cancelAppointment(id: number, tenantId: number, reason?: string) {
  const existing = await repo.findAppointmentById(id, tenantId);
  if (!existing) throw new NotFoundError('Cita');
  if (existing.status === 'CANCELLED') throw new ValidationError('La cita ya está cancelada');

  const updated = await repo.updateAppointmentStatus(id, tenantId, 'CANCELLED', reason);
  return serializeAppointment(updated);
}

// ── Stats POS — ventas últimos 7 días ────────────────────────────────────────
const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

async function getVentasPosSemana(tenantId: number) {
  const now = new Date();
  // Construir los 7 días con sus etiquetas
  const days: Array<{ date: Date; label: string }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push({ date: d, label: DAY_LABELS[d.getDay()] });
  }

  // Una sola query en lugar de 7 queries en loop
  const since = days[0].date;
  const until = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const ventas = await prisma.barberVenta.findMany({
    where: { tenantId, estado: 'ACTIVA', createdAt: { gte: since, lt: until } },
    select: { total: true, createdAt: true },
  });

  // Agrupar en memoria por fecha exacta
  const byDate = new Map<string, { total: number; count: number }>();
  for (const { date } of days) byDate.set(date.toDateString(), { total: 0, count: 0 });
  for (const v of ventas) {
    const key = new Date(v.createdAt.getFullYear(), v.createdAt.getMonth(), v.createdAt.getDate()).toDateString();
    const entry = byDate.get(key);
    if (entry) { entry.total += Number(v.total); entry.count++; }
  }

  return days.map(({ date, label }) => {
    const entry = byDate.get(date.toDateString()) ?? { total: 0, count: 0 };
    return { day: label, total: parseFloat(entry.total.toFixed(2)), count: entry.count };
  });
}

export async function getStats(tenantId: number) {
  const now      = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const since30    = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const since7     = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);
  const inicioSeisM = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    citasHoy, citasPendientes, ingresosAppt, clientesActivos, citasSemana,
    ventasPosHoy, ingresosPosHoyAgg, ventasSemana, ventasMesAgg, clientesPosAgg,
    ventasMensuales, gastosMensuales, detallesTop,
  ] = await Promise.all([
    repo.countTodayAppointments(tenantId, todayStart, todayEnd),
    repo.countPendingAppointments(tenantId),
    repo.sumPaymentsToday(tenantId, todayStart, todayEnd),
    repo.countActiveClientsLast30Days(tenantId, since30),
    repo.countAppointmentsLast7Days(tenantId),
    // POS: ventas de hoy
    prisma.barberVenta.count({
      where: { tenantId, estado: 'ACTIVA', createdAt: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.barberVenta.aggregate({
      where: { tenantId, estado: 'ACTIVA', createdAt: { gte: todayStart, lt: todayEnd } },
      _sum: { total: true },
    }),
    // POS: últimos 7 días (para gráfica de barras)
    getVentasPosSemana(tenantId),
    // POS: últimos 7 días (para ticket promedio)
    prisma.barberVenta.aggregate({
      where: { tenantId, estado: 'ACTIVA', createdAt: { gte: since7 } },
      _sum:   { total: true },
      _count: { id: true },
    }),
    // POS: clientes únicos últimos 30 días
    prisma.barberVenta.findMany({
      where:  { tenantId, estado: 'ACTIVA', createdAt: { gte: since30 }, clienteId: { not: null } },
      select: { clienteId: true },
      distinct: ['clienteId'],
    }),
    // GRÁFICA: ingresos mensuales (ventas POS últimos 6 meses)
    prisma.barberVenta.findMany({
      where: { tenantId, estado: 'ACTIVA', createdAt: { gte: inicioSeisM } },
      select: { total: true, createdAt: true },
    }),
    // GRÁFICA: gastos mensuales últimos 6 meses
    prisma.barberGasto.findMany({
      where: { tenantId, fecha: { gte: inicioSeisM } },
      select: { monto: true, fecha: true },
    }),
    // GRÁFICA: top servicios por ingreso (últimos 30 días)
    prisma.barberDetalleVenta.findMany({
      where: {
        servicioId: { not: null },
        venta: { tenantId, estado: 'ACTIVA', createdAt: { gte: since30 } },
      },
      select: { descripcion: true, subtotal: true, cantidad: true },
    }),
  ]);

  const ingresosPosHoy = ingresosPosHoyAgg._sum.total?.toNumber() ?? 0;
  const ingresosHoy    = parseFloat((ingresosAppt + ingresosPosHoy).toFixed(2));
  const ventasSemanaTotal = ventasMesAgg._sum.total?.toNumber() ?? 0;
  const ventasSemanaCount = ventasMesAgg._count.id;
  const ticketPromedio = ventasSemanaCount > 0
    ? parseFloat((ventasSemanaTotal / ventasSemanaCount).toFixed(2))
    : 0;

  // ── Ingresos vs Gastos últimos 6 meses ─────────────────
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const mapaM = new Map<string, { ingresos: number; gastos: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    mapaM.set(k, { ingresos: 0, gastos: 0 });
  }
  for (const v of ventasMensuales) {
    const d = v.createdAt;
    const k = `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    const entry = mapaM.get(k);
    if (entry) entry.ingresos += Number(v.total);
  }
  for (const g of gastosMensuales) {
    const d = g.fecha;
    const k = `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    const entry = mapaM.get(k);
    if (entry) entry.gastos += Number(g.monto);
  }
  const ingresosVsGastos = Array.from(mapaM.entries()).map(([mes, v]) => ({
    mes,
    ingresos: parseFloat(v.ingresos.toFixed(2)),
    gastos:   parseFloat(v.gastos.toFixed(2)),
    utilidad: parseFloat((v.ingresos - v.gastos).toFixed(2)),
  }));

  // ── Ranking de barberos (mes actual) ──────────────────
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const apptsMes  = await prisma.barberAppointment.findMany({
    where: { tenantId, startTime: { gte: inicioMes } },
    include: {
      barber:  { include: { user: { select: { fullName: true } } } },
      payment: { select: { amount: true, status: true } },
    },
  });
  const barberMap = new Map<number, { nombre: string; citas: number; completadas: number; ingresos: number }>();
  for (const a of apptsMes) {
    const prev = barberMap.get(a.barberId) ?? { nombre: a.barber.user.fullName, citas: 0, completadas: 0, ingresos: 0 };
    const ingreso = a.payment?.status === 'PAID' ? Number(a.payment.amount) : 0;
    barberMap.set(a.barberId, {
      nombre:      a.barber.user.fullName,
      citas:       prev.citas + 1,
      completadas: prev.completadas + (a.status === 'COMPLETED' ? 1 : 0),
      ingresos:    prev.ingresos + ingreso,
    });
  }
  const rankingBarberos = Array.from(barberMap.values())
    .sort((a, b) => b.completadas - a.completadas)
    .slice(0, 5)
    .map(b => ({ ...b, ingresos: parseFloat(b.ingresos.toFixed(2)) }));

  // ── Top servicios por ingreso (últimos 30 días) ─────────
  const mapaServ = new Map<string, { total: number; cantidad: number }>();
  for (const d of detallesTop) {
    const entry = mapaServ.get(d.descripcion) ?? { total: 0, cantidad: 0 };
    entry.total += Number(d.subtotal);
    entry.cantidad += d.cantidad;
    mapaServ.set(d.descripcion, entry);
  }
  const topServicios = Array.from(mapaServ.entries())
    .map(([nombre, v]) => ({ nombre, total: parseFloat(v.total.toFixed(2)), cantidad: v.cantidad }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  return {
    citasHoy,
    citasPendientes,
    ingresosHoy,
    clientesActivos: Math.max(clientesActivos, clientesPosAgg.length),
    citasSemana,
    // POS
    ventasPosHoy,
    ingresosPosHoy: parseFloat(ingresosPosHoy.toFixed(2)),
    ventasSemana,
    ticketPromedio,
    // Gráficas
    ingresosVsGastos,
    topServicios,
    rankingBarberos,
  };
}

// ── Owner Stats — métricas ejecutivas para el propietario ───────────────────
export async function getOwnerStats(tenantId: number) {
  const now        = new Date();
  const inicioMesA = new Date(now.getFullYear(), now.getMonth(), 1);
  const finMesA    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const inicioMesP = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const finMesP    = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const inicioAnio = new Date(now.getFullYear(), 0, 1);
  const inicioSeisM = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    // Ventas POS mes actual y mes anterior
    ventasMesActAgg, ventasMesPasAgg,
    // Gastos mes actual y mes anterior
    gastosMesActAgg, gastosMesPasAgg,
    // Ingresos año en curso (YTD)
    ventasYTDAgg,
    // Clientes: total activos y nuevos este mes
    totalClientes, clientesNuevosMes,
    // Citas mes actual
    citasMesAct, citasCompletadasMes,
    // Gráficas 6 meses (ingresos + gastos mensuales)
    ventasMensuales, gastosMensuales,
    // Top servicios 30 días
    detallesTop,
    // Ranking barberos mes actual
    apptsMes,
  ] = await Promise.all([
    // POS mes actual
    prisma.barberVenta.aggregate({
      where: { tenantId, estado: 'ACTIVA', createdAt: { gte: inicioMesA, lte: finMesA } },
      _sum:   { total: true },
      _count: { id: true },
    }),
    // POS mes anterior
    prisma.barberVenta.aggregate({
      where: { tenantId, estado: 'ACTIVA', createdAt: { gte: inicioMesP, lte: finMesP } },
      _sum:   { total: true },
      _count: { id: true },
    }),
    // Gastos mes actual
    prisma.barberGasto.aggregate({
      where: { tenantId, fecha: { gte: inicioMesA, lte: finMesA } },
      _sum: { monto: true },
    }),
    // Gastos mes anterior
    prisma.barberGasto.aggregate({
      where: { tenantId, fecha: { gte: inicioMesP, lte: finMesP } },
      _sum: { monto: true },
    }),
    // YTD ventas
    prisma.barberVenta.aggregate({
      where: { tenantId, estado: 'ACTIVA', createdAt: { gte: inicioAnio } },
      _sum: { total: true },
    }),
    // Total clientes
    prisma.barberUser.count({
      where: { tenantId, role: 'CLIENT', active: true },
    }),
    // Clientes nuevos mes actual
    prisma.barberUser.count({
      where: { tenantId, role: 'CLIENT', createdAt: { gte: inicioMesA } },
    }),
    // Total citas mes actual
    prisma.barberAppointment.count({
      where: { tenantId, startTime: { gte: inicioMesA, lte: finMesA } },
    }),
    // Citas completadas mes actual
    prisma.barberAppointment.count({
      where: { tenantId, startTime: { gte: inicioMesA, lte: finMesA }, status: 'COMPLETED' },
    }),
    // Ventas mensuales 6 meses (para gráfica)
    prisma.barberVenta.findMany({
      where: { tenantId, estado: 'ACTIVA', createdAt: { gte: inicioSeisM } },
      select: { total: true, createdAt: true },
    }),
    // Gastos mensuales 6 meses
    prisma.barberGasto.findMany({
      where: { tenantId, fecha: { gte: inicioSeisM } },
      select: { monto: true, fecha: true },
    }),
    // Top servicios 30 días
    prisma.barberDetalleVenta.findMany({
      where: {
        servicioId: { not: null },
        venta: { tenantId, estado: 'ACTIVA', createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
      },
      select: { descripcion: true, subtotal: true, cantidad: true },
    }),
    // Ranking barberos mes actual
    prisma.barberAppointment.findMany({
      where: { tenantId, startTime: { gte: inicioMesA } },
      include: {
        barber:  { include: { user: { select: { fullName: true } } } },
        payment: { select: { amount: true, status: true } },
      },
    }),
  ]);

  const ingresosMesAct  = ventasMesActAgg._sum.total?.toNumber() ?? 0;
  const ingresosMesPas  = ventasMesPasAgg._sum.total?.toNumber() ?? 0;
  const gastosMesAct    = gastosMesActAgg._sum.monto?.toNumber() ?? 0;
  const gastosMesPas    = gastosMesPasAgg._sum.monto?.toNumber() ?? 0;
  const utilidadMesAct  = ingresosMesAct - gastosMesAct;
  const utilidadMesPas  = ingresosMesPas - gastosMesPas;
  const margenMes       = ingresosMesAct > 0 ? (utilidadMesAct / ingresosMesAct) * 100 : 0;
  const ingresoYTD      = ventasYTDAgg._sum.total?.toNumber() ?? 0;
  const tasaCompletacion = citasMesAct > 0 ? (citasCompletadasMes / citasMesAct) * 100 : 0;

  // Variación % mes vs mes anterior
  const varIngresos = ingresosMesPas > 0 ? ((ingresosMesAct - ingresosMesPas) / ingresosMesPas) * 100 : null;
  const varGastos   = gastosMesPas   > 0 ? ((gastosMesAct   - gastosMesPas)   / gastosMesPas)   * 100 : null;
  const varUtilidad = ingresosMesPas > 0 ? ((utilidadMesAct - utilidadMesPas) / Math.abs(ingresosMesPas)) * 100 : null;

  // ── Ingresos vs Gastos 6 meses ──────────────────────────────────────────
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const mapaM = new Map<string, { ingresos: number; gastos: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    mapaM.set(`${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, { ingresos: 0, gastos: 0 });
  }
  for (const v of ventasMensuales) {
    const d = v.createdAt;
    const k = `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    const e = mapaM.get(k); if (e) e.ingresos += Number(v.total);
  }
  for (const g of gastosMensuales) {
    const d = g.fecha;
    const k = `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    const e = mapaM.get(k); if (e) e.gastos += Number(g.monto);
  }
  const ingresosVsGastos = Array.from(mapaM.entries()).map(([mes, v]) => ({
    mes,
    ingresos: parseFloat(v.ingresos.toFixed(2)),
    gastos:   parseFloat(v.gastos.toFixed(2)),
    utilidad: parseFloat((v.ingresos - v.gastos).toFixed(2)),
  }));

  // ── Top servicios ───────────────────────────────────────────────────────
  const mapaServ = new Map<string, { total: number; cantidad: number }>();
  for (const d of detallesTop) {
    const entry = mapaServ.get(d.descripcion) ?? { total: 0, cantidad: 0 };
    entry.total += Number(d.subtotal); entry.cantidad += d.cantidad;
    mapaServ.set(d.descripcion, entry);
  }
  const topServicios = Array.from(mapaServ.entries())
    .map(([nombre, v]) => ({ nombre, total: parseFloat(v.total.toFixed(2)), cantidad: v.cantidad }))
    .sort((a, b) => b.total - a.total).slice(0, 6);

  // ── Ranking barberos ────────────────────────────────────────────────────
  const barberMap = new Map<number, { nombre: string; citas: number; completadas: number; ingresos: number }>();
  for (const a of apptsMes) {
    const prev = barberMap.get(a.barberId) ?? { nombre: a.barber.user.fullName, citas: 0, completadas: 0, ingresos: 0 };
    const ingreso = a.payment?.status === 'PAID' ? Number(a.payment.amount) : 0;
    barberMap.set(a.barberId, {
      nombre: a.barber.user.fullName, citas: prev.citas + 1,
      completadas: prev.completadas + (a.status === 'COMPLETED' ? 1 : 0),
      ingresos: prev.ingresos + ingreso,
    });
  }
  const rankingBarberos = Array.from(barberMap.values())
    .sort((a, b) => b.ingresos - a.ingresos).slice(0, 5)
    .map(b => ({ ...b, ingresos: parseFloat(b.ingresos.toFixed(2)) }));

  return {
    // KPIs financieros mes
    ingresosMesAct:  parseFloat(ingresosMesAct.toFixed(2)),
    ingresosMesPas:  parseFloat(ingresosMesPas.toFixed(2)),
    gastosMesAct:    parseFloat(gastosMesAct.toFixed(2)),
    gastosMesPas:    parseFloat(gastosMesPas.toFixed(2)),
    utilidadMesAct:  parseFloat(utilidadMesAct.toFixed(2)),
    utilidadMesPas:  parseFloat(utilidadMesPas.toFixed(2)),
    margenMes:       parseFloat(margenMes.toFixed(1)),
    ingresoYTD:      parseFloat(ingresoYTD.toFixed(2)),
    // Variaciones %
    varIngresos:     varIngresos !== null ? parseFloat(varIngresos.toFixed(1)) : null,
    varGastos:       varGastos   !== null ? parseFloat(varGastos.toFixed(1))   : null,
    varUtilidad:     varUtilidad !== null ? parseFloat(varUtilidad.toFixed(1)) : null,
    // Operacional
    totalClientes,
    clientesNuevosMes,
    citasMesAct,
    citasCompletadasMes,
    tasaCompletacion: parseFloat(tasaCompletacion.toFixed(1)),
    // Gráficas
    ingresosVsGastos,
    topServicios,
    rankingBarberos,
    // Mes de referencia
    mesMostrado: MESES[now.getMonth()],
    mesPasadoMostrado: MESES[inicioMesP.getMonth()],
  };
}

// ── Serializer ────────────────────────────────────────

type RawAppointment = Awaited<ReturnType<typeof repo.findAppointmentById>>;

function serializeAppointment(appt: NonNullable<RawAppointment>) {
  return {
    ...appt,
    service: {
      ...appt.service,
      price: appt.service.price.toNumber(),
    },
    payment: appt.payment
      ? { ...appt.payment, amount: appt.payment.amount.toNumber() }
      : null,
  };
}
