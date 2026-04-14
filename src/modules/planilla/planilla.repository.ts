import { prisma } from '@/lib/prisma';
import { CONFIG_DEFAULTS } from './planilla.service';
import { branchWhere } from '@/lib/branch-filter';

// ── Config global del tenant ─────────────────────────
export async function getConfigPlanilla(tenantId: number) {
  return prisma.barberConfigPlanilla.findMany({ where: { tenantId }, orderBy: { clave: 'asc' } });
}

export async function upsertConfigPlanilla(
  tenantId: number,
  items: Array<{ clave: string; valor: number; descripcion?: string; topeMaximo?: number | null }>
) {
  const ops = items.map(item =>
    prisma.barberConfigPlanilla.upsert({
      where:  { tenantId_clave: { tenantId, clave: item.clave } },
      create: { tenantId, clave: item.clave, valor: item.valor, descripcion: item.descripcion, topeMaximo: item.topeMaximo },
      update: { valor: item.valor, topeMaximo: item.topeMaximo ?? null, updatedAt: new Date() },
    })
  );
  return prisma.$transaction(ops);
}

export async function seedConfigPlanilla(tenantId: number) {
  const ops = CONFIG_DEFAULTS.map(d =>
    prisma.barberConfigPlanilla.upsert({
      where:  { tenantId_clave: { tenantId, clave: d.clave } },
      create: { tenantId, clave: d.clave, valor: d.valor, descripcion: d.descripcion },
      update: {},
    })
  );
  return prisma.$transaction(ops);
}

// ── Config por barbero ───────────────────────────────
export async function getConfigsBarberos(tenantId: number) {
  return prisma.barberConfigBarbero.findMany({
    where: { tenantId },
    include: { barbero: { include: { user: { select: { fullName: true } } } } },
  });
}

export async function getConfigBarbero(tenantId: number, barberoId: number) {
  return prisma.barberConfigBarbero.findFirst({ where: { tenantId, barberoId } });
}

export async function upsertConfigBarbero(
  tenantId: number,
  barberoId: number,
  data: {
    tipoPago: string;
    salarioBase: number;
    valorPorUnidad: number;
    porcentajeServicio: number;
    aplicaRenta: boolean;
    fechaIngreso?: Date | null;
  }
) {
  return prisma.barberConfigBarbero.upsert({
    where:  { barberoId },
    create: { tenantId, barberoId, ...data },
    update: { ...data, updatedAt: new Date() },
  });
}

// ── Planillas ────────────────────────────────────────
export async function listarPlanillas(tenantId: number, branchId?: number | null) {
  return prisma.barberPlanilla.findMany({
    where:   { tenantId, ...branchWhere(branchId) },
    include: { detalles: { select: { id: true } } },
    orderBy: { periodo: 'desc' },
  });
}

export async function getPlanillaById(tenantId: number, id: number) {
  return prisma.barberPlanilla.findFirst({
    where:   { id, tenantId },
    include: { detalles: true },
  });
}

export async function crearPlanilla(
  tenantId: number,
  periodo: string,
  totales: {
    totalBruto: number; totalISS: number; totalAFP: number; totalRenta: number;
    totalDeducciones: number; totalNeto: number;
    totalPatronalISS: number; totalPatronalAFP: number; totalINSAFORP: number;
  },
  detalles: Array<{
    barberoId: number; nombre: string; tipoPago: string; unidades: number;
    salarioBruto: number; isss: number; afp: number; renta: number;
    otrasDeducciones: number; totalDeducciones: number; salarioNeto: number;
    isssPatronal: number; afpPatronal: number; insaforp: number;
  }>
) {
  return prisma.barberPlanilla.create({
    data: {
      tenantId, periodo, ...totales,
      detalles: { create: detalles },
    },
    include: { detalles: true },
  });
}

export async function aprobarPlanilla(tenantId: number, id: number) {
  return prisma.barberPlanilla.update({
    where: { id },
    data:  { estado: 'APROBADA' },
  });
}

export async function pagarPlanilla(tenantId: number, id: number) {
  const p = await prisma.barberPlanilla.findFirst({ where: { id, tenantId } });
  if (!p) throw new Error('Planilla no encontrada');
  if (p.estado !== 'APROBADA') throw new Error('Solo se pueden marcar como pagadas las planillas aprobadas');
  return prisma.barberPlanilla.update({
    where: { id },
    data:  { estado: 'PAGADA' },
  });
}

export async function eliminarPlanilla(tenantId: number, id: number) {
  const p = await prisma.barberPlanilla.findFirst({ where: { id, tenantId } });
  if (!p) throw new Error('Planilla no encontrada');
  if (p.estado !== 'BORRADOR') throw new Error('Solo se pueden eliminar planillas en estado BORRADOR');
  return prisma.barberPlanilla.delete({ where: { id } });
}

// ── Comisiones del período para barberos POR_SERVICIO ─────────────────────────
export async function getComisionesBarberosPeriodo(tenantId: number, periodo: string) {
  // periodo = "2025-03" (YYYY-MM)
  const [year, month] = periodo.split('-').map(Number);
  const desde = new Date(year, month - 1, 1);
  const hasta = new Date(year, month, 1);

  const detalles = await prisma.barberDetalleVenta.findMany({
    where: {
      barberoId: { not: null },
      venta: { tenantId, estado: 'ACTIVA', createdAt: { gte: desde, lt: hasta } },
    },
    select: {
      barberoId: true,
      comisionLinea: true,
      descripcion: true,
      cantidad: true,
    },
  });

  const mapa = new Map<number, { total: number; detalle: { desc: string; cant: number; comision: number }[] }>();
  for (const d of detalles) {
    const id = d.barberoId!;
    const entry = mapa.get(id) ?? { total: 0, detalle: [] };
    const com = Number(d.comisionLinea);
    entry.total += com;
    if (com > 0) {
      entry.detalle.push({ desc: d.descripcion, cant: d.cantidad, comision: com });
    }
    mapa.set(id, entry);
  }

  return Array.from(mapa.entries()).map(([barberoId, v]) => ({
    barberoId,
    totalComision: parseFloat(v.total.toFixed(2)),
    detalle: v.detalle,
  }));
}

// ── Barberos activos con su config para generar planilla / prestaciones
export async function getBarberosParaPlanilla(tenantId: number) {
  return prisma.barber.findMany({
    where:   { tenantId, active: true },
    include: {
      user:           { select: { fullName: true } },
      configPlanilla: true,
    },
    orderBy: { user: { fullName: 'asc' } },
  });
}
