/**
 * proxy.ts — Auth + Tenant middleware para Next.js 16.
 * Se ejecuta en Edge Runtime (antes de cada request).
 * Protege rutas del dashboard y verifica el JWT.
 *
 * Flujo:
 *  1. Ruta pública → dejar pasar
 *  2. Access token válido → dejar pasar (+ headers con datos del usuario)
 *  3. Access token expirado + refresh token → redirigir a /api/auth/refresh
 *  4. Sin tokens válidos → /login (páginas) o 401 (API)
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const ACCESS_TOKEN  = 'barber_access_token';
const REFRESH_TOKEN = 'barber_refresh_token';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth',        // login, logout, refresh
  '/api/public',      // branding, info pública
  '/api/tenant/verify',
  '/book',            // página pública de reservas
  '/api/book',        // API pública de reservas
  '/api/superadmin',  // panel central Speeddan Control (auth por API key)
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(p =>
    pathname === p ||
    pathname.startsWith(p + '/') ||
    pathname.startsWith(p + '?')
  );
}

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? 'fallback-secret');
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Assets del sistema → pasar siempre
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Rutas públicas → pasar sin verificación
  if (isPublic(pathname)) return NextResponse.next();

  const accessToken  = request.cookies.get(ACCESS_TOKEN)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN)?.value;

  // ── 1. Access token presente → verificar ─────────────────────────────────
  if (accessToken) {
    try {
      const { payload } = await jwtVerify(accessToken, getSecret());
      const response = NextResponse.next();
      // Pasar datos del usuario en headers para Server Components
      response.headers.set('x-user-id',     String(payload.sub));
      response.headers.set('x-tenant-id',   String(payload.tenantId));
      response.headers.set('x-user-role',   String(payload.role));
      response.headers.set('x-tenant-slug', String(payload.slug));
      response.headers.set('x-user-name',   String(payload.name ?? ''));
      return response;
    } catch {
      // Token expirado o inválido → intentar refresh
    }
  }

  // ── 2. Refresh token disponible → redirect al endpoint de refresh ─────────
  if (refreshToken) {
    const refreshUrl = request.nextUrl.clone();
    refreshUrl.pathname = '/api/auth/refresh';
    refreshUrl.search   = '';
    refreshUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
    return NextResponse.redirect(refreshUrl);
  }

  // ── 3. Sin tokens válidos ─────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { success: false, error: { message: 'No autorizado', code: 'UNAUTHORIZED' } },
      { status: 401 }
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search   = '';
  const res = NextResponse.redirect(loginUrl);
  res.cookies.delete(ACCESS_TOKEN);
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
