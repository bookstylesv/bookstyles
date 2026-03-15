/**
 * auth.ts — JWT helpers usando 'jose' (Edge-compatible).
 * No usa jsonwebtoken porque no funciona en Edge Runtime.
 * Maneja: sign, verify, cookies httpOnly con SameSite correcto.
 * Patrón aprendido de DTE Online para cross-domain Vercel.
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { BarberUserRole } from '@prisma/client';

export type JwtPayload = {
  sub:      string;
  tenantId: number;
  role:     BarberUserRole;
  slug:     string;
  name:     string;   // fullName del usuario (para avatar con iniciales)
};

const ACCESS_TOKEN_NAME  = 'barber_access_token';
const REFRESH_TOKEN_NAME = 'barber_refresh_token';
const IS_PROD = process.env.NODE_ENV === 'production';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado en .env.local');
  return new TextEncoder().encode(secret);
}

// ── Sign ──────────────────────────────────────────────────
// jose v6: setExpirationTime acepta solo timestamps numéricos (no strings '15m')
const nowSec = () => Math.floor(Date.now() / 1000);
const ACCESS_TTL  = 15 * 60;           // 15 minutos
const REFRESH_TTL = 7 * 24 * 60 * 60;  // 7 días


export async function signAccessToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(nowSec() + ACCESS_TTL)
    .sign(getSecret());
}

export async function signRefreshToken(userId: number): Promise<string> {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(nowSec() + REFRESH_TTL)
    .sign(getSecret());
}

// ── Verify ────────────────────────────────────────────────

export async function verifyAccessToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// ── Cookies ───────────────────────────────────────────────
// SameSite=none + Secure en prod (cross-domain Vercel)
// SameSite=lax en dev (localhost mismo dominio)

const COOKIE_BASE = {
  httpOnly: true,
  secure:   IS_PROD,
  sameSite: IS_PROD ? ('none' as const) : ('lax' as const),
  path:     '/',
};

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const store = await cookies();
  store.set(ACCESS_TOKEN_NAME,  accessToken,  { ...COOKIE_BASE, maxAge: 15 * 60 });
  store.set(REFRESH_TOKEN_NAME, refreshToken, { ...COOKIE_BASE, maxAge: 7 * 24 * 60 * 60 });
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_NAME);
  store.delete(REFRESH_TOKEN_NAME);
}

export async function getAccessTokenFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_NAME)?.value ?? null;
}

export async function getRefreshTokenFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_TOKEN_NAME)?.value ?? null;
}

export async function getCurrentUser(): Promise<JwtPayload | null> {
  const token = await getAccessTokenFromCookie();
  if (!token) return null;
  return verifyAccessToken(token);
}
