/**
 * GET   /api/settings — Obtener datos del tenant
 * PATCH /api/settings — Actualizar info + tema del tenant
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { tenantsRepository } from '@/modules/tenants/tenants.repository';

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const tenant = await tenantsRepository.findById(user.tenantId);
    if (!tenant) throw new UnauthorizedError();

    return ok({
      id:          tenant.id,
      slug:        tenant.slug,
      name:        tenant.name,
      email:       tenant.email,
      phone:       tenant.phone,
      address:     tenant.address,
      city:        tenant.city,
      country:     tenant.country,
      logoUrl:     tenant.logoUrl,
      plan:        tenant.plan,
      status:      tenant.status,
      themeConfig: tenant.themeConfig,
      trialEndsAt: tenant.trialEndsAt,
      paidUntil:   tenant.paidUntil,
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER') throw new ForbiddenError();

    const body = await req.json() as Record<string, unknown>;

    // Actualizar info básica
    const infoFields = ['name', 'email', 'phone', 'address', 'city', 'logoUrl'] as const;
    const infoUpdate: Record<string, string> = {};
    for (const field of infoFields) {
      if (body[field] !== undefined && body[field] !== null) {
        infoUpdate[field] = String(body[field]);
      }
    }

    let tenant = await tenantsRepository.findById(user.tenantId);
    if (!tenant) throw new UnauthorizedError();

    if (Object.keys(infoUpdate).length > 0) {
      tenant = await tenantsRepository.updateInfo(user.tenantId, infoUpdate);
    }

    // Actualizar tema
    if (body.themeConfig && typeof body.themeConfig === 'object') {
      const currentTheme = (tenant?.themeConfig ?? {}) as Record<string, string>;
      const newTheme = { ...currentTheme, ...(body.themeConfig as Record<string, string>) };
      tenant = await tenantsRepository.updateTheme(user.tenantId, newTheme);
    }

    return ok(tenant);
  } catch (err) {
    return apiError(err);
  }
}
