/**
 * middleware.ts — Protección de rutas por autenticación y acceso a módulos.
 *
 * Para páginas del dashboard: redirige a /dashboard si el rol no tiene acceso.
 * Para APIs: retorna 401/403 JSON si no tiene acceso.
 *
 * Rutas públicas (sin auth): /login, /book/*, /api/auth/login, /api/auth/refresh,
 * /api/tenant/*, /api/book/*, /api/superadmin/*
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify }                  from 'jose';
import { canAccess, PAGE_MODULE_MAP, API_MODULE_MAP } from '@/lib/module-guard';

type TokenPayload = {
  sub:          string;
  role:         string;
  tenantId:     number;
  slug:         string;
  moduleAccess: string[] | null;
};

async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// Prefijos de rutas siempre públicas
const PUBLIC_PREFIXES = [
  '/login',
  '/book/',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/tenant/',
  '/api/book/',
  '/api/superadmin/',
  '/_next/',
  '/favicon',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas públicas — sin verificación
  if (isPublicRoute(pathname)) return NextResponse.next();

  // ── Verificar token ────────────────────────────────────────────────────────
  const token = req.cookies.get('barber_access_token')?.value;

  if (!token) {
    return pathname.startsWith('/api/')
      ? NextResponse.json(
          { success: false, error: { message: 'No autenticado', code: 'UNAUTHORIZED' } },
          { status: 401 },
        )
      : NextResponse.redirect(new URL('/login', req.url));
  }

  const user = await verifyToken(token);

  if (!user) {
    return pathname.startsWith('/api/')
      ? NextResponse.json(
          { success: false, error: { message: 'Sesión expirada', code: 'UNAUTHORIZED' } },
          { status: 401 },
        )
      : NextResponse.redirect(new URL('/login', req.url));
  }

  // CLIENT no tiene acceso al ERP bajo ninguna circunstancia
  if (user.role === 'CLIENT') {
    return pathname.startsWith('/api/')
      ? NextResponse.json(
          { success: false, error: { message: 'Acceso denegado', code: 'FORBIDDEN' } },
          { status: 403 },
        )
      : NextResponse.redirect(new URL('/login', req.url));
  }

  // ── Control de acceso por módulo ───────────────────────────────────────────

  if (!pathname.startsWith('/api/')) {
    // Páginas del dashboard
    const module = PAGE_MODULE_MAP[pathname];
    if (module && !canAccess(user.role, module, user.moduleAccess)) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // API routes — buscar módulo por prefijo
  const matched = API_MODULE_MAP.find(([prefix]) => pathname.startsWith(prefix));
  if (matched) {
    const [, apiModule] = matched;
    if (!canAccess(user.role, apiModule, user.moduleAccess)) {
      return NextResponse.json(
        { success: false, error: { message: 'No tienes acceso a este módulo', code: 'FORBIDDEN' } },
        { status: 403 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
