/**
 * superadmin-auth.ts — Middleware de autenticación para endpoints /api/superadmin/*.
 * Valida el header Authorization: Bearer <BARBER_SUPERADMIN_API_KEY>.
 * NO usa withApi() ni JWT de tenant — es completamente independiente.
 */

import { NextRequest } from 'next/server';

export function validateSuperadminKey(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

  const key = authHeader.slice(7);
  const expected = process.env.BARBER_SUPERADMIN_API_KEY;

  if (!expected) {
    console.error('[superadmin-auth] BARBER_SUPERADMIN_API_KEY no configurada');
    return false;
  }

  return key === expected;
}

export function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
