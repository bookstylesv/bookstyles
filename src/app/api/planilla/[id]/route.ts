import { NextRequest, NextResponse } from 'next/server';
import { getPlanillaById, eliminarPlanilla } from '@/modules/planilla/planilla.repository';
import { withTenantAuth } from '@/lib/with-tenant-auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ser(p: any) {
  if (!p) return null;
  return {
    ...p,
    totalBruto: p.totalBruto.toNumber(), totalISS: p.totalISS.toNumber(),
    totalAFP: p.totalAFP.toNumber(), totalRenta: p.totalRenta.toNumber(),
    totalDeducciones: p.totalDeducciones.toNumber(), totalNeto: p.totalNeto.toNumber(),
    totalPatronalISS: p.totalPatronalISS.toNumber(), totalPatronalAFP: p.totalPatronalAFP.toNumber(),
    totalINSAFORP: p.totalINSAFORP.toNumber(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    detalles: p.detalles?.map((d: any) => ({
      ...d,
      unidades: d.unidades?.toNumber() ?? 0,
      salarioBruto: d.salarioBruto.toNumber(), isss: d.isss.toNumber(),
      afp: d.afp.toNumber(), renta: d.renta.toNumber(),
      otrasDeducciones: d.otrasDeducciones.toNumber(),
      totalDeducciones: d.totalDeducciones.toNumber(), salarioNeto: d.salarioNeto.toNumber(),
      isssPatronal: d.isssPatronal.toNumber(), afpPatronal: d.afpPatronal.toNumber(),
      insaforp: d.insaforp.toNumber(),
    })),
  };
}

export const GET = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
const { id } = await routeCtx.params;
  const planilla = await getPlanillaById(ctx.tenantId, parseInt(id));
  if (!planilla) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  return NextResponse.json(ser(planilla));
}, { requiredModule: 'planilla' })

export const DELETE = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
  const { id } = await routeCtx.params;
  try {
    await eliminarPlanilla(ctx.tenantId, parseInt(id));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}, { requiredModule: 'planilla' })
