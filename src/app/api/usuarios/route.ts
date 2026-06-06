/**
 * GET  /api/usuarios — Lista usuarios del tenant (excepto clientes del portal)
 * POST /api/usuarios — Crea un nuevo usuario (solo SUPERADMIN)
 */
import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/response';
import { ValidationError, ForbiddenError } from '@/lib/errors';
import { withTenantAuth } from '@/lib/with-tenant-auth';
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

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {
  if (ctx.user.role !== 'SUPERADMIN') throw new ForbiddenError();

  const [usuarios, availableModules] = await Promise.all([
    prisma.barberUser.findMany({
      where:   { tenantId: ctx.tenantId, role: { in: ERP_ROLES } },
      select: {
        id: true, fullName: true, email: true, phone: true,
        role: true, moduleAccess: true, active: true, createdAt: true, avatarUrl: true,
        branchId: true,
        branch: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    }),
    getAllowedModuleAccess(ctx.tenantId),
  ]);

  return ok({ users: usuarios, availableModules });
}, { requiredModule: 'usuarios' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
  if (ctx.user.role !== 'SUPERADMIN') throw new ForbiddenError();

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

  const ASSIGNABLE: BarberUserRole[] = ['GERENTE', 'USERS'];
  if (!role || !ASSIGNABLE.includes(role)) throw new ValidationError('Rol no válido');

  const chars       = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$';
  const tempPassword = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const bcrypt      = await import('bcryptjs');
  const hashed      = await bcrypt.hash(tempPassword, 10);

  const allowedModules = await getAllowedModuleAccess(ctx.tenantId);
  const resolvedModuleAccess = filterAllowedModules(moduleAccess, allowedModules);

  if (branchId) {
    const branch = await prisma.barberBranch.findFirst({
      where: { id: branchId, tenantId: ctx.tenantId },
    });
    if (!branch) throw new ValidationError('La sucursal seleccionada no existe');
  }

  const usuario = await prisma.barberUser.create({
    data: {
      tenantId:     ctx.tenantId,
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
}, { requiredModule: 'usuarios' })
