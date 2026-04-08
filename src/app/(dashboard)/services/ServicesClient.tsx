'use client';

// ══════════════════════════════════════════════════════════
// SERVICIOS — CRUD + CRUD CATEGORÍAS (patrón Speeddansys ERP)
// ══════════════════════════════════════════════════════════

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Table, Card, Input, Button, Space, Row, Col,
  Statistic, Tag, Tooltip, Popconfirm, Typography,
  Select as AntSelect, Drawer, theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined, PlusOutlined, ReloadOutlined,
  ScissorOutlined, EditOutlined, DeleteOutlined,
  CheckCircleOutlined, TagOutlined, DollarOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useBarberTheme } from '@/context/ThemeContext';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button as SdButton }  from '@/components/ui/button';
import { Input as SdInput }    from '@/components/ui/input';
import { FormField }           from '@/components/shared/FormField';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const { Title, Text } = Typography;

// ── Tipos ──────────────────────────────────────────────────────────────────

type Categoria = { id: number; nombre: string; color: string; activo: boolean };

type Service = {
  id: number; name: string; description: string | null;
  price: number; comisionTipo: string; comisionBarbero: number;
  duration: number; category: string | null; active: boolean;
};

type FormValues = {
  name: string; description: string; price: string;
  comisionTipo: string; comisionBarbero: string;
  duration: string; category: string; active: boolean;
};

// Colores disponibles para categorías (Ant Design Tag colors)
const COLOR_OPTIONS = [
  { value: 'blue',     label: 'Azul' },
  { value: 'purple',   label: 'Morado' },
  { value: 'cyan',     label: 'Cyan' },
  { value: 'green',    label: 'Verde' },
  { value: 'orange',   label: 'Naranja' },
  { value: 'red',      label: 'Rojo' },
  { value: 'gold',     label: 'Dorado' },
  { value: 'geekblue', label: 'Azul oscuro' },
  { value: 'magenta',  label: 'Magenta' },
  { value: 'volcano',  label: 'Volcán' },
  { value: 'lime',     label: 'Lima' },
];

// ── Componente ─────────────────────────────────────────────────────────────

export default function ServicesClient({
  initialServices,
  initialCategorias,
}: {
  initialServices: Service[];
  initialCategorias: Categoria[];
}) {
  const { theme: barberTheme } = useBarberTheme();
  const primary = barberTheme.colorPrimary;
  const { token } = theme.useToken();
  const C = {
    textMuted:    'hsl(var(--text-muted))',
    textDisabled: 'hsl(var(--text-disabled))',
    colorSuccess: token.colorSuccess,
    colorWarning: token.colorWarning,
  };

  // ── Estado servicios ───────────────────────────────────
  const [services,  setServices]  = useState<Service[]>(initialServices);
  const [open,      setOpen]      = useState(false);
  const [editing,   setEditing]   = useState<Service | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [search,    setSearch]    = useState('');
  const [catFiltro, setCatFiltro] = useState<string | undefined>();

  // ── Estado categorías ──────────────────────────────────
  const [categorias,     setCategorias]     = useState<Categoria[]>(initialCategorias);
  const [drawerCat,      setDrawerCat]      = useState(false);
  const [catNombre,      setCatNombre]      = useState('');
  const [catColor,       setCatColor]       = useState('blue');
  const [catSaving,      setCatSaving]      = useState(false);
  const [catError,       setCatError]       = useState('');
  const [editingCat,     setEditingCat]     = useState<Categoria | null>(null);
  const [catModalOpen,   setCatModalOpen]   = useState(false);
  const [catEditNombre,  setCatEditNombre]  = useState('');
  const [catEditColor,   setCatEditColor]   = useState('blue');
  const [catEditSaving,  setCatEditSaving]  = useState(false);
  const [catEditError,   setCatEditError]   = useState('');

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>();
  const selectedCategory = (watch('category') ?? '') as string;
  const activeVal        = watch('active');
  const comisionTipoVal  = watch('comisionTipo') ?? 'NINGUNA';

  // Filtro cliente-side
  const filtered = services.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFiltro || s.category === catFiltro;
    return matchSearch && matchCat;
  });

  // ── Servicios: abrir modal crear ───────────────────────
  const handleNuevo = () => {
    setEditing(null);
    reset({ name: '', description: '', price: '', comisionTipo: 'NINGUNA', comisionBarbero: '0', duration: '', category: '', active: true });
    setError('');
    setOpen(true);
  };

  // ── Servicios: abrir modal editar ──────────────────────
  const handleEditar = (s: Service) => {
    setEditing(s);
    reset({
      name: s.name, description: s.description ?? '',
      price: String(s.price),
      comisionTipo: s.comisionTipo ?? 'NINGUNA',
      comisionBarbero: String(s.comisionBarbero ?? 0),
      duration: String(s.duration),
      category: s.category ?? '', active: s.active,
    });
    setError('');
    setOpen(true);
  };

  // ── Servicios: guardar ─────────────────────────────────
  async function onSubmit(values: FormValues) {
    setSaving(true); setError('');
    try {
      const body = {
        name:           values.name,
        description:    values.description || undefined,
        price:          parseFloat(values.price),
        comisionTipo:   values.comisionTipo || 'NINGUNA',
        comisionBarbero: values.comisionTipo === 'NINGUNA' ? 0 : (parseFloat(values.comisionBarbero) || 0),
        duration:       parseInt(values.duration, 10),
        category:       values.category || undefined,
        active:         values.active,
      };
      const url    = editing ? `/api/services/${editing.id}` : '/api/services';
      const method = editing ? 'PATCH' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json   = await res.json();
      if (!res.ok) { const msg = json.error?.message ?? 'Error al guardar'; setError(msg); toast.error(msg); return; }
      if (editing) {
        setServices(prev => prev.map(s => s.id === editing.id ? json.data : s));
        toast.success(`Servicio "${values.name}" actualizado`);
      } else {
        setServices(prev => [json.data, ...prev]);
        toast.success(`Servicio "${values.name}" creado`);
      }
      setOpen(false);
    } catch { setError('Error de red'); toast.error('Error de red'); }
    finally { setSaving(false); }
  }

  // ── Servicios: eliminar ────────────────────────────────
  async function handleEliminar(s: Service) {
    const res = await fetch(`/api/services/${s.id}`, { method: 'DELETE' });
    if (res.ok) { setServices(prev => prev.filter(x => x.id !== s.id)); toast.success(`"${s.name}" eliminado`); }
    else toast.error('No se pudo eliminar');
  }

  // ── Categorías: crear ──────────────────────────────────
  async function handleCrearCategoria() {
    if (!catNombre.trim()) { setCatError('El nombre es requerido'); return; }
    setCatSaving(true); setCatError('');
    try {
      const res  = await fetch('/api/services/categorias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: catNombre.trim(), color: catColor }) });
      const json = await res.json();
      if (!res.ok) { setCatError(json.error?.message ?? 'Error al crear'); return; }
      setCategorias(prev => [...prev, json.data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setCatNombre(''); setCatColor('blue');
      toast.success(`Categoría "${json.data.nombre}" creada`);
    } catch { setCatError('Error de red'); }
    finally { setCatSaving(false); }
  }

  // ── Categorías: abrir modal editar ─────────────────────
  function openEditCat(cat: Categoria) {
    setEditingCat(cat);
    setCatEditNombre(cat.nombre);
    setCatEditColor(cat.color);
    setCatEditError('');
    setCatModalOpen(true);
  }

  // ── Categorías: guardar edición ────────────────────────
  async function handleGuardarCategoria() {
    if (!catEditNombre.trim()) { setCatEditError('El nombre es requerido'); return; }
    if (!editingCat) return;
    setCatEditSaving(true); setCatEditError('');
    try {
      const res  = await fetch(`/api/services/categorias/${editingCat.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: catEditNombre.trim(), color: catEditColor }) });
      const json = await res.json();
      if (!res.ok) { setCatEditError(json.error?.message ?? 'Error al guardar'); return; }
      setCategorias(prev => prev.map(c => c.id === editingCat.id ? json.data : c).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setCatModalOpen(false);
      toast.success('Categoría actualizada');
    } catch { setCatEditError('Error de red'); }
    finally { setCatEditSaving(false); }
  }

  // ── Categorías: eliminar ───────────────────────────────
  async function handleEliminarCategoria(cat: Categoria) {
    const res = await fetch(`/api/services/categorias/${cat.id}`, { method: 'DELETE' });
    if (res.ok) {
      setCategorias(prev => prev.filter(c => c.id !== cat.id));
      toast.success(`"${cat.nombre}" eliminada`);
    } else toast.error('No se pudo eliminar');
  }

  // ── Columnas servicios ─────────────────────────────────
  const columns: ColumnsType<Service> = [
    {
      title:  'Servicio',
      key:    'name',
      render: (_, r) => (
        <div style={{ opacity: r.active ? 1 : 0.5 }}>
          <div style={{ fontWeight: 500 }}>{r.name}</div>
          {r.description && (
            <Text type="secondary" style={{ fontSize: 11 }}>{r.description.slice(0, 60)}</Text>
          )}
        </div>
      ),
    },
    {
      title:     'Categoría',
      dataIndex: 'category',
      key:       'category',
      width:     130,
      render:    (v: string | null) => {
        const cat = categorias.find(c => c.nombre === v);
        return v
          ? <Tag color={cat?.color ?? 'default'} style={{ fontSize: 11 }}>{v}</Tag>
          : <Text type="secondary">—</Text>;
      },
    },
    {
      title:     'Precio',
      dataIndex: 'price',
      key:       'price',
      width:     90,
      align:     'right',
      render:    (v: number) => <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>${v.toFixed(2)}</Text>,
    },
    {
      title:  'Comisión empleado',
      key:    'comision',
      width:  130,
      align:  'right',
      render: (_: unknown, s: Service) => {
        if (s.comisionTipo === 'PORCENTAJE')
          return <Text style={{ color: C.colorSuccess, fontVariantNumeric: 'tabular-nums' }}>{s.comisionBarbero}%</Text>;
        if (s.comisionTipo === 'MONTO_FIJO' && s.comisionBarbero > 0)
          return <Text style={{ color: C.colorSuccess, fontVariantNumeric: 'tabular-nums' }}>${s.comisionBarbero.toFixed(2)}</Text>;
        return <Text type="secondary">Sin comisión</Text>;
      },
    },
    {
      title:     'Duración',
      dataIndex: 'duration',
      key:       'duration',
      width:     100,
      align:     'center',
      render:    (v: number) => <Text type="secondary">{v} min</Text>,
    },
    {
      title:     'Estado',
      dataIndex: 'active',
      key:       'active',
      width:     90,
      render:    (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Activo' : 'Inactivo'}</Tag>,
    },
    {
      title:  'Acciones',
      key:    'actions',
      width:  90,
      fixed:  'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Editar">
            <Button size="small" type="primary" ghost icon={<EditOutlined />} onClick={() => handleEditar(record)} />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar este servicio?"
            description="Esta acción no se puede deshacer."
            okText="Eliminar" cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleEliminar(record)}
          >
            <Tooltip title="Eliminar">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Columnas categorías (drawer) ───────────────────────
  const catColumns: ColumnsType<Categoria> = [
    {
      title:  'Nombre',
      key:    'nombre',
      render: (_, r) => <Tag color={r.color} style={{ fontSize: 12 }}>{r.nombre}</Tag>,
    },
    {
      title:  'Acciones',
      key:    'actions',
      width:  80,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Editar">
            <Button size="small" type="primary" ghost icon={<EditOutlined />} onClick={() => openEditCat(record)} />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar esta categoría?"
            okText="Eliminar" cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleEliminarCategoria(record)}
          >
            <Tooltip title="Eliminar">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── KPIs ───────────────────────────────────────────────
  const activeCount = services.filter(s => s.active).length;
  const avgPrice    = services.length ? (services.reduce((a, s) => a + s.price, 0) / services.length).toFixed(2) : '0.00';

  return (
    <>
      {/* ── KPIs ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Total Servicios" value={services.length} prefix={<ScissorOutlined style={{ color: primary }} />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Activos" value={activeCount} prefix={<CheckCircleOutlined style={{ color: C.colorSuccess }} />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Precio Promedio" value={`$${avgPrice}`} prefix={<DollarOutlined style={{ color: C.colorWarning }} />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Categorías" value={categorias.length} prefix={<TagOutlined style={{ color: '#722ed1' }} />} />
          </Card>
        </Col>
      </Row>

      {/* ── Tabla servicios ── */}
      <Card
        title={<Title level={5} style={{ margin: 0 }}>Servicios</Title>}
        extra={
          <Space>
            <Button icon={<AppstoreOutlined />} onClick={() => setDrawerCat(true)}>
              Categorías
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleNuevo}>
              Nuevo servicio
            </Button>
          </Space>
        }
      >
        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={10} md={8}>
            <Input
              placeholder="Buscar por nombre o descripción..."
              prefix={<SearchOutlined />}
              allowClear
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={12} sm={7} md={5}>
            <AntSelect
              placeholder="Categoría"
              allowClear
              style={{ width: '100%' }}
              value={catFiltro}
              onChange={v => setCatFiltro(v)}
              options={categorias.map(c => ({ value: c.nombre, label: c.nombre }))}
            />
          </Col>
          <Col>
            <Tooltip title="Limpiar filtros">
              <Button icon={<ReloadOutlined />} onClick={() => { setSearch(''); setCatFiltro(undefined); }} />
            </Tooltip>
          </Col>
        </Row>

        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          size="small"
          scroll={{ x: 600 }}
          pagination={{
            pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'],
            showTotal: (t, range) => `${range[0]}–${range[1]} de ${t} servicios`,
          }}
          locale={{
            emptyText: (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <ScissorOutlined style={{ fontSize: 32, color: C.textDisabled }} />
                <div style={{ marginTop: 8, color: C.textMuted }}>
                  {search || catFiltro ? 'Sin resultados. Cambia los filtros.' : 'No hay servicios aún. Usa "+ Nuevo servicio".'}
                </div>
              </div>
            ),
          }}
        />
      </Card>

      {/* ── Modal Crear / Editar servicio ── */}
      <Dialog open={open} onOpenChange={v => { if (!v) setOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
              <FormField label="Nombre *">
                <SdInput {...register('name', { required: true })} placeholder="Corte de cabello" autoFocus />
              </FormField>
              <FormField label="Descripción">
                <SdInput {...register('description')} placeholder="Descripción opcional" />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Precio *">
                  <SdInput type="number" step="0.01" min="0" {...register('price', { required: true })} placeholder="10.00" />
                </FormField>
                <FormField label="Duración (min) *">
                  <SdInput type="number" min="1" {...register('duration', { required: true })} placeholder="30" />
                </FormField>
              </div>
              <FormField label="Comisión para empleado">
                <Select value={comisionTipoVal} onValueChange={v => setValue('comisionTipo', v ?? 'NINGUNA')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tipo de comisión" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NINGUNA">Sin comisión</SelectItem>
                    <SelectItem value="MONTO_FIJO">Monto fijo ($)</SelectItem>
                    <SelectItem value="PORCENTAJE">Porcentaje (%)</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              {comisionTipoVal !== 'NINGUNA' && (
                <FormField
                  label={comisionTipoVal === 'PORCENTAJE' ? 'Porcentaje de comisión (%)' : 'Monto fijo de comisión ($)'}
                  hint={comisionTipoVal === 'PORCENTAJE'
                    ? 'Ej: 30 = el empleado gana el 30% del precio del servicio'
                    : 'Monto fijo que gana el empleado por cada vez que realiza este servicio'}
                >
                  <SdInput type="number" step={comisionTipoVal === 'PORCENTAJE' ? '1' : '0.25'} min="0"
                    max={comisionTipoVal === 'PORCENTAJE' ? '100' : undefined}
                    {...register('comisionBarbero')} placeholder={comisionTipoVal === 'PORCENTAJE' ? '30' : '2.50'} />
                </FormField>
              )}
              <FormField label="Categoría">
                <Select value={selectedCategory} onValueChange={v => setValue('category', v as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => (
                      <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={activeVal ?? true}
                  onChange={e => setValue('active', e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: 'hsl(var(--brand-primary))' }}
                />
                <span style={{ fontSize: 13, color: 'hsl(var(--text-secondary))' }}>Servicio activo</span>
              </label>
              {error && <p style={{ color: 'hsl(var(--status-error))', fontSize: 13, margin: 0 }}>{error}</p>}
            </div>
            <DialogFooter>
              <SdButton type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</SdButton>
              <SdButton type="submit" disabled={saving}>{saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear servicio'}</SdButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Drawer Categorías ── */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TagOutlined style={{ color: primary }} />
            <span>Categorías de servicios</span>
          </div>
        }
        open={drawerCat}
        onClose={() => setDrawerCat(false)}
        width={420}
      >
        {/* Formulario crear */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Nueva categoría</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SdInput
              value={catNombre}
              onChange={e => setCatNombre(e.target.value)}
              placeholder="Nombre de la categoría"
              onKeyDown={e => e.key === 'Enter' && handleCrearCategoria()}
            />
            <AntSelect
              value={catColor}
              onChange={v => setCatColor(v)}
              style={{ width: '100%' }}
              options={COLOR_OPTIONS.map(o => ({
                value: o.value,
                label: (
                  <Space>
                    <Tag color={o.value} style={{ margin: 0 }}>{o.label}</Tag>
                  </Space>
                ),
              }))}
            />
            {catError && <p style={{ color: 'hsl(var(--status-error))', fontSize: 12, margin: 0 }}>{catError}</p>}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={catSaving}
              onClick={handleCrearCategoria}
              block
            >
              Agregar categoría
            </Button>
          </div>
        </div>

        {/* Lista de categorías existentes */}
        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>
          Categorías existentes ({categorias.length})
        </div>
        <Table
          dataSource={categorias}
          columns={catColumns}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: <Text type="secondary">Sin categorías aún</Text> }}
        />
      </Drawer>

      {/* ── Modal Editar categoría ── */}
      <Dialog open={catModalOpen} onOpenChange={v => { if (!v) setCatModalOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
            <FormField label="Nombre *">
              <SdInput
                value={catEditNombre}
                onChange={e => setCatEditNombre(e.target.value)}
                placeholder="Nombre de la categoría"
                autoFocus
              />
            </FormField>
            <FormField label="Color">
              <AntSelect
                value={catEditColor}
                onChange={v => setCatEditColor(v)}
                style={{ width: '100%' }}
                options={COLOR_OPTIONS.map(o => ({
                  value: o.value,
                  label: <Space><Tag color={o.value} style={{ margin: 0 }}>{o.label}</Tag></Space>,
                }))}
              />
            </FormField>
            {catEditError && <p style={{ color: 'hsl(var(--status-error))', fontSize: 13, margin: 0 }}>{catEditError}</p>}
          </div>
          <DialogFooter>
            <SdButton variant="outline" onClick={() => setCatModalOpen(false)}>Cancelar</SdButton>
            <SdButton onClick={handleGuardarCategoria} disabled={catEditSaving}>
              {catEditSaving ? 'Guardando...' : 'Guardar cambios'}
            </SdButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
