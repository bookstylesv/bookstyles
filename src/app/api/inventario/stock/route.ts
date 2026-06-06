/**
 * GET /api/inventario/stock — Stock por sucursal
 * ?branchId=N → stock de esa sucursal
 * sin branchId → usa user.branchId del JWT; si OWNER sin branch, retorna todo el tenant
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { getStockPorSucursal } from '@/modules/inventario/inventario.service';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams;
  const queryBranchId = sp.get('branchId') ? Number(sp.get('branchId')) : null;

  // Prioridad: query param > JWT branchId > null (OWNER ve todo)
  const effectiveBranchId = queryBranchId ?? ctx.branchId ?? null;

  const result = await getStockPorSucursal(ctx.tenantId, effectiveBranchId);
  return ok(result);
}, { requiredModule: 'inventario' });
