/**
 * GET /api/compras/[id]  — Obtener detalle de una compra
 *
 * Requiere rol OWNER.
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { getCompra } from '@/modules/compras/compras.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Params = { params: Promise<{ id: string }> };

export const GET = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const compra = await getCompra(Number(id), ctx.tenantId);
    return ok(compra);
}, { requiredModule: 'compras' })
