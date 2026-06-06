import { NextRequest, NextResponse } from 'next/server';
import { getConfigPlanilla, getBarberosParaPlanilla } from '@/modules/planilla/planilla.repository';
import { buildConfigMap } from '@/modules/planilla/planilla.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {
const [configRows, barberos] = await Promise.all([
    getConfigPlanilla(ctx.tenantId),
    getBarberosParaPlanilla(ctx.tenantId),
  ]);

  const cfg = buildConfigMap(configRows);

  const items = barberos.map(barb => {
    const config = barb.configPlanilla;
    return {
      barberoId:          barb.id,
      nombre:             barb.user.fullName,
      tipoPago:           config?.tipoPago ?? 'FIJO',
      salarioBase:        config?.salarioBase.toNumber() ?? 0,
      valorPorUnidad:     config?.valorPorUnidad.toNumber() ?? 0,
      porcentajeServicio: config?.porcentajeServicio.toNumber() ?? 0,
      aplicaRenta:        config?.aplicaRenta ?? true,
      configurado:        !!config,
    };
  });

  // cfg is used for future preview calculations — included in response for client-side use
  void cfg;

  return NextResponse.json({ items, hasConfig: configRows.length > 0 });
}, { requiredModule: 'planilla' })
