/**
 * GET  /api/billing         — Listar pagos con filtros
 * POST /api/billing         — Registrar un pago
 */

import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import { listPayments, registerPayment } from '@/modules/billing/billing.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const payments = await listPayments(ctx.tenantId, query);
    return ok(payments);
}, { requiredModule: 'facturacion' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
    const body = await req.json();
    const payment = await registerPayment(ctx.tenantId, body);
    return created(payment);
}, { requiredModule: 'facturacion' })
