/**
 * PUT /api/barbers/[id]/schedule — Guardar horario individual de un barbero
 */

import { NextRequest } from 'next/server';
import { ok } from '@/lib/response';
import { NotFoundError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { withTenantAuth } from '@/lib/with-tenant-auth';

type Ctx = { params: Promise<{ id: string }> };

type ScheduleEntry = {
  dayOfWeek: number;
  startTime: string;
  endTime:   string;
  active:    boolean;
};

export const PUT = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const barberId = Number(id);

    const barber = await prisma.barber.findFirst({ where: { id: barberId, tenantId: ctx.tenantId } });
    if (!barber) throw new NotFoundError('Barbero');

    const hours = await req.json() as ScheduleEntry[];

    for (const h of hours) {
      if (h.active) {
        await prisma.barberSchedule.upsert({
          where:  { barberId_dayOfWeek: { barberId, dayOfWeek: h.dayOfWeek } },
          update: { startTime: h.startTime, endTime: h.endTime, active: true },
          create: { barberId, dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime, active: true },
        });
      } else {
        await prisma.barberSchedule.updateMany({
          where: { barberId, dayOfWeek: h.dayOfWeek },
          data:  { active: false },
        });
      }
    }

    const updated = await prisma.barberSchedule.findMany({
      where:   { barberId },
      orderBy: { dayOfWeek: 'asc' },
    });

    return ok(updated);
}, { requiredModule: 'citas' })
