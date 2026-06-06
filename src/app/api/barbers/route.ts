import { NextRequest } from 'next/server';
/**
 * GET  /api/barbers — Listar barberos del tenant
 * POST /api/barbers — Crear nuevo barbero (con usuario)
 */

import { created, ok } from '@/lib/response';
import { listBarbers, createBarber } from '@/modules/barbers/barbers.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {    const barbers = await listBarbers(ctx.tenantId);
    return ok(barbers);
}, { requiredModule: 'citas' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
    const body = await req.json();
    const barber = await createBarber(ctx.tenantId, body);
    return created(barber);
}, { requiredModule: 'citas' })
