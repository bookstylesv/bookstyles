import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getComisionesBarberosPeriodo } from '@/modules/planilla/planilla.repository';

/**
 * GET /api/planilla/comisiones?periodo=2025-03
 * Retorna las comisiones acumuladas de cada barbero en el período indicado,
 * calculadas desde BarberDetalleVenta.comisionLinea.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const periodo = req.nextUrl.searchParams.get('periodo');
  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json({ error: 'Parámetro periodo requerido (formato: YYYY-MM)' }, { status: 400 });
  }

  const data = await getComisionesBarberosPeriodo(user.tenantId, periodo);
  return NextResponse.json({ data });
}
