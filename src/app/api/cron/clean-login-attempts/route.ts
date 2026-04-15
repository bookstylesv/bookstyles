/**
 * GET /api/cron/clean-login-attempts
 *
 * Elimina registros de intentos de login con más de 24 horas de antigüedad.
 * La ventana activa de rate limiting es 15 min, por lo que todo lo anterior
 * a 24h es seguro eliminar.
 *
 * Invocado por Vercel Cron diariamente a las 04:00 UTC.
 * También puede llamarse manualmente con CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count } = await prisma.barberLoginAttempt.deleteMany({
    where: { failedAt: { lt: cutoff } },
  });

  return NextResponse.json({ ok: true, deleted: count });
}
