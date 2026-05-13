/**
 * GET /api/cxp/resumen  — Resumen de KPIs de Cuentas por Pagar
 */

import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { getResumen } from '@/modules/cxp/cxp.service';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const data = await getResumen(user.tenantId);
    return ok(data);
  } catch (err) {
    return apiError(err);
  }
}
