/**
 * GET  /api/services   — Listar servicios del tenant
 * POST /api/services   — Crear nuevo servicio
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';
import * as svc from '@/modules/services/services.service';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const services = await svc.listServices(user.tenantId);
    return ok(services);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const body = await req.json();
    const service = await svc.createService(user.tenantId, body);
    return created(service);
  } catch (err) {
    return apiError(err);
  }
}
