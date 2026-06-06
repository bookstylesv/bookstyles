/**
 * GET /api/billing/stats — KPIs de caja
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { getStats } from '@/modules/billing/billing.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {    const stats = await getStats(ctx.tenantId);
    return ok(stats);
}, { requiredModule: 'facturacion' })
