'use client';

// ══════════════════════════════════════════════════════════
// USUARIOS Y ROLES — gestión de acceso del equipo
// ══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Table, Card, Button, Space, Row, Col, Input, Tag, Tooltip,
  Typography, Avatar, Select, Switch, Modal, Statistic, theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, SearchOutlined, UserOutlined,
  CheckCircleOutlined, StopOutlined,
} from '@ant-design/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button as SdButton } from '@/components/ui/button';
import { FormField } from '@/components/shared/FormField';
import { Input as SdInput } from '@/components/ui/input';
import { Key, UserGear, ShieldCheck, Users } from '@phosphor-icons/react';
import { useBarberTheme } from '@/context/ThemeContext';

const { Title, Text } = Typography;

// ── Tipos ───────────────────────────────────────────────────────────────────
type BarberUserRole = 'OWNER' | 'ADMIN' | 'GERENTE' | 'IT' | 'BARBER';

type StaffUser = {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: BarberUserRole;
  active: boolean;
  createdAt: string;
  avatarUrl: string | null;
  barberProfile: { id: number; cargo: string | null } | null;
};

type CreateForm = {
  fullName: string;
  email: string;
  phone: string;
  role: BarberUserRole;
};

// ── Constantes ──────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<BarberUserRole, string> = {
  OWNER:   'Propietario',
  ADMIN:   'Administrador',
  GERENTE: 'Gerente',
  IT:      'IT / Soporte',
  BARBER:  'Barbero',
};

const ROLE_COLORS: Record<BarberUserRole, string> = {
  OWNER:   'gold',
  ADMIN:   'red',
  GERENTE: 'blue',
  IT:      'purple',
  BARBER:  'cyan',
};

const ASSIGNABLE_ROLES: { value: BarberUserRole; label: string }[] = [
  { value: 'ADMIN',   label: 'Administrador' },
  { value: 'GERENTE', label: 'Gerente' },
  { value: 'IT',      label: 'IT / Soporte' },
  { value: 'BARBER',  label: 'Barbero' },
];

const AVATAR_COLORS = ['#0d9488', '#7c3aed', '#0284c7', '#b45309', '#be123c', '#065f46'];
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }
function getInitials(name: string) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(); }

// ── Componente principal ─────────────────────────────────────────────────────
export default function UsuariosPage() {
  const { theme: barberTheme } = useBarberTheme();
  const { token } = theme.useToken();
  const primary = barberTheme.colorPrimary;

  const [usuarios, setUsuarios]       = useState<StaffUser[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [showCreate, setShowCreate]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [tempPassword, setTempPassword] = useState<{ name: string; pwd: string } | null>(null);

  const [form, setForm] = useState<CreateForm>({
    fullName: '', email: '', phone: '', role: 'BARBER',
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/usuarios');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsuarios(data.data ?? data);
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  // ── Crear usuario ──────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!form.fullName.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (!form.email.trim())    { toast.error('El email es obligatorio'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear usuario');
      toast.success('Usuario creado');
      setShowCreate(false);
      setForm({ fullName: '', email: '', phone: '', role: 'BARBER' });
      await fetchUsuarios();
      setTempPassword({ name: data.data?.fullName ?? form.fullName, pwd: data.data?.tempPassword });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  }

  // ── Cambiar rol ────────────────────────────────────────────────────────────
  async function handleRoleChange(id: number, role: BarberUserRole) {
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Rol actualizado');
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar rol');
    }
  }

  // ── Toggle activo ──────────────────────────────────────────────────────────
  async function handleToggleActive(id: number, active: boolean) {
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(active ? 'Usuario activado' : 'Usuario desactivado');
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, active } : u));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar estado');
    }
  }

  // ── Filtrado ───────────────────────────────────────────────────────────────
  const filtered = usuarios.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const activos   = usuarios.filter(u => u.active).length;
  const admins    = usuarios.filter(u => ['OWNER','ADMIN'].includes(u.role)).length;
  const barberos  = usuarios.filter(u => u.role === 'BARBER').length;

  // ── Columnas ───────────────────────────────────────────────────────────────
  const columns: ColumnsType<StaffUser> = [
    {
      title: 'Usuario',
      key: 'usuario',
      render: (_, u) => (
        <Space>
          <Avatar
            size={36}
            src={u.avatarUrl || undefined}
            style={{ background: avatarColor(u.id), flexShrink: 0 }}
            icon={!u.avatarUrl ? undefined : <UserOutlined />}
          >
            {!u.avatarUrl && getInitials(u.fullName)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{u.fullName}</div>
            <div style={{ fontSize: 12, color: token.colorTextSecondary }}>{u.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Teléfono',
      dataIndex: 'phone',
      key: 'phone',
      render: v => v || <Text type="secondary">—</Text>,
      responsive: ['md'],
    },
    {
      title: 'Perfil',
      key: 'perfil',
      render: (_, u) => u.barberProfile?.cargo
        ? <Tag>{u.barberProfile.cargo}</Tag>
        : <Text type="secondary" style={{ fontSize: 12 }}>Sin perfil</Text>,
      responsive: ['lg'],
    },
    {
      title: 'Rol',
      key: 'role',
      width: 180,
      render: (_, u) => (
        u.role === 'OWNER'
          ? <Tag color="gold">Propietario</Tag>
          : (
            <Select
              size="small"
              value={u.role}
              style={{ width: 150 }}
              options={ASSIGNABLE_ROLES}
              onChange={role => handleRoleChange(u.id, role)}
            />
          )
      ),
    },
    {
      title: 'Estado',
      key: 'active',
      width: 90,
      render: (_, u) => (
        u.role === 'OWNER'
          ? <Tag color="green" icon={<CheckCircleOutlined />}>Activo</Tag>
          : (
            <Tooltip title={u.active ? 'Desactivar acceso' : 'Activar acceso'}>
              <Switch
                size="small"
                checked={u.active}
                onChange={v => handleToggleActive(u.id, v)}
              />
            </Tooltip>
          )
      ),
    },
    {
      title: 'Desde',
      key: 'createdAt',
      width: 110,
      render: (_, u) => new Date(u.createdAt).toLocaleDateString('es-SV'),
      responsive: ['xl'],
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Encabezado */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Space align="center">
            <UserGear size={28} weight="duotone" color={primary} />
            <Title level={3} style={{ margin: 0 }}>Usuarios y Roles</Title>
          </Space>
          <Text type="secondary" style={{ display: 'block', marginTop: 2 }}>
            Gestión de acceso del equipo
          </Text>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>
            Nuevo usuario
          </Button>
        </Col>
      </Row>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          { title: 'Total usuarios', value: usuarios.length, icon: <Users size={22} />, color: primary },
          { title: 'Activos',        value: activos,          icon: <CheckCircleOutlined />, color: '#52c41a' },
          { title: 'Administración', value: admins,           icon: <ShieldCheck size={22} />, color: '#faad14' },
          { title: 'Barberos',       value: barberos,         icon: <UserOutlined />, color: '#1890ff' },
        ].map(k => (
          <Col xs={12} sm={6} key={k.title}>
            <Card size="small" style={{ borderRadius: 10 }}>
              <Statistic
                title={k.title}
                value={k.value}
                prefix={<span style={{ color: k.color }}>{k.icon}</span>}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Tabla */}
      <Card
        size="small"
        style={{ borderRadius: 10 }}
        title={
          <Input
            prefix={<SearchOutlined />}
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
        }
      >
        <Table
          size="small"
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: false, hideOnSinglePage: true }}
          rowClassName={r => !r.active ? 'opacity-50' : ''}
        />
      </Card>

      {/* Modal crear usuario */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
            <FormField label="Nombre completo" required>
              <SdInput
                placeholder="Nombre completo"
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              />
            </FormField>

            <FormField label="Email" required>
              <SdInput
                type="email"
                placeholder="correo@ejemplo.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </FormField>

            <FormField label="Teléfono">
              <SdInput
                placeholder="+503 7000-0000"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </FormField>

            <FormField label="Rol" required>
              <Select
                style={{ width: '100%' }}
                value={form.role}
                options={ASSIGNABLE_ROLES}
                onChange={v => setForm(f => ({ ...f, role: v }))}
              />
            </FormField>

            <div style={{
              background: token.colorFillSecondary,
              borderRadius: 8, padding: '10px 14px', fontSize: 13,
              color: token.colorTextSecondary,
            }}>
              Se generará una contraseña temporal que se mostrará al crear el usuario.
            </div>
          </div>

          <DialogFooter style={{ marginTop: 16 }}>
            <SdButton variant="outline" onClick={() => setShowCreate(false)}>Cancelar</SdButton>
            <SdButton onClick={handleCreate} disabled={saving}>
              {saving ? 'Creando…' : 'Crear usuario'}
            </SdButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal contraseña temporal */}
      <Modal
        open={!!tempPassword}
        onCancel={() => setTempPassword(null)}
        footer={
          <Button type="primary" onClick={() => setTempPassword(null)}>Entendido</Button>
        }
        title={
          <Space>
            <Key size={18} weight="duotone" color={primary} />
            Contraseña temporal generada
          </Space>
        }
      >
        {tempPassword && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <Text>El usuario <strong>{tempPassword.name}</strong> fue creado con la contraseña temporal:</Text>
            <div style={{
              fontFamily: 'monospace', fontSize: 22, fontWeight: 700,
              letterSpacing: 3, margin: '16px 0',
              background: token.colorFillSecondary, padding: '12px 24px',
              borderRadius: 8, color: primary,
            }}>
              {tempPassword.pwd}
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Compártela con el usuario. Deberá cambiarla en su primer ingreso.
            </Text>
          </div>
        )}
      </Modal>
    </div>
  );
}
