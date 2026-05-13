/**
 * GET  /api/productos  — Listar productos con filtros y paginación
 * POST /api/productos  — Crear un nuevo producto
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { listProductos, createProducto } from '@/modules/productos/productos.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const result = await listProductos(user.tenantId, query);
    return ok(result);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError('Solo el propietario puede crear productos');

    const body = await req.json();
    const producto = await createProducto(user.tenantId, body);
    return created(producto);
  } catch (err) {
    return apiError(err);
  }
}
