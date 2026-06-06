/**
 * POST /api/cxp/[id]/pago  — Registrar un pago parcial o total de una CxP
 */

import { NextRequest } from 'next/server';
import { created } from '@/lib/response';
import { pagarCxP } from '@/modules/cxp/cxp.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Ctx = { params: Promise<{ id: string }> };

export const POST = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const body = await req.json();
    const pago = await pagarCxP(ctx.tenantId, Number(id), body);
    return created(pago);
}, { requiredModule: 'cxp' })
