/**
 * PUT /api/barbers/[id]/schedule — Guardar horario individual de un barbero
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

type ScheduleEntry = {
  dayOfWeek: number;
  startTime: string;
  endTime:   string;
  active:    boolean;
};

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER') throw new ForbiddenError();

    const { id } = await params;
    const barberId = Number(id);

    const barber = await prisma.barber.findFirst({ where: { id: barberId, tenantId: user.tenantId } });
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
  } catch (err) {
    return apiError(err);
  }
}
