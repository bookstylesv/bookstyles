/**
 * GET    /api/clients/[id]  — Detalle con historial de citas
 * PATCH  /api/clients/[id]  — Actualizar datos del cliente
 * DELETE /api/clients/[id]  — Eliminar / desactivar cliente
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import {
  getClientById,
  updateClientUser,
  setClientActive,
  removeClient,
} from '@/modules/clients/clients.service';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {    const { id } = await routeCtx.params;
    const client = await getClientById(ctx.tenantId, Number(id));
    return ok(client);
}, { requiredModule: 'clients' })

export const PATCH = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const body = await req.json();

    // Soporte para toggle active
    if (typeof body.active === 'boolean') {
      const client = await setClientActive(ctx.tenantId, Number(id), body.active);
      return ok(client);
    }

    const client = await updateClientUser(ctx.tenantId, Number(id), body);
    return ok(client);
}, { requiredModule: 'clients' })

export const DELETE = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    await removeClient(ctx.tenantId, Number(id));
    return ok({ deleted: true });
}, { requiredModule: 'clients' })
