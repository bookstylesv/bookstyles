/**
 * PATCH  /api/usuarios/[id] — Actualiza rol, módulos o estado de un usuario
 * DELETE /api/usuarios/[id] — Desactiva un usuario (soft delete)
 * Solo accesible para SUPERADMIN (el middleware ya bloquea el resto).
 */
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors';
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new UnauthorizedError();
    if (currentUser.role !== 'SUPERADMIN') throw new ForbiddenError();

    const { id } = await params;
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
      where: { id: userId, tenantId: currentUser.tenantId },
    });
    if (!target) throw new NotFoundError('Usuario');

    // No se puede modificar al propietario ni a otro SUPERADMIN
    if (target.role === 'OWNER') throw new ForbiddenError('No se puede modificar al propietario');

    // No se puede asignar OWNER ni SUPERADMIN desde este endpoint
    if (role && !ASSIGNABLE_ROLES.includes(role)) {
      throw new ValidationError('Solo se pueden asignar los roles Gerente o Usuario');
    }

    const allowedModules = await getAllowedModuleAccess(currentUser.tenantId);

    // Si cambia a USUARIO y no trae módulos, inicializar vacío
    const resolvedModuleAccess = role === 'GERENTE' || role === 'USERS'
      ? filterAllowedModules(moduleAccess, allowedModules)
      : undefined;

    // Validar que branchId pertenece al tenant si se proporciona
    if (branchId) {
      const branch = await prisma.barberBranch.findFirst({
        where: { id: branchId, tenantId: currentUser.tenantId },
      });
      if (!branch) throw new ValidationError('La sucursal seleccionada no existe');
    }

    // Detectar rol efectivo (el nuevo si cambió, o el actual)
    const effectiveRole = role ?? target.role;

    const updated = await prisma.barberUser.update({
      where: { id: userId },
      data: {
        ...(fullName !== undefined && fullName.trim() && { fullName: fullName.trim() }),
        ...(email    !== undefined && email.trim()    && { email: email.trim().toLowerCase() }),
        ...(phone    !== undefined                    && { phone: phone?.trim() || null }),
        ...(role     !== undefined                    && { role }),
        ...(active   !== undefined                    && { active }),
        // Sucursal: solo aplica para GERENTE/USERS
        ...(branchId !== undefined && {
          branchId: (effectiveRole === 'GERENTE' || effectiveRole === 'USERS') ? branchId : null,
        }),
        // Módulos: si cambió rol → usar resueltos; si solo moduleAccess → actualizar directo
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
  } catch (err) { return apiError(err); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new UnauthorizedError();
    if (currentUser.role !== 'SUPERADMIN') throw new ForbiddenError();

    const { id } = await params;
    const userId  = parseInt(id);
    if (isNaN(userId)) throw new ValidationError('ID inválido');

    const target = await prisma.barberUser.findFirst({
      where: { id: userId, tenantId: currentUser.tenantId },
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
  } catch (err) { return apiError(err); }
}
