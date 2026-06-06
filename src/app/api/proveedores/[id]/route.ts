/**
 * GET    /api/proveedores/[id]  — Detalle de un proveedor
 * PUT    /api/proveedores/[id]  — Actualizar proveedor
 * DELETE /api/proveedores/[id]  — Desactivar proveedor (soft delete)
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import {
  getProveedorById,
  updateProveedorService,
  deactivateProveedorService,
} from '@/modules/proveedores/proveedores.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const proveedor = await getProveedorById(ctx.tenantId, Number(id));
    return ok(proveedor);
}, { requiredModule: 'compras' })

export const PUT = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const body      = await req.json();
    const proveedor = await updateProveedorService(ctx.tenantId, Number(id), body);
    return ok(proveedor);
}, { requiredModule: 'compras' })

export const DELETE = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const proveedor = await deactivateProveedorService(ctx.tenantId, Number(id));
    return ok({ deactivated: true, proveedor });
}, { requiredModule: 'compras' })
