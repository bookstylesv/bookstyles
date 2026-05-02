import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { BarberUserRole } from '@prisma/client';

const ERP_ACCESS_ROLES: BarberUserRole[] = ['OWNER', 'SUPERADMIN', 'GERENTE', 'USERS'];

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!#$';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const { id, userId } = await params;
  const tenantId = Number(id);
  const targetUserId = Number(userId);

  if (!tenantId || isNaN(tenantId) || !targetUserId || isNaN(targetUserId)) {
    return NextResponse.json({ error: 'tenantId o userId invalido' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({})) as { password?: string };
  const password = body.password?.trim() || generatePassword();

  if (password.length < 8) {
    return NextResponse.json({ error: 'La contrasena debe tener al menos 8 caracteres' }, { status: 422 });
  }

  const user = await prisma.barberUser.findFirst({
    where: {
      id:       targetUserId,
      tenantId,
      role:     { in: ERP_ACCESS_ROLES },
    },
    select: { id: true, email: true, fullName: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Usuario ERP no encontrado en este tenant' }, { status: 404 });
  }

  const hashed = await bcrypt.hash(password, 10);

  await prisma.barberUser.update({
    where: { id: user.id },
    data:  { password: hashed },
  });

  return NextResponse.json({
    userId:      user.id,
    userEmail:   user.email,
    userName:    user.fullName,
    role:        user.role,
    newPassword: password,
  });
}
