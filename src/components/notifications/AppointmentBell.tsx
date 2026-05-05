'use client';

/**
 * AppointmentBell — Campana de notificaciones para citas pendientes.
 * - Fetch inicial al montar; se actualiza vía evento global 'appointment-mutated'
 * - Sin polling — reacciona solo a acciones del usuario (crear/cancelar/pagar)
 * - Dropdown con lista de citas PENDING, CONFIRMED, IN_PROGRESS, NO_SHOW
 */

import { useState, useEffect, useCallback } from 'react';
import { Bell } from '@phosphor-icons/react';
import { Popover, List, Tag, Typography, Empty } from 'antd';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

type NotifAppointment = {
  id: number;
  startTime: string;
  status: string;
  client:  { fullName: string };
  service: { name: string };
  barber:  { user: { fullName: string } };
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:     'warning',
  CONFIRMED:   'processing',
  IN_PROGRESS: 'purple',
  NO_SHOW:     'error',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING:     'Pendiente',
  CONFIRMED:   'Confirmada',
  IN_PROGRESS: 'En curso',
  NO_SHOW:     'No asistió',
};

type Props = { collapsed: boolean };

export default function AppointmentBell({ collapsed }: Props) {
  const [count,        setCount]        = useState(0);
  const [appointments, setAppointments] = useState<NotifAppointment[]>([]);
  const [open,         setOpen]         = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res  = await fetch('/api/notifications/appointments');
      const json = await res.json();
      if (json.success) {
        setCount(json.data.count);
        setAppointments(json.data.appointments);
      }
    } catch { /* silencioso — no bloquear UI */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const handler = () => fetchNotifications();
    window.addEventListener('appointment-mutated', handler);
    return () => window.removeEventListener('appointment-mutated', handler);
  }, [fetchNotifications]);

  const content = (
    <div style={{ width: 300 }}>
      {appointments.length === 0 ? (
        <Empty
          description="Sin citas pendientes"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: '12px 0' }}
        />
      ) : (
        <List
          size="small"
          dataSource={appointments}
          style={{ maxHeight: 340, overflowY: 'auto' }}
          renderItem={(appt) => (
            <List.Item style={{ padding: '8px 0', borderBlockEnd: '1px solid hsl(var(--border))' }}>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    {appt.client.fullName}
                  </Typography.Text>
                  <Tag
                    color={STATUS_COLORS[appt.status] ?? 'default'}
                    style={{ marginInlineEnd: 0, fontSize: 10, lineHeight: '16px', padding: '0 5px' }}
                  >
                    {STATUS_LABELS[appt.status] ?? appt.status}
                  </Tag>
                </div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {appt.service.name} · {format(new Date(appt.startTime), "dd MMM, HH:mm", { locale: es })}
                </Typography.Text>
              </div>
            </List.Item>
          )}
        />
      )}
      <div style={{ paddingTop: 8, marginTop: 4, textAlign: 'center' }}>
        <Link href="/appointments" onClick={() => setOpen(false)}>
          <Typography.Text style={{ fontSize: 12, color: 'hsl(var(--brand-primary))' }}>
            Ver todas las citas →
          </Typography.Text>
        </Link>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      title={
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          Citas pendientes ({count})
        </span>
      }
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="rightBottom"
    >
      <button
        type="button"
        title={`${count} cita${count !== 1 ? 's' : ''} pendiente${count !== 1 ? 's' : ''}`}
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          width:          '100%',
          padding:        '9px 0',
          background:     'transparent',
          border:         'none',
          borderTop:      '1px solid hsl(var(--sidebar-border))',
          color:          count > 0 ? 'hsl(var(--brand-primary))' : 'hsl(var(--sidebar-muted))',
          cursor:         'pointer',
          gap:            6,
          fontSize:       11,
          transition:     'color 0.15s',
        }}
      >
        {/* Icono con badge */}
        <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
          <Bell size={15} weight={count > 0 ? 'fill' : 'regular'} />
          {count > 0 && (
            <span style={{
              position:    'absolute',
              top:         -6,
              right:       -8,
              background:  '#ef4444',
              color:       '#fff',
              fontSize:    9,
              fontWeight:  700,
              lineHeight:  1,
              padding:     '2px 4px',
              borderRadius: 10,
              minWidth:    14,
              textAlign:   'center',
            }}>
              {count > 99 ? '99+' : count}
            </span>
          )}
        </div>
        {!collapsed && <span>Citas pendientes</span>}
      </button>
    </Popover>
  );
}
