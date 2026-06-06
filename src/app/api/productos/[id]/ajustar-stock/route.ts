/**
 * POST /api/productos/[id]/ajustar-stock
 * Ajuste manual de stock: ENTRADA | SALIDA | AJUSTE
 * Crea el movimiento en kardex y actualiza stockActual + costoPromedio.
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { ajustarStock } from '@/modules/productos/productos.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Params = { params: Promise<{ id: string }> };

export const POST = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const body = await req.json();
    const updated = await ajustarStock(Number(id), ctx.tenantId, body, ctx.branchId);
    return ok(updated);
}, { requiredModule: 'inventario' })
