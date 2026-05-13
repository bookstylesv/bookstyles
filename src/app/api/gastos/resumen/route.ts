/**
 * GET /api/gastos/resumen?mes=&anio=
 * Retorna el total de gastos agrupado por categoría para el mes/año indicado.
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { resumenMesService } from '@/modules/gastos/gastos.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const sp   = req.nextUrl.searchParams;
    const now  = new Date();
    const mes  = Number(sp.get('mes')  ?? now.getMonth() + 1);
    const anio = Number(sp.get('anio') ?? now.getFullYear());

    if (mes < 1 || mes > 12)        throw new ValidationError('Mes inválido (1-12)');
    if (anio < 2000 || anio > 2100) throw new ValidationError('Año inválido');

    const data = await resumenMesService(user.tenantId, mes, anio);
    return ok(data);
  } catch (err) {
    return apiError(err);
  }
}
