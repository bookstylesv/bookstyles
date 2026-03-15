/**
 * GET  /api/clients  — Listar clientes del tenant
 * POST /api/clients  — Crear nuevo cliente
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { listClients, createClientUser } from '@/modules/clients/clients.service';

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const clients = await listClients(user.tenantId);
    return ok(clients);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER' && user.role !== 'BARBER') throw new ForbiddenError();

    const body = await req.json();
    const client = await createClientUser(user.tenantId, body);
    return created(client);
  } catch (err) {
    return apiError(err);
  }
}
