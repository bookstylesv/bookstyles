/**
 * PATCH /api/usuarios/[id] — Actualiza rol o estado activo de un usuario
 * DELETE /api/usuarios/[id] — Desactiva un usuario (soft delete)
 */
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import type { BarberUserRole } from '@prisma/client';

const STAFF_ROLES: BarberUserRole[] = ['OWNER', 'ADMIN', 'GERENTE', 'IT', 'BARBER'];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new UnauthorizedError();
    if (!['OWNER', 'ADMIN', 'IT'].includes(currentUser.role)) throw new UnauthorizedError();

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) throw new ValidationError('ID inválido');

    const body = await req.json();
    const { role, active } = body as { role?: BarberUserRole; active?: boolean };

    // Verificar que el usuario pertenece al mismo tenant
    const target = await prisma.barberUser.findFirst({
      where: { id: userId, tenantId: currentUser.tenantId },
    });
    if (!target) throw new NotFoundError('Usuario');

    // No permitir cambiar el rol de un OWNER desde la UI (solo otro OWNER podría)
    if (target.role === 'OWNER' && currentUser.role !== 'OWNER')
      throw new UnauthorizedError();

    // No permitir asignar rol OWNER desde este endpoint
    if (role === 'OWNER' && currentUser.role !== 'OWNER')
      throw new UnauthorizedError();

    if (role && !STAFF_ROLES.includes(role)) throw new ValidationError('Rol no válido');

    const updated = await prisma.barberUser.update({
      where: { id: userId },
      data: {
        ...(role !== undefined && { role }),
        ...(active !== undefined && { active }),
      },
      select: { id: true, fullName: true, email: true, role: true, active: true },
    });

    return ok(updated);
  } catch (err) { return apiError(err); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new UnauthorizedError();
    if (!['OWNER', 'ADMIN'].includes(currentUser.role)) throw new UnauthorizedError();

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) throw new ValidationError('ID inválido');

    const target = await prisma.barberUser.findFirst({
      where: { id: userId, tenantId: currentUser.tenantId },
    });
    if (!target) throw new NotFoundError('Usuario');
    if (target.role === 'OWNER') throw new UnauthorizedError();

    // Soft delete — desactivar
    await prisma.barberUser.update({
      where: { id: userId },
      data: { active: false },
    });

    return ok({ message: 'Usuario desactivado' });
  } catch (err) { return apiError(err); }
}
