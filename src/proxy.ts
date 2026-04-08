/**
 * proxy.ts — Protección de rutas a nivel de red (Next.js 16+).
 * En Next.js 16, middleware.ts fue renombrado a proxy.ts con export proxy() y proxyConfig.
 * Verifica el JWT en barber_access_token antes de renderizar páginas del dashboard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? '')
}

// Rutas que NO requieren autenticación
const PUBLIC_PREFIXES = [
  '/login',
  '/api/auth',
  '/api/tenant/verify',
  '/api/public',
  '/api/book',
  '/api/superadmin',
  '/book',
]

// Si hay refresh token intenta renovar la sesión; si no, va a login.
function tryRefreshOrLogin(req: NextRequest, pathname: string) {
  const rt = req.cookies.get('barber_refresh_token')?.value
  if (rt) {
    const refreshUrl = new URL('/api/auth/refresh', req.url)
    refreshUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(refreshUrl)
  }
  return NextResponse.redirect(new URL('/login', req.url))
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Permitir rutas públicas sin verificar token
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = req.cookies.get('barber_access_token')?.value

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: { message: 'No autorizado', code: 'UNAUTHORIZED' } },
        { status: 401 },
      )
    }
    return tryRefreshOrLogin(req, pathname)
  }

  try {
    await jwtVerify(token, getSecret())
    return NextResponse.next()
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: { message: 'Token inválido o expirado', code: 'UNAUTHORIZED' } },
        { status: 401 },
      )
    }
    return tryRefreshOrLogin(req, pathname)
  }
}

export const proxyConfig = {
  // Excluir assets estáticos de Next.js
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
}
