/**
 * GET  /api/proveedores  — Listar proveedores con filtros y paginación
 * POST /api/proveedores  — Crear nuevo proveedor (solo OWNER)
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError, paginate } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import {
  listProveedores,
  createProveedorService,
} from '@/modules/proveedores/proveedores.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const { searchParams } = req.nextUrl;
    const search   = searchParams.get('search')   ?? undefined;
    const tipo     = searchParams.get('tipo')     ?? undefined;
    const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1',  10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));

    const result = await listProveedores(user.tenantId, { search, tipo, page, pageSize });

    const pagination = paginate(result.total, page, pageSize);
    return ok(result.items, pagination);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const body      = await req.json();
    const proveedor = await createProveedorService(user.tenantId, body);
    return created(proveedor);
  } catch (err) {
    return apiError(err);
  }
}
