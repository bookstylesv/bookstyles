/**
 * GET    /api/branches/[id]  — Obtener sucursal con detalle
 * PATCH  /api/branches/[id]  — Actualizar sucursal (solo OWNER)
 * DELETE /api/branches/[id]  — Eliminar sucursal (solo OWNER, sin datos)
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { branchesService } from '@/modules/branches/branches.service';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const { id } = await params;
    const branch = await branchesService.getBranch(Number(id), user.tenantId);
    return ok(branch);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER') throw new ForbiddenError('Solo el propietario puede editar sucursales');

    const { id } = await params;
    const body = await req.json();
    const branch = await branchesService.updateBranch(Number(id), user.tenantId, body);
    return ok(branch);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER') throw new ForbiddenError('Solo el propietario puede eliminar sucursales');

    const { id } = await params;
    await branchesService.deleteBranch(Number(id), user.tenantId);
    return ok({ deleted: true });
  } catch (err) {
    return apiError(err);
  }
}
