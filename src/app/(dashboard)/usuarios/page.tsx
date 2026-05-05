'use client';

// ══════════════════════════════════════════════════════════
// USUARIOS Y ROLES — Solo accesible para SUPERADMIN
// ══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Table, Card, Button, Space, Row, Col, Input, Tag, Tooltip,
  Typography, Avatar, Select, Switch, Modal, Statistic, Checkbox,
  theme, Divider, Drawer, Form,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, SearchOutlined, UserOutlined, CheckCircleOutlined,
  EditOutlined, TeamOutlined, SafetyCertificateOutlined,
  KeyOutlined, SettingOutlined, ShopOutlined, BranchesOutlined,
} from '@ant-design/icons';
import { useBarberTheme } from '@/context/ThemeContext';
import { MODULE_KEYS, MODULE_LABELS } from '@/lib/module-guard';
import type { ModuleKey } from '@/lib/module-guard';

const { Text } = Typography;

// ── Tipos ────────────────────────────────────────────────────────────────────

type ErpRole = 'OWNER' | 'SUPERADMIN' | 'GERENTE' | 'USERS';

type BranchOption = { id: number; name: string; slug: string };

type StaffUser = {
  id:           number;
  fullName:     string;
  email:        string;
  phone:        string | null;
  role:         ErpRole;
  moduleAccess: string[] | null;
  active:       boolean;
  createdAt:    string;
  avatarUrl:    string | null;
  branchId:     number | null;
  branch:       BranchOption | null;
};

type CreateForm = {
  fullName:     string;
  email:        string;
  phone:        string;
  role:         ErpRole;
  moduleAccess: string[];
  branchId:     number | null;
};

type EditForm = {
  fullName:     string;
  email:        string;
  phone:        string;
  role:         ErpRole;
  moduleAccess: string[];
  branchId:     number | null;
  active:       boolean;
};

// ── Constantes ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<ErpRole, string> = {
  OWNER:      'Propietario',
  SUPERADMIN: 'Super Admin',
  GERENTE:    'Gerente',
  USERS:      'Usuario',
};

const ROLE_COLORS: Record<ErpRole, string> = {
  OWNER:      'gold',
  SUPERADMIN: 'red',
  GERENTE:    'blue',
  USERS:      'cyan',
};

const ROLE_DESCRIPTIONS: Record<ErpRole, string> = {
  OWNER:      'Solo dashboard y reportes — vista ejecutiva',
  SUPERADMIN: 'Acceso según plan contratado + gestión de usuarios',
  GERENTE:    'Módulos asignados + acceso limitado a su sucursal',
  USERS:      'Solo los módulos asignados mediante checkboxes',
};

const ASSIGNABLE_ROLES: { value: ErpRole; label: string }[] = [
  { value: 'GERENTE', label: 'Gerente' },
  { value: 'USERS',   label: 'Usuario' },
];

const AVATAR_COLORS = ['#0d9488', '#7c3aed', '#0284c7', '#b45309', '#be123c', '#065f46'];
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }
function getInitials(name: string) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(); }

// ── Selector de módulos ───────────────────────────────────────────────────────

function ModuleSelector({ value, availableModules, onChange }: {
  value:            string[];
  availableModules: ModuleKey[];
  onChange:         (v: string[]) => void;
}) {
  const toggle    = (key: ModuleKey) =>
    onChange(value.includes(key) ? value.filter(k => k !== key) : [...value, key]);
  const allSelected = availableModules.length > 0 && availableModules.every(k => value.includes(k));
  const toggleAll   = () => onChange(allSelected ? [] : [...availableModules]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: 600 }}>
          Módulos con acceso ({value.filter(m => availableModules.includes(m as ModuleKey)).length}/{availableModules.length})
        </Text>
        <Button size="small" type="link" onClick={toggleAll} style={{ padding: 0, fontSize: 12 }}>
          {allSelected ? 'Quitar todos' : 'Seleccionar todos'}
        </Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
        {availableModules.map(key => (
          <Checkbox key={key} checked={value.includes(key)} onChange={() => toggle(key)} style={{ fontSize: 13 }}>
            {MODULE_LABELS[key]}
          </Checkbox>
        ))}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function UsuariosPage() {
  const { theme: barberTheme } = useBarberTheme();
  const { token }              = theme.useToken();
  const primary                = barberTheme.colorPrimary;

  const [usuarios,          setUsuarios]          = useState<StaffUser[]>([]);
  const [branches,          setBranches]          = useState<BranchOption[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [search,            setSearch]            = useState('');
  const [showCreate,        setShowCreate]        = useState(false);
  const [saving,            setSaving]            = useState(false);
  const [tempPassword,      setTempPassword]      = useState<{ name: string; pwd: string } | null>(null);
  const [availableModules,  setAvailableModules]  = useState<ModuleKey[]>([...MODULE_KEYS]);

  // Estado drawer edición
  const [editingUser,   setEditingUser]   = useState<StaffUser | null>(null);
  const [editDrawer,    setEditDrawer]    = useState(false);
  const [editSaving,    setEditSaving]    = useState(false);
  const [editForm,      setEditForm]      = useState<EditForm>({
    fullName: '', email: '', phone: '', role: 'GERENTE', moduleAccess: [], branchId: null, active: true,
  });

  const [createForm, setCreateForm] = useState<CreateForm>({
    fullName: '', email: '', phone: '', role: 'GERENTE', moduleAccess: [], branchId: null,
  });

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/usuarios');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const payload = data.data ?? data;
      if (Array.isArray(payload)) {
        setUsuarios(payload);
      } else {
        setUsuarios(payload.users ?? []);
        setAvailableModules(
          (payload.availableModules ?? []).filter((m: string): m is ModuleKey =>
            (MODULE_KEYS as readonly string[]).includes(m),
          ),
        );
      }
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      const res  = await fetch('/api/branches');
      const data = await res.json();
      const list = (data.data ?? data) as { id: number; name: string; slug: string; status: string }[];
      setBranches(
        Array.isArray(list)
          ? list.filter(b => b.status === 'ACTIVE').map(b => ({ id: b.id, name: b.name, slug: b.slug }))
          : [],
      );
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    fetchUsuarios();
    fetchBranches();
  }, [fetchUsuarios, fetchBranches]);

  // ── Crear ─────────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!createForm.fullName.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (!createForm.email.trim())    { toast.error('El email es obligatorio'); return; }
    if ((createForm.role === 'GERENTE' || createForm.role === 'USERS') && !createForm.branchId) {
      toast.error('Debes asignar una sucursal'); return;
    }
    setSaving(true);
    try {
      const res  = await fetch('/api/usuarios', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          fullName:     createForm.fullName,
          email:        createForm.email,
          phone:        createForm.phone || null,
          role:         createForm.role,
          branchId:     createForm.branchId,
          moduleAccess: createForm.role === 'GERENTE' || createForm.role === 'USERS'
            ? createForm.moduleAccess.filter(m => availableModules.includes(m as ModuleKey))
            : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || 'Error al crear usuario');
      toast.success('Usuario creado');
      setShowCreate(false);
      setCreateForm({ fullName: '', email: '', phone: '', role: 'GERENTE', moduleAccess: [], branchId: null });
      await fetchUsuarios();
      setTempPassword({ name: data.data?.fullName ?? createForm.fullName, pwd: data.data?.tempPassword });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  }

  // ── Editar ────────────────────────────────────────────────────────────────

  function openEdit(u: StaffUser) {
    setEditingUser(u);
    setEditForm({
      fullName:     u.fullName,
      email:        u.email,
      phone:        u.phone ?? '',
      role:         u.role,
      moduleAccess: (u.moduleAccess as string[]) ?? [],
      branchId:     u.branchId,
      active:       u.active,
    });
    setEditDrawer(true);
  }

  async function handleSaveEdit() {
    if (!editingUser) return;
    if (!editForm.fullName.trim()) { toast.error('El nombre es obligatorio'); return; }
    if ((editForm.role === 'GERENTE' || editForm.role === 'USERS') && !editForm.branchId) {
      toast.error('Debes asignar una sucursal'); return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/usuarios/${editingUser.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          fullName:     editForm.fullName,
          email:        editForm.email,
          phone:        editForm.phone || null,
          role:         editForm.role,
          branchId:     editForm.branchId,
          active:       editForm.active,
          moduleAccess: editForm.role === 'GERENTE' || editForm.role === 'USERS'
            ? editForm.moduleAccess.filter(m => availableModules.includes(m as ModuleKey))
            : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || 'Error al guardar');
      toast.success('Usuario actualizado');
      setEditDrawer(false);
      await fetchUsuarios();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setEditSaving(false);
    }
  }

  // ── Toggle activo ─────────────────────────────────────────────────────────

  async function handleToggleActive(id: number, active: boolean) {
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ active }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error?.message || d.error); }
      toast.success(active ? 'Usuario activado' : 'Usuario desactivado');
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, active } : u));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar estado');
    }
  }

  // ── Filtrado ──────────────────────────────────────────────────────────────

  const filtered = usuarios.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const activos     = usuarios.filter(u => u.active).length;
  const superAdmins = usuarios.filter(u => u.role === 'SUPERADMIN').length;
  const gerentes    = usuarios.filter(u => u.role === 'GERENTE').length;

  // ── Columnas ──────────────────────────────────────────────────────────────

  const columns: ColumnsType<StaffUser> = [
    {
      title: 'Usuario',
      key:   'usuario',
      render: (_, u) => (
        <Space>
          <Avatar
            size={36}
            src={u.avatarUrl || undefined}
            style={{ background: avatarColor(u.id), flexShrink: 0 }}
            icon={u.avatarUrl ? <UserOutlined /> : undefined}
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
      title:      'Sucursal',
      key:        'branch',
      responsive: ['md'],
      render: (_, u) => {
        if (u.role === 'OWNER' || u.role === 'SUPERADMIN')
          return <Text type="secondary" style={{ fontSize: 12 }}>Todas</Text>;
        if (!u.branch)
          return <Tag color="warning" style={{ fontSize: 11 }}>Sin asignar</Tag>;
        return (
          <Space size={4}>
            <ShopOutlined style={{ color: token.colorTextSecondary }} />
            <Text style={{ fontSize: 13 }}>{u.branch.name}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Rol',
      key:   'role',
      width: 140,
      render: (_, u) => <Tag color={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Tag>,
    },
    {
      title:      'Módulos',
      key:        'modules',
      responsive: ['lg'],
      render: (_, u) => {
        if (u.role === 'OWNER')
          return <Text type="secondary" style={{ fontSize: 12 }}>Solo dashboard</Text>;
        if (u.role === 'SUPERADMIN')
          return <Tag color="green">Según plan</Tag>;
        if (!u.moduleAccess || u.moduleAccess.length === 0)
          return <Tag color="warning" style={{ fontSize: 11 }}>Sin módulos</Tag>;
        const names = u.moduleAccess
          .map(k => MODULE_LABELS[k as ModuleKey] ?? k)
          .join(', ');
        return (
          <Tooltip title={names} placement="topLeft">
            <Tag color="blue" style={{ cursor: 'default', fontSize: 12 }}>
              {u.moduleAccess.length} módulo{u.moduleAccess.length !== 1 ? 's' : ''}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Estado',
      key:   'active',
      width: 80,
      render: (_, u) =>
        u.role === 'OWNER'
          ? <Tag color="green" icon={<CheckCircleOutlined />}>Activo</Tag>
          : (
            <Tooltip title={u.active ? 'Desactivar' : 'Activar'}>
              <Switch size="small" checked={u.active} onChange={v => handleToggleActive(u.id, v)} />
            </Tooltip>
          ),
    },
    {
      title:      'Desde',
      key:        'createdAt',
      width:      100,
      render:     (_, u) => new Date(u.createdAt).toLocaleDateString('es-SV'),
      responsive: ['xl'],
    },
    {
      title: 'Acciones',
      key:   'actions',
      width: 70,
      render: (_, u) =>
        u.role !== 'OWNER'
          ? (
            <Tooltip title="Editar usuario">
              <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(u)} />
            </Tooltip>
          )
          : null,
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24 }}>
      {/* Encabezado */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Space align="center">
            <SettingOutlined style={{ fontSize: 24, color: primary }} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>Usuarios y Roles</div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Gestión de acceso al sistema — solo visible para Super Admin
              </Text>
            </div>
          </Space>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}
            style={{ background: primary }}>
            Nuevo usuario
          </Button>
        </Col>
      </Row>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          { title: 'Total usuarios', value: usuarios.length, icon: <TeamOutlined />,               color: primary },
          { title: 'Activos',        value: activos,          icon: <CheckCircleOutlined />,         color: '#52c41a' },
          { title: 'Super Admins',   value: superAdmins,      icon: <SafetyCertificateOutlined />,   color: '#f5222d' },
          { title: 'Gerentes',       value: gerentes,         icon: <BranchesOutlined />,            color: '#1890ff' },
        ].map(k => (
          <Col xs={12} sm={6} key={k.title}>
            <Card size="small" style={{ borderRadius: 10, border: 0 }}>
              <Statistic
                title={k.title}
                value={k.value}
                prefix={<span style={{ color: k.color }}>{k.icon}</span>}
                valueStyle={{ fontSize: 26 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Tabla */}
      <Card
        size="small"
        style={{ borderRadius: 10, border: 0 }}
        title={
          <Input
            prefix={<SearchOutlined />}
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 280 }}
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

      {/* ── Modal crear usuario ──────────────────────────────────────── */}
      <Modal
        open={showCreate}
        onCancel={() => { setShowCreate(false); setCreateForm({ fullName: '', email: '', phone: '', role: 'GERENTE', moduleAccess: [], branchId: null }); }}
        onOk={handleCreate}
        confirmLoading={saving}
        okText="Crear usuario"
        cancelText="Cancelar"
        title={<Space><PlusOutlined />Nuevo usuario</Space>}
        width={520}
      >
        <Form layout="vertical" style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Nombre completo" required style={{ marginBottom: 12 }}>
                <Input
                  placeholder="Nombre completo"
                  value={createForm.fullName}
                  onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Email" required style={{ marginBottom: 12 }}>
                <Input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Teléfono" style={{ marginBottom: 12 }}>
                <Input
                  placeholder="7000-0000"
                  value={createForm.phone}
                  onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Rol" required style={{ marginBottom: 12 }}>
                <Select
                  style={{ width: '100%' }}
                  value={createForm.role}
                  onChange={v => setCreateForm(f => ({ ...f, role: v, moduleAccess: [] }))}
                  options={ASSIGNABLE_ROLES.map(r => ({ value: r.value, label: r.label }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Sucursal asignada" required style={{ marginBottom: 12 }}>
            <Select
              style={{ width: '100%' }}
              placeholder="Selecciona una sucursal"
              value={createForm.branchId ?? undefined}
              onChange={v => setCreateForm(f => ({ ...f, branchId: v }))}
              allowClear
              options={branches.map(b => ({ value: b.id, label: b.name }))}
            />
            <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 4 }}>
              {ROLE_DESCRIPTIONS[createForm.role]}
            </div>
          </Form.Item>

          {(createForm.role === 'GERENTE' || createForm.role === 'USERS') && (
            <>
              <Divider style={{ margin: '8px 0' }} />
              <ModuleSelector
                value={createForm.moduleAccess}
                availableModules={availableModules}
                onChange={v => setCreateForm(f => ({ ...f, moduleAccess: v }))}
              />
            </>
          )}

          <div style={{
            background: token.colorFillSecondary, borderRadius: 8,
            padding: '10px 14px', fontSize: 13, color: token.colorTextSecondary, marginTop: 12,
          }}>
            Se generará una contraseña temporal que se mostrará al crear el usuario.
          </div>
        </Form>
      </Modal>

      {/* ── Drawer editar usuario ────────────────────────────────────── */}
      <Drawer
        title={
          <Space>
            <EditOutlined />
            {editingUser ? `Editar: ${editingUser.fullName}` : 'Editar usuario'}
          </Space>
        }
        open={editDrawer}
        onClose={() => setEditDrawer(false)}
        width={460}
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setEditDrawer(false)}>Cancelar</Button>
            <Button
              type="primary"
              loading={editSaving}
              onClick={handleSaveEdit}
              style={{ background: primary }}
            >
              Guardar cambios
            </Button>
          </Space>
        }
      >
        {editingUser && (
          <Form layout="vertical">
            <Form.Item label="Nombre completo" required>
              <Input
                value={editForm.fullName}
                onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
              />
            </Form.Item>

            <Form.Item label="Email" required>
              <Input
                type="email"
                value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
              />
            </Form.Item>

            <Form.Item label="Teléfono">
              <Input
                placeholder="7000-0000"
                value={editForm.phone}
                onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
              />
            </Form.Item>

            <Form.Item label="Rol" required>
              <Select
                style={{ width: '100%' }}
                value={editForm.role}
                onChange={v => setEditForm(f => ({ ...f, role: v, moduleAccess: [] }))}
                options={ASSIGNABLE_ROLES.map(r => ({ value: r.value, label: r.label }))}
              />
              <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 4 }}>
                {ROLE_DESCRIPTIONS[editForm.role]}
              </div>
            </Form.Item>

            <Form.Item label="Sucursal asignada" required>
              <Select
                style={{ width: '100%' }}
                placeholder="Selecciona una sucursal"
                value={editForm.branchId ?? undefined}
                onChange={v => setEditForm(f => ({ ...f, branchId: v ?? null }))}
                allowClear
                options={branches.map(b => ({ value: b.id, label: b.name }))}
              />
            </Form.Item>

            <Form.Item label="Estado">
              <Space>
                <Switch
                  checked={editForm.active}
                  onChange={v => setEditForm(f => ({ ...f, active: v }))}
                />
                <Text style={{ fontSize: 13 }}>{editForm.active ? 'Activo' : 'Inactivo'}</Text>
              </Space>
            </Form.Item>

            {(editForm.role === 'GERENTE' || editForm.role === 'USERS') && (
              <>
                <Divider style={{ margin: '8px 0' }} />
                <ModuleSelector
                  value={editForm.moduleAccess}
                  availableModules={availableModules}
                  onChange={v => setEditForm(f => ({ ...f, moduleAccess: v }))}
                />
              </>
            )}
          </Form>
        )}
      </Drawer>

      {/* ── Modal contraseña temporal ────────────────────────────────── */}
      <Modal
        open={!!tempPassword}
        onCancel={() => setTempPassword(null)}
        footer={<Button type="primary" onClick={() => setTempPassword(null)}>Entendido</Button>}
        title={<Space><KeyOutlined />Contraseña temporal generada</Space>}
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
