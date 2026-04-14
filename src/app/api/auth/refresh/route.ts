/**
 * GET /api/auth/refresh
 * Valida el refresh token (cookie), busca la sesión en BD,
 * emite un nuevo access token y redirige al destino original.
 *
 * Llamado automáticamente por el middleware cuando el access token expira.
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import { signAccessToken, resolveBranchForLogin, type JwtPayload } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const IS_PROD = process.env.NODE_ENV === 'production'

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? '')
}

export async function GET(req: NextRequest) {
  const redirectParam = req.nextUrl.searchParams.get('redirect') || '/dashboard'
  const loginUrl      = new URL('/login', req.url)

  try {
    const refreshToken = req.cookies.get('barber_refresh_token')?.value
    if (!refreshToken) return NextResponse.redirect(loginUrl)

    // ── 1. Verificar estructura JWT del refresh token ────────────────────
    try {
      await jwtVerify(refreshToken, getSecret())
    } catch {
      // Refresh token expirado o corrupto → forzar nuevo login
      const res = NextResponse.redirect(loginUrl)
      res.cookies.delete('barber_access_token')
      res.cookies.delete('barber_refresh_token')
      return res
    }

    // ── 2. Buscar sesión en base de datos ────────────────────────────────
    const session = await prisma.barberSession.findFirst({
      where: {
        refreshToken,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: { id: true, fullName: true, role: true, active: true },
        },
        tenant: {
          select: { id: true, slug: true, status: true },
        },
      },
    })

    // Sesión inválida, usuario inactivo o tenant suspendido → logout
    if (
      !session ||
      !session.user.active ||
      session.tenant.status === 'SUSPENDED' ||
      session.tenant.status === 'CANCELLED'
    ) {
      const res = NextResponse.redirect(loginUrl)
      res.cookies.delete('barber_access_token')
      res.cookies.delete('barber_refresh_token')
      return res
    }

    // ── 3. Emitir nuevo access token ──────────────────────────────────────
    const { branchId, branchSlug } = await resolveBranchForLogin(
      session.user.id,
      session.tenant.id,
      session.user.role,
    );
    const payload: JwtPayload = {
      sub:        String(session.user.id),
      tenantId:   session.tenant.id,
      role:       session.user.role,
      slug:       session.tenant.slug,
      name:       session.user.fullName,
      branchId,
      branchSlug,
    }
    const newAccessToken = await signAccessToken(payload)

    // ── 4. Redirigir a destino original con la nueva cookie ───────────────
    const destination = new URL(
      redirectParam.startsWith('/') ? redirectParam : `/${redirectParam}`,
      req.url
    )
    const res = NextResponse.redirect(destination)
    res.cookies.set('barber_access_token', newAccessToken, {
      httpOnly: true,
      secure:   IS_PROD,
      sameSite: IS_PROD ? 'none' : 'lax',
      path:     '/',
      maxAge:   15 * 60, // 15 minutos
    })

    return res
  } catch (err) {
    console.error('[auth/refresh]', err)
    return NextResponse.redirect(loginUrl)
  }
}
