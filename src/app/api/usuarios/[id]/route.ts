/**
 * PATCH  /api/usuarios/[id] — Actualiza rol, módulos o estado de un usuario
 * DELETE /api/usuarios/[id] — Desactiva un usuario (soft delete)
 * Solo accesible para SUPERADMIN (el middleware ya bloquea el resto).
 */
import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { BarberUserRole } from '@prisma/client';
import { getPlanLimits, moduleAccessFromPlanModules } from '@/lib/plan-guard';

const ASSIGNABLE_ROLES: BarberUserRole[] = ['GERENTE', 'USERS'];

async function getAllowedModuleAccess(tenantId: number) {
  const limits = await getPlanLimits(tenantId);
  return moduleAccessFromPlanModules(limits.modules);
}

function filterAllowedModules(moduleAccess: string[] | null | undefined, allowedModules: string[]) {
  if (!Array.isArray(moduleAccess)) return [];
  return moduleAccess.filter(module => allowedModules.includes(module));
}

export const PATCH = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
  if (ctx.user.role !== 'SUPERADMIN') throw new ForbiddenError();

  const { id } = await routeCtx.params;
  const userId  = parseInt(id);
  if (isNaN(userId)) throw new ValidationError('ID inválido');

  const body = await req.json();
  const { role, active, moduleAccess, fullName, email, phone, branchId } = body as {
    role?:         BarberUserRole;
    active?:       boolean;
    moduleAccess?: string[] | null;
    fullName?:     string;
    email?:        string;
    phone?:        string | null;
    branchId?:     number | null;
  };

  const target = await prisma.barberUser.findFirst({
    where: { id: userId, tenantId: ctx.tenantId },
  });
  if (!target) throw new NotFoundError('Usuario');

  if (target.role === 'OWNER') throw new ForbiddenError('No se puede modificar al propietario');

  if (role && !ASSIGNABLE_ROLES.includes(role)) {
    throw new ValidationError('Solo se pueden asignar los roles Gerente o Usuario');
  }

  const allowedModules = await getAllowedModuleAccess(ctx.tenantId);

  const resolvedModuleAccess = role === 'GERENTE' || role === 'USERS'
    ? filterAllowedModules(moduleAccess, allowedModules)
    : undefined;

  if (branchId) {
    const branch = await prisma.barberBranch.findFirst({
      where: { id: branchId, tenantId: ctx.tenantId },
    });
    if (!branch) throw new ValidationError('La sucursal seleccionada no existe');
  }

  const effectiveRole = role ?? target.role;

  const updated = await prisma.barberUser.update({
    where: { id: userId },
    data: {
      ...(fullName !== undefined && fullName.trim() && { fullName: fullName.trim() }),
      ...(email    !== undefined && email.trim()    && { email: email.trim().toLowerCase() }),
      ...(phone    !== undefined                    && { phone: phone?.trim() || null }),
      ...(role     !== undefined                    && { role }),
      ...(active   !== undefined                    && { active }),
      ...(branchId !== undefined && {
        branchId: (effectiveRole === 'GERENTE' || effectiveRole === 'USERS') ? branchId : null,
      }),
      ...(role !== undefined
        ? { moduleAccess: resolvedModuleAccess }
        : moduleAccess !== undefined && {
            moduleAccess: Array.isArray(moduleAccess)
              ? filterAllowedModules(moduleAccess, allowedModules)
              : Prisma.DbNull,
          }
      ),
    },
    select: {
      id: true, fullName: true, email: true, role: true,
      moduleAccess: true, active: true,
      branchId: true, branch: { select: { id: true, name: true, slug: true } },
    },
  });

  return ok(updated);
}, { requiredModule: 'usuarios' })

export const DELETE = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
  if (ctx.user.role !== 'SUPERADMIN') throw new ForbiddenError();

  const { id } = await routeCtx.params;
  const userId  = parseInt(id);
  if (isNaN(userId)) throw new ValidationError('ID inválido');

  const target = await prisma.barberUser.findFirst({
    where: { id: userId, tenantId: ctx.tenantId },
  });
  if (!target) throw new NotFoundError('Usuario');
  if (target.role === 'OWNER' || target.role === 'SUPERADMIN') {
    throw new ForbiddenError('No se pueden eliminar los roles protegidos del sistema');
  }

  await prisma.barberUser.update({
    where: { id: userId },
    data:  { active: false },
  });

  return ok({ message: 'Usuario desactivado' });
}, { requiredModule: 'usuarios' })
