/**
 * GET /api/cxp  — Listar todas las cuentas por pagar (compras a crédito no anuladas)
 */

import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { listCxP } from '@/modules/cxp/cxp.service';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const cxp = await listCxP(user.tenantId);
    return ok(cxp);
  } catch (err) {
    return apiError(err);
  }
}
