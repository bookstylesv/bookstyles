import { NextRequest } from 'next/server';
/**
 * GET /api/cxp/resumen  — Resumen de KPIs de Cuentas por Pagar
 */

import { ok } from '@/lib/response';
import { getResumen } from '@/modules/cxp/cxp.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {
    const data = await getResumen(ctx.tenantId);
    return ok(data);
}, { requiredModule: 'cxp' })
