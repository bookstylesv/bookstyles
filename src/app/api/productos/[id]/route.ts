/**
 * GET    /api/productos/[id]  — Obtener un producto por ID
 * PUT    /api/productos/[id]  — Actualizar un producto
 * DELETE /api/productos/[id]  — Desactivar (soft delete) un producto
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import {
  getProducto,
  updateProducto,
  deactivateProducto,
} from '@/modules/productos/productos.service';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const { id } = await params;
    const producto = await getProducto(Number(id), user.tenantId);
    return ok(producto);
  } catch (err) {
    return apiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError('Solo el propietario puede editar productos');

    const { id } = await params;
    const body = await req.json();
    const updated = await updateProducto(Number(id), user.tenantId, body);
    return ok(updated);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError('Solo el propietario puede desactivar productos');

    const { id } = await params;
    const updated = await deactivateProducto(Number(id), user.tenantId);
    return ok(updated);
  } catch (err) {
    return apiError(err);
  }
}
