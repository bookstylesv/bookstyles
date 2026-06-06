import { NextRequest } from 'next/server';
/**
 * GET /api/cxp  — Listar todas las cuentas por pagar (compras a crédito no anuladas)
 */

import { ok } from '@/lib/response';
import { listCxP } from '@/modules/cxp/cxp.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {
    const cxp = await listCxP(ctx.tenantId);
    return ok(cxp);
}, { requiredModule: 'cxp' })
