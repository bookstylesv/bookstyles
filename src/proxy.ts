/**
 * proxy.ts — Auth + Tenant middleware para Next.js 16.
 * Se ejecuta en Edge Runtime (antes de cada request).
 * Protege rutas del dashboard y verifica el JWT.
 * (Renombrado de middleware.ts → proxy.ts para Next.js 16)
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/refresh', '/api/tenant/verify'];

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? 'fallback-secret');
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Permitir assets y rutas del sistema
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Verificar token en rutas protegidas
  const token = request.cookies.get('barber_access_token')?.value;

  if (!token) {
    // API routes → 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: { message: 'No autorizado', code: 'UNAUTHORIZED' } }, { status: 401 });
    }
    // Páginas → redirigir a login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const response = NextResponse.next();
    // Pasar datos del usuario en headers para server components
    response.headers.set('x-user-id',    String(payload.sub));
    response.headers.set('x-tenant-id',  String(payload.tenantId));
    response.headers.set('x-user-role',  String(payload.role));
    response.headers.set('x-tenant-slug', String(payload.slug));
    return response;
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: { message: 'Token inválido', code: 'INVALID_TOKEN' } }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
