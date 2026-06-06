/**
 * GET /api/productos/kardex-general
 * Retorna el historial general de movimientos de inventario del tenant.
 * Soporta paginación: ?page=1&limit=30
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { getKardexGeneral } from '@/modules/productos/productos.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const result = await getKardexGeneral(ctx.tenantId, query, ctx.branchId);
    return ok(result);
}, { requiredModule: 'inventario' })
