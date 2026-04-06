/**
 * GET  /api/settings/schedule — obtener horarios de trabajo del tenant
 * PUT  /api/settings/schedule — guardar horarios + sincronizar BarberSchedule de todos los barberos
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { tenantsRepository, type BusinessHourEntry } from '@/modules/tenants/tenants.repository';
import { prisma } from '@/lib/prisma';

const DEFAULT_HOURS: BusinessHourEntry[] = [
  { dayOfWeek: 0, active: false, startTime: '08:00', endTime: '17:00' }, // Dom
  { dayOfWeek: 1, active: false, startTime: '08:00', endTime: '17:00' }, // Lun
  { dayOfWeek: 2, active: true,  startTime: '08:00', endTime: '17:00' }, // Mar
  { dayOfWeek: 3, active: true,  startTime: '08:00', endTime: '17:00' }, // Mié
  { dayOfWeek: 4, active: true,  startTime: '08:00', endTime: '17:00' }, // Jue
  { dayOfWeek: 5, active: true,  startTime: '08:00', endTime: '17:00' }, // Vie
  { dayOfWeek: 6, active: true,  startTime: '08:00', endTime: '17:00' }, // Sáb
];

function parseHours(raw: unknown): BusinessHourEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_HOURS;
  return DEFAULT_HOURS.map((def, i) => {
    const entry = raw.find((e: BusinessHourEntry) => e.dayOfWeek === i);
    if (!entry) return def;
    return {
      dayOfWeek: i,
      active:    Boolean(entry.active),
      startTime: typeof entry.startTime === 'string' ? entry.startTime : def.startTime,
      endTime:   typeof entry.endTime   === 'string' ? entry.endTime   : def.endTime,
    };
  });
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const tenant = await tenantsRepository.findById(user.tenantId);
    if (!tenant) throw new UnauthorizedError();

    const hours = parseHours(tenant.businessHours);
    return ok(hours);
  } catch (err) {
    return apiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER') throw new ForbiddenError();

    const body = await req.json() as unknown;
    if (!Array.isArray(body)) throw new ValidationError('Se esperaba un array de horarios');

    const hours = parseHours(body);

    // 1. Guardar en tenant
    await tenantsRepository.updateBusinessHours(user.tenantId, hours);

    // 2. Sincronizar BarberSchedule para todos los barberos activos del tenant
    //    — Cada barbero hereda el horario general del negocio
    const barbers = await prisma.barber.findMany({
      where: { tenantId: user.tenantId, active: true },
      select: { id: true },
    });

    for (const barber of barbers) {
      for (const h of hours) {
        if (h.active) {
          await prisma.barberSchedule.upsert({
            where:  { barberId_dayOfWeek: { barberId: barber.id, dayOfWeek: h.dayOfWeek } },
            update: { startTime: h.startTime, endTime: h.endTime, active: true },
            create: { barberId: barber.id, dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime, active: true },
          });
        } else {
          // Día inactivo: desactivar schedule si existe
          await prisma.barberSchedule.updateMany({
            where: { barberId: barber.id, dayOfWeek: h.dayOfWeek },
            data:  { active: false },
          });
        }
      }
    }

    return ok(hours);
  } catch (err) {
    return apiError(err);
  }
}
