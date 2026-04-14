/**
 * POST /api/auth/switch-branch
 * Permite al OWNER cambiar la sucursal activa sin re-login.
 * Emite un nuevo access token con el branchId actualizado.
 * El BARBER solo puede cambiar a sucursales donde está asignado.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, signAccessToken, setAuthCookies, getRefreshTokenFromCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';

const IS_PROD = process.env.NODE_ENV === 'production';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json() as { branchId: number | null };

    // branchId = null solo para OWNER (vista consolidada)
    if (body.branchId === null) {
      if (user.role !== 'OWNER') {
        return NextResponse.json({ error: 'Solo el propietario puede ver todas las sucursales' }, { status: 403 });
      }

      const newToken = await signAccessToken({ ...user, branchId: null, branchSlug: null });
      const refreshToken = await getRefreshTokenFromCookie();
      if (refreshToken) {
        await setAuthCookies(newToken, refreshToken);
      }
      return ok({ branchId: null, branchSlug: null });
    }

    // Verificar que la sucursal pertenece al tenant
    const branch = await prisma.barberBranch.findFirst({
      where: { id: body.branchId, tenantId: user.tenantId, status: 'ACTIVE' },
      select: { id: true, slug: true },
    });

    if (!branch) {
      return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 });
    }

    // BARBER: solo puede cambiar a sucursales donde esté asignado
    if (user.role === 'BARBER') {
      const barber = await prisma.barber.findUnique({
        where: { userId: Number(user.sub) },
        select: { id: true },
      });

      if (!barber) {
        return NextResponse.json({ error: 'Perfil de barbero no encontrado' }, { status: 404 });
      }

      const assignment = await prisma.barberBranchAssignment.findUnique({
        where: { branchId_barberId: { branchId: branch.id, barberId: barber.id } },
      });

      if (!assignment) {
        return NextResponse.json({ error: 'No estás asignado a esa sucursal' }, { status: 403 });
      }
    }

    // Emitir nuevo token con branchId actualizado
    const newToken = await signAccessToken({ ...user, branchId: branch.id, branchSlug: branch.slug });
    const refreshToken = await getRefreshTokenFromCookie();
    if (refreshToken) {
      await setAuthCookies(newToken, refreshToken);
    } else {
      // Sin refresh token: solo setear la cookie del access token
      const res = ok({ branchId: branch.id, branchSlug: branch.slug });
      (res as NextResponse).cookies.set('barber_access_token', newToken, {
        httpOnly: true,
        secure:   IS_PROD,
        sameSite: IS_PROD ? 'none' : 'lax',
        path:     '/',
        maxAge:   15 * 60,
      });
      return res;
    }

    return ok({ branchId: branch.id, branchSlug: branch.slug });
  } catch (err) {
    return apiError(err);
  }
}
