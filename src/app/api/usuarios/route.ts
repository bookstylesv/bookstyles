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
import { getPlanLimits, moduleAccessFromPlanModules } from '@/lib/plan-guard';

const ERP_ROLES: BarberUserRole[] = ['OWNER', 'SUPERADMIN', 'GERENTE', 'USERS'];

async function getAllowedModuleAccess(tenantId: number) {
  const limits = await getPlanLimits(tenantId);
  return moduleAccessFromPlanModules(limits.modules);
}

function filterAllowedModules(moduleAccess: string[] | null | undefined, allowedModules: string[]) {
  if (!Array.isArray(moduleAccess)) return [];
  return moduleAccess.filter(module => allowedModules.includes(module));
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    // El middleware ya bloquea el acceso a /api/usuarios para no-SUPERADMIN,
    // pero añadimos la verificación explícita como defensa en profundidad.
    if (user.role !== 'SUPERADMIN') throw new ForbiddenError();

    const [usuarios, availableModules] = await Promise.all([
      prisma.barberUser.findMany({
        where:   { tenantId: user.tenantId, role: { in: ERP_ROLES } },
        select: {
          id: true, fullName: true, email: true, phone: true,
          role: true, moduleAccess: true, active: true, createdAt: true, avatarUrl: true,
          branchId: true,
          branch: { select: { id: true, name: true, slug: true } },
        },
        orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      }),
      getAllowedModuleAccess(user.tenantId),
    ]);

    return ok({ users: usuarios, availableModules });
  } catch (err) { return apiError(err); }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new UnauthorizedError();
    if (currentUser.role !== 'SUPERADMIN') throw new ForbiddenError();

    const body = await req.json();
    const { fullName, email, role, phone, moduleAccess, branchId } = body as {
      fullName:     string;
      email:        string;
      role:         BarberUserRole;
      phone?:       string;
      moduleAccess: string[] | null;
      branchId?:    number | null;
    };

    if (!fullName?.trim()) throw new ValidationError('El nombre es obligatorio');
    if (!email?.trim())    throw new ValidationError('El email es obligatorio');

    // Solo se pueden asignar estos roles desde la UI
    const ASSIGNABLE: BarberUserRole[] = ['GERENTE', 'USERS'];
    if (!role || !ASSIGNABLE.includes(role)) throw new ValidationError('Rol no válido');

    // Generar contraseña temporal
    const chars       = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$';
    const tempPassword = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const bcrypt      = await import('bcryptjs');
    const hashed      = await bcrypt.hash(tempPassword, 10);

    const allowedModules = await getAllowedModuleAccess(currentUser.tenantId);
    const resolvedModuleAccess = filterAllowedModules(moduleAccess, allowedModules);

    // Validar que branchId pertenece al tenant si se proporciona
    if (branchId) {
      const branch = await prisma.barberBranch.findFirst({
        where: { id: branchId, tenantId: currentUser.tenantId },
      });
      if (!branch) throw new ValidationError('La sucursal seleccionada no existe');
    }

    const usuario = await prisma.barberUser.create({
      data: {
        tenantId:     currentUser.tenantId,
        fullName:     fullName.trim(),
        email:        email.trim().toLowerCase(),
        password:     hashed,
        phone:        phone?.trim() || null,
        role,
        branchId:     (role === 'GERENTE' || role === 'USERS') ? (branchId ?? null) : null,
        moduleAccess: role === 'GERENTE' || role === 'USERS'
          ? resolvedModuleAccess
          : Prisma.DbNull,
        active:       true,
      },
      select: {
        id: true, fullName: true, email: true, role: true,
        moduleAccess: true, active: true, createdAt: true,
        branchId: true, branch: { select: { id: true, name: true, slug: true } },
      },
    });

    return created({ ...usuario, tempPassword });
  } catch (err) { return apiError(err); }
}
