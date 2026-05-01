/**
 * GET  /api/superadmin/tenants/[id]/users — Lista el equipo (SUPERADMIN, GERENTE, USERS)
 * POST /api/superadmin/tenants/[id]/users — Crea un usuario del equipo
 *
 * La asociación GERENTE↔sucursal se guarda en BarberBranch.managerId (no en BarberUser).
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { BarberUserRole } from '@prisma/client';

const TEAM_ROLES: BarberUserRole[] = ['SUPERADMIN', 'GERENTE', 'USERS'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const { id } = await params;
  const tenantId = Number(id);

  if (!tenantId || isNaN(tenantId)) {
    return NextResponse.json({ error: 'tenantId inválido' }, { status: 400 });
  }

  try {
    const [users, branches] = await Promise.all([
      prisma.barberUser.findMany({
        where:   { tenantId, role: { in: TEAM_ROLES } },
        select:  { id: true, fullName: true, email: true, role: true, active: true, moduleAccess: true, createdAt: true },
        orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      }),
      // Sucursales del tenant para saber cuál tiene cada GERENTE como managerId
      prisma.barberBranch.findMany({
        where:  { tenantId, managerId: { not: null } },
        select: { id: true, name: true, slug: true, isHeadquarters: true, managerId: true },
      }),
    ]);

    // Mapa userId → rama gestionada
    const branchByManager = new Map(branches.map(b => [b.managerId!, b]));

    return NextResponse.json(
      users.map(u => ({
        ...u,
        branch: branchByManager.get(u.id) ?? null,
      })),
    );
  } catch (err) {
    console.error('[superadmin/tenants/users GET]', err);
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const { id } = await params;
  const tenantId = Number(id);

  if (!tenantId || isNaN(tenantId)) {
    return NextResponse.json({ error: 'tenantId inválido' }, { status: 400 });
  }

  try {
    const body = await req.json() as {
      role:      BarberUserRole;
      fullName:  string;
      email:     string;
      password:  string;
      branchId?: number;
    };

    const { role, fullName, email, password, branchId } = body;

    if (!TEAM_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Rol no válido. Use SUPERADMIN, GERENTE o USERS' }, { status: 422 });
    }
    if (!fullName?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'fullName, email y password son requeridos' }, { status: 422 });
    }

    // Solo un SUPERADMIN por tenant
    if (role === 'SUPERADMIN') {
      const existing = await prisma.barberUser.findFirst({ where: { tenantId, role: 'SUPERADMIN' } });
      if (existing) {
        return NextResponse.json({ error: 'Ya existe un SUPERADMIN para este tenant' }, { status: 409 });
      }
    }

    // GERENTE requiere branchId
    if (role === 'GERENTE' && !branchId) {
      return NextResponse.json({ error: 'El rol GERENTE requiere una sucursal asignada' }, { status: 422 });
    }

    // Verificar que branchId pertenece al tenant
    let branch: { id: number; name: string; slug: string; isHeadquarters: boolean } | null = null;
    if (branchId) {
      branch = await prisma.barberBranch.findFirst({
        where:  { id: branchId, tenantId },
        select: { id: true, name: true, slug: true, isHeadquarters: true },
      });
      if (!branch) {
        return NextResponse.json({ error: 'Sucursal no encontrada en este tenant' }, { status: 404 });
      }
    }

    // Email único dentro del tenant
    const emailTaken = await prisma.barberUser.findFirst({
      where: { tenantId, email: email.trim().toLowerCase() },
    });
    if (emailTaken) {
      return NextResponse.json({ error: 'El email ya está en uso en este tenant' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.barberUser.create({
      data: {
        tenantId,
        fullName:     fullName.trim(),
        email:        email.trim().toLowerCase(),
        password:     hashed,
        role,
        moduleAccess: role === 'GERENTE' || role === 'USERS' ? [] : undefined,
        active:       true,
      },
      select: { id: true, fullName: true, email: true, role: true, active: true, moduleAccess: true, createdAt: true },
    });

    // Si es GERENTE, asignar como manager de la sucursal
    if (role === 'GERENTE' && branchId) {
      await prisma.barberBranch.update({
        where: { id: branchId },
        data:  { managerId: user.id },
      });
    }

    return NextResponse.json({ ...user, branch: branch ?? null }, { status: 201 });
  } catch (err) {
    console.error('[superadmin/tenants/users POST]', err);
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
