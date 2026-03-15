/**
 * GET    /api/services/[id]  — Obtener servicio
 * PATCH  /api/services/[id]  — Actualizar servicio
 * DELETE /api/services/[id]  — Eliminar servicio
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';
import * as svc from '@/modules/services/services.service';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const { id } = await params;
    const service = await svc.getService(Number(id), user.tenantId);
    return ok(service);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const { id } = await params;
    const body = await req.json();
    const service = await svc.updateService(Number(id), user.tenantId, body);
    return ok(service);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const { id } = await params;
    await svc.removeService(Number(id), user.tenantId);
    return ok({ deleted: true });
  } catch (err) {
    return apiError(err);
  }
}
