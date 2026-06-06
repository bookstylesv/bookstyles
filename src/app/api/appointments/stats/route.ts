import { NextRequest } from 'next/server';
/**
 * GET /api/appointments/stats — KPIs del dashboard
 */

import { ok } from '@/lib/response';
import { getStats } from '@/modules/appointments/appointments.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {    const stats = await getStats(ctx.tenantId);
    return ok(stats);
}, { requiredModule: 'citas' })
