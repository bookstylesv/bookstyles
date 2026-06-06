/**
 * GET /api/proveedores/search?q=  — Búsqueda rápida de proveedores (máx 10)
 * Usado por dropdowns en módulo de Compras.
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { quickSearchProveedores } from '@/modules/proveedores/proveedores.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {
    const q = req.nextUrl.searchParams.get('q') ?? '';
    const results = await quickSearchProveedores(ctx.tenantId, q);
    return ok(results);
}, { requiredModule: 'compras' })
