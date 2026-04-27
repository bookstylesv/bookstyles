/**
 * GET  /api/usuarios — Lista todos los usuarios del tenant (excepto clientes)
 * POST /api/usuarios — Crea un nuevo usuario con rol específico
 */
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import type { BarberUserRole } from '@prisma/client';

const STAFF_ROLES: BarberUserRole[] = ['OWNER', 'ADMIN', 'GERENTE', 'IT', 'BARBER'];

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const usuarios = await prisma.barberUser.findMany({
      where:   { tenantId: user.tenantId, role: { in: STAFF_ROLES } },
      select: {
        id: true, fullName: true, email: true, phone: true,
        role: true, active: true, createdAt: true, avatarUrl: true,
        barberProfile: { select: { id: true, cargo: true } },
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });

    return ok(usuarios);
  } catch (err) { return apiError(err); }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new UnauthorizedError();
    if (!['OWNER', 'ADMIN', 'IT'].includes(currentUser.role))
      throw new UnauthorizedError();

    const body = await req.json();
    const { fullName, email, role, phone } = body as {
      fullName: string; email: string;
      role: BarberUserRole; phone?: string;
    };

    if (!fullName?.trim()) throw new ValidationError('El nombre es obligatorio');
    if (!email?.trim())    throw new ValidationError('El email es obligatorio');
    if (!role || !STAFF_ROLES.includes(role)) throw new ValidationError('Rol no válido');

    // Generar contraseña temporal
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$';
    const tempPassword = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const bcrypt  = await import('bcryptjs');
    const hashed  = await bcrypt.hash(tempPassword, 10);

    const usuario = await prisma.barberUser.create({
      data: {
        tenantId: currentUser.tenantId,
        fullName: fullName.trim(),
        email:    email.trim().toLowerCase(),
        password: hashed,
        phone:    phone?.trim() || null,
        role,
        active:   true,
      },
      select: { id: true, fullName: true, email: true, role: true, active: true, createdAt: true },
    });

    return created({ ...usuario, tempPassword });
  } catch (err) { return apiError(err); }
}
