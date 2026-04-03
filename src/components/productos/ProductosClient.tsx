'use client';

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTOS — Catálogo de productos con soporte de unidades fraccionadas
// KPIs | Tabla | Modal crear/editar | Drawer categorías | Drawer unidades
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Table, Card, Button, Row, Col,
  Statistic, Tag, Select, Modal, Input,
  Typography, Tooltip, Drawer, Space,
  Popconfirm, InputNumber,
  Switch, Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  AppstoreOutlined, InboxOutlined,
  SearchOutlined, TagsOutlined,
  SettingOutlined, SplitCellsOutlined,
} from '@ant-design/icons';
import { FormField } from '@/components/shared/FormField';
import { useBarberTheme } from '@/context/ThemeContext';

const { Text } = Typography;

// ── Tipos ────────────────────────────────────────────────────────────────────

type Categoria = {
  id: number;
  nombre: string;
  color: string;
};

type Unidad = {
  id: number;
  nombre: string;
  simbolo: string | null;
  activa: boolean;
};

type Producto = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoriaId: number | null;
  categoria: { id: number; nombre: string } | null;
  precioVenta: number;
  costoPromedio: number;
  precioComision: number | null;
  stockMinimo: number;
  stockActual: number;
  unidadMedida: string;
  unidadCompra: string;
  unidadVentaId: number | null;
  unidadVenta: { id: number; nombre: string; simbolo: string | null } | null;
  factorConversion: number;
  activo: boolean;
  stockBajo: boolean;
};

type Resumen = {
  totalProductos: number;
  productosStockBajo: number;
  valorInventario: number;
  totalCategorias: number;
};

type Props = {
  initialProductos: Producto[];
  initialCategorias: Categoria[];
  initialResumen: Resumen;
  initialUnidades: Unidad[];
};

// ── Constantes ───────────────────────────────────────────────────────────────

const CATEGORY_COLORS = [
  { value: 'blue', label: 'Azul' },
  { value: 'green', label: 'Verde' },
  { value: 'red', label: 'Rojo' },
  { value: 'orange', label: 'Naranja' },
  { value: 'purple', label: 'Morado' },
  { value: 'cyan', label: 'Cian' },
  { value: 'magenta', label: 'Magenta' },
  { value: 'gold', label: 'Dorado' },
  { value: 'volcano', label: 'Volcán' },
  { value: 'geekblue', label: 'Azul marino' },
  { value: 'lime', label: 'Lima' },
  { value: 'teal', label: 'Teal' },
];

// ── Estado inicial del formulario ────────────────────────────────────────────

const FORM_EMPTY = {
  codigo: '',
  nombre: '',
  descripcion: '',
  categoriaId: undefined as number | undefined,
  precioVenta: undefined as number | undefined,
  precioComision: undefined as number | undefined,
  stockMinimo: undefined as number | undefined,
  stockInicial: undefined as number | undefined,
  // Unidades
  esFraccionable: false,
  unidadCompra: '',
  unidadVentaId: undefined as number | undefined,
  factorConversion: undefined as number | undefined,
};

function formatMoney(n: number) { return `$${n.toFixed(2)}`; }

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?';
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function ProductosClient({
  initialProductos,
  initialCategorias,
  initialResumen,
  initialUnidades,
}: Props) {
  const { theme: barberTheme } = useBarberTheme();
  const primary = barberTheme.colorPrimary;
  const C = {
    bgPage: 'hsl(var(--bg-page))',
    bgSurface: 'hsl(var(--bg-surface))',
    bgSubtle: 'hsl(var(--bg-subtle))',
    bgMuted: 'hsl(var(--bg-muted))',
    textPrimary: 'hsl(var(--text-primary))',
    textSecondary: 'hsl(var(--text-secondary))',
    textMuted: 'hsl(var(--text-muted))',
    textDisabled: 'hsl(var(--text-disabled))',
    border: 'hsl(var(--border-default))',
  };

  // ── Estado ────────────────────────────────────────────────────────────────
  const [productos, setProductos] = useState<Producto[]>(initialProductos);
  const [categorias, setCategorias] = useState<Categoria[]>(initialCategorias);
  const [resumen, setResumen] = useState<Resumen>(initialResumen);
  const [unidades, setUnidades] = useState<Unidad[]>(initialUnidades);

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<number | undefined>(undefined);

  // ── Modal producto ────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Producto | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({ ...FORM_EMPTY });

  // ── Drawer categorías ──────────────────────────────────────────────────────
  const [catDrawerOpen, setCatDrawerOpen] = useState(false);
  const [catFormName, setCatFormName] = useState('');
  const [catFormColor, setCatFormColor] = useState('blue');
  const [catSaving, setCatSaving] = useState(false);
  const [catEditTarget, setCatEditTarget] = useState<Categoria | null>(null);
  const [catEditOpen, setCatEditOpen] = useState(false);
  const [catEditName, setCatEditName] = useState('');
  const [catEditColor, setCatEditColor] = useState('blue');
  const [catEditSaving, setCatEditSaving] = useState(false);

  // ── Drawer unidades ────────────────────────────────────────────────────────
  const [unidadDrawerOpen, setUnidadDrawerOpen] = useState(false);
  const [unidadFormName, setUnidadFormName] = useState('');
  const [unidadFormSimbolo, setUnidadFormSimbolo] = useState('');
  const [unidadSaving, setUnidadSaving] = useState(false);

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = productos;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        (p.descripcion ?? '').toLowerCase().includes(q)
      );
    }
    if (filterCat !== undefined) {
      list = list.filter(p => p.categoriaId === filterCat);
    }
    return list;
  }, [productos, search, filterCat]);

  // ── Handlers: Producto Modal ───────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null);
    setFormData({ ...FORM_EMPTY });
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(p: Producto) {
    setEditTarget(p);
    const esFrac = Number(p.factorConversion) > 1;
    setFormData({
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      categoriaId: p.categoriaId ?? undefined,
      precioVenta: p.precioVenta,
      precioComision: p.precioComision ?? undefined,
      stockMinimo: p.stockMinimo,
      stockInicial: undefined,
      esFraccionable: esFrac,
      unidadCompra: p.unidadCompra,
      unidadVentaId: p.unidadVentaId ?? undefined,
      factorConversion: esFrac ? Number(p.factorConversion) : undefined,
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSubmitProducto() {
    if (!formData.codigo.trim()) { setFormError('El código es requerido'); return; }
    if (!formData.nombre.trim()) { setFormError('El nombre es requerido'); return; }
    if (!formData.precioVenta || formData.precioVenta <= 0) {
      setFormError('El precio de venta debe ser mayor a 0'); return;
    }
    if (formData.esFraccionable) {
      if (!formData.unidadCompra?.trim()) { setFormError('La unidad de compra es requerida'); return; }
      if (!formData.unidadVentaId) { setFormError('Selecciona la unidad de venta'); return; }
      if (!formData.factorConversion || formData.factorConversion <= 1) {
        setFormError('El factor de conversión debe ser mayor a 1'); return;
      }
    }

    setFormLoading(true);
    setFormError('');

    const payload: Record<string, unknown> = {
      codigo: formData.codigo.trim().toUpperCase(),
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion?.trim() || undefined,
      categoriaId: formData.categoriaId,
      precioVenta: formData.precioVenta,
      precioComision: formData.precioComision ?? null,
      stockMinimo: formData.stockMinimo ?? 0,
      stockInicial: formData.stockInicial ?? 0,
    };

    if (formData.esFraccionable) {
      payload.unidadCompra = formData.unidadCompra?.trim();
      payload.unidadVentaId = formData.unidadVentaId;
      payload.factorConversion = formData.factorConversion;
    } else {
      payload.unidadCompra = 'UNIDAD';
      payload.unidadVentaId = formData.unidadVentaId ?? null;
      payload.factorConversion = 1;
    }

    try {
      const isEdit = editTarget !== null;
      const url = isEdit ? `/api/productos/${editTarget.id}` : '/api/productos';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        const msg = json.error?.message ?? 'Error al guardar producto';
        setFormError(msg); toast.error(msg); return;
      }

      const saved: Producto = json.data;

      if (isEdit) {
        setProductos(prev => prev.map(p => p.id === saved.id ? saved : p));
        toast.success(`Producto "${saved.nombre}" actualizado`);
      } else {
        setProductos(prev => [saved, ...prev]);
        setResumen(prev => ({
          ...prev,
          totalProductos: prev.totalProductos + 1,
        }));
        toast.success(`Producto "${saved.nombre}" creado`);
      }

      setModalOpen(false);
    } catch {
      setFormError('Error de red'); toast.error('Error de red');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeactivate(p: Producto) {
    try {
      const res = await fetch(`/api/productos/${p.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al desactivar'); return; }
      setProductos(prev => prev.filter(x => x.id !== p.id));
      setResumen(prev => ({ ...prev, totalProductos: Math.max(0, prev.totalProductos - 1) }));
      toast.success(`Producto "${p.nombre}" desactivado`);
    } catch {
      toast.error('Error de red');
    }
  }

  // ── Handlers: Categorías ───────────────────────────────────────────────────

  async function handleCreateCat() {
    if (!catFormName.trim()) return;
    setCatSaving(true);
    try {
      const res = await fetch('/api/productos/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: catFormName.trim(), color: catFormColor }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al crear'); return; }
      const cat: Categoria = json.data;
      setCategorias(prev => [...prev, cat].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setResumen(prev => ({ ...prev, totalCategorias: prev.totalCategorias + 1 }));
      setCatFormName('');
      setCatFormColor('blue');
      toast.success(`Categoría "${cat.nombre}" creada`);
    } catch { toast.error('Error de red'); }
    finally { setCatSaving(false); }
  }

  function openEditCat(cat: Categoria) {
    setCatEditTarget(cat);
    setCatEditName(cat.nombre);
    setCatEditColor(cat.color ?? 'blue');
    setCatEditOpen(true);
  }

  async function handleUpdateCat() {
    if (!catEditTarget || !catEditName.trim()) return;
    setCatEditSaving(true);
    try {
      const res = await fetch(`/api/productos/categorias/${catEditTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: catEditName.trim(), color: catEditColor }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al actualizar'); return; }
      const updated: Categoria = json.data;
      setCategorias(prev => prev.map(c => c.id === updated.id ? updated : c).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setCatEditOpen(false);
      toast.success(`Categoría "${updated.nombre}" actualizada`);
    } catch { toast.error('Error de red'); }
    finally { setCatEditSaving(false); }
  }

  async function handleDeleteCat(cat: Categoria) {
    try {
      const res = await fetch(`/api/productos/categorias/${cat.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al eliminar'); return; }
      setCategorias(prev => prev.filter(c => c.id !== cat.id));
      setResumen(prev => ({ ...prev, totalCategorias: Math.max(0, prev.totalCategorias - 1) }));
      toast.success(`Categoría "${cat.nombre}" eliminada`);
    } catch { toast.error('Error de red'); }
  }

  // ── Handlers: Unidades ─────────────────────────────────────────────────────

  async function handleCreateUnidad() {
    if (!unidadFormName.trim()) return;
    setUnidadSaving(true);
    try {
      const res = await fetch('/api/unidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: unidadFormName.trim(), simbolo: unidadFormSimbolo.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al crear unidad'); return; }
      const unidad: Unidad = json.data;
      setUnidades(prev => [...prev, unidad].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setUnidadFormName('');
      setUnidadFormSimbolo('');
      toast.success(`Unidad "${unidad.nombre}" creada`);
    } catch { toast.error('Error de red'); }
    finally { setUnidadSaving(false); }
  }

  async function handleDeleteUnidad(u: Unidad) {
    try {
      const res = await fetch(`/api/unidades/${u.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al eliminar'); return; }
      setUnidades(prev => prev.filter(x => x.id !== u.id));
      toast.success(`Unidad "${u.nombre}" eliminada`);
    } catch { toast.error('Error de red'); }
  }

  // ── Columnas tabla ────────────────────────────────────────────────────────

  const columns: ColumnsType<Producto> = [
    {
      title: 'Código',
      key: 'codigo',
      width: 100,
      render: (_, r) => <Text code style={{ fontSize: 12 }}>{r.codigo}</Text>,
    },
    {
      title: 'Producto',
      key: 'nombre',
      render: (_, r) => (
        <Space size={10}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: `${primary}18`,
            border: `1px solid ${primary}30`,
            color: primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
          }}>
            {getInitials(r.nombre)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, lineHeight: '18px' }}>{r.nombre}</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
              {r.categoria && (
                <Tag color={categorias.find(c => c.id === r.categoria?.id)?.color ?? 'teal'} style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>
                  {r.categoria.nombre}
                </Tag>
              )}
              {r.descripcion && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {r.descripcion.length > 40 ? r.descripcion.slice(0, 40) + '…' : r.descripcion}
                </Text>
              )}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Unidades',
      key: 'unidades',
      width: 200,
      render: (_, r) => {
        const esFrac = Number(r.factorConversion) > 1;
        if (esFrac) {
          const unidVenta = r.unidadVenta?.nombre ?? r.unidadMedida;
          return (
            <div>
              <Space size={4}>
                <SplitCellsOutlined style={{ color: primary, fontSize: 11 }} />
                <Text style={{ fontSize: 12, color: primary, fontWeight: 600 }}>Fraccionable</Text>
              </Space>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                1 {r.unidadCompra} = {r.factorConversion} {unidVenta}
              </div>
            </div>
          );
        }
        const unidVenta = r.unidadVenta?.nombre ?? r.unidadMedida;
        return <Tag style={{ fontSize: 11 }}>{unidVenta}</Tag>;
      },
    },
    {
      title: 'Precio venta',
      key: 'precio',
      width: 115,
      align: 'right',
      render: (_, r) => (
        <Text strong style={{ color: primary, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(r.precioVenta)}
        </Text>
      ),
    },
    {
      title: 'Comisión',
      key: 'comision',
      width: 100,
      align: 'right',
      responsive: ['lg'],
      render: (_, r) => r.precioComision !== null
        ? <Text style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(r.precioComision)}</Text>
        : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>,
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Popconfirm
            title="¿Desactivar producto?"
            description="El producto quedará inactivo y no aparecerá en el sistema."
            onConfirm={() => handleDeactivate(r)}
            okText="Sí, desactivar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Desactivar">
              <Button size="small" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* KPIs */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${primary}` }}>
            <Statistic
              title="Total productos"
              value={resumen.totalProductos}
              prefix={<AppstoreOutlined style={{ color: primary }} />}
              valueStyle={{ color: primary, fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: '3px solid #52c41a' }}>
            <Statistic
              title="Valor inventario"
              value={resumen.valorInventario}
              precision={2}
              prefix={<InboxOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: '3px solid #722ed1' }}>
            <Statistic
              title="Categorías"
              value={resumen.totalCategorias}
              prefix={<TagsOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${primary}` }}>
            <Statistic
              title="Unidades de medida"
              value={unidades.length}
              prefix={<SplitCellsOutlined style={{ color: primary }} />}
              valueStyle={{ color: primary, fontSize: 22 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabla */}
      <Card>
        {/* Toolbar */}
        <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 14 }}>
          <Col flex="1">
            <Input.Search
              placeholder="Buscar por nombre o código..."
              allowClear
              prefix={<SearchOutlined />}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 340 }}
            />
          </Col>
          <Col>
            <Select
              placeholder="Categoría"
              allowClear
              style={{ width: 160 }}
              value={filterCat}
              onChange={v => setFilterCat(v)}
              options={categorias.map(c => ({ value: c.id, label: c.nombre }))}
            />
          </Col>
          <Col>
            <Button icon={<SettingOutlined />} onClick={() => setUnidadDrawerOpen(true)}>
              Unidades
            </Button>
          </Col>
          <Col>
            <Button icon={<TagsOutlined />} onClick={() => setCatDrawerOpen(true)}>
              Categorías
            </Button>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreate}
              style={{ background: primary, borderColor: primary }}
            >
              Nuevo producto
            </Button>
          </Col>
        </Row>

        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          size="small"
          scroll={{ x: 780 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (t, range) => `${range[0]}–${range[1]} de ${t} productos`,
          }}
          locale={{
            emptyText: (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <InboxOutlined style={{ fontSize: 36, color: C.textDisabled }} />
                <div style={{ marginTop: 10, color: C.textMuted }}>Sin productos registrados</div>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ marginTop: 12 }}>
                  Crear primer producto
                </Button>
              </div>
            ),
          }}
        />
      </Card>

      {/* ══════════════════════════════════════════════════════
          Modal: Crear / Editar producto
      ══════════════════════════════════════════════════════ */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={
          <Space>
            <AppstoreOutlined style={{ color: primary }} />
            <span>{editTarget ? 'Editar producto' : 'Nuevo producto'}</span>
          </Space>
        }
        footer={null}
        destroyOnHidden
        width={660}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
          {/* Código + Nombre */}
          <Row gutter={12}>
            <Col span={8}>
              <FormField label="Código *">
                <Input
                  value={formData.codigo}
                  onChange={e => setFormData(p => ({ ...p, codigo: e.target.value }))}
                  placeholder="EJ: SH-001"
                  style={{ textTransform: 'uppercase' }}
                  maxLength={20}
                />
              </FormField>
            </Col>
            <Col span={16}>
              <FormField label="Nombre *">
                <Input
                  value={formData.nombre}
                  onChange={e => setFormData(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: Shampoo anticaspa 400ml"
                  maxLength={120}
                />
              </FormField>
            </Col>
          </Row>

          {/* Descripción */}
          <FormField label="Descripción">
            <Input.TextArea
              value={formData.descripcion}
              onChange={e => setFormData(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Descripción opcional del producto"
              rows={2}
              maxLength={300}
            />
          </FormField>

          {/* Categoría */}
          <FormField label="Categoría">
            <Select
              style={{ width: '100%' }}
              placeholder="Seleccionar categoría..."
              allowClear
              value={formData.categoriaId}
              onChange={v => setFormData(p => ({ ...p, categoriaId: v }))}
              showSearch
              filterOption={(input, opt) =>
                (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={categorias.map(c => ({ value: c.id, label: c.nombre }))}
            />
          </FormField>

          {/* Precios */}
          <Row gutter={12}>
            <Col span={12}>
              <FormField label="Precio de venta ($) *">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.01} step={0.01} precision={2} prefix="$"
                  value={formData.precioVenta}
                  onChange={v => setFormData(p => ({ ...p, precioVenta: v ?? undefined }))}
                  placeholder="0.00"
                />
              </FormField>
            </Col>
            <Col span={12}>
              <FormField label="Precio comisión ($)">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0} step={0.01} precision={2} prefix="$"
                  value={formData.precioComision}
                  onChange={v => setFormData(p => ({ ...p, precioComision: v ?? undefined }))}
                  placeholder="0.00"
                />
              </FormField>
            </Col>
          </Row>

          {/* Stock mínimo + Stock inicial */}
          <Row gutter={12}>
            <Col span={12}>
              <FormField label="Stock mínimo">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0} step={1}
                  value={formData.stockMinimo}
                  onChange={v => setFormData(p => ({ ...p, stockMinimo: v ?? undefined }))}
                  placeholder="0"
                />
              </FormField>
            </Col>
            {!editTarget && (
              <Col span={12}>
                <FormField label="Stock inicial">
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0} step={1}
                    value={formData.stockInicial}
                    onChange={v => setFormData(p => ({ ...p, stockInicial: v ?? undefined }))}
                    placeholder="0"
                  />
                </FormField>
              </Col>
            )}
          </Row>

          {/* ── Sección Unidades ── */}
          <Divider style={{ margin: '4px 0' }}>
            <Space size={6}>
              <SplitCellsOutlined style={{ color: primary }} />
              <Text style={{ fontSize: 12, fontWeight: 600 }}>Unidades</Text>
            </Space>
          </Divider>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Switch
              checked={formData.esFraccionable}
              onChange={v => setFormData(p => ({ ...p, esFraccionable: v, unidadCompra: '', unidadVentaId: undefined, factorConversion: undefined }))}
            />
            <Text style={{ fontSize: 13 }}>
              {formData.esFraccionable ? '✂️ Producto fraccionable' : 'Producto sin fracciones'}
            </Text>
          </div>

          {!formData.esFraccionable && (
            <FormField label="Unidad de venta">
              <Select
                style={{ width: '100%' }}
                placeholder="Seleccionar unidad de venta (opcional)"
                allowClear
                value={formData.unidadVentaId}
                onChange={v => setFormData(p => ({ ...p, unidadVentaId: v }))}
                options={unidades.map(u => ({
                  value: u.id,
                  label: u.simbolo ? `${u.nombre} (${u.simbolo})` : u.nombre,
                }))}
                dropdownRender={menu => (
                  <>
                    {menu}
                    <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}>
                      <Button
                        type="link"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => { setModalOpen(false); setUnidadDrawerOpen(true); }}
                        style={{ padding: 0 }}
                      >
                        Crear nueva unidad
                      </Button>
                    </div>
                  </>
                )}
              />
            </FormField>
          )}

          {formData.esFraccionable && (
            <div style={{ background: C.bgSubtle, borderRadius: 8, padding: 14, border: `1px solid ${primary}30`, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Text style={{ fontSize: 12, color: C.textMuted }}>
                Define la unidad de compra (a granel) y la unidad de venta (fracción al cliente).
              </Text>

              <Row gutter={12}>
                <Col span={12}>
                  <FormField label="Unidad de compra *">
                    <Select
                      style={{ width: '100%' }}
                      placeholder="Seleccionar..."
                      showSearch
                      value={formData.unidadCompra || undefined}
                      onChange={v => setFormData(p => ({ ...p, unidadCompra: v }))}
                      filterOption={(input, opt) =>
                        (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={unidades.map(u => ({
                        value: u.nombre,
                        label: u.simbolo ? `${u.nombre} (${u.simbolo})` : u.nombre,
                      }))}
                      dropdownRender={menu => (
                        <>
                          {menu}
                          <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}>
                            <Button
                              type="link"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() => { setModalOpen(false); setUnidadDrawerOpen(true); }}
                              style={{ padding: 0 }}
                            >
                              Crear nueva unidad
                            </Button>
                          </div>
                        </>
                      )}
                    />
                  </FormField>
                </Col>
                <Col span={12}>
                  <FormField label="Unidad de venta *">
                    <Select
                      style={{ width: '100%' }}
                      placeholder="Seleccionar..."
                      value={formData.unidadVentaId}
                      onChange={v => setFormData(p => ({ ...p, unidadVentaId: v }))}
                      options={unidades.map(u => ({
                        value: u.id,
                        label: u.simbolo ? `${u.nombre} (${u.simbolo})` : u.nombre,
                      }))}
                      dropdownRender={menu => (
                        <>
                          {menu}
                          <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}>
                            <Button
                              type="link"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() => { setModalOpen(false); setUnidadDrawerOpen(true); }}
                              style={{ padding: 0 }}
                            >
                              Crear nueva unidad
                            </Button>
                          </div>
                        </>
                      )}
                    />
                  </FormField>
                </Col>
              </Row>

              <FormField label="Factor de conversión *">
                <InputNumber
                  style={{ width: '100%' }}
                  min={2} step={1} precision={0}
                  value={formData.factorConversion}
                  onChange={v => setFormData(p => ({ ...p, factorConversion: v ?? undefined }))}
                  placeholder="Ej: 12"
                  addonBefore={`1 ${formData.unidadCompra || '?'} =`}
                  addonAfter={
                    formData.unidadVentaId
                      ? unidades.find(u => u.id === formData.unidadVentaId)?.nombre ?? 'uds'
                      : 'uds'
                  }
                />
              </FormField>

              {/* Vista previa */}
              {formData.unidadCompra && formData.factorConversion && formData.unidadVentaId && (
                <div style={{ background: `${primary}10`, borderRadius: 6, padding: '8px 12px', fontSize: 12, color: primary }}>
                  <strong>Ejemplo:</strong> Si compras 2 {formData.unidadCompra}s → se suman {Number(formData.factorConversion) * 2} {unidades.find(u => u.id === formData.unidadVentaId)?.nombre ?? 'uds'} al stock.
                </div>
              )}
            </div>
          )}

          {formError && (
            <p style={{ color: '#ff4d4f', fontSize: 13, margin: 0 }}>{formError}</p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button
            type="primary"
            loading={formLoading}
            onClick={handleSubmitProducto}
            style={{ background: primary, borderColor: primary }}
          >
            {formLoading ? 'Guardando...' : editTarget ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          Drawer: Gestión de Categorías
      ══════════════════════════════════════════════════════ */}
      <Drawer
        title={<Space><TagsOutlined style={{ color: '#722ed1' }} /><span>Categorías</span></Space>}
        open={catDrawerOpen}
        onClose={() => setCatDrawerOpen(false)}
        width={460}
        destroyOnHidden
      >
        <div style={{ background: C.bgSubtle, borderRadius: 8, padding: 16, marginBottom: 20, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Nueva categoría</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <FormField label="Nombre *">
              <Input
                value={catFormName}
                onChange={e => setCatFormName(e.target.value)}
                placeholder="Ej: Shampoos, Tintes..."
                maxLength={60}
                onPressEnter={handleCreateCat}
              />
            </FormField>
            <FormField label="Color">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORY_COLORS.map(c => (
                  <Tag
                    key={c.value}
                    color={c.value}
                    style={{ cursor: 'pointer', margin: 0, outline: catFormColor === c.value ? '2px solid #1890ff' : 'none', outlineOffset: 2 }}
                    onClick={() => setCatFormColor(c.value)}
                  >
                    {c.label}
                  </Tag>
                ))}
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 12, color: C.textMuted }}>Vista previa: </span>
                <Tag color={catFormColor} style={{ margin: 0 }}>{catFormName || 'Ejemplo'}</Tag>
              </div>
            </FormField>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={catSaving}
              disabled={!catFormName.trim()}
              onClick={handleCreateCat}
              style={{ background: primary, borderColor: primary, alignSelf: 'flex-start' }}
            >
              Crear categoría
            </Button>
          </div>
        </div>

        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Categorías ({categorias.length})</div>
        {categorias.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: C.textMuted }}>
            <TagsOutlined style={{ fontSize: 28, color: C.textDisabled }} />
            <div style={{ marginTop: 8 }}>Sin categorías creadas</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categorias.map(cat => (
              <div key={cat.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 8,
                border: `1px solid ${C.border}`, background: C.bgSurface,
              }}>
                <Tag color={cat.color ?? 'blue'} style={{ margin: 0, fontSize: 13 }}>{cat.nombre}</Tag>
                <Space size={4}>
                  <Tooltip title="Editar">
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEditCat(cat)} />
                  </Tooltip>
                  <Popconfirm
                    title={`¿Eliminar "${cat.nombre}"?`}
                    description="Los productos con esta categoría quedarán sin categoría."
                    onConfirm={() => handleDeleteCat(cat)}
                    okText="Sí, eliminar"
                    cancelText="Cancelar"
                    okButtonProps={{ danger: true }}
                  >
                    <Tooltip title="Eliminar">
                      <Button size="small" icon={<DeleteOutlined />} danger />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      {/* Modal editar categoría */}
      <Modal
        open={catEditOpen}
        onCancel={() => setCatEditOpen(false)}
        title={<Space><TagsOutlined style={{ color: '#722ed1' }} /><span>Editar categoría</span></Space>}
        footer={null} destroyOnHidden width={400}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
          <FormField label="Nombre *">
            <Input value={catEditName} onChange={e => setCatEditName(e.target.value)} maxLength={60} onPressEnter={handleUpdateCat} />
          </FormField>
          <FormField label="Color">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORY_COLORS.map(c => (
                <Tag
                  key={c.value} color={c.value}
                  style={{ cursor: 'pointer', margin: 0, outline: catEditColor === c.value ? '2px solid #1890ff' : 'none', outlineOffset: 2 }}
                  onClick={() => setCatEditColor(c.value)}
                >
                  {c.label}
                </Tag>
              ))}
            </div>
            <div style={{ marginTop: 6 }}>
              <Tag color={catEditColor} style={{ margin: 0 }}>{catEditName || 'Ejemplo'}</Tag>
            </div>
          </FormField>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => setCatEditOpen(false)}>Cancelar</Button>
          <Button type="primary" loading={catEditSaving} onClick={handleUpdateCat} style={{ background: primary, borderColor: primary }}>
            Guardar cambios
          </Button>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          Drawer: Gestión de Unidades de Medida
      ══════════════════════════════════════════════════════ */}
      <Drawer
        title={<Space><SplitCellsOutlined style={{ color: primary }} /><span>Unidades de Medida</span></Space>}
        open={unidadDrawerOpen}
        onClose={() => setUnidadDrawerOpen(false)}
        width={460}
        destroyOnHidden
      >
        <div style={{ background: C.bgSubtle, borderRadius: 8, padding: 16, marginBottom: 20, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Nueva unidad de medida</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
            El mismo catálogo se usa para <strong>unidad de compra</strong> y <strong>unidad de venta</strong>.
            Ej: KG, LB, GL, Onza, Vaso, Cucharada
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Row gutter={12}>
              <Col span={14}>
                <FormField label="Nombre *">
                  <Input
                    value={unidadFormName}
                    onChange={e => setUnidadFormName(e.target.value)}
                    placeholder="Ej: Onza, Vaso, Cucharada"
                    maxLength={40}
                    onPressEnter={handleCreateUnidad}
                  />
                </FormField>
              </Col>
              <Col span={10}>
                <FormField label="Símbolo (opcional)">
                  <Input
                    value={unidadFormSimbolo}
                    onChange={e => setUnidadFormSimbolo(e.target.value)}
                    placeholder="oz, vaso, cdta"
                    maxLength={10}
                    onPressEnter={handleCreateUnidad}
                  />
                </FormField>
              </Col>
            </Row>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={unidadSaving}
              disabled={!unidadFormName.trim()}
              onClick={handleCreateUnidad}
              style={{ background: primary, borderColor: primary, alignSelf: 'flex-start' }}
            >
              Crear unidad
            </Button>
          </div>
        </div>

        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>
          Unidades ({unidades.length})
        </div>
        {unidades.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: C.textMuted }}>
            <SplitCellsOutlined style={{ fontSize: 28, color: C.textDisabled }} />
            <div style={{ marginTop: 8 }}>Sin unidades creadas</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
              Crea unidades para compra (KG, LB, GL) y venta (Onza, Vaso, Cucharada)
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unidades.map(u => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 8,
                border: `1px solid ${C.border}`, background: C.bgSurface,
              }}>
                <Space size={8}>
                  <Text style={{ fontWeight: 600, fontSize: 13 }}>{u.nombre}</Text>
                  {u.simbolo && (
                    <Tag style={{ fontSize: 10, margin: 0 }}>{u.simbolo}</Tag>
                  )}
                </Space>
                <Popconfirm
                  title={`¿Eliminar unidad "${u.nombre}"?`}
                  description="Solo se puede eliminar si ningún producto la usa."
                  onConfirm={() => handleDeleteUnidad(u)}
                  okText="Sí, eliminar"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="Eliminar">
                    <Button size="small" icon={<DeleteOutlined />} danger />
                  </Tooltip>
                </Popconfirm>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}
