import { NextRequest, NextResponse } from 'next/server';
import { getComisionesBarberosPeriodo } from '@/modules/planilla/planilla.repository';
import { withTenantAuth } from '@/lib/with-tenant-auth';

/**
 * GET /api/planilla/comisiones?periodo=2025-03
 * Retorna las comisiones acumuladas de cada barbero en el período indicado,
 * calculadas desde BarberDetalleVenta.comisionLinea.
 */
export const GET = withTenantAuth(async (req: NextRequest, ctx) => {
  const periodo = req.nextUrl.searchParams.get('periodo');
  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json({ error: 'Parámetro periodo requerido (formato: YYYY-MM)' }, { status: 400 });
  }

  const data = await getComisionesBarberosPeriodo(ctx.tenantId, periodo);
  return NextResponse.json({ data });
}, { requiredModule: 'planilla' })
