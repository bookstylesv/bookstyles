import { NextRequest, NextResponse } from 'next/server';
import { getConfigsBarberos, upsertConfigBarbero } from '@/modules/planilla/planilla.repository';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {
const configs = await getConfigsBarberos(ctx.tenantId);
  return NextResponse.json(configs.map(cfg => ({
    ...cfg,
    salarioBase:        cfg.salarioBase.toNumber(),
    valorPorUnidad:     cfg.valorPorUnidad.toNumber(),
    porcentajeServicio: cfg.porcentajeServicio.toNumber(),
    fechaIngreso:       cfg.fechaIngreso?.toISOString() ?? null,
  })));
}, { requiredModule: 'planilla' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
  const { barberoId, tipoPago, salarioBase, valorPorUnidad, porcentajeServicio, aplicaRenta, fechaIngreso } = await req.json();

  const result = await upsertConfigBarbero(ctx.tenantId, barberoId, {
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
}, { requiredModule: 'planilla' })
