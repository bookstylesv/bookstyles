import { NextRequest } from 'next/server';
/**
 * GET /api/notifications/appointments
 * Retorna el conteo y lista de citas que NO están COMPLETED ni CANCELLED.
 * Sin paginación — máximo 100 registros para el dropdown de notificaciones.
 */

import { ok } from '@/lib/response';
import { prisma }          from '@/lib/prisma';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {    const appointments = await prisma.barberAppointment.findMany({
      where: {
        tenantId: ctx.tenantId,
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
}, { requiredModule: 'citas' })
