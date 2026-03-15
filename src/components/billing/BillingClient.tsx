'use client';

// ══════════════════════════════════════════════════════════
// CAJA — Rediseño completo Ant Design 5
// Mejoras: KPIs por método, Tabs con conteos, búsqueda,
//          Drawer de detalle, acción de reembolso,
//          Modal mejorado con preview de cita
// ══════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Table, Card, Button, Row, Col,
  Statistic, Tag, Select, Modal, Input,
  Typography, Tooltip, Tabs, Drawer,
  Descriptions, Space,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, DollarOutlined, ClockCircleOutlined,
  CheckCircleOutlined, WarningOutlined, CalendarOutlined,
  WalletOutlined, CreditCardOutlined, BankOutlined,
  QrcodeOutlined, RollbackOutlined,
  UserOutlined, ScissorOutlined,
} from '@ant-design/icons';
import { FormField } from '@/components/shared/FormField';

const { Title, Text } = Typography;

// ── Tipos ──────────────────────────────────────────────────────────────────

type UnpaidAppointment = {
  id: number; startTime: string;
  client:  { id: number; fullName: string };
  barber:  { user: { fullName: string } };
  service: { id: number; name: string; price: number };
};

type Payment = {
  id: number; amount: number; method: string; status: string;
  paidAt: string | null; createdAt: string; notes: string | null;
  appointment: {
    id: number; startTime: string;
    client:  { id: number; fullName: string };
    barber:  { user: { fullName: string } };
    service: { id: number; name: string };
  };
};

type Stats = {
  ingresosHoy: number; ingresosMes: number;
  pendienteSum: number; pendienteCount: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', QR: 'QR',
};

const METHOD_ICONS = {
  CASH:     <WalletOutlined />,
  CARD:     <CreditCardOutlined />,
  TRANSFER: <BankOutlined />,
  QR:       <QrcodeOutlined />,
};

const METHOD_COLORS: Record<string, string> = {
  CASH:     '#52c41a',
  CARD:     '#1677ff',
  TRANSFER: '#722ed1',
  QR:       '#13c2c2',
};

const METHOD_TAG_COLORS: Record<string, string> = {
  CASH:     'green',
  CARD:     'blue',
  TRANSFER: 'purple',
  QR:       'cyan',
};

const STATUS_COLORS: Record<string, string> = {
  PAID: 'success', PENDING: 'warning', REFUNDED: 'error',
};
const STATUS_LABELS: Record<string, string> = {
  PAID: 'Pagado', PENDING: 'Pendiente', REFUNDED: 'Reembolsado',
};
const STATUS_ICONS: Record<string, string> = {
  PAID: '✅', PENDING: '⏳', REFUNDED: '↩️',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-SV', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function formatMoney(n: number) { return `$${n.toFixed(2)}`; }
function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ── Componente ────────────────────────────────────────────────────────────

type Props = {
  initialPayments: Payment[];
  initialUnpaid:   UnpaidAppointment[];
  initialStats:    Stats;
};

export default function BillingClient({ initialPayments, initialUnpaid, initialStats }: Props) {
  const [payments,   setPayments]   = useState<Payment[]>(initialPayments);
  const [unpaid,     setUnpaid]     = useState<UnpaidAppointment[]>(initialUnpaid);
  const [stats,      setStats]      = useState<Stats>(initialStats);

  // Filtros
  const [activeTab,    setActiveTab]    = useState('ALL');
  const [search,       setSearch]       = useState('');
  const [filterMethod, setFilterMethod] = useState<string | undefined>(undefined);

  // Modal de pago
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [apptId,  setApptId]  = useState('');
  const [amount,  setAmount]  = useState('');
  const [method,  setMethod]  = useState('CASH');
  const [notes,   setNotes]   = useState('');

  // Drawer de detalle
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected,   setSelected]   = useState<Payment | null>(null);
  const [refunding,  setRefunding]  = useState(false);

  // ── Datos calculados ──────────────────────────────────────────────────

  // Desglose por método (mes actual) — calculado del array cargado
  const metodosDesglose = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const map: Record<string, { amount: number; count: number }> = {
      CASH:     { amount: 0, count: 0 },
      CARD:     { amount: 0, count: 0 },
      TRANSFER: { amount: 0, count: 0 },
      QR:       { amount: 0, count: 0 },
    };
    payments
      .filter(p => p.status === 'PAID' && p.paidAt && new Date(p.paidAt) >= monthStart)
      .forEach(p => {
        if (map[p.method]) {
          map[p.method].amount += p.amount;
          map[p.method].count++;
        }
      });
    return map;
  }, [payments]);

  // Conteos para tabs
  const counts = useMemo(() => ({
    ALL:      payments.length,
    PAID:     payments.filter(p => p.status === 'PAID').length,
    PENDING:  payments.filter(p => p.status === 'PENDING').length,
    REFUNDED: payments.filter(p => p.status === 'REFUNDED').length,
  }), [payments]);

  // Lista filtrada
  const filtered = useMemo(() => {
    let list = payments;
    if (activeTab !== 'ALL') list = list.filter(p => p.status === activeTab);
    if (filterMethod) list = list.filter(p => p.method === filterMethod);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.appointment.client.fullName.toLowerCase().includes(q) ||
        p.appointment.service.name.toLowerCase().includes(q) ||
        p.appointment.barber.user.fullName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [payments, activeTab, filterMethod, search]);

  // Cita seleccionada en el modal
  const selectedAppt = useMemo(
    () => unpaid.find(a => String(a.id) === apptId),
    [unpaid, apptId]
  );

  // ── Handlers ──────────────────────────────────────────────────────────

  function onApptSelect(v: string) {
    setApptId(v);
    const appt = unpaid.find(a => String(a.id) === v);
    if (appt) setAmount(String(appt.service.price));
  }

  function openRegister() {
    setApptId(''); setAmount(''); setMethod('CASH');
    setNotes(''); setError(''); setOpen(true);
  }

  function openDetail(payment: Payment) {
    setSelected(payment);
    setDrawerOpen(true);
  }

  async function handleSubmit() {
    if (!apptId || !amount) { setError('Selecciona una cita y monto'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: Number(apptId),
          amount:        parseFloat(amount),
          method,
          notes:         notes || undefined,
          status:        'PAID',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error?.message ?? 'Error al registrar pago';
        setError(msg); toast.error(msg); return;
      }
      setPayments(prev => [json.data, ...prev]);
      setUnpaid(prev => prev.filter(a => a.id !== Number(apptId)));
      setStats(prev => ({
        ...prev,
        ingresosHoy:    prev.ingresosHoy    + parseFloat(amount),
        ingresosMes:    prev.ingresosMes    + parseFloat(amount),
        pendienteCount: Math.max(0, prev.pendienteCount - 1),
      }));
      setOpen(false);
      toast.success(`Pago de ${formatMoney(parseFloat(amount))} registrado`);
    } catch {
      setError('Error de red'); toast.error('Error de red');
    } finally { setLoading(false); }
  }

  async function handleRefund(id: number) {
    if (!selected) return;
    setRefunding(true);
    try {
      const res = await fetch(`/api/billing/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REFUNDED' }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Error al reembolsar'); return;
      }
      const refundedAmount = selected.amount;
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'REFUNDED' } : p));
      setSelected(prev => prev?.id === id ? { ...prev, status: 'REFUNDED' } : prev);
      setStats(prev => ({
        ...prev,
        ingresosHoy: Math.max(0, prev.ingresosHoy - refundedAmount),
        ingresosMes: Math.max(0, prev.ingresosMes - refundedAmount),
      }));
      toast.success('Pago marcado como reembolsado');
    } catch {
      toast.error('Error de red');
    } finally { setRefunding(false); }
  }

  // ── Columnas ──────────────────────────────────────────────────────────

  const columns: ColumnsType<Payment> = [
    {
      title: '#',
      key:   'id',
      width: 55,
      render: (_, r) => (
        <Text type="secondary" style={{ fontSize: 11 }}>#{r.id}</Text>
      ),
    },
    {
      title:  'Cliente / Servicio',
      key:    'cliente',
      render: (_, r) => (
        <Space size={10}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: '#0d9488', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {getInitials(r.appointment.client.fullName)}
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13, lineHeight: '18px' }}>
              {r.appointment.client.fullName}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {r.appointment.service.name}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title:      'Barbero',
      key:        'barbero',
      responsive: ['md'],
      render: (_, r) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {r.appointment.barber.user.fullName}
        </Text>
      ),
    },
    {
      title:  'Método',
      key:    'method',
      width:  130,
      render: (_, r) => (
        <Tag
          icon={METHOD_ICONS[r.method as keyof typeof METHOD_ICONS]}
          color={METHOD_TAG_COLORS[r.method] ?? 'default'}
          style={{ fontSize: 11 }}
        >
          {METHOD_LABELS[r.method] ?? r.method}
        </Tag>
      ),
    },
    {
      title:  'Monto',
      key:    'amount',
      width:  105,
      align:  'right',
      render: (_, r) => (
        <Text strong style={{
          fontVariantNumeric: 'tabular-nums',
          color: r.status === 'REFUNDED' ? '#ff4d4f' : '#52c41a',
          fontSize: 14,
        }}>
          {r.status === 'REFUNDED' ? '-' : ''}{formatMoney(r.amount)}
        </Text>
      ),
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
      title:      'Fecha pago',
      key:        'paidAt',
      width:      150,
      responsive: ['lg'],
      render: (_, r) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatDate(r.paidAt)}
        </Text>
      ),
    },
  ];

  // ── Tabs ──────────────────────────────────────────────────────────────

  const tabItems = [
    { key: 'ALL',      label: `Todos (${counts.ALL})` },
    { key: 'PAID',     label: `Pagados (${counts.PAID})` },
    { key: 'PENDING',  label: `Pendientes (${counts.PENDING})` },
    { key: 'REFUNDED', label: `Reembolsados (${counts.REFUNDED})` },
  ];

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── KPIs fila 1: Ingresos ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: '3px solid #52c41a' }}>
            <Statistic
              title="Ingresos hoy"
              value={stats.ingresosHoy}
              precision={2}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: '3px solid #0d9488' }}>
            <Statistic
              title="Ingresos del mes"
              value={stats.ingresosMes}
              precision={2}
              prefix={<CheckCircleOutlined style={{ color: '#0d9488' }} />}
              valueStyle={{ color: '#0d9488', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: '3px solid #f59e0b' }}>
            <Statistic
              title="Pendiente ($)"
              value={stats.pendienteSum}
              precision={2}
              prefix={<WarningOutlined style={{ color: '#f59e0b' }} />}
              valueStyle={{ color: '#f59e0b', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: '3px solid #f59e0b' }}>
            <Statistic
              title="Citas por cobrar"
              value={stats.pendienteCount}
              prefix={<ClockCircleOutlined style={{ color: '#f59e0b' }} />}
              valueStyle={{ fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── KPIs fila 2: Desglose por método (mes actual) ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {(['CASH', 'CARD', 'TRANSFER', 'QR'] as const).map(m => {
          const stat = metodosDesglose[m];
          return (
            <Col xs={12} md={6} key={m}>
              <Card size="small" hoverable>
                <Space align="center" size={12}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: METHOD_COLORS[m] + '18',
                    color: METHOD_COLORS[m],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>
                    {METHOD_ICONS[m]}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#8c8c8c', lineHeight: '16px' }}>
                      {METHOD_LABELS[m]} — mes
                    </div>
                    <div style={{
                      fontWeight: 700, fontSize: 15,
                      color: stat.count > 0 ? METHOD_COLORS[m] : '#d9d9d9',
                    }}>
                      {formatMoney(stat.amount)}
                    </div>
                    <div style={{ fontSize: 11, color: '#bfbfbf', lineHeight: '16px' }}>
                      {stat.count} {stat.count === 1 ? 'pago' : 'pagos'}
                    </div>
                  </div>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* ── Tabla principal ── */}
      <Card>
        {/* Toolbar */}
        <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 12 }}>
          <Col flex="1">
            <Input.Search
              placeholder="Buscar por cliente, servicio o barbero..."
              allowClear
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 380 }}
            />
          </Col>
          <Col>
            <Select
              placeholder="Método"
              allowClear
              style={{ width: 148 }}
              value={filterMethod}
              onChange={v => setFilterMethod(v)}
              options={[
                { value: 'CASH',     label: 'Efectivo' },
                { value: 'CARD',     label: 'Tarjeta' },
                { value: 'TRANSFER', label: 'Transferencia' },
                { value: 'QR',       label: 'QR' },
              ]}
            />
          </Col>
          {unpaid.length > 0 && (
            <Col>
              <Button type="primary" icon={<PlusOutlined />} onClick={openRegister}>
                Registrar pago ({unpaid.length})
              </Button>
            </Col>
          )}
        </Row>

        {/* Tabs de estado */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="small"
          items={tabItems}
          tabBarStyle={{ marginBottom: 0 }}
        />

        {/* Total filtrado cuando se ven pagados */}
        {activeTab === 'PAID' && filtered.length > 0 && (
          <div style={{ padding: '6px 0 8px', textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Total filtrado:{' '}
            </Text>
            <Text strong style={{ color: '#52c41a' }}>
              {formatMoney(filtered.reduce((s, p) => s + p.amount, 0))}
            </Text>
          </div>
        )}

        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          size="small"
          scroll={{ x: 720 }}
          style={{ marginTop: 8 }}
          onRow={r => ({
            onClick:    () => openDetail(r),
            style:      { cursor: 'pointer' },
          })}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (t, range) => `${range[0]}–${range[1]} de ${t} pagos`,
          }}
          locale={{
            emptyText: (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <CalendarOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
                <div style={{ marginTop: 8, color: '#8c8c8c' }}>Sin registros de pago</div>
              </div>
            ),
          }}
        />
      </Card>

      {/* ── Drawer: Detalle del pago ── */}
      <Drawer
        title="Detalle del pago"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={400}
        extra={
          selected?.status === 'PAID' && (
            <Tooltip title="Marcar como reembolsado">
              <Button
                danger
                size="small"
                icon={<RollbackOutlined />}
                loading={refunding}
                onClick={() => selected && handleRefund(selected.id)}
              >
                Reembolsar
              </Button>
            </Tooltip>
          )
        }
      >
        {selected && (
          <>
            {/* Resumen visual */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 64, height: 64, borderRadius: '50%',
                background: selected.status === 'PAID'
                  ? '#f6ffed'
                  : selected.status === 'PENDING'
                  ? '#fffbe6'
                  : '#fff1f0',
                fontSize: 28, marginBottom: 10,
              }}>
                {STATUS_ICONS[selected.status] ?? '💳'}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: selected.status === 'REFUNDED' ? '#ff4d4f' : '#52c41a', lineHeight: '32px' }}>
                {formatMoney(selected.amount)}
              </div>
              <div style={{ marginTop: 6 }}>
                <Tag color={STATUS_COLORS[selected.status]}>
                  {STATUS_LABELS[selected.status]}
                </Tag>
                <Tag
                  icon={METHOD_ICONS[selected.method as keyof typeof METHOD_ICONS]}
                  color={METHOD_TAG_COLORS[selected.method]}
                >
                  {METHOD_LABELS[selected.method]}
                </Tag>
              </div>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label={<><UserOutlined style={{ marginRight: 4 }} />Cliente</>}>
                <Text strong>{selected.appointment.client.fullName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={<><ScissorOutlined style={{ marginRight: 4 }} />Servicio</>}>
                {selected.appointment.service.name}
              </Descriptions.Item>
              <Descriptions.Item label="Barbero">
                {selected.appointment.barber.user.fullName}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha de cita">
                {formatDate(selected.appointment.startTime)}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha de pago">
                {formatDate(selected.paidAt)}
              </Descriptions.Item>
              {selected.notes && (
                <Descriptions.Item label="Notas">
                  <Text type="secondary" style={{ fontSize: 12 }}>{selected.notes}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}
      </Drawer>

      {/* ── Modal: Registrar pago ── */}
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        title={
          <Space>
            <DollarOutlined style={{ color: '#0d9488' }} />
            <span>Registrar pago</span>
          </Space>
        }
        footer={null}
        destroyOnHidden
        width={500}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
          <FormField label="Cita pendiente *">
            <Select
              style={{ width: '100%' }}
              placeholder="Seleccionar cita..."
              value={apptId || undefined}
              onChange={onApptSelect}
              showSearch
              filterOption={(input, opt) =>
                (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={unpaid.map(a => ({
                value: String(a.id),
                label: `${a.client.fullName} — ${a.service.name} (${new Date(a.startTime).toLocaleDateString('es-SV')})`,
              }))}
            />
          </FormField>

          {/* Preview de la cita seleccionada */}
          {selectedAppt && (
            <Card
              size="small"
              style={{ background: '#f0fdfa', border: '1px solid #99f6e4' }}
            >
              <Row gutter={[8, 6]}>
                <Col span={12}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Cliente</div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{selectedAppt.client.fullName}</div>
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Barbero</div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{selectedAppt.barber.user.fullName}</div>
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Servicio</div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{selectedAppt.service.name}</div>
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Precio sugerido</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0d9488' }}>
                    {formatMoney(selectedAppt.service.price)}
                  </div>
                </Col>
              </Row>
            </Card>
          )}

          <Row gutter={12}>
            <Col span={12}>
              <FormField label="Monto ($) *">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  prefix="$"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </FormField>
            </Col>
            <Col span={12}>
              <FormField label="Método *">
                <Select
                  style={{ width: '100%' }}
                  value={method}
                  onChange={v => setMethod(v)}
                  options={[
                    { value: 'CASH',     label: 'Efectivo' },
                    { value: 'CARD',     label: 'Tarjeta' },
                    { value: 'TRANSFER', label: 'Transferencia' },
                    { value: 'QR',       label: 'QR' },
                  ]}
                />
              </FormField>
            </Col>
          </Row>

          <FormField label="Notas">
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones opcionales"
            />
          </FormField>

          {error && (
            <p style={{ color: '#ff4d4f', fontSize: 13, margin: 0 }}>{error}</p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            type="primary"
            loading={loading}
            disabled={!apptId || !amount}
            onClick={handleSubmit}
          >
            {loading ? 'Registrando...' : 'Confirmar pago'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
