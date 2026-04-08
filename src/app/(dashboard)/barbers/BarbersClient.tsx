'use client';

// ══════════════════════════════════════════════════════════
// BARBEROS — tabla + drawer perfil completo + CRUD cargos
// ══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Table, Card, Button, Space, Row, Col, Input, Modal, Drawer,
  Statistic, Tag, Tooltip, Typography, Avatar, theme, Tabs,
  Select, Switch, InputNumber, DatePicker, Form, Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, UserOutlined, CheckCircleOutlined,
  ScissorOutlined, ClockCircleOutlined, TagsOutlined, DeleteOutlined,
  SettingOutlined, CalendarOutlined,
} from '@ant-design/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button as SdButton } from '@/components/ui/button';
import { Input as SdInput }  from '@/components/ui/input';
import { FormField }         from '@/components/shared/FormField';
import { Eye, EyeSlash }     from '@phosphor-icons/react';
import { useBarberTheme }    from '@/context/ThemeContext';
import dayjs                 from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

// ── Constantes ─────────────────────────────────────────────────────────────
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DEFAULT_SCHED = DAY_NAMES.map((_, i) => ({
  dayOfWeek: i, active: i >= 1 && i <= 6, startTime: '08:00', endTime: '18:00',
}));
const TIPO_PAGO_OPTS = [
  { value: 'FIJO',        label: 'Salario Fijo' },
  { value: 'POR_DIA',     label: 'Por Día' },
  { value: 'POR_SEMANA',  label: 'Por Semana' },
  { value: 'POR_HORA',    label: 'Por Hora' },
  { value: 'POR_SERVICIO',label: 'Por Servicio / Comisión' },
];

// ── Tipos ───────────────────────────────────────────────────────────────────
type Schedule   = { dayOfWeek: number; startTime: string; endTime: string; active: boolean };
type BarberUser = { id: number; fullName: string; email: string; phone: string | null; avatarUrl: string | null; active: boolean };
type Barber = {
  id: number; bio: string | null; cargo: string | null; specialties: string[]; active: boolean;
  scheduleText: string; user: BarberUser; schedules: Schedule[];
};
type BarberDetail = Barber & {
  configPlanilla: {
    tipoPago: string; salarioBase: number; valorPorUnidad: number;
    porcentajeServicio: number; aplicaRenta: boolean; fechaIngreso: string | null;
  } | null;
};
type CreateForm = { fullName: string; email: string; password: string; phone: string; bio: string; cargo: string; specialtiesInput: string };
type CargoItem  = { id: number; nombre: string; descripcion: string | null; activo: boolean };
type PagoForm   = { tipoPago: string; salarioBase: number; valorPorUnidad: number; porcentajeServicio: number; aplicaRenta: boolean; fechaIngreso: string | null };

// ── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name: string) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(); }
const AVATAR_COLORS = ['#0d9488', '#7c3aed', '#0284c7', '#b45309', '#be123c', '#065f46'];
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }

function normSchedule(schedules: Schedule[]): Schedule[] {
  return DEFAULT_SCHED.map(def => {
    const found = schedules.find(s => s.dayOfWeek === def.dayOfWeek);
    return found ?? def;
  });
}

// ── Componente ──────────────────────────────────────────────────────────────
export default function BarbersClient({ initialBarbers }: { initialBarbers: Barber[] }) {
  const { theme: barberTheme } = useBarberTheme();
  const primary = barberTheme.colorPrimary;
  const { token } = theme.useToken();
  const textDisabled = 'hsl(var(--text-disabled))';
  const textMuted    = 'hsl(var(--text-muted))';

  // ── Estado barberos ──────────────────────────────────────
  const [barbers, setBarbers] = useState<Barber[]>(initialBarbers);

  // Crear barbero
  const [creating,      setCreating]      = useState(false);
  const [showPass,      setShowPass]      = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError,   setCreateError]   = useState('');
  const [form, setForm] = useState<CreateForm>({ fullName: '', email: '', password: '', phone: '', bio: '', cargo: '', specialtiesInput: '' });

  // ── Drawer perfil completo ──────────────────────────────
  const [drawer,        setDrawer]        = useState<BarberDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerTab,     setDrawerTab]     = useState('general');

  // Tab General
  const [genBio,        setGenBio]        = useState('');
  const [genCargo,      setGenCargo]      = useState('');
  const [genSpec,       setGenSpec]       = useState('');
  const [genSaving,     setGenSaving]     = useState(false);

  // Tab Configuración de Pago
  const [pago, setPago] = useState<PagoForm>({
    tipoPago: 'FIJO', salarioBase: 0, valorPorUnidad: 0,
    porcentajeServicio: 0, aplicaRenta: true, fechaIngreso: null,
  });
  const [pagoSaving, setPagoSaving] = useState(false);

  // Tab Horarios
  const [sched,      setSched]      = useState<Schedule[]>(DEFAULT_SCHED);
  const [schedSaving, setSchedSaving] = useState(false);

  // ── Estado cargos ────────────────────────────────────────
  const [cargos,      setCargos]      = useState<CargoItem[]>([]);
  const [cargoLoad,   setCargoLoad]   = useState(false);
  const [modalCargo,  setModalCargo]  = useState<CargoItem | null | 'new'>(null);
  const [cargoNombre, setCargoNombre] = useState('');
  const [cargoDesc,   setCargoDesc]   = useState('');
  const [cargoSaving, setCargoSaving] = useState(false);

  // Cargar cargos al montar
  useEffect(() => {
    setCargoLoad(true);
    fetch('/api/cargos').then(r => r.json())
      .then(j => { if (j.success) setCargos(j.data); })
      .finally(() => setCargoLoad(false));
  }, []);

  const cargoOptions = cargos.filter(c => c.activo).map(c => ({ value: c.nombre, label: c.nombre }));

  function setField(f: keyof CreateForm, v: string) { setForm(p => ({ ...p, [f]: v })); }

  // ── Abrir drawer ─────────────────────────────────────────
  async function openDrawer(b: Barber) {
    setDrawerTab('general');
    setDrawer(b as BarberDetail);
    setGenBio(b.bio ?? ''); setGenCargo(b.cargo ?? ''); setGenSpec(b.specialties.join(', '));
    setSched(normSchedule(b.schedules));
    setPago({ tipoPago: 'FIJO', salarioBase: 0, valorPorUnidad: 0, porcentajeServicio: 0, aplicaRenta: true, fechaIngreso: null });
    setDrawerLoading(true);
    try {
      const res = await fetch(`/api/barbers/${b.id}`);
      const json = await res.json();
      if (json.success) {
        const detail = json.data as BarberDetail;
        setDrawer(detail);
        setGenBio(detail.bio ?? ''); setGenCargo(detail.cargo ?? ''); setGenSpec(detail.specialties.join(', '));
        setSched(normSchedule(detail.schedules));
        if (detail.configPlanilla) setPago({ ...detail.configPlanilla });
      }
    } finally { setDrawerLoading(false); }
  }

  // ── Guardar General ──────────────────────────────────────
  async function saveGeneral() {
    if (!drawer) return;
    setGenSaving(true);
    try {
      const specialties = genSpec.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch(`/api/barbers/${drawer.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: genBio, cargo: genCargo, specialties }),
      });
      const json = await res.json();
      if (res.ok) {
        setBarbers(prev => prev.map(b => b.id === drawer.id ? { ...b, ...json.data } : b));
        setDrawer(prev => prev ? { ...prev, ...json.data } : prev);
        toast.success('Datos generales actualizados');
      } else { toast.error(json.error?.message ?? 'Error al guardar'); }
    } catch { toast.error('Error de red'); } finally { setGenSaving(false); }
  }

  // ── Guardar Configuración de Pago ────────────────────────
  async function savePago() {
    if (!drawer) return;
    setPagoSaving(true);
    try {
      const res = await fetch('/api/planilla/barberos-config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberoId: drawer.id, ...pago }),
      });
      const json = await res.json();
      if (res.ok) {
        setDrawer(prev => prev ? { ...prev, configPlanilla: {
          tipoPago:           json.tipoPago,
          salarioBase:        json.salarioBase,
          valorPorUnidad:     json.valorPorUnidad,
          porcentajeServicio: json.porcentajeServicio,
          aplicaRenta:        json.aplicaRenta,
          fechaIngreso:       json.fechaIngreso,
        }} : prev);
        toast.success('Configuración de pago guardada');
      } else { toast.error(json.error?.message ?? 'Error al guardar'); }
    } catch { toast.error('Error de red'); } finally { setPagoSaving(false); }
  }

  // ── Guardar Horarios ─────────────────────────────────────
  async function saveHorarios() {
    if (!drawer) return;
    setSchedSaving(true);
    try {
      const res = await fetch(`/api/barbers/${drawer.id}/schedule`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sched),
      });
      const json = await res.json();
      if (res.ok) {
        const updated = normSchedule(json.data as Schedule[]);
        setSched(updated);
        setDrawer(prev => prev ? { ...prev, schedules: json.data } : prev);
        const txt = updated.filter(s => s.active)
          .map(s => `${DAY_NAMES[s.dayOfWeek].slice(0,3)} ${s.startTime}-${s.endTime}`).join(', ');
        setBarbers(prev => prev.map(b => b.id === drawer.id ? { ...b, scheduleText: txt, schedules: json.data } : b));
        toast.success('Horarios guardados');
      } else { toast.error(json.error?.message ?? 'Error al guardar'); }
    } catch { toast.error('Error de red'); } finally { setSchedSaving(false); }
  }

  // ── CRUD barbero (crear) ─────────────────────────────────
  async function handleCreate() {
    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      setCreateError('Nombre, email y contraseña son obligatorios.'); return;
    }
    setCreateLoading(true); setCreateError('');
    try {
      const specialties = form.specialtiesInput.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/barbers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(), email: form.email.trim().toLowerCase(),
          password: form.password, phone: form.phone.trim() || undefined,
          bio: form.bio.trim() || undefined, cargo: form.cargo || undefined, specialties,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setCreateError(json.error?.message ?? 'Error'); toast.error(json.error?.message ?? 'Error'); return; }
      setBarbers(prev => [...prev, json.data]);
      setCreating(false);
      toast.success(`Barbero "${form.fullName.trim()}" creado`);
    } catch { setCreateError('Error de red'); toast.error('Error de red'); }
    finally { setCreateLoading(false); }
  }

  // ── CRUD cargos ──────────────────────────────────────────
  function openNuevoCargo() { setCargoNombre(''); setCargoDesc(''); setModalCargo('new'); }
  function openEditCargo(c: CargoItem) { setCargoNombre(c.nombre); setCargoDesc(c.descripcion ?? ''); setModalCargo(c); }

  async function saveCargo() {
    if (!cargoNombre.trim()) { toast.error('El nombre es requerido'); return; }
    setCargoSaving(true);
    try {
      const isNew = modalCargo === 'new';
      const url    = isNew ? '/api/cargos' : `/api/cargos/${(modalCargo as CargoItem).id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: cargoNombre.trim(), descripcion: cargoDesc.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? 'Error'); return; }
      if (isNew) { setCargos(prev => [...prev, json.data]); toast.success('Cargo creado'); }
      else { setCargos(prev => prev.map(c => c.id === json.data.id ? json.data : c)); toast.success('Cargo actualizado'); }
      setModalCargo(null);
    } catch { toast.error('Error de red'); } finally { setCargoSaving(false); }
  }

  async function toggleActivoCargo(c: CargoItem) {
    const res = await fetch(`/api/cargos/${c.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !c.activo }),
    });
    const json = await res.json();
    if (res.ok) setCargos(prev => prev.map(x => x.id === c.id ? json.data : x));
    else toast.error(json.error?.message ?? 'Error');
  }

  function confirmDeleteCargo(c: CargoItem) {
    Modal.confirm({
      title: `¿Eliminar cargo "${c.nombre}"?`, content: 'Esta acción no se puede deshacer.',
      okText: 'Eliminar', okType: 'danger', cancelText: 'Cancelar',
      onOk: async () => {
        const res = await fetch(`/api/cargos/${c.id}`, { method: 'DELETE' });
        if (res.ok) { setCargos(prev => prev.filter(x => x.id !== c.id)); toast.success('Cargo eliminado'); }
        else { const j = await res.json(); toast.error(j.error?.message ?? 'Error'); }
      },
    });
  }

  // ── Columnas barberos ────────────────────────────────────
  const columns: ColumnsType<Barber> = [
    {
      title: 'Empleado', key: 'barbero',
      render: (_, r) => (
        <Space>
          <Avatar size={36} style={{ backgroundColor: avatarColor(r.id), flexShrink: 0, fontWeight: 700 }}>
            {getInitials(r.user.fullName)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{r.user.fullName}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.user.email}</Text>
          </div>
        </Space>
      ),
    },
    { title: 'Teléfono', key: 'phone', width: 130,
      render: (_, r) => r.user.phone ? <Text style={{ fontSize: 12 }}>{r.user.phone}</Text> : <Text type="secondary">—</Text> },
    { title: 'Cargo', key: 'cargo', width: 130,
      render: (_, r) => <Tag color="cyan" style={{ fontSize: 11 }}>{r.cargo ?? 'Barbero'}</Tag> },
    {
      title: 'Especialidades', key: 'specialties',
      render: (_, r) => r.specialties.length === 0 ? <Text type="secondary">—</Text> : (
        <Space size={2} wrap>
          {r.specialties.slice(0, 3).map(sp => <Tag key={sp} style={{ fontSize: 11 }}>{sp}</Tag>)}
          {r.specialties.length > 3 && (
            <Tooltip title={r.specialties.slice(3).join(', ')}>
              <Tag style={{ fontSize: 11 }}>+{r.specialties.length - 3}</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    { title: 'Estado', key: 'active', width: 90,
      render: (_, r) => <Tag color={r.active ? 'success' : 'default'}>{r.active ? 'Activo' : 'Inactivo'}</Tag> },
    {
      title: 'Acciones', key: 'actions', width: 100, fixed: 'right',
      render: (_, r) => (
        <Button size="small" type="primary" ghost icon={<EditOutlined />} onClick={() => openDrawer(r)}>
          Ver perfil
        </Button>
      ),
    },
  ];

  // ── Columnas cargos ──────────────────────────────────────
  const colsCargos: ColumnsType<CargoItem> = [
    { title: 'Nombre', dataIndex: 'nombre', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Descripción', dataIndex: 'descripcion',
      render: (v: string | null) => v ? <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text> },
    { title: 'Estado', dataIndex: 'activo', width: 110,
      render: (v: boolean, r) => (
        <Switch size="small" checked={v} checkedChildren="Activo" unCheckedChildren="Inactivo"
          onChange={() => toggleActivoCargo(r)} style={{ background: v ? primary : undefined }} />
      ),
    },
    { title: 'Acciones', key: 'acc', width: 90,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Editar"><Button size="small" icon={<EditOutlined />} onClick={() => openEditCargo(r)} /></Tooltip>
          <Tooltip title="Eliminar"><Button size="small" danger icon={<DeleteOutlined />} onClick={() => confirmDeleteCargo(r)} /></Tooltip>
        </Space>
      ),
    },
  ];

  const activeCount = barbers.filter(b => b.active).length;

  // ── JSX ─────────────────────────────────────────────────
  return (
    <>
      {/* KPIs */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={8}>
          <Card size="small">
            <Statistic title="Total Empleados" value={barbers.length} prefix={<UserOutlined style={{ color: primary }} />} />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card size="small">
            <Statistic title="Activos" value={activeCount}
              prefix={<CheckCircleOutlined style={{ color: token.colorSuccess }} />} />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card size="small">
            <Statistic title="Cargos definidos" value={cargos.length}
              prefix={<TagsOutlined style={{ color: '#722ed1' }} />} />
          </Card>
        </Col>
      </Row>

      {/* Tabs: Empleados | Cargos */}
      <Card>
        <Tabs items={[
          {
            key: 'barberos',
            label: <span><UserOutlined /> Empleados</span>,
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />}
                    onClick={() => {
                      setForm({ fullName: '', email: '', password: '', phone: '', bio: '', cargo: '', specialtiesInput: '' });
                      setCreateError(''); setShowPass(false); setCreating(true);
                    }}>
                    Nuevo empleado
                  </Button>
                </div>
                <Table dataSource={barbers} columns={columns} rowKey="id" size="small" scroll={{ x: 700 }}
                  pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10','20'],
                    showTotal: (t, r) => `${r[0]}–${r[1]} de ${t} empleados` }}
                  locale={{ emptyText: (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                      <ClockCircleOutlined style={{ fontSize: 32, color: textDisabled }} />
                      <div style={{ marginTop: 8, color: textMuted }}>No hay empleados. Usa &quot;+ Nuevo empleado&quot;.</div>
                    </div>
                  )}}
                />
              </>
            ),
          },
          {
            key: 'cargos',
            label: <span><TagsOutlined /> Cargos</span>,
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Define los puestos de trabajo. Se usan al crear empleados y en constancias laborales.
                  </Text>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openNuevoCargo}>Nuevo cargo</Button>
                </div>
                <Table dataSource={cargos} columns={colsCargos} rowKey="id" size="small"
                  loading={cargoLoad}
                  pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}–${r[1]} de ${t} cargos` }}
                  locale={{ emptyText: (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                      <TagsOutlined style={{ fontSize: 32, color: textDisabled }} />
                      <div style={{ marginTop: 8, color: textMuted }}>No hay cargos. Crea el primero.</div>
                    </div>
                  )}}
                />
              </>
            ),
          },
        ]} />
      </Card>

      {/* ── Drawer: Perfil completo del empleado ─────────── */}
      <Drawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        title={
          drawer ? (
            <Space>
              <Avatar size={32} style={{ backgroundColor: avatarColor(drawer.id), fontWeight: 700 }}>
                {getInitials(drawer.user.fullName)}
              </Avatar>
              <div>
                <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{drawer.user.fullName}</div>
                <Tag color="cyan" style={{ fontSize: 11, marginTop: 2 }}>{drawer.cargo ?? 'Barbero'}</Tag>
              </div>
            </Space>
          ) : 'Perfil'
        }
        width={typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 560}
        loading={drawerLoading}
      >
        <Tabs activeKey={drawerTab} onChange={setDrawerTab} items={[
          /* ── Tab 1: General ── */
          {
            key: 'general',
            label: <span><UserOutlined /> General</span>,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Form layout="vertical" size="small">
                  <Form.Item label="Cargo / Puesto">
                    <Select
                      style={{ width: '100%' }}
                      placeholder="Selecciona un cargo…"
                      showSearch allowClear
                      value={genCargo || undefined}
                      onChange={v => setGenCargo(v ?? '')}
                      options={cargoOptions}
                      notFoundContent={<span style={{ fontSize: 12 }}>Sin cargos — créalos en la pestaña &quot;Cargos&quot;</span>}
                    />
                  </Form.Item>
                  <Form.Item label="Biografía">
                    <Input.TextArea
                      value={genBio}
                      onChange={e => setGenBio(e.target.value)}
                      placeholder="Descripción breve del empleado…"
                      autoSize={{ minRows: 2, maxRows: 4 }}
                    />
                  </Form.Item>
                  <Form.Item label="Especialidades (separadas por coma)">
                    <Input
                      value={genSpec}
                      onChange={e => setGenSpec(e.target.value)}
                      placeholder="Fade, Barba, Diseño…"
                    />
                  </Form.Item>
                </Form>
                <Divider style={{ margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="primary" loading={genSaving} onClick={saveGeneral}>
                    Guardar cambios
                  </Button>
                </div>
              </div>
            ),
          },

          /* ── Tab 2: Configuración de Pago ── */
          {
            key: 'pago',
            label: <span><SettingOutlined /> Configuración de Pago</span>,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Form layout="vertical" size="small">
                  <Form.Item label="Tipo de Pago">
                    <Select
                      style={{ width: '100%' }}
                      value={pago.tipoPago}
                      onChange={v => setPago(p => ({ ...p, tipoPago: v }))}
                      options={TIPO_PAGO_OPTS}
                    />
                  </Form.Item>

                  {pago.tipoPago === 'FIJO' && (
                    <Form.Item label="Salario Base Mensual ($)">
                      <InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="$"
                        value={pago.salarioBase}
                        onChange={v => setPago(p => ({ ...p, salarioBase: v ?? 0 }))} />
                    </Form.Item>
                  )}

                  {(pago.tipoPago === 'POR_DIA' || pago.tipoPago === 'POR_SEMANA' || pago.tipoPago === 'POR_HORA') && (
                    <Form.Item label={`Valor por ${pago.tipoPago === 'POR_DIA' ? 'día' : pago.tipoPago === 'POR_SEMANA' ? 'semana' : 'hora'} ($)`}>
                      <InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="$"
                        value={pago.valorPorUnidad}
                        onChange={v => setPago(p => ({ ...p, valorPorUnidad: v ?? 0 }))} />
                    </Form.Item>
                  )}

                  {pago.tipoPago === 'POR_SERVICIO' && (
                    <>
                      <Form.Item label="Porcentaje de comisión (%)">
                        <InputNumber style={{ width: '100%' }} min={0} max={100} precision={2} addonAfter="%"
                          value={pago.porcentajeServicio}
                          onChange={v => setPago(p => ({ ...p, porcentajeServicio: v ?? 0 }))} />
                      </Form.Item>
                      <Form.Item label="Valor fijo por servicio ($) — si no usa porcentaje">
                        <InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="$"
                          value={pago.valorPorUnidad}
                          onChange={v => setPago(p => ({ ...p, valorPorUnidad: v ?? 0 }))} />
                      </Form.Item>
                    </>
                  )}

                  <Form.Item label="Fecha de Ingreso (para cálculo de prestaciones)">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY"
                      value={pago.fechaIngreso ? dayjs(pago.fechaIngreso) : null}
                      onChange={d => setPago(p => ({ ...p, fechaIngreso: d ? d.toISOString() : null }))}
                      placeholder="Fecha de contratación"
                    />
                  </Form.Item>

                  <Form.Item label="Aplica Retención de Renta (ISR)">
                    <Switch checked={pago.aplicaRenta}
                      onChange={v => setPago(p => ({ ...p, aplicaRenta: v }))}
                      checkedChildren="Sí" unCheckedChildren="No"
                      style={{ background: pago.aplicaRenta ? primary : undefined }}
                    />
                  </Form.Item>
                </Form>
                <Divider style={{ margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="primary" loading={pagoSaving} onClick={savePago}>
                    Guardar configuración
                  </Button>
                </div>
              </div>
            ),
          },

          /* ── Tab 3: Horarios ── */
          {
            key: 'horarios',
            label: <span><CalendarOutlined /> Horarios</span>,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Configura los días y horarios de trabajo individuales para este empleado.
                </Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sched.map((h, idx) => (
                    <Row key={h.dayOfWeek} align="middle" gutter={8}>
                      <Col style={{ width: 36 }}>
                        <Switch size="small" checked={h.active}
                          style={{ background: h.active ? primary : undefined }}
                          onChange={val => setSched(prev => prev.map((s, i) => i === idx ? { ...s, active: val } : s))}
                        />
                      </Col>
                      <Col style={{ width: 88 }}>
                        <Text style={{ fontSize: 13, color: h.active ? undefined : '#bfbfbf', fontWeight: h.active ? 500 : 400 }}>
                          {DAY_NAMES[h.dayOfWeek]}
                        </Text>
                      </Col>
                      {h.active ? (
                        <>
                          <Col>
                            <Select size="small" style={{ width: 88 }} value={h.startTime}
                              onChange={v => setSched(prev => prev.map((s, i) => i === idx ? { ...s, startTime: v } : s))}
                              options={Array.from({ length: 24 }, (_, i) => ({ value: `${String(i).padStart(2,'0')}:00`, label: `${String(i).padStart(2,'0')}:00` }))}
                            />
                          </Col>
                          <Col><Text type="secondary" style={{ fontSize: 12 }}>a</Text></Col>
                          <Col>
                            <Select size="small" style={{ width: 88 }} value={h.endTime}
                              onChange={v => setSched(prev => prev.map((s, i) => i === idx ? { ...s, endTime: v } : s))}
                              options={Array.from({ length: 24 }, (_, i) => ({ value: `${String(i).padStart(2,'0')}:00`, label: `${String(i).padStart(2,'0')}:00` }))}
                            />
                          </Col>
                        </>
                      ) : (
                        <Col><Text type="secondary" style={{ fontSize: 12 }}>Descanso</Text></Col>
                      )}
                    </Row>
                  ))}
                </div>
                <Divider style={{ margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="primary" loading={schedSaving} onClick={saveHorarios}>
                    Guardar horarios
                  </Button>
                </div>
              </div>
            ),
          },
        ]} />
      </Drawer>

      {/* ── Modal CREAR empleado ─────────────────────────── */}
      <Dialog open={creating} onOpenChange={v => { if (!v) setCreating(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo empleado</DialogTitle></DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
            <FormField label="Nombre completo *">
              <SdInput value={form.fullName} onChange={e => setField('fullName', e.target.value)} placeholder="Carlos López" autoFocus />
            </FormField>
            <FormField label="Email *">
              <SdInput type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="carlos@barberia.com" />
            </FormField>
            <FormField label="Contraseña *">
              <div style={{ position: 'relative' }}>
                <SdInput type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => setField('password', e.target.value)} placeholder="Mínimo 6 caracteres" style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', padding: 0, display: 'flex' }}>
                  {showPass ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </FormField>
            <FormField label="Teléfono">
              <SdInput value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+503 7000-0000" />
            </FormField>
            <FormField label="Cargo / Puesto">
              <Select style={{ width: '100%' }} placeholder="Selecciona un cargo…" showSearch allowClear
                value={form.cargo || undefined} onChange={v => setField('cargo', v ?? '')} options={cargoOptions}
                notFoundContent={<span style={{ fontSize: 12 }}>Sin cargos — créalos en la pestaña &quot;Cargos&quot;</span>} />
            </FormField>
            <FormField label="Especialidades (separadas por coma)">
              <SdInput value={form.specialtiesInput} onChange={e => setField('specialtiesInput', e.target.value)} placeholder="Fade, Barba, Diseño" />
            </FormField>
            {createError && <p style={{ color: 'hsl(var(--status-error))', fontSize: 13, margin: 0 }}>{createError}</p>}
          </div>
          <DialogFooter>
            <SdButton variant="outline" onClick={() => setCreating(false)}>Cancelar</SdButton>
            <SdButton onClick={handleCreate} disabled={createLoading}>{createLoading ? 'Creando...' : 'Crear empleado'}</SdButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal CRUD cargo ─────────────────────────────── */}
      <Modal open={!!modalCargo}
        title={modalCargo === 'new' ? <span><TagsOutlined /> Nuevo cargo</span> : <span><EditOutlined /> Editar cargo</span>}
        onCancel={() => setModalCargo(null)} onOk={saveCargo}
        okText={modalCargo === 'new' ? 'Crear cargo' : 'Guardar'}
        confirmLoading={cargoSaving}
        okButtonProps={{ style: { background: primary, borderColor: primary } }}
        width="min(420px, 96vw)"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Nombre *</div>
            <Input value={cargoNombre} onChange={e => setCargoNombre(e.target.value)}
              placeholder="Ej: Barbero, Estilista, Cajero, Supervisor…" autoFocus />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Descripción (opcional)</div>
            <TextArea value={cargoDesc} onChange={e => setCargoDesc(e.target.value)}
              placeholder="Descripción breve…" autoSize={{ minRows: 2, maxRows: 4 }} />
          </div>
        </div>
      </Modal>
    </>
  );
}
