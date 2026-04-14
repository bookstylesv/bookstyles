/**
 * GET  /api/branches  — Listar sucursales del tenant
 * POST /api/branches  — Crear nueva sucursal (solo OWNER)
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { branchesService } from '@/modules/branches/branches.service';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const branches = await branchesService.listBranches(user.tenantId);
    return ok(branches);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER') throw new ForbiddenError('Solo el propietario puede crear sucursales');

    const body = await req.json();
    const branch = await branchesService.createBranch(user.tenantId, body);
    return created(branch);
  } catch (err) {
    return apiError(err);
  }
}
