/**
 * GET  /api/compras  — Listar compras con filtros y paginación
 * POST /api/compras  — Registrar una nueva compra
 *
 * Requiere rol OWNER.
 */

import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import { listCompras, createCompra } from '@/modules/compras/compras.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {
    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const result = await listCompras(ctx.tenantId, query);
    return ok(result.data);
}, { requiredModule: 'compras' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
    const body = await req.json();
    const compra = await createCompra(ctx.tenantId, body);
    return created(compra);
}, { requiredModule: 'compras' })
