/**
 * GET /api/productos/kardex-general
 * Retorna el historial general de movimientos de inventario del tenant.
 * Soporta paginación: ?page=1&limit=30
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';
import { getKardexGeneral } from '@/modules/productos/productos.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const result = await getKardexGeneral(user.tenantId, query, user.branchId);
    return ok(result);
  } catch (err) {
    return apiError(err);
  }
}
