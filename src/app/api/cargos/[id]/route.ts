/**
 * PUT    /api/cargos/[id] — Actualizar cargo
 * DELETE /api/cargos/[id] — Eliminar cargo
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { updateCargo, deleteCargo } from '@/modules/cargos/cargos.service';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER') throw new ForbiddenError();
    const { id } = await params;
    const body = await req.json();
    return ok(await updateCargo(Number(id), user.tenantId, body));
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER') throw new ForbiddenError();
    const { id } = await params;
    return ok(await deleteCargo(Number(id), user.tenantId));
  } catch (err) {
    return apiError(err);
  }
}
