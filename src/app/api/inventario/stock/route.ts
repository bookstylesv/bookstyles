/**
 * GET /api/inventario/stock — Stock por sucursal
 * ?branchId=N → stock de esa sucursal
 * sin branchId → usa user.branchId del JWT; si OWNER sin branch, retorna todo el tenant
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';
import { getStockPorSucursal } from '@/modules/inventario/inventario.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const sp = req.nextUrl.searchParams;
    const queryBranchId = sp.get('branchId') ? Number(sp.get('branchId')) : null;

    // Prioridad: query param > JWT branchId > null (OWNER ve todo)
    const effectiveBranchId = queryBranchId ?? user.branchId ?? null;

    const result = await getStockPorSucursal(user.tenantId, effectiveBranchId);
    return ok(result);
  } catch (e) {
    return apiError(e);
  }
}
