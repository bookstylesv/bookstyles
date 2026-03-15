'use client';

// ══════════════════════════════════════════════════════════
// BARBEROS — CRUD COMPLETO (patrón Speeddansys ERP)
// ══════════════════════════════════════════════════════════

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Table, Card, Button, Space, Row, Col,
  Statistic, Tag, Tooltip, Typography, Avatar,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, UserOutlined,
  CheckCircleOutlined, ScissorOutlined, ClockCircleOutlined,
} from '@ant-design/icons';

// Componentes internos del formulario
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button as SdButton }  from '@/components/ui/button';
import { Input as SdInput }    from '@/components/ui/input';
import { FormField }           from '@/components/shared/FormField';
import { Eye, EyeSlash }       from '@phosphor-icons/react';

const { Title, Text } = Typography;

// ── Tipos ──────────────────────────────────────────────────────────────────
type Schedule   = { dayOfWeek: number; startTime: string; endTime: string; active: boolean };
type BarberUser = { id: number; fullName: string; email: string; phone: string | null; avatarUrl: string | null; active: boolean };
type Barber = {
  id: number; bio: string | null; specialties: string[]; active: boolean;
  scheduleText: string; user: BarberUser; schedules: Schedule[];
};
type CreateForm = { fullName: string; email: string; password: string; phone: string; bio: string; specialtiesInput: string };

// Iniciales para el Avatar de antd
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// Color de fondo del Avatar según índice (variedad visual)
const AVATAR_COLORS = ['#0d9488', '#7c3aed', '#0284c7', '#b45309', '#be123c', '#065f46'];
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }

// ── Componente principal ───────────────────────────────────────────────────
export default function BarbersClient({ initialBarbers }: { initialBarbers: Barber[] }) {
  const [barbers, setBarbers] = useState<Barber[]>(initialBarbers);

  // Estado crear
  const [creating,      setCreating]      = useState(false);
  const [showPass,      setShowPass]      = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError,   setCreateError]   = useState('');
  const [form, setForm] = useState<CreateForm>({ fullName: '', email: '', password: '', phone: '', bio: '', specialtiesInput: '' });

  // Estado editar
  const [editing,          setEditing]          = useState<Barber | null>(null);
  const [bio,              setBio]              = useState('');
  const [specialtiesInput, setSpecialtiesInput] = useState('');
  const [editLoading,      setEditLoading]      = useState(false);

  function setField(field: keyof CreateForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // ── Crear ──────────────────────────────────────────────
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
          fullName:   form.fullName.trim(),
          email:      form.email.trim().toLowerCase(),
          password:   form.password,
          phone:      form.phone.trim()  || undefined,
          bio:        form.bio.trim()    || undefined,
          specialties,
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

  // ── Editar ─────────────────────────────────────────────
  function openEdit(b: Barber) {
    setEditing(b); setBio(b.bio ?? ''); setSpecialtiesInput(b.specialties.join(', '));
  }

  async function saveEdit() {
    if (!editing) return;
    setEditLoading(true);
    try {
      const specialties = specialtiesInput.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch(`/api/barbers/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, specialties }),
      });
      const json = await res.json();
      if (res.ok) {
        setBarbers(prev => prev.map(b => b.id === editing.id ? { ...b, ...json.data } : b));
        setEditing(null); toast.success('Perfil actualizado');
      } else { toast.error(json.error?.message ?? 'Error al guardar'); }
    } catch { toast.error('Error de red'); } finally { setEditLoading(false); }
  }

  // ── Columnas de la tabla (patrón Speeddansys) ──────────
  const columns: ColumnsType<Barber> = [
    {
      title:  'Barbero',
      key:    'barbero',
      render: (_, r) => (
        <Space>
          <Avatar
            size={36}
            style={{ backgroundColor: avatarColor(r.id), flexShrink: 0, fontWeight: 700 }}
          >
            {getInitials(r.user.fullName)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{r.user.fullName}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.user.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title:     'Teléfono',
      key:       'phone',
      width:     140,
      render:    (_, r) => r.user.phone
        ? <Text style={{ fontSize: 12 }}>{r.user.phone}</Text>
        : <Text type="secondary">—</Text>,
    },
    {
      title:  'Especialidades',
      key:    'specialties',
      render: (_, r) => r.specialties.length === 0
        ? <Text type="secondary">—</Text>
        : (
          <Space size={2} wrap>
            {r.specialties.slice(0, 3).map(sp => (
              <Tag key={sp} style={{ fontSize: 11 }}>{sp}</Tag>
            ))}
            {r.specialties.length > 3 && (
              <Tooltip title={r.specialties.slice(3).join(', ')}>
                <Tag style={{ fontSize: 11 }}>+{r.specialties.length - 3}</Tag>
              </Tooltip>
            )}
          </Space>
        ),
    },
    {
      title:  'Horario',
      key:    'schedule',
      render: (_, r) => (
        <Tooltip title={r.scheduleText || 'Sin horario definido'}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.scheduleText
              ? (r.scheduleText.length > 45 ? r.scheduleText.slice(0, 45) + '…' : r.scheduleText)
              : '—'}
          </Text>
        </Tooltip>
      ),
    },
    {
      title:  'Estado',
      key:    'active',
      width:  100,
      render: (_, r) => (
        <Tag color={r.active ? 'success' : 'default'}>
          {r.active ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
    {
      title:  'Acciones',
      key:    'actions',
      width:  80,
      fixed:  'right',
      render: (_, record) => (
        <Tooltip title="Editar perfil">
          <Button
            size="small"
            type="primary"
            ghost
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          />
        </Tooltip>
      ),
    },
  ];

  // ── KPIs ───────────────────────────────────────────────
  const activeCount      = barbers.filter(b => b.active).length;
  const allSpecialties   = [...new Set(barbers.flatMap(b => b.specialties))].length;

  return (
    <>
      {/* ── Estadísticas rápidas ─────────────────────── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={8}>
          <Card size="small">
            <Statistic
              title="Total Barberos"
              value={barbers.length}
              prefix={<UserOutlined style={{ color: '#0d9488' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card size="small">
            <Statistic
              title="Activos"
              value={activeCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card size="small">
            <Statistic
              title="Especialidades"
              value={allSpecialties}
              prefix={<ScissorOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Tabla principal ───────────────────────────── */}
      <Card
        title={<Title level={5} style={{ margin: 0 }}>Barberos</Title>}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setForm({ fullName: '', email: '', password: '', phone: '', bio: '', specialtiesInput: '' });
              setCreateError(''); setShowPass(false); setCreating(true);
            }}
          >
            Nuevo barbero
          </Button>
        }
      >
        <Table
          dataSource={barbers}
          columns={columns}
          rowKey="id"
          size="small"
          scroll={{ x: 700 }}
          pagination={{
            pageSize:        10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20'],
            showTotal:       (t, range) => `${range[0]}–${range[1]} de ${t} barberos`,
          }}
          locale={{
            emptyText: (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <ClockCircleOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
                <div style={{ marginTop: 8, color: '#8c8c8c' }}>
                  No hay barberos registrados. Usa &quot;+ Nuevo barbero&quot;.
                </div>
              </div>
            ),
          }}
        />
      </Card>

      {/* ── Modal CREAR ──────────────────────────────── */}
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
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', padding: 0, display: 'flex' }}
                >
                  {showPass ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </FormField>
            <FormField label="Teléfono">
              <SdInput value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+503 7000-0000" />
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

      {/* ── Modal EDITAR ─────────────────────────────── */}
      <Dialog open={!!editing} onOpenChange={v => { if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar perfil — {editing?.user.fullName}</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
            <FormField label="Biografía">
              <SdInput value={bio} onChange={e => setBio(e.target.value)} placeholder="Descripción del barbero…" autoFocus />
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
    </>
  );
}
