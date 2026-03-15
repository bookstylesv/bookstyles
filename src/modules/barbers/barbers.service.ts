/**
 * barbers.service.ts — Lógica de negocio para barberos.
 */

import { NotFoundError } from '@/lib/errors';
import * as repo from './barbers.repository';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function formatSchedule(schedules: { dayOfWeek: number; startTime: string; endTime: string }[]) {
  if (schedules.length === 0) return 'Sin horario';
  return schedules
    .map(s => `${DAY_NAMES[s.dayOfWeek]} ${s.startTime}-${s.endTime}`)
    .join(', ');
}

export async function listBarbers(tenantId: number) {
  const barbers = await repo.findAllBarbers(tenantId);
  return barbers.map(b => ({
    ...b,
    scheduleText: formatSchedule(b.schedules),
  }));
}

export async function getBarber(id: number, tenantId: number) {
  const barber = await repo.findBarberById(id, tenantId);
  if (!barber) throw new NotFoundError('Barbero');
  return { ...barber, scheduleText: formatSchedule(barber.schedules) };
}

export async function updateBarber(id: number, tenantId: number, body: unknown) {
  const existing = await repo.findBarberById(id, tenantId);
  if (!existing) throw new NotFoundError('Barbero');

  const data = body as { bio?: string; specialties?: string[]; active?: boolean };
  const updated = await repo.updateBarber(id, tenantId, {
    bio: data.bio,
    specialties: data.specialties,
    active: data.active,
  });
  return { ...updated, scheduleText: formatSchedule(updated.schedules) };
}
