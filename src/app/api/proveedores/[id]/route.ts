/**
 * GET    /api/proveedores/[id]  — Detalle de un proveedor
 * PUT    /api/proveedores/[id]  — Actualizar proveedor
 * DELETE /api/proveedores/[id]  — Desactivar proveedor (soft delete)
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import {
  getProveedorById,
  updateProveedorService,
  deactivateProveedorService,
} from '@/modules/proveedores/proveedores.service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const { id } = await params;
    const proveedor = await getProveedorById(user.tenantId, Number(id));
    return ok(proveedor);
  } catch (err) {
    return apiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const { id }    = await params;
    const body      = await req.json();
    const proveedor = await updateProveedorService(user.tenantId, Number(id), body);
    return ok(proveedor);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (!['OWNER','SUPERADMIN','GERENTE','USERS'].includes(user.role)) throw new ForbiddenError();

    const { id }    = await params;
    const proveedor = await deactivateProveedorService(user.tenantId, Number(id));
    return ok({ deactivated: true, proveedor });
  } catch (err) {
    return apiError(err);
  }
}
