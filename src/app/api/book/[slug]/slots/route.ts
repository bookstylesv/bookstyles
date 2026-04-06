/**
 * GET /api/book/[slug]/slots
 * Query params: date (YYYY-MM-DD), barberId? (number), serviceId (number)
 * Returns available 30-min time slots for public booking (no auth required).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_OPEN  = '08:00';
const DEFAULT_CLOSE = '17:00';

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number) {
  const hh = Math.floor(m / 60).toString().padStart(2, '0');
  const mm = (m % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = req.nextUrl;
  const dateStr        = searchParams.get('date');
  const barberIdQ      = searchParams.get('barberId');
  const serviceId      = searchParams.get('serviceId');
  const totalDurationQ = searchParams.get('totalDuration');

  if (!dateStr) return NextResponse.json({ error: 'date requerido' }, { status: 400 });

  // Find tenant (incluir businessHours)
  const tenant = await prisma.barberTenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: 'Barbería no encontrada' }, { status: 404 });

  // Parse date — local midnight
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dayStart  = new Date(y, mo - 1, d, 0, 0, 0);
  const dayEnd    = new Date(y, mo - 1, d, 23, 59, 59);
  const dayOfWeek = dayStart.getDay(); // 0=Dom,1=Lun...

  // Leer businessHours del tenant para este día de la semana
  const bhRaw = Array.isArray(tenant.businessHours) ? tenant.businessHours as Array<{
    dayOfWeek: number; active: boolean; startTime: string; endTime: string;
  }> : [];
  const bhDay = bhRaw.find(h => h.dayOfWeek === dayOfWeek);

  // Si el tenant tiene horarios configurados y el día está inactivo → cerrado
  if (bhRaw.length > 0 && bhDay && !bhDay.active) {
    return NextResponse.json({ slots: [], isOpen: false, reason: 'La barbería no atiende este día.' });
  }

  // Check day override (excepciones de fecha específica — tienen prioridad sobre businessHours)
  const override = await prisma.barberDayOverride.findUnique({
    where: { tenantId_date: { tenantId: tenant.id, date: dayStart } },
  });

  if (override && !override.isOpen) {
    return NextResponse.json({ slots: [], isOpen: false, reason: override.reason });
  }

  // Horas de apertura: override > businessHours del día > DEFAULT
  const openTime  = override?.openTime  ?? bhDay?.startTime ?? DEFAULT_OPEN;
  const closeTime = override?.closeTime ?? bhDay?.endTime   ?? DEFAULT_CLOSE;

  // Service duration — totalDuration overrides single serviceId lookup
  let duration = 30;
  if (totalDurationQ && Number(totalDurationQ) > 0) {
    duration = Number(totalDurationQ);
  } else if (serviceId) {
    const svc = await prisma.barberService.findFirst({
      where: { id: Number(serviceId), tenantId: tenant.id, active: true },
    });
    if (svc) duration = svc.duration;
  }

  // Generate candidate slots
  const openMin  = timeToMinutes(openTime);
  const closeMin = timeToMinutes(closeTime);
  const candidates: string[] = [];
  for (let t = openMin; t + duration <= closeMin; t += 30) {
    candidates.push(minutesToTime(t));
  }

  // Get active barbers with their schedules
  const barbers = await prisma.barber.findMany({
    where: {
      tenantId: tenant.id,
      active: true,
      ...(barberIdQ ? { id: Number(barberIdQ) } : {}),
    },
    include: {
      schedules: { where: { dayOfWeek, active: true } },
      appointments: {
        where: {
          startTime: { gte: dayStart, lte: dayEnd },
          status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        },
        select: { startTime: true, endTime: true },
      },
    },
  });

  // Para cada slot candidato, determinar si está disponible u ocupado
  // Devolvemos TODOS los slots con su estado para mostrar visualización completa
  const now = new Date();
  const slots: Array<{ time: string; available: boolean }> = [];

  for (const slotTime of candidates) {
    const [sh, sm] = slotTime.split(':').map(Number);
    const slotStart = new Date(y, mo - 1, d, sh, sm, 0);
    const slotEnd   = new Date(slotStart.getTime() + duration * 60_000);

    // Slots pasados no disponibles
    if (slotStart <= now) {
      slots.push({ time: slotTime, available: false });
      continue;
    }

    // Verificar si algún barbero está libre en este slot
    const someBarberFree = barbers.some(barber => {
      if (!barber.schedules.length) return false;
      const schedule = barber.schedules[0];

      const barberOpen  = timeToMinutes(schedule.startTime);
      const barberClose = timeToMinutes(schedule.endTime);
      const slotMin     = sh * 60 + sm;
      if (slotMin < barberOpen || slotMin + duration > barberClose) return false;

      const hasConflict = barber.appointments.some(appt =>
        appt.startTime < slotEnd && appt.endTime > slotStart
      );
      return !hasConflict;
    });

    slots.push({ time: slotTime, available: someBarberFree });
  }

  return NextResponse.json({ slots, isOpen: true });
}
