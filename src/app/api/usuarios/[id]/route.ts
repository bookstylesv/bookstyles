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

const ASSIGNABLE_ROLES: BarberUserRole[] = ['GERENTE', 'USUARIO'];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new UnauthorizedError();
    if (currentUser.role !== 'SUPERADMIN') throw new ForbiddenError();

    const { id } = await params;
    const userId  = parseInt(id);
    if (isNaN(userId)) throw new ValidationError('ID inválido');

    const body = await req.json();
    const { role, active, moduleAccess } = body as {
      role?:         BarberUserRole;
      active?:       boolean;
      moduleAccess?: string[] | null;
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

    // Si cambia a USUARIO y no trae módulos, inicializar vacío
    const resolvedModuleAccess = role === 'USUARIO'
      ? (Array.isArray(moduleAccess) ? moduleAccess : [])
      : role === 'GERENTE'
        ? Prisma.DbNull
        : undefined;

    const updated = await prisma.barberUser.update({
      where: { id: userId },
      data: {
        ...(role !== undefined   && { role }),
        ...(active !== undefined && { active }),
        // Si cambió rol: aplicar módulos resueltos; si solo se envió moduleAccess: actualizar directo
        ...(role !== undefined
          ? { moduleAccess: resolvedModuleAccess }
          : moduleAccess !== undefined && { moduleAccess: Array.isArray(moduleAccess) ? moduleAccess : Prisma.DbNull }
        ),
      },
      select: { id: true, fullName: true, email: true, role: true, moduleAccess: true, active: true },
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
