/**
 * GET /api/cron/expire-pending
 *
 * Cancela automáticamente las citas PENDING de reservas web que llevan
 * más de 2 horas sin ser confirmadas por el negocio.
 * Protección anti-spam: evita que citas falsas bloqueen slots indefinidamente.
 *
 * Invocado por Vercel Cron (vercel.json) cada hora.
 * También puede llamarse manualmente con la clave CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const PENDING_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

export async function GET(req: NextRequest) {
  // Verificar clave para llamadas manuales (Vercel Cron no necesita key)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - PENDING_TTL_MS);

  const result = await prisma.barberAppointment.updateMany({
    where: {
      status:    'PENDING',
      createdAt: { lt: cutoff },
      notes:     { startsWith: '__WEB_IP:' }, // solo citas de reserva pública
    },
    data: {
      status:       'CANCELLED',
      cancelReason: 'Expirada automáticamente (sin confirmar en 2 horas)',
    },
  });

  console.log(`[cron/expire-pending] Canceladas: ${result.count} citas`);

  return NextResponse.json({
    ok:        true,
    cancelled: result.count,
    cutoff:    cutoff.toISOString(),
  });
}
