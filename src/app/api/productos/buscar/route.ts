/**
 * GET /api/productos/buscar?q=texto
 * Búsqueda rápida de productos para dropdowns y selectores.
 * Retorna máximo 20 resultados con campos mínimos.
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { searchProductos } from '@/modules/productos/productos.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {    const q = req.nextUrl.searchParams.get('q') ?? '';
    const results = await searchProductos(ctx.tenantId, q);
    return ok(results);
}, { requiredModule: 'inventario' })
