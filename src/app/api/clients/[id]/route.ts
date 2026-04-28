/**
 * GET    /api/clients/[id]  — Detalle con historial de citas
 * PATCH  /api/clients/[id]  — Actualizar datos del cliente
 * DELETE /api/clients/[id]  — Eliminar / desactivar cliente
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import {
  getClientById,
  updateClientUser,
  setClientActive,
  removeClient,
} from '@/modules/clients/clients.service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const { id } = await params;
    const client = await getClientById(user.tenantId, Number(id));
    return ok(client);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role === 'OWNER') throw new ForbiddenError();

    const { id } = await params;
    const body = await req.json();

    // Soporte para toggle active
    if (typeof body.active === 'boolean') {
      const client = await setClientActive(user.tenantId, Number(id), body.active);
      return ok(client);
    }

    const client = await updateClientUser(user.tenantId, Number(id), body);
    return ok(client);
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
    await removeClient(user.tenantId, Number(id));
    return ok({ deleted: true });
  } catch (err) {
    return apiError(err);
  }
}
