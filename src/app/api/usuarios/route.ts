/**
 * GET  /api/usuarios — Lista usuarios del tenant (excepto clientes del portal)
 * POST /api/usuarios — Crea un nuevo usuario (solo SUPERADMIN)
 */
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError, ValidationError, ForbiddenError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { BarberUserRole } from '@prisma/client';

const ERP_ROLES: BarberUserRole[] = ['OWNER', 'SUPERADMIN', 'GERENTE', 'USUARIO'];

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    // El middleware ya bloquea el acceso a /api/usuarios para no-SUPERADMIN,
    // pero añadimos la verificación explícita como defensa en profundidad.
    if (user.role !== 'SUPERADMIN') throw new ForbiddenError();

    const usuarios = await prisma.barberUser.findMany({
      where:   { tenantId: user.tenantId, role: { in: ERP_ROLES } },
      select: {
        id: true, fullName: true, email: true, phone: true,
        role: true, moduleAccess: true, active: true, createdAt: true, avatarUrl: true,
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
    if (currentUser.role !== 'SUPERADMIN') throw new ForbiddenError();

    const body = await req.json();
    const { fullName, email, role, phone, moduleAccess } = body as {
      fullName:     string;
      email:        string;
      role:         BarberUserRole;
      phone?:       string;
      moduleAccess: string[] | null;
    };

    if (!fullName?.trim()) throw new ValidationError('El nombre es obligatorio');
    if (!email?.trim())    throw new ValidationError('El email es obligatorio');

    // Solo se pueden asignar estos roles desde la UI
    const ASSIGNABLE: BarberUserRole[] = ['GERENTE', 'USUARIO'];
    if (!role || !ASSIGNABLE.includes(role)) throw new ValidationError('Rol no válido');

    // USUARIO requiere al menos un módulo asignado
    if (role === 'USUARIO' && (!Array.isArray(moduleAccess) || moduleAccess.length === 0)) {
      throw new ValidationError('El rol Usuario requiere al menos un módulo asignado');
    }

    // Generar contraseña temporal
    const chars       = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$';
    const tempPassword = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const bcrypt      = await import('bcryptjs');
    const hashed      = await bcrypt.hash(tempPassword, 10);

    const usuario = await prisma.barberUser.create({
      data: {
        tenantId:     currentUser.tenantId,
        fullName:     fullName.trim(),
        email:        email.trim().toLowerCase(),
        password:     hashed,
        phone:        phone?.trim() || null,
        role,
        moduleAccess: role === 'USUARIO' ? (moduleAccess ?? []) : Prisma.DbNull,
        active:       true,
      },
      select: { id: true, fullName: true, email: true, role: true, moduleAccess: true, active: true, createdAt: true },
    });

    return created({ ...usuario, tempPassword });
  } catch (err) { return apiError(err); }
}
