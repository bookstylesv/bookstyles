/**
 * GET   /api/settings — Obtener datos del tenant
 * PATCH /api/settings — Actualizar info + tema del tenant
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { tenantsRepository } from '@/modules/tenants/tenants.repository';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {    const tenant = await tenantsRepository.findById(ctx.tenantId);
    if (!tenant) throw new UnauthorizedError();

    return ok({
      id:           tenant.id,
      slug:         tenant.slug,
      name:         tenant.name,
      email:        tenant.email,
      phone:        tenant.phone,
      address:      tenant.address,
      city:         tenant.city,
      country:      tenant.country,
      logoUrl:      tenant.logoUrl,
      plan:         tenant.plan,
      status:       tenant.status,
      businessType: tenant.businessType,
      themeConfig:  tenant.themeConfig,
      trialEndsAt:  tenant.trialEndsAt,
      paidUntil:    tenant.paidUntil,
    });
}, { requiredModule: 'settings' })

export const PATCH = withTenantAuth(async (req: NextRequest, ctx) => {    if (ctx.user.role !== 'SUPERADMIN') throw new ForbiddenError();

    const body = await req.json() as Record<string, unknown>;

    // Actualizar info básica
    const infoFields = ['name', 'email', 'phone', 'address', 'city', 'logoUrl'] as const;
    const infoUpdate: Record<string, string> = {};
    for (const field of infoFields) {
      if (body[field] !== undefined && body[field] !== null) {
        infoUpdate[field] = String(body[field]);
      }
    }

    let tenant = await tenantsRepository.findById(ctx.tenantId);
    if (!tenant) throw new UnauthorizedError();

    if (Object.keys(infoUpdate).length > 0) {
      tenant = await tenantsRepository.updateInfo(ctx.tenantId, infoUpdate);
    }

    // Actualizar tema
    if (body.themeConfig && typeof body.themeConfig === 'object') {
      const currentTheme = (tenant?.themeConfig ?? {}) as Record<string, string>;
      const newTheme = { ...currentTheme, ...(body.themeConfig as Record<string, string>) };
      tenant = await tenantsRepository.updateTheme(ctx.tenantId, newTheme);
    }

    return ok(tenant);
}, { requiredModule: 'settings' })
