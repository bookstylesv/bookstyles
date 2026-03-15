'use client';

/**
 * AppointmentCalendar — Vista de calendario con FullCalendar.
 * Vistas: timeGridWeek y timeGridDay.
 * Click en evento abre modal de detalle.
 */

import { useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventInput } from '@fullcalendar/core';

const STATUS_COLORS: Record<string, string> = {
  PENDING:     '#f59e0b',
  CONFIRMED:   '#3b82f6',
  IN_PROGRESS: '#8b5cf6',
  COMPLETED:   '#22c55e',
  CANCELLED:   '#ef4444',
  NO_SHOW:     '#6b7280',
};

type Appointment = {
  id: number;
  startTime: string;
  endTime: string;
  status: string;
  client: { fullName: string };
  service: { name: string };
  barber: { user: { fullName: string } };
};

type Props = {
  appointments: Appointment[];
  onEventClick: (appt: Appointment) => void;
};

export default function AppointmentCalendar({ appointments, onEventClick }: Props) {
  const calendarRef = useRef<FullCalendar>(null);

  const events: EventInput[] = appointments.map(a => ({
    id: String(a.id),
    title: `${a.client.fullName} — ${a.service.name}`,
    start: a.startTime,
    end: a.endTime,
    backgroundColor: STATUS_COLORS[a.status] ?? '#6b7280',
    borderColor: STATUS_COLORS[a.status] ?? '#6b7280',
    extendedProps: { appointment: a },
  }));

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const appt = info.event.extendedProps.appointment as Appointment;
      onEventClick(appt);
    },
    [onEventClick],
  );

  return (
    <div style={{ background: 'hsl(var(--bg-surface))', borderRadius: 'var(--radius-lg)', padding: 16 }}>
      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left:   'prev,next today',
          center: 'title',
          right:  'timeGridWeek,timeGridDay,dayGridMonth',
        }}
        locale="es"
        buttonText={{ today: 'Hoy', week: 'Semana', day: 'Día', month: 'Mes' }}
        slotMinTime="07:00:00"
        slotMaxTime="21:00:00"
        allDaySlot={false}
        events={events}
        eventClick={handleEventClick}
        height="auto"
        eventDisplay="block"
        nowIndicator
      />
    </div>
  );
}
