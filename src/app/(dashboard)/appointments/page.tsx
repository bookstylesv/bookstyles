'use client';

// ══════════════════════════════════════════════════════════
// CITAS — Calendario + lista antd (patrón Speeddansys ERP)
// ══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import {
  Table, Card, Button, Space, Row, Col,
  Statistic, Tag, Modal, Descriptions,
  Typography, Segmented,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, CalendarOutlined, UnorderedListOutlined,
  ClockCircleOutlined, CheckCircleOutlined, StopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import AppointmentForm from '@/components/appointments/AppointmentForm';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const AppointmentCalendar = dynamic(
  () => import('@/components/appointments/AppointmentCalendar'),
  { ssr: false, loading: () => <div style={{ padding: 32, textAlign: 'center', color: 'hsl(var(--text-muted))' }}>Cargando calendario...</div> },
);

const { Title, Text } = Typography;

// ── Tipos ───────────────────────────────────────────────
type Appointment = {
  id: number; startTime: string; endTime: string; status: string;
  notes: string | null; cancelReason: string | null;
  client:  { id: number; fullName: string; email: string; phone: string | null };
  barber:  { id: number; user: { id: number; fullName: string } };
  service: { id: number; name: string; price: number; duration: number; category: string | null };
  payment: { amount: number; method: string; status: string; paidAt: string | null } | null;
};

type Barber  = { id: number; user: { fullName: string } };
type Service = { id: number; name: string; price: number; duration: number };
type Client  = { id: number; fullName: string };

const STATUS_COLORS: Record<string, string> = {
  PENDING:     'warning',
  CONFIRMED:   'processing',
  IN_PROGRESS: 'processing',
  COMPLETED:   'success',
  CANCELLED:   'error',
  NO_SHOW:     'error',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING:     'Pendiente',
  CONFIRMED:   'Confirmada',
  IN_PROGRESS: 'En curso',
  COMPLETED:   'Completada',
  CANCELLED:   'Cancelada',
  NO_SHOW:     'No asistió',
};

// ── Componente ───────────────────────────────────────────
export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers,  setBarbers]  = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients,  setClients]  = useState<Client[]>([]);
  const [view,     setView]     = useState<string>('calendar');
  const [loading,  setLoading]  = useState(true);
  const [createOpen,  setCreateOpen]  = useState(false);
  const [detailAppt,  setDetailAppt]  = useState<Appointment | null>(null);
  const [formError,   setFormError]   = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, barberRes, svcRes] = await Promise.all([
        fetch('/api/appointments').then(r => r.json()),
        fetch('/api/barbers').then(r => r.json()),
        fetch('/api/services').then(r => r.json()),
      ]);
      if (apptRes.success)   setAppointments(apptRes.data);
      if (barberRes.success) setBarbers(barberRes.data);
      if (svcRes.success)    setServices(svcRes.data.filter((s: Service & { active: boolean }) => s.active));
      const clientMap = new Map<number, Client>();
      (apptRes.data ?? []).forEach((a: Appointment) => {
        if (!clientMap.has(a.client.id)) {
          clientMap.set(a.client.id, { id: a.client.id, fullName: a.client.fullName });
        }
      });
      setClients(Array.from(clientMap.values()));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── KPIs computados ────────────────────────────────────
  const kpis = useMemo(() => ({
    total:       appointments.length,
    pendientes:  appointments.filter(a => a.status === 'PENDING').length,
    confirmadas: appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS').length,
    completadas: appointments.filter(a => a.status === 'COMPLETED').length,
  }), [appointments]);

  // ── Crear cita ─────────────────────────────────────────
  async function handleCreateSubmit(values: {
    clientId: string; barberId: string; serviceId: string; startTime: string; notes: string;
  }) {
    setFormLoading(true); setFormError('');
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId:  Number(values.clientId),
          barberId:  Number(values.barberId),
          serviceId: Number(values.serviceId),
          startTime: values.startTime,
          notes:     values.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error?.message ?? 'Error al crear cita';
        setFormError(msg); toast.error(msg); return;
      }
      setAppointments(prev => [...prev, json.data]);
      setCreateOpen(false);
      toast.success('Cita agendada correctamente');
    } catch {
      setFormError('Error de red'); toast.error('Error de red');
    } finally { setFormLoading(false); }
  }

  // ── Cancelar cita ──────────────────────────────────────
  async function handleCancel(appt: Appointment) {
    const id = toast.loading('Cancelando cita…');
    const res = await fetch(`/api/appointments/${appt.id}/cancel`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Cancelado por el administrador' }),
    });
    const json = await res.json();
    if (res.ok) {
      setAppointments(prev => prev.map(a => a.id === appt.id ? json.data : a));
      setDetailAppt(null);
      toast.success('Cita cancelada', { id });
    } else {
      toast.error(json.error?.message ?? 'No se pudo cancelar', { id });
    }
  }

  // ── Columnas de la tabla ───────────────────────────────
  const columns: ColumnsType<Appointment> = [
    {
      title:  'Cliente',
      key:    'cliente',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.client.fullName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.service.name}</Text>
        </div>
      ),
    },
    {
      title:  'Barbero',
      key:    'barbero',
      render: (_, r) => <Text style={{ fontSize: 13 }}>{r.barber.user.fullName}</Text>,
    },
    {
      title:  'Fecha y hora',
      key:    'startTime',
      width:  160,
      render: (_, r) => (
        <Text style={{ fontSize: 12 }}>
          {format(new Date(r.startTime), 'dd MMM yyyy, HH:mm', { locale: es })}
        </Text>
      ),
      sorter: (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    },
    {
      title:  'Estado',
      key:    'status',
      width:  120,
      render: (_, r) => (
        <Tag color={STATUS_COLORS[r.status] ?? 'default'}>
          {STATUS_LABELS[r.status] ?? r.status}
        </Tag>
      ),
    },
    {
      title:  'Precio',
      key:    'precio',
      width:  90,
      align:  'right',
      render: (_, r) => (
        <Text style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
          ${r.service.price.toFixed(2)}
        </Text>
      ),
    },
    {
      title:  'Acciones',
      key:    'actions',
      width:  80,
      fixed:  'right',
      render: (_, record) => (
        <Button size="small" type="primary" ghost onClick={() => setDetailAppt(record)}>
          Ver
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* ── KPIs ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Total citas" value={kpis.total}
              prefix={<CalendarOutlined style={{ color: 'hsl(var(--brand-primary))' }} />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Pendientes" value={kpis.pendientes}
              prefix={<ClockCircleOutlined style={{ color: '#f59e0b' }} />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Confirmadas / En curso" value={kpis.confirmadas}
              prefix={<TeamOutlined style={{ color: '#0284c7' }} />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Completadas" value={kpis.completadas}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
      </Row>

      {/* ── Tabla / Calendario ── */}
      <Card
        title={<Title level={5} style={{ margin: 0 }}>Citas</Title>}
        extra={
          <Space>
            <Segmented
              value={view}
              onChange={v => setView(v as string)}
              options={[
                { value: 'calendar', icon: <CalendarOutlined />,      label: 'Calendario' },
                { value: 'list',     icon: <UnorderedListOutlined />,  label: 'Lista' },
              ]}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              Nueva cita
            </Button>
          </Space>
        }
      >
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
          <Table
            dataSource={appointments}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ x: 700 }}
            pagination={{
              pageSize:        10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal:       (t, range) => `${range[0]}–${range[1]} de ${t} citas`,
            }}
            locale={{ emptyText: (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <StopOutlined style={{ fontSize: 32, color: 'hsl(var(--text-disabled))' }} />
                <div style={{ marginTop: 8, color: 'hsl(var(--text-muted))' }}>No hay citas registradas.</div>
              </div>
            ) }}
          />
        )}
      </Card>

      {/* ── Modal Nueva cita ── */}
      <Modal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        title="Nueva cita"
        footer={null}
        width={520}
        destroyOnHidden
      >
        <AppointmentForm
          barbers={barbers}
          services={services}
          clients={clients}
          onSubmit={handleCreateSubmit}
          loading={formLoading}
          error={formError}
        />
      </Modal>

      {/* ── Modal Detalle ── */}
      <Modal
        open={!!detailAppt}
        onCancel={() => setDetailAppt(null)}
        title="Detalle de cita"
        footer={
          detailAppt && !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(detailAppt.status) ? (
            <Button danger onClick={() => detailAppt && handleCancel(detailAppt)}>
              Cancelar cita
            </Button>
          ) : null
        }
        width={520}
        destroyOnHidden
      >
        {detailAppt && (
          <>
            <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Cliente">{detailAppt.client.fullName}</Descriptions.Item>
              <Descriptions.Item label="Barbero">{detailAppt.barber.user.fullName}</Descriptions.Item>
              <Descriptions.Item label="Servicio">{detailAppt.service.name}</Descriptions.Item>
              <Descriptions.Item label="Precio">${detailAppt.service.price.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="Inicio">
                {format(new Date(detailAppt.startTime), 'dd MMM yyyy, HH:mm', { locale: es })}
              </Descriptions.Item>
              <Descriptions.Item label="Fin">
                {format(new Date(detailAppt.endTime), 'HH:mm', { locale: es })}
              </Descriptions.Item>
            </Descriptions>
            <Space>
              <Text type="secondary" style={{ fontSize: 12 }}>Estado:</Text>
              <Tag color={STATUS_COLORS[detailAppt.status] ?? 'default'}>
                {STATUS_LABELS[detailAppt.status] ?? detailAppt.status}
              </Tag>
            </Space>
            {detailAppt.notes && (
              <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', marginTop: 8, marginBottom: 0 }}>
                <strong>Nota:</strong> {detailAppt.notes}
              </p>
            )}
            {detailAppt.cancelReason && (
              <p style={{ fontSize: 13, color: '#ff4d4f', marginTop: 8, marginBottom: 0 }}>
                <strong>Motivo cancelación:</strong> {detailAppt.cancelReason}
              </p>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
