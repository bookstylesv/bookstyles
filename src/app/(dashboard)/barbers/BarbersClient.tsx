'use client';

// ══════════════════════════════════════════════════════════
// BARBEROS — CRUD + CARGOS (patrón Speeddansys ERP)
// ══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Table, Card, Button, Space, Row, Col, Input, Modal,
  Statistic, Tag, Tooltip, Typography, Avatar, theme, Tabs, Select, Switch,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, UserOutlined,
  CheckCircleOutlined, ScissorOutlined, ClockCircleOutlined,
  TagsOutlined, DeleteOutlined,
} from '@ant-design/icons';

// Componentes internos del formulario
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button as SdButton }  from '@/components/ui/button';
import { Input as SdInput }    from '@/components/ui/input';
import { FormField }           from '@/components/shared/FormField';
import { Eye, EyeSlash }       from '@phosphor-icons/react';
import { useBarberTheme } from '@/context/ThemeContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

// ── Tipos ──────────────────────────────────────────────────────────────────
type Schedule   = { dayOfWeek: number; startTime: string; endTime: string; active: boolean };
type BarberUser = { id: number; fullName: string; email: string; phone: string | null; avatarUrl: string | null; active: boolean };
type Barber = {
  id: number; bio: string | null; cargo: string | null; specialties: string[]; active: boolean;
  scheduleText: string; user: BarberUser; schedules: Schedule[];
};
type CreateForm = { fullName: string; email: string; password: string; phone: string; bio: string; cargo: string; specialtiesInput: string };
type CargoItem  = { id: number; nombre: string; descripcion: string | null; activo: boolean };

// Iniciales para el Avatar de antd
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#0d9488', '#7c3aed', '#0284c7', '#b45309', '#be123c', '#065f46'];
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }

// ── Componente principal ───────────────────────────────────────────────────
export default function BarbersClient({ initialBarbers }: { initialBarbers: Barber[] }) {
  const { theme: barberTheme } = useBarberTheme();
  const primary = barberTheme.colorPrimary;
  const { token } = theme.useToken();
  const C = {
    textDisabled: 'hsl(var(--text-disabled))',
    textMuted:    'hsl(var(--text-muted))',
    colorSuccess: token.colorSuccess,
  };

  // ── Estado barberos ────────────────────────────────────
  const [barbers, setBarbers] = useState<Barber[]>(initialBarbers);

  // Estado crear barbero
  const [creating,      setCreating]      = useState(false);
  const [showPass,      setShowPass]      = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError,   setCreateError]   = useState('');
  const [form, setForm] = useState<CreateForm>({ fullName: '', email: '', password: '', phone: '', bio: '', cargo: '', specialtiesInput: '' });

  // Estado editar barbero
  const [editing,          setEditing]          = useState<Barber | null>(null);
  const [bio,              setBio]              = useState('');
  const [cargo,            setCargo]            = useState('');
  const [specialtiesInput, setSpecialtiesInput] = useState('');
  const [editLoading,      setEditLoading]      = useState(false);

  // ── Estado cargos ──────────────────────────────────────
  const [cargos,        setCargos]        = useState<CargoItem[]>([]);
  const [cargosLoading, setCargosLoading] = useState(false);
  const [modalCargo,    setModalCargo]    = useState<CargoItem | null | 'new'>(null);
  const [cargoNombre,   setCargoNombre]   = useState('');
  const [cargoDesc,     setCargoDesc]     = useState('');
  const [cargoSaving,   setCargoSaving]   = useState(false);

  // Cargar cargos al montar
  useEffect(() => {
    setCargosLoading(true);
    fetch('/api/cargos')
      .then(r => r.json())
      .then(j => { if (j.success) setCargos(j.data); })
      .finally(() => setCargosLoading(false));
  }, []);

  const cargoOptions = cargos.filter(c => c.activo).map(c => ({ value: c.nombre, label: c.nombre }));

  function setField(field: keyof CreateForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // ── CRUD barberos ──────────────────────────────────────
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
      if (!res.ok) { const msg = json.error?.message ?? 'Error al crear barbero'; setCreateError(msg); toast.error(msg); return; }
      setBarbers(prev => [...prev, json.data]);
      setCreating(false);
      toast.success(`Barbero "${form.fullName.trim()}" creado`);
    } catch { const msg = 'Error de red'; setCreateError(msg); toast.error(msg); }
    finally { setCreateLoading(false); }
  }

  function openEdit(b: Barber) {
    setEditing(b); setBio(b.bio ?? ''); setCargo(b.cargo ?? ''); setSpecialtiesInput(b.specialties.join(', '));
  }

  async function saveEdit() {
    if (!editing) return;
    setEditLoading(true);
    try {
      const specialties = specialtiesInput.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch(`/api/barbers/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, cargo, specialties }),
      });
      const json = await res.json();
      if (res.ok) {
        setBarbers(prev => prev.map(b => b.id === editing.id ? { ...b, ...json.data } : b));
        setEditing(null); toast.success('Perfil actualizado');
      } else { toast.error(json.error?.message ?? 'Error al guardar'); }
    } catch { toast.error('Error de red'); } finally { setEditLoading(false); }
  }

  // ── CRUD cargos ────────────────────────────────────────
  function openNuevoCargo() {
    setCargoNombre(''); setCargoDesc(''); setModalCargo('new');
  }

  function openEditCargo(c: CargoItem) {
    setCargoNombre(c.nombre); setCargoDesc(c.descripcion ?? ''); setModalCargo(c);
  }

  async function saveCargo() {
    if (!cargoNombre.trim()) { toast.error('El nombre del cargo es requerido'); return; }
    setCargoSaving(true);
    try {
      const isNew = modalCargo === 'new';
      const url   = isNew ? '/api/cargos' : `/api/cargos/${(modalCargo as CargoItem).id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: cargoNombre.trim(), descripcion: cargoDesc.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al guardar'); return; }
      if (isNew) {
        setCargos(prev => [...prev, json.data]);
        toast.success(`Cargo "${cargoNombre.trim()}" creado`);
      } else {
        setCargos(prev => prev.map(c => c.id === json.data.id ? json.data : c));
        toast.success('Cargo actualizado');
      }
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
      title:   `¿Eliminar cargo "${c.nombre}"?`,
      content: 'Esta acción no se puede deshacer.',
      okText: 'Eliminar', okType: 'danger', cancelText: 'Cancelar',
      onOk: async () => {
        const res = await fetch(`/api/cargos/${c.id}`, { method: 'DELETE' });
        if (res.ok) { setCargos(prev => prev.filter(x => x.id !== c.id)); toast.success('Cargo eliminado'); }
        else { const j = await res.json(); toast.error(j.error?.message ?? 'Error al eliminar'); }
      },
    });
  }

  // ── Columnas tabla barberos ────────────────────────────
  const columns: ColumnsType<Barber> = [
    {
      title: 'Barbero', key: 'barbero',
      render: (_, r) => (
        <Space>
          <Avatar size={36} style={{ backgroundColor: avatarColor(r.id), flexShrink: 0, fontWeight: 700 }}>
            {getInitials(r.user.fullName)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{r.user.fullName}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.user.email}</Text>
          </div>
        </Space>
      ),
    },
    { title: 'Teléfono', key: 'phone', width: 140,
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
    {
      title: 'Horario', key: 'schedule',
      render: (_, r) => (
        <Tooltip title={r.scheduleText || 'Sin horario definido'}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.scheduleText ? (r.scheduleText.length > 45 ? r.scheduleText.slice(0, 45) + '…' : r.scheduleText) : '—'}
          </Text>
        </Tooltip>
      ),
    },
    { title: 'Estado', key: 'active', width: 100,
      render: (_, r) => <Tag color={r.active ? 'success' : 'default'}>{r.active ? 'Activo' : 'Inactivo'}</Tag> },
    {
      title: 'Acciones', key: 'actions', width: 80, fixed: 'right',
      render: (_, record) => (
        <Tooltip title="Editar perfil">
          <Button size="small" type="primary" ghost icon={<EditOutlined />} onClick={() => openEdit(record)} />
        </Tooltip>
      ),
    },
  ];

  // ── Columnas tabla cargos ──────────────────────────────
  const colsCargos: ColumnsType<CargoItem> = [
    { title: 'Nombre', dataIndex: 'nombre',
      render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Descripción', dataIndex: 'descripcion',
      render: (v: string | null) => v ? <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text> },
    { title: 'Estado', dataIndex: 'activo', width: 100,
      render: (v: boolean, r) => (
        <Switch
          size="small"
          checked={v}
          checkedChildren="Activo"
          unCheckedChildren="Inactivo"
          onChange={() => toggleActivoCargo(r)}
          style={{ background: v ? primary : undefined }}
        />
      ),
    },
    {
      title: 'Acciones', key: 'actions', width: 100,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditCargo(r)} />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => confirmDeleteCargo(r)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const activeCount    = barbers.filter(b => b.active).length;
  const allSpecialties = [...new Set(barbers.flatMap(b => b.specialties))].length;

  return (
    <>
      {/* ── KPIs ─────────────────────────────────────── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={8}>
          <Card size="small">
            <Statistic title="Total Barberos" value={barbers.length}
              prefix={<UserOutlined style={{ color: primary }} />} />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card size="small">
            <Statistic title="Activos" value={activeCount}
              prefix={<CheckCircleOutlined style={{ color: C.colorSuccess }} />} />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card size="small">
            <Statistic title="Especialidades" value={allSpecialties}
              prefix={<ScissorOutlined style={{ color: '#722ed1' }} />} />
          </Card>
        </Col>
      </Row>

      {/* ── Tabs: Barberos | Cargos ──────────────────── */}
      <Card>
        <Tabs items={[
          {
            key:   'barberos',
            label: <span><UserOutlined /> Barberos</span>,
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />}
                    onClick={() => {
                      setForm({ fullName: '', email: '', password: '', phone: '', bio: '', cargo: '', specialtiesInput: '' });
                      setCreateError(''); setShowPass(false); setCreating(true);
                    }}>
                    Nuevo barbero
                  </Button>
                </div>
                <Table
                  dataSource={barbers} columns={columns} rowKey="id" size="small" scroll={{ x: 700 }}
                  pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20'],
                    showTotal: (t, r) => `${r[0]}–${r[1]} de ${t} barberos` }}
                  locale={{ emptyText: (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                      <ClockCircleOutlined style={{ fontSize: 32, color: C.textDisabled }} />
                      <div style={{ marginTop: 8, color: C.textMuted }}>
                        No hay barberos registrados. Usa &quot;+ Nuevo barbero&quot;.
                      </div>
                    </div>
                  )}}
                />
              </>
            ),
          },
          {
            key:   'cargos',
            label: <span><TagsOutlined /> Cargos</span>,
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Define los puestos de trabajo de tu equipo. Se usan al crear barberos y en constancias laborales.
                  </Text>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openNuevoCargo}>
                    Nuevo cargo
                  </Button>
                </div>
                <Table
                  dataSource={cargos} columns={colsCargos} rowKey="id" size="small"
                  loading={cargosLoading}
                  pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}–${r[1]} de ${t} cargos` }}
                  locale={{ emptyText: (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                      <TagsOutlined style={{ fontSize: 32, color: C.textDisabled }} />
                      <div style={{ marginTop: 8, color: C.textMuted }}>
                        No hay cargos definidos. Crea el primero con &quot;+ Nuevo cargo&quot;.
                      </div>
                    </div>
                  )}}
                />
              </>
            ),
          },
        ]} />
      </Card>

      {/* ── Modal CREAR barbero ───────────────────────── */}
      <Dialog open={creating} onOpenChange={v => { if (!v) setCreating(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo barbero</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
            <FormField label="Nombre completo *">
              <SdInput value={form.fullName} onChange={e => setField('fullName', e.target.value)} placeholder="Carlos López" autoFocus />
            </FormField>
            <FormField label="Email *">
              <SdInput type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="carlos@barberia.com" />
            </FormField>
            <FormField label="Contraseña *">
              <div style={{ position: 'relative' }}>
                <SdInput
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setField('password', e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  style={{ paddingRight: 40 }}
                />
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
              <Select
                style={{ width: '100%' }}
                placeholder="Selecciona un cargo…"
                showSearch
                allowClear
                value={form.cargo || undefined}
                onChange={v => setField('cargo', v ?? '')}
                options={cargoOptions}
                notFoundContent={<span style={{ fontSize: 12 }}>Sin cargos — créalos en la pestaña &quot;Cargos&quot;</span>}
              />
            </FormField>
            <FormField label="Biografía">
              <SdInput value={form.bio} onChange={e => setField('bio', e.target.value)} placeholder="Especialista en fades…" />
            </FormField>
            <FormField label="Especialidades (separadas por coma)">
              <SdInput value={form.specialtiesInput} onChange={e => setField('specialtiesInput', e.target.value)} placeholder="Fade, Barba, Diseño" />
            </FormField>
            {createError && <p style={{ color: 'hsl(var(--status-error))', fontSize: 13, margin: 0 }}>{createError}</p>}
          </div>
          <DialogFooter>
            <SdButton variant="outline" onClick={() => setCreating(false)}>Cancelar</SdButton>
            <SdButton onClick={handleCreate} disabled={createLoading}>{createLoading ? 'Creando...' : 'Crear barbero'}</SdButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal EDITAR barbero ──────────────────────── */}
      <Dialog open={!!editing} onOpenChange={v => { if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar perfil — {editing?.user.fullName}</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
            <FormField label="Cargo / Puesto">
              <Select
                style={{ width: '100%' }}
                placeholder="Selecciona un cargo…"
                showSearch
                allowClear
                value={cargo || undefined}
                onChange={v => setCargo(v ?? '')}
                options={cargoOptions}
                notFoundContent={<span style={{ fontSize: 12 }}>Sin cargos — créalos en la pestaña &quot;Cargos&quot;</span>}
              />
            </FormField>
            <FormField label="Biografía">
              <SdInput value={bio} onChange={e => setBio(e.target.value)} placeholder="Descripción del barbero…" />
            </FormField>
            <FormField label="Especialidades (separadas por coma)">
              <SdInput value={specialtiesInput} onChange={e => setSpecialtiesInput(e.target.value)} placeholder="Fade, Barba, Diseño…" />
            </FormField>
          </div>
          <DialogFooter>
            <SdButton variant="outline" onClick={() => setEditing(null)}>Cancelar</SdButton>
            <SdButton onClick={saveEdit} disabled={editLoading}>{editLoading ? 'Guardando...' : 'Guardar cambios'}</SdButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal CREAR / EDITAR cargo ────────────────── */}
      <Modal
        open={!!modalCargo}
        title={modalCargo === 'new' ? <span><TagsOutlined /> Nuevo cargo</span> : <span><EditOutlined /> Editar cargo</span>}
        onCancel={() => setModalCargo(null)}
        onOk={saveCargo}
        okText={modalCargo === 'new' ? 'Crear cargo' : 'Guardar cambios'}
        confirmLoading={cargoSaving}
        okButtonProps={{ style: { background: primary, borderColor: primary } }}
        width="min(420px, 96vw)"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Nombre del cargo *</div>
            <Input
              value={cargoNombre}
              onChange={e => setCargoNombre(e.target.value)}
              placeholder="Ej: Barbero, Estilista, Cajero, Supervisor…"
              autoFocus
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Descripción (opcional)</div>
            <TextArea
              value={cargoDesc}
              onChange={e => setCargoDesc(e.target.value)}
              placeholder="Descripción breve del cargo…"
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
