import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getConfigsBarberos, upsertConfigBarbero } from '@/modules/planilla/planilla.repository';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const configs = await getConfigsBarberos(user.tenantId);
  return NextResponse.json(configs.map(cfg => ({
    ...cfg,
    salarioBase:        cfg.salarioBase.toNumber(),
    valorPorUnidad:     cfg.valorPorUnidad.toNumber(),
    porcentajeServicio: cfg.porcentajeServicio.toNumber(),
    fechaIngreso:       cfg.fechaIngreso?.toISOString() ?? null,
  })));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'OWNER') return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { barberoId, tipoPago, salarioBase, valorPorUnidad, porcentajeServicio, aplicaRenta, fechaIngreso } = await req.json();

  const result = await upsertConfigBarbero(user.tenantId, barberoId, {
    tipoPago, salarioBase, valorPorUnidad, porcentajeServicio, aplicaRenta,
    fechaIngreso: fechaIngreso ? new Date(fechaIngreso) : null,
  });

  return NextResponse.json({
    ...result,
    salarioBase:        result.salarioBase.toNumber(),
    valorPorUnidad:     result.valorPorUnidad.toNumber(),
    porcentajeServicio: result.porcentajeServicio.toNumber(),
    fechaIngreso:       result.fechaIngreso?.toISOString() ?? null,
  });
}
