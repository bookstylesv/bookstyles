'use client';

/**
 * DashboardTopbar — Barra superior del área de contenido principal.
 * Siempre visible en todos los módulos del dashboard.
 * Contiene: campana de notificaciones de citas.
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

export default function DashboardTopbar() {
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
    } catch { /* silencioso */ }
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
            <List.Item style={{ padding: '8px 0' }}>
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
                  {appt.service.name} · {format(new Date(appt.startTime), 'dd MMM, HH:mm', { locale: es })}
                </Typography.Text>
              </div>
            </List.Item>
          )}
        />
      )}
      <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: 8, marginTop: 4, textAlign: 'center' }}>
        <Link href="/appointments" onClick={() => setOpen(false)}>
          <Typography.Text style={{ fontSize: 12, color: 'hsl(var(--brand-primary))' }}>
            Ver todas las citas →
          </Typography.Text>
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'flex-end',
      height:          44,
      padding:        '0 4px',
      marginBottom:    16,
      background:     'hsl(var(--bg-surface))',
      borderRadius:   'var(--radius-lg, 10px)',
      border:         '1px solid hsl(var(--border))',
    }}>
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
        placement="bottomRight"
      >
        <button
          type="button"
          title={`${count} cita${count !== 1 ? 's' : ''} pendiente${count !== 1 ? 's' : ''}`}
          style={{
            position:   'relative',
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width:      36,
            height:     36,
            background: count > 0 ? 'hsl(var(--brand-primary) / 0.1)' : 'transparent',
            border:     count > 0 ? '1px solid hsl(var(--brand-primary) / 0.3)' : '1px solid transparent',
            borderRadius: 8,
            color:      count > 0 ? 'hsl(var(--brand-primary))' : 'hsl(var(--sidebar-muted))',
            cursor:     'pointer',
            transition: 'all 0.15s',
          }}
        >
          <Bell size={18} weight={count > 0 ? 'fill' : 'regular'} />
          {count > 0 && (
            <span style={{
              position:     'absolute',
              top:          -5,
              right:        -5,
              background:   '#ef4444',
              color:        '#fff',
              fontSize:     9,
              fontWeight:   700,
              lineHeight:   1,
              padding:      '2px 4px',
              borderRadius: 10,
              minWidth:     16,
              textAlign:    'center',
            }}>
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      </Popover>
    </div>
  );
}
