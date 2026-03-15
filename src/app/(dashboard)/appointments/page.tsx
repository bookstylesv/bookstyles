'use client';

/**
 * /appointments — Página de citas con FullCalendar + lista.
 * Client Component: carga datos via API en el cliente.
 */

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import AppointmentForm from '@/components/appointments/AppointmentForm';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusIcon, CalendarIcon, ListIcon } from 'lucide-react';

const AppointmentCalendar = dynamic(
  () => import('@/components/appointments/AppointmentCalendar'),
  { ssr: false, loading: () => <div style={{ padding: 32, textAlign: 'center' }}>Cargando calendario...</div> },
);

type Appointment = {
  id: number;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  cancelReason: string | null;
  client: { id: number; fullName: string; email: string; phone: string | null };
  barber: { id: number; user: { id: number; fullName: string } };
  service: { id: number; name: string; price: number; duration: number; category: string | null };
  payment: { amount: number; method: string; status: string; paidAt: string | null } | null;
};

type Barber  = { id: number; user: { fullName: string } };
type Service = { id: number; name: string; price: number; duration: number };
type Client  = { id: number; fullName: string };

const STATUS_LABELS: Record<string, string> = {
  PENDING:     'Pendiente',
  CONFIRMED:   'Confirmada',
  IN_PROGRESS: 'En curso',
  COMPLETED:   'Completada',
  CANCELLED:   'Cancelada',
  NO_SHOW:     'No asistió',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING:     'secondary',
  CONFIRMED:   'default',
  IN_PROGRESS: 'default',
  COMPLETED:   'outline',
  CANCELLED:   'destructive',
  NO_SHOW:     'destructive',
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers,  setBarbers]  = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients,  setClients]  = useState<Client[]>([]);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, barberRes, svcRes] = await Promise.all([
        fetch('/api/appointments').then(r => r.json()),
        fetch('/api/barbers').then(r => r.json()),
        fetch('/api/services').then(r => r.json()),
      ]);
      if (apptRes.success) setAppointments(apptRes.data);
      if (barberRes.success) setBarbers(barberRes.data);
      if (svcRes.success) setServices(svcRes.data.filter((s: Service & { active: boolean }) => s.active));

      // Extraer clientes únicos de las citas
      const clientMap = new Map<number, Client>();
      (apptRes.data ?? []).forEach((a: Appointment) => {
        if (!clientMap.has(a.client.id)) {
          clientMap.set(a.client.id, { id: a.client.id, fullName: a.client.fullName });
        }
      });
      setClients(Array.from(clientMap.values()));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreateSubmit(values: { clientId: string; barberId: string; serviceId: string; startTime: string; notes: string }) {
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId:  Number(values.clientId),
          barberId:  Number(values.barberId),
          serviceId: Number(values.serviceId),
          startTime: values.startTime,
          notes:     values.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error?.message ?? 'Error'); return; }
      setAppointments(prev => [...prev, json.data]);
      setCreateOpen(false);
    } catch {
      setFormError('Error de red');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleCancel(appt: Appointment) {
    if (!confirm('¿Cancelar esta cita?')) return;
    const res = await fetch(`/api/appointments/${appt.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Cancelado por el administrador' }),
    });
    const json = await res.json();
    if (res.ok) {
      setAppointments(prev => prev.map(a => a.id === appt.id ? json.data : a));
      setDetailAppt(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--text-primary))', margin: '0 0 4px' }}>
            Citas
          </h1>
          <p style={{ color: 'hsl(var(--text-secondary))', margin: 0, fontSize: 14 }}>
            {appointments.length} cita{appointments.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant={view === 'calendar' ? 'default' : 'outline'} size="sm" onClick={() => setView('calendar')}>
            <CalendarIcon /> Calendario
          </Button>
          <Button variant={view === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setView('list')}>
            <ListIcon /> Lista
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon /> Nueva cita
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'hsl(var(--text-muted))' }}>Cargando...</div>
      ) : view === 'calendar' ? (
        <AppointmentCalendar
          appointments={appointments}
          onEventClick={(calAppt) => {
            const full = appointments.find(a => a.id === calAppt.id) ?? null;
            setDetailAppt(full);
          }}
        />
      ) : (
        <AppointmentsList
          appointments={appointments}
          onDetail={setDetailAppt}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva cita</DialogTitle>
          </DialogHeader>
          <AppointmentForm
            barbers={barbers}
            services={services}
            clients={clients}
            onSubmit={handleCreateSubmit}
            loading={formLoading}
            error={formError}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailAppt} onOpenChange={v => { if (!v) setDetailAppt(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de cita</DialogTitle>
          </DialogHeader>
          {detailAppt && (
            <AppointmentDetail
              appt={detailAppt}
              onCancel={() => handleCancel(detailAppt)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────

function AppointmentsList({
  appointments,
  onDetail,
}: {
  appointments: Appointment[];
  onDetail: (a: Appointment) => void;
}) {
  if (appointments.length === 0) {
    return (
      <div style={{
        background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))',
        borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center',
        color: 'hsl(var(--text-muted))',
      }}>
        No hay citas registradas.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {appointments.map(a => (
        <div key={a.id}
          onClick={() => onDetail(a)}
          style={{
            background: 'hsl(var(--bg-surface))',
            border: '1px solid hsl(var(--border-default))',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, color: 'hsl(var(--text-primary))' }}>
              {a.client.fullName}
            </div>
            <div style={{ fontSize: 12, color: 'hsl(var(--text-muted))', marginTop: 2 }}>
              {a.service.name} — {a.barber.user.fullName}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>
            {format(new Date(a.startTime), 'dd MMM, HH:mm', { locale: es })}
          </div>
          <Badge variant={STATUS_VARIANTS[a.status] ?? 'secondary'}>
            {STATUS_LABELS[a.status] ?? a.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function AppointmentDetail({ appt, onCancel }: { appt: Appointment; onCancel: () => void }) {
  const canCancel = !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appt.status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
        <InfoRow label="Cliente"  value={appt.client.fullName} />
        <InfoRow label="Barbero"  value={appt.barber.user.fullName} />
        <InfoRow label="Servicio" value={appt.service.name} />
        <InfoRow label="Precio"   value={`$${appt.service.price.toFixed(2)}`} />
        <InfoRow label="Inicio"   value={format(new Date(appt.startTime), 'dd MMM yyyy, HH:mm', { locale: es })} />
        <InfoRow label="Fin"      value={format(new Date(appt.endTime), 'HH:mm', { locale: es })} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'hsl(var(--text-muted))' }}>Estado:</span>
        <Badge variant={STATUS_VARIANTS[appt.status] ?? 'secondary'}>
          {STATUS_LABELS[appt.status] ?? appt.status}
        </Badge>
      </div>
      {appt.notes && (
        <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', margin: 0 }}>
          Nota: {appt.notes}
        </p>
      )}
      {appt.cancelReason && (
        <p style={{ fontSize: 13, color: 'hsl(var(--destructive))', margin: 0 }}>
          Motivo: {appt.cancelReason}
        </p>
      )}
      {canCancel && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="destructive" size="sm" onClick={onCancel}>
            Cancelar cita
          </Button>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: 2 }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
