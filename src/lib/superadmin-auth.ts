/**
 * superadmin-auth.ts — Middleware de autenticación para endpoints /api/superadmin/*.
 * Valida el header Authorization: Bearer <BARBER_SUPERADMIN_API_KEY>.
 * NO usa withApi() ni JWT de tenant — es completamente independiente.
 *
 * SEGURIDAD: usa timingSafeEqual para evitar timing attacks al comparar la API key.
 */

import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

export function validateSuperadminKey(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

  const key = authHeader.slice(7);
  const expected = process.env.BARBER_SUPERADMIN_API_KEY;

  if (!expected) {
    console.error('[superadmin-auth] BARBER_SUPERADMIN_API_KEY no configurada');
    return false;
  }

  // Comparación en tiempo constante — previene timing attacks
  const keyBuf = Buffer.from(key);
  const expBuf = Buffer.from(expected);
  if (keyBuf.length !== expBuf.length) return false;
  return timingSafeEqual(keyBuf, expBuf);
}

export function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
