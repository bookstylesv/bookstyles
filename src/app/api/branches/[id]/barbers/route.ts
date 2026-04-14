/**
 * GET    /api/branches/[id]/barbers          — Listar barberos asignados
 * POST   /api/branches/[id]/barbers          — Asignar barbero a sucursal
 * DELETE /api/branches/[id]/barbers?barberId — Quitar barbero de sucursal
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { branchesService } from '@/modules/branches/branches.service';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const { id } = await params;
    const barbers = await branchesService.getBarbersForBranch(Number(id), user.tenantId);
    return ok(barbers);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER') throw new ForbiddenError('Solo el propietario puede asignar barberos');

    const { id } = await params;
    const { barberId, isPrimary = false } = await req.json() as { barberId: number; isPrimary?: boolean };
    const assignment = await branchesService.assignBarber(Number(id), user.tenantId, barberId, isPrimary);
    return created(assignment);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER') throw new ForbiddenError('Solo el propietario puede quitar barberos');

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const barberId = Number(searchParams.get('barberId'));
    await branchesService.removeBarber(Number(id), user.tenantId, barberId);
    return ok({ removed: true });
  } catch (err) {
    return apiError(err);
  }
}
