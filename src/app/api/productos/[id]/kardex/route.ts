/**
 * GET /api/productos/[id]/kardex
 * Retorna el historial de movimientos de inventario para un producto específico.
 * Soporta paginación: ?page=1&limit=20
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { getKardexProducto } from '@/modules/productos/productos.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Params = { params: Promise<{ id: string }> };

export const GET = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {    const { id } = await routeCtx.params;
    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const result = await getKardexProducto(Number(id), ctx.tenantId, query, ctx.branchId);
    return ok(result);
}, { requiredModule: 'inventario' })
