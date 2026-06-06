/**
 * PATCH /api/billing/[id]  — Actualizar método/estado de un pago
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { patchPayment } from '@/modules/billing/billing.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const body = await req.json();
    const payment = await patchPayment(ctx.tenantId, Number(id), body);
    return ok(payment);
}, { requiredModule: 'facturacion' })
