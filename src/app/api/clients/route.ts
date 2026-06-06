/**
 * GET  /api/clients  — Listar clientes del tenant
 * POST /api/clients  — Crear nuevo cliente
 */

import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import { ForbiddenError } from '@/lib/errors';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { listClients, createClientUser, listClientsWithDescuento } from '@/modules/clients/clients.service';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {
  const conDescuento = req.nextUrl.searchParams.get('conDescuento') === 'true';
  const clients = conDescuento
    ? await listClientsWithDescuento(ctx.tenantId)
    : await listClients(ctx.tenantId);
  return ok(clients);
}, { requiredModule: 'clients' });

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
  if (ctx.user.role === 'OWNER') throw new ForbiddenError();

  const body = await req.json();
  const client = await createClientUser(ctx.tenantId, body);
  return created(client);
}, { requiredModule: 'clients' });
