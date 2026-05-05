/**
 * GET /api/notifications/appointments
 * Retorna el conteo y lista de citas que NO están COMPLETED ni CANCELLED.
 * Sin paginación — máximo 100 registros para el dropdown de notificaciones.
 */

import { getCurrentUser } from '@/lib/auth';
import { ok, apiError }   from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';
import { prisma }          from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const appointments = await prisma.barberAppointment.findMany({
      where: {
        tenantId: user.tenantId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      select: {
        id:        true,
        startTime: true,
        status:    true,
        client:  { select: { fullName: true } },
        service: { select: { name: true } },
        barber:  { select: { user: { select: { fullName: true } } } },
      },
      orderBy: { startTime: 'asc' },
      take: 100,
    });

    return ok({ count: appointments.length, appointments });
  } catch (err) {
    return apiError(err);
  }
}
