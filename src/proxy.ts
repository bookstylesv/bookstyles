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
  '/api/book',
  '/api/superadmin/',
  '/_next/',
  '/favicon',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

// ── CSRF Protection ─────────────────────────────────────────────────────────
// Validates Origin header for state-changing methods to prevent cross-site
// request forgery. Safe methods (GET/HEAD/OPTIONS) are exempt.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Paths exempt from CSRF (server-to-server or public endpoints)
const CSRF_EXEMPT_PREFIXES = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/book',
  '/api/superadmin/',
  '/api/cron/',
  '/api/public/',
];

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

function validateCsrf(req: NextRequest): NextResponse | null {
  if (SAFE_METHODS.has(req.method)) return null;
  if (!req.nextUrl.pathname.startsWith('/api/')) return null;
  if (isCsrfExempt(req.nextUrl.pathname)) return null;

  const origin = req.headers.get('origin');
  // Requests with cookies but no Origin header are suspicious (possible CSRF)
  if (!origin && req.cookies.has('barber_access_token')) {
    return NextResponse.json(
      { success: false, error: { message: 'Origin header requerido', code: 'CSRF_REJECTED' } },
      { status: 403 },
    );
  }

  if (origin) {
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      'http://localhost:3000',
      'http://localhost:3001',
    ].filter(Boolean);

    const isAllowed = allowedOrigins.some(allowed => origin === allowed);
    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Origen no permitido', code: 'CSRF_REJECTED' } },
        { status: 403 },
      );
    }
  }

  return null;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── CSRF check for mutation endpoints ──────────────────────────────────
  const csrfResponse = validateCsrf(req);
  if (csrfResponse) return csrfResponse;

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
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: { message: 'Sesión expirada', code: 'UNAUTHORIZED' } },
        { status: 401 },
      );
    }
    // Token expirado en página → intentar refresh antes de ir al login
    const refreshUrl = new URL('/api/auth/refresh', req.url);
    refreshUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(refreshUrl);
  }

  // CLIENT y BARBER no tienen acceso al ERP bajo ninguna circunstancia
  if (user.role === 'CLIENT' || user.role === 'BARBER') {
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
  // OWNER: los route handlers controlan internamente qué puede hacer;
  // no aplicar module-guard aquí para no bloquear sus reportes de lectura.
  if (user.role !== 'OWNER') {
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
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
