/**
 * barbers.service.ts — Lógica de negocio para barberos.
 */

import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
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
  return {
    ...barber,
    scheduleText: formatSchedule(barber.schedules),
    configPlanilla: barber.configPlanilla ? {
      tipoPago:           barber.configPlanilla.tipoPago,
      salarioBase:        barber.configPlanilla.salarioBase.toNumber(),
      valorPorUnidad:     barber.configPlanilla.valorPorUnidad.toNumber(),
      porcentajeServicio: barber.configPlanilla.porcentajeServicio.toNumber(),
      aplicaRenta:        barber.configPlanilla.aplicaRenta,
      fechaIngreso:       barber.configPlanilla.fechaIngreso?.toISOString() ?? null,
    } : null,
  };
}

export async function createBarber(tenantId: number, body: unknown) {
  const data = body as repo.BarberCreateInput;
  if (!data.fullName?.trim()) throw new ValidationError('El nombre es obligatorio');
  if (!data.email?.trim())    throw new ValidationError('El email es obligatorio');
  if (!data.password?.trim()) throw new ValidationError('La contraseña es obligatoria');

  try {
    const barber = await repo.createBarber(tenantId, data);
    return { ...barber, scheduleText: formatSchedule(barber.schedules) };
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002') {
      throw new ConflictError('El email ya está registrado');
    }
    throw err;
  }
}

export async function updateBarber(id: number, tenantId: number, body: unknown) {
  const existing = await repo.findBarberById(id, tenantId);
  if (!existing) throw new NotFoundError('Barbero');

  const data = body as { bio?: string; cargo?: string; specialties?: string[]; active?: boolean };
  const updated = await repo.updateBarber(id, tenantId, {
    bio: data.bio,
    cargo: data.cargo,
    specialties: data.specialties,
    active: data.active,
  });
  return { ...updated, scheduleText: formatSchedule(updated.schedules) };
}
