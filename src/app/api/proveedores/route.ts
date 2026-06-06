/**
 * GET  /api/proveedores  — Listar proveedores con filtros y paginación
 * POST /api/proveedores  — Crear nuevo proveedor (solo OWNER)
 */

import { NextRequest } from 'next/server';
import { ok, created, paginate } from '@/lib/response';
import {
  listProveedores,
  createProveedorService,
} from '@/modules/proveedores/proveedores.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {
    const { searchParams } = req.nextUrl;
    const search   = searchParams.get('search')   ?? undefined;
    const tipo     = searchParams.get('tipo')     ?? undefined;
    const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1',  10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));

    const result = await listProveedores(ctx.tenantId, { search, tipo, page, pageSize });

    const pagination = paginate(result.total, page, pageSize);
    return ok(result.items, pagination);
}, { requiredModule: 'compras' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
    const body      = await req.json();
    const proveedor = await createProveedorService(ctx.tenantId, body);
    return created(proveedor);
}, { requiredModule: 'compras' })
