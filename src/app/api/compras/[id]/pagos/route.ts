/**
 * GET  /api/compras/[id]/pagos  — Historial de pagos de una compra
 * POST /api/compras/[id]/pagos  — Registrar un pago CxP
 *
 * Requiere rol OWNER.
 */

import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import { historialPagos, registrarPago } from '@/modules/compras/compras.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Params = { params: Promise<{ id: string }> };

export const GET = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const pagos = await historialPagos(ctx.tenantId, Number(id));
    return ok(pagos);
}, { requiredModule: 'compras' })

export const POST = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const body = await req.json();
    const pago = await registrarPago(ctx.tenantId, Number(id), body);
    return created(pago);
}, { requiredModule: 'compras' })
