/**
 * GET  /api/services   — Listar servicios del tenant
 * POST /api/services   — Crear nuevo servicio
 */

import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import * as svc from '@/modules/services/services.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {    const services = await svc.listServices(ctx.tenantId);
    return ok(services);
}, { requiredModule: 'citas' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {    const body = await req.json();
    const service = await svc.createService(ctx.tenantId, body);
    return created(service);
}, { requiredModule: 'citas' })
