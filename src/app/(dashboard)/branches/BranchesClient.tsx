'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Table, Card, Button, Space, Row, Col, Statistic,
  Tag, Tooltip, Popconfirm, Drawer, Form, Input,
  Typography, Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, ReloadOutlined, EditOutlined,
  DeleteOutlined, BankOutlined, HomeOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { useBarberTheme } from '@/context/ThemeContext';

const { Text } = Typography;

// ── Tipos ────────────────────────────────────────────────────────────────────

type Branch = {
  id: number;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  isHeadquarters: boolean;
  _count: { appointments: number; ventas: number; barberAssignments: number };
};

type FormValues = {
  name: string;
  address: string;
  phone: string;
  email: string;
  city: string;
};

// ── Componente ───────────────────────────────────────────────────────────────

export default function BranchesClient({
  initialBranches,
  maxBranches,
  currentBranchId,
}: {
  initialBranches: Branch[];
  maxBranches: number;
  currentBranchId: number | null;
}) {
  const { theme } = useBarberTheme();
  const primary = theme.colorPrimary;

  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();

  const activeBranches = branches.filter(b => b.status === 'ACTIVE').length;
  const canCreate = activeBranches < maxBranches;

  // ── Fetch ────────────────────────────────────────────────────────────────

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/branches');
      if (!res.ok) throw new Error('Error al cargar');
      setBranches(await res.json());
    } catch {
      toast.error('Error al recargar sucursales');
    } finally {
      setLoading(false);
    }
  }

  // ── Drawer ───────────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    reset({ name: '', address: '', phone: '', email: '', city: '' });
    setDrawerOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    reset({
      name: branch.name,
      address: branch.address ?? '',
      phone: branch.phone ?? '',
      email: branch.email ?? '',
      city: branch.city ?? '',
    });
    setDrawerOpen(true);
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  const onSubmit = handleSubmit(async (data) => {
    setSaving(true);
    try {
      const url = editing ? `/api/branches/${editing.id}` : '/api/branches';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          address: data.address || null,
          phone: data.phone || null,
          email: data.email || null,
          city: data.city || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Error al guardar');
      }

      toast.success(editing ? 'Sucursal actualizada' : 'Sucursal creada');
      setDrawerOpen(false);
      await refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  });

  // ── Delete ───────────────────────────────────────────────────────────────

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'No se pudo eliminar');
      }
      toast.success('Sucursal eliminada');
      await refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  async function handleToggleStatus(branch: Branch) {
    const newStatus = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/branches/${branch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      toast.success(newStatus === 'ACTIVE' ? 'Sucursal activada' : 'Sucursal desactivada');
      await refresh();
    } catch {
      toast.error('Error al cambiar estado');
    }
  }

  // ── Columnas ─────────────────────────────────────────────────────────────

  const columns: ColumnsType<Branch> = [
    {
      title: 'Sucursal',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, row: Branch) => (
        <Space>
          {row.isHeadquarters
            ? <HomeOutlined style={{ color: primary }} />
            : <BankOutlined style={{ color: 'hsl(var(--text-muted))' }} />}
          <span style={{ fontWeight: row.isHeadquarters ? 600 : 400 }}>{name}</span>
          {row.isHeadquarters && <Tag color="green" style={{ fontSize: 11 }}>Principal</Tag>}
          {row.id === currentBranchId && <Tag color="blue" style={{ fontSize: 11 }}>Activa</Tag>}
        </Space>
      ),
    },
    {
      title: 'Ciudad',
      dataIndex: 'city',
      key: 'city',
      render: (city: string | null) =>
        city
          ? <Space size={4}><EnvironmentOutlined /><Text>{city}</Text></Space>
          : <Text type="secondary">—</Text>,
    },
    {
      title: 'Contacto',
      key: 'contact',
      render: (_: unknown, row: Branch) => (
        <Space direction="vertical" size={0} style={{ fontSize: 12 }}>
          {row.phone && <Text>{row.phone}</Text>}
          {row.email && <Text type="secondary">{row.email}</Text>}
          {!row.phone && !row.email && <Text type="secondary">—</Text>}
        </Space>
      ),
    },
    {
      title: 'Barberos',
      key: 'barbers',
      align: 'center',
      render: (_: unknown, row: Branch) => (
        <Badge count={row._count.barberAssignments} showZero color="purple" />
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'default'}>
          {status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      align: 'right',
      render: (_: unknown, row: Branch) => (
        <Space size={4}>
          {!row.isHeadquarters && (
            <Tooltip title={row.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}>
              <Popconfirm
                title={`¿${row.status === 'ACTIVE' ? 'Desactivar' : 'Activar'} "${row.name}"?`}
                onConfirm={() => handleToggleStatus(row)}
                okText="Sí"
                cancelText="No"
              >
                <Button
                  size="small"
                  type="text"
                  style={{ color: row.status === 'ACTIVE' ? 'hsl(var(--text-muted))' : primary }}
                >
                  {row.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                </Button>
              </Popconfirm>
            </Tooltip>
          )}
          <Tooltip title="Editar">
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          </Tooltip>
          {!row.isHeadquarters && (
            <Tooltip title="Eliminar">
              <Popconfirm
                title={`¿Eliminar "${row.name}"?`}
                description="Solo se puede eliminar si no tiene datos asociados."
                onConfirm={() => handleDelete(row.id)}
                okText="Eliminar"
                okButtonProps={{ danger: true }}
                cancelText="Cancelar"
              >
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6}>
          <Card size="small" style={{ borderRadius: 10, border: 0 }}>
            <Statistic
              title="Sucursales activas"
              value={activeBranches}
              suffix={`/ ${maxBranches}`}
              valueStyle={{ color: primary, fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small" style={{ borderRadius: 10, border: 0 }}>
            <Statistic
              title="Total registradas"
              value={branches.length}
              valueStyle={{ fontSize: 28 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabla */}
      <Card
        size="small"
        style={{ borderRadius: 10, border: 0 }}
        extra={
          <Space>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={refresh}
              loading={loading}
            >
              Actualizar
            </Button>
            <Tooltip title={!canCreate ? `Límite del plan: ${maxBranches} sucursales` : undefined}>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={openCreate}
                disabled={!canCreate}
                style={{ background: canCreate ? primary : undefined }}
              >
                Nueva sucursal
              </Button>
            </Tooltip>
          </Space>
        }
      >
        <Table
          size="small"
          rowKey="id"
          columns={columns}
          dataSource={branches}
          loading={loading}
          pagination={false}
        />
      </Card>

      {/* Drawer crear/editar */}
      <Drawer
        title={editing ? `Editar: ${editing.name}` : 'Nueva sucursal'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={420}
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button
              type="primary"
              loading={saving}
              onClick={onSubmit}
              style={{ background: primary }}
            >
              {editing ? 'Guardar cambios' : 'Crear sucursal'}
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" component="div">
          <Form.Item
            label="Nombre"
            validateStatus={errors.name ? 'error' : ''}
            help={errors.name?.message}
            required
          >
            <Input
              {...register('name', { required: 'El nombre es requerido' })}
              placeholder="Ej: Sucursal Centro"
              disabled={editing?.isHeadquarters}
            />
          </Form.Item>

          <Form.Item label="Ciudad">
            <Input
              {...register('city')}
              placeholder="Ej: San Salvador"
            />
          </Form.Item>

          <Form.Item label="Dirección">
            <Input
              {...register('address')}
              placeholder="Ej: Av. Los Héroes #123"
            />
          </Form.Item>

          <Form.Item label="Teléfono">
            <Input
              {...register('phone')}
              placeholder="Ej: 7000-0000"
            />
          </Form.Item>

          <Form.Item label="Correo electrónico">
            <Input
              {...register('email')}
              placeholder="Ej: sucursal@correo.com"
              type="email"
            />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
