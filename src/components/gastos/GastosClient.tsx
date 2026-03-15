'use client';

// ══════════════════════════════════════════════════════════
// GASTOS — Ant Design 5 Client Component
// KPIs, resumen por categoría, tabla con filtros,
// Modal nuevo/editar gasto, Drawer gestión de categorías
// ══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback, useRef } from 'react';
import React from 'react';
import { toast } from 'sonner';
import {
  Table, Card, Button, Row, Col,
  Statistic, Tag, Select, Modal, Input,
  Typography, Tabs, Drawer, Space,
  DatePicker, Badge, Empty,
  Divider, ColorPicker,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  DollarOutlined, CalendarOutlined,
  AppstoreOutlined, SettingOutlined,
  SearchOutlined, TagOutlined,
} from '@ant-design/icons';
import { FormField } from '@/components/shared/FormField';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ── Tipos ──────────────────────────────────────────────────────────────────────

type Categoria = {
  id: number;
  nombre: string;
  descripcion: string | null;
  color: string;
  activo: boolean;
  countGastos: number;
  createdAt: string;
  updatedAt: string;
};

type Gasto = {
  id: number;
  categoriaId: number;
  descripcion: string;
  monto: number;
  fecha: string;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
  categoria: {
    id: number;
    nombre: string;
    color: string;
  };
};

type ResumenCategoria = {
  categoriaId: number;
  nombre: string;
  color: string;
  total: number;
  count: number;
};

type Stats = {
  totalHoy: number;
  totalMes: number;
  totalAnio: number;
  categoriaTopMes: { nombre: string; color: string; total: number } | null;
};

type Props = {
  initialGastos:     Gasto[];
  initialCategorias: Categoria[];
  initialStats:      Stats;
  initialResumen:    ResumenCategoria[];
  mesFiltro:         number;
  anioFiltro:        number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatMoney(n: number) { return `$${n.toFixed(2)}`; }

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-SV', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const COLORES_PRESET = [
  '#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ef4444', '#10b981', '#f97316', '#06b6d4',
  '#84cc16', '#ec4899', '#6366f1', '#14b8a6',
];

// ── Componente ─────────────────────────────────────────────────────────────────

export default function GastosClient({
  initialGastos,
  initialCategorias,
  initialStats,
  initialResumen,
  mesFiltro,
  anioFiltro,
}: Props) {
  const [gastos,     setGastos]     = useState<Gasto[]>(initialGastos);
  const [categorias, setCategorias] = useState<Categoria[]>(initialCategorias);
  const [stats,      setStats]      = useState<Stats>(initialStats);
  const [resumen,    setResumen]    = useState<ResumenCategoria[]>(initialResumen);

  // Filtros tabla
  const [search,       setSearch]       = useState('');
  const [filterCat,    setFilterCat]    = useState<number | undefined>(undefined);
  const [dateRange,    setDateRange]    = useState<[string, string] | null>(null);

  // Modal gasto
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editGasto,    setEditGasto]    = useState<Gasto | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [fCategoria,   setFCategoria]   = useState<number | undefined>(undefined);
  const [fDesc,        setFDesc]        = useState('');
  const [fMonto,       setFMonto]       = useState('');
  const [fFecha,       setFFecha]       = useState<dayjs.Dayjs>(dayjs());
  const [fNotas,       setFNotas]       = useState('');
  const [formError,    setFormError]    = useState('');

  // Drawer categorías
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [catNombre,    setCatNombre]    = useState('');
  const [catColor,     setCatColor]     = useState('#0d9488');
  const [catDesc,      setCatDesc]      = useState('');
  const [savingCat,    setSavingCat]    = useState(false);
  const [editCat,      setEditCat]      = useState<Categoria | null>(null);
  const [catError,     setCatError]     = useState('');
  const drawerFormRef = useRef<HTMLDivElement>(null);

  // ── Lista filtrada ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = gastos;
    if (filterCat) list = list.filter(g => g.categoriaId === filterCat);
    if (dateRange) {
      const [desde, hasta] = dateRange;
      list = list.filter(g => {
        const f = g.fecha;
        return f >= desde && f <= hasta + 'T23:59:59';
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(g =>
        g.descripcion.toLowerCase().includes(q) ||
        g.categoria.nombre.toLowerCase().includes(q) ||
        (g.notas ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [gastos, filterCat, dateRange, search]);

  // ── Refrescar stats ─────────────────────────────────────────────────────────

  const refreshStats = useCallback(async () => {
    try {
      const [sRes, rRes] = await Promise.all([
        fetch('/api/gastos/resumen?mes=' + mesFiltro + '&anio=' + anioFiltro),
        fetch('/api/gastos/resumen?mes=' + mesFiltro + '&anio=' + anioFiltro),
      ]);
      if (sRes.ok) {
        const sJson = await sRes.json();
        setResumen(sJson.data ?? []);
      }
      void rRes;
    } catch { /* silencio */ }
  }, [mesFiltro, anioFiltro]);

  // ── Modal Gasto ─────────────────────────────────────────────────────────────

  function openCreate() {
    setEditGasto(null);
    setFCategoria(undefined);
    setFDesc(''); setFMonto('');
    setFFecha(dayjs()); setFNotas('');
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(g: Gasto) {
    setEditGasto(g);
    setFCategoria(g.categoriaId);
    setFDesc(g.descripcion);
    setFMonto(String(g.monto));
    setFFecha(dayjs(g.fecha));
    setFNotas(g.notas ?? '');
    setFormError('');
    setModalOpen(true);
  }

  async function handleSaveGasto() {
    if (!fCategoria)       { setFormError('Selecciona una categoría');    return; }
    if (!fDesc.trim())     { setFormError('La descripción es requerida'); return; }
    if (!fMonto || Number(fMonto) <= 0) { setFormError('El monto debe ser mayor a 0'); return; }

    setSaving(true); setFormError('');
    const body = {
      categoriaId: fCategoria,
      descripcion: fDesc.trim(),
      monto:       Number(fMonto),
      fecha:       fFecha.toISOString(),
      notas:       fNotas.trim() || null,
    };

    try {
      const isEdit = !!editGasto;
      const res = await fetch(isEdit ? `/api/gastos/${editGasto!.id}` : '/api/gastos', {
        method:  isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error?.message ?? 'Error al guardar';
        setFormError(msg); toast.error(msg); return;
      }
      const saved: Gasto = json.data;
      if (isEdit) {
        setGastos(prev => prev.map(g => g.id === saved.id ? saved : g));
        toast.success('Gasto actualizado');
      } else {
        setGastos(prev => [saved, ...prev]);
        setStats(prev => ({
          ...prev,
          totalHoy: prev.totalHoy + saved.monto,
          totalMes: prev.totalMes + saved.monto,
          totalAnio: prev.totalAnio + saved.monto,
        }));
        toast.success('Gasto registrado');
      }
      setModalOpen(false);
      void refreshStats();
    } catch {
      setFormError('Error de red'); toast.error('Error de red');
    } finally { setSaving(false); }
  }

  async function handleDeleteGasto(id: number) {
    try {
      const res = await fetch(`/api/gastos/${id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Error al eliminar gasto'); return; }
      const gasto = gastos.find(g => g.id === id);
      setGastos(prev => prev.filter(g => g.id !== id));
      if (gasto) {
        setStats(prev => ({
          ...prev,
          totalAnio: Math.max(0, prev.totalAnio - gasto.monto),
        }));
      }
      toast.success('Gasto eliminado');
      void refreshStats();
    } catch { toast.error('Error de red'); }
  }

  // ── Drawer Categorías ────────────────────────────────────────────────────────

  function openDrawer() {
    setEditCat(null);
    setCatNombre(''); setCatColor('#0d9488');
    setCatDesc(''); setCatError('');
    setDrawerOpen(true);
  }

  function startEditCat(c: Categoria) {
    setEditCat(c);
    setCatNombre(c.nombre);
    setCatColor(c.color);
    setCatDesc(c.descripcion ?? '');
    setCatError('');
    // Scroll al formulario de edición en el drawer
    setTimeout(() => {
      drawerFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  async function handleSaveCat() {
    if (!catNombre.trim()) { setCatError('El nombre es requerido'); return; }
    setSavingCat(true); setCatError('');
    const body = {
      nombre:      catNombre.trim(),
      color:       catColor,
      descripcion: catDesc.trim() || null,
    };

    try {
      const isEdit = !!editCat;
      const res = await fetch(
        isEdit ? `/api/gastos/categorias/${editCat!.id}` : '/api/gastos/categorias',
        {
          method:  isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error?.message ?? 'Error al guardar categoría';
        setCatError(msg); toast.error(msg); return;
      }
      const saved: Categoria = json.data;
      if (isEdit) {
        setCategorias(prev => prev.map(c => c.id === saved.id ? saved : c));
        toast.success('Categoría actualizada');
      } else {
        setCategorias(prev => [...prev, saved]);
        toast.success('Categoría creada');
      }
      setEditCat(null);
      setCatNombre(''); setCatColor('#0d9488'); setCatDesc('');
    } catch {
      setCatError('Error de red'); toast.error('Error de red');
    } finally { setSavingCat(false); }
  }

  async function handleDeleteCat(id: number) {
    try {
      const res = await fetch(`/api/gastos/categorias/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'No se puede eliminar'); return;
      }
      setCategorias(prev => prev.filter(c => c.id !== id));
      toast.success('Categoría eliminada');
    } catch { toast.error('Error de red'); }
  }

  // ── Columnas tabla ──────────────────────────────────────────────────────────

  const columns: ColumnsType<Gasto> = [
    {
      title: 'Fecha',
      key:   'fecha',
      width: 120,
      render: (_, r) => (
        <Text style={{ fontSize: 13 }}>{formatFecha(r.fecha)}</Text>
      ),
      sorter: (a, b) => a.fecha.localeCompare(b.fecha),
      defaultSortOrder: 'descend',
    },
    {
      title:  'Categoría',
      key:    'categoria',
      width:  160,
      render: (_, r) => (
        <Tag
          style={{
            borderColor: r.categoria.color,
            color:       r.categoria.color,
            background:  r.categoria.color + '18',
            fontWeight:  500,
          }}
        >
          <span
            style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: r.categoria.color, marginRight: 6,
            }}
          />
          {r.categoria.nombre}
        </Tag>
      ),
      filters: categorias.map(c => ({ text: c.nombre, value: c.id })),
      onFilter: (value, record) => record.categoriaId === value,
    },
    {
      title:  'Descripción',
      key:    'descripcion',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{r.descripcion}</div>
          {r.notas && (
            <Text type="secondary" style={{ fontSize: 11 }}>{r.notas}</Text>
          )}
        </div>
      ),
    },
    {
      title:  'Monto',
      key:    'monto',
      width:  110,
      align:  'right',
      render: (_, r) => (
        <Text strong style={{ color: '#ef4444', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(r.monto)}
        </Text>
      ),
      sorter: (a, b) => a.monto - b.monto,
    },
    {
      title:  'Acciones',
      key:    'acciones',
      width:  90,
      align:  'center',
      render: (_, r) => (
        <Space size={4}>
          <Button
            type="text" size="small" icon={<EditOutlined />}
            onClick={() => openEdit(r)}
          />
          <Button
            type="text" size="small" danger icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: 'Eliminar gasto',
                content: 'Esta acción no se puede deshacer.',
                okText: 'Eliminar',
                cancelText: 'Cancelar',
                okButtonProps: { danger: true },
                onOk: () => handleDeleteGasto(r.id),
              });
            }}
          />
        </Space>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  const totalFiltrado = filtered.reduce((s, g) => s + g.monto, 0);

  return (
    <>
      {/* ── KPIs fila 1 ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: '3px solid #f59e0b' }}>
            <Statistic
              title="Gastos hoy"
              value={stats.totalHoy}
              precision={2}
              prefix={<DollarOutlined style={{ color: '#f59e0b' }} />}
              valueStyle={{ color: '#f59e0b', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: '3px solid #ef4444' }}>
            <Statistic
              title="Gastos este mes"
              value={stats.totalMes}
              precision={2}
              prefix={<CalendarOutlined style={{ color: '#ef4444' }} />}
              valueStyle={{ color: '#ef4444', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: '3px solid #6b7280' }}>
            <Statistic
              title="Gastos este año"
              value={stats.totalAnio}
              precision={2}
              prefix={<DollarOutlined style={{ color: '#6b7280' }} />}
              valueStyle={{ color: '#6b7280', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: '3px solid #8b5cf6' }}>
            {stats.categoriaTopMes ? (
              <Statistic
                title={
                  <span>
                    <span
                      style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        background: stats.categoriaTopMes.color, marginRight: 6,
                      }}
                    />
                    Categoría top del mes
                  </span>
                }
                value={stats.categoriaTopMes.total}
                precision={2}
                suffix={
                  <span style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 4 }}>
                    {stats.categoriaTopMes.nombre}
                  </span>
                }
                valueStyle={{ color: '#8b5cf6', fontSize: 18 }}
              />
            ) : (
              <Statistic title="Categoría top del mes" value="—" valueStyle={{ fontSize: 18 }} />
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Resumen por categoría (mes actual) ── */}
      {resumen.length > 0 && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {resumen.map(r => (
            <Col xs={12} sm={8} md={6} lg={4} key={r.categoriaId}>
              <Card size="small" hoverable>
                <Space align="center" size={10}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: r.color, flexShrink: 0,
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: '#8c8c8c', lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.nombre}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: r.color }}>
                      {formatMoney(r.total)}
                    </div>
                    <div style={{ fontSize: 10, color: '#bfbfbf' }}>
                      {r.count} {r.count === 1 ? 'gasto' : 'gastos'}
                    </div>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* ── Tabla principal ── */}
      <Card>
        {/* Toolbar */}
        <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 12 }}>
          <Col flex="1">
            <Input
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Buscar descripción, categoría o notas..."
              allowClear
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 360 }}
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
            <RangePicker
              style={{ width: 240 }}
              onChange={(_, strs) => {
                if (strs[0] && strs[1]) setDateRange([strs[0], strs[1]]);
                else setDateRange(null);
              }}
            />
          </Col>
          <Col>
            <Button
              icon={<SettingOutlined />}
              onClick={openDrawer}
            >
              Categorías
            </Button>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Nuevo gasto
            </Button>
          </Col>
        </Row>

        {/* Total del filtro */}
        {filtered.length > 0 && (
          <div style={{ textAlign: 'right', padding: '0 0 8px' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Total filtrado: </Text>
            <Text strong style={{ color: '#ef4444' }}>{formatMoney(totalFiltrado)}</Text>
          </div>
        )}

        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          size="small"
          scroll={{ x: 700 }}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ['15', '30', '50'],
            showTotal: (t, range) => `${range[0]}–${range[1]} de ${t} gastos`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ color: '#8c8c8c' }}>
                    No hay gastos registrados
                  </span>
                }
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  Registrar primer gasto
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* ── Modal: Nuevo / Editar Gasto ── */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={
          <Space>
            <DollarOutlined style={{ color: '#ef4444' }} />
            <span>{editGasto ? 'Editar gasto' : 'Nuevo gasto'}</span>
          </Space>
        }
        footer={null}
        destroyOnHidden
        width={480}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
          <FormField label="Categoría *">
            <Select
              style={{ width: '100%' }}
              placeholder="Seleccionar categoría..."
              value={fCategoria}
              onChange={v => setFCategoria(v)}
              showSearch
              filterOption={(input, opt) =>
                (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={categorias.map(c => ({ value: c.id, label: c.nombre }))}
              dropdownRender={menu => (
                <>
                  {menu}
                  <Divider style={{ margin: '6px 0' }} />
                  <div style={{ padding: '4px 8px' }}>
                    <Button
                      type="link"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => { setModalOpen(false); openDrawer(); }}
                      style={{ padding: 0 }}
                    >
                      Nueva categoría
                    </Button>
                  </div>
                </>
              )}
            />
          </FormField>

          <FormField label="Descripción *">
            <Input
              value={fDesc}
              onChange={e => setFDesc(e.target.value)}
              placeholder="Ej: Papel de tienda, Servicio de agua..."
              maxLength={200}
            />
          </FormField>

          <Row gutter={12}>
            <Col span={12}>
              <FormField label="Monto ($) *">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  prefix="$"
                  value={fMonto}
                  onChange={e => setFMonto(e.target.value)}
                  placeholder="0.00"
                />
              </FormField>
            </Col>
            <Col span={12}>
              <FormField label="Fecha *">
                <DatePicker
                  style={{ width: '100%' }}
                  value={fFecha}
                  onChange={d => { if (d) setFFecha(d); }}
                  format="DD/MM/YYYY"
                  allowClear={false}
                />
              </FormField>
            </Col>
          </Row>

          <FormField label="Notas">
            <Input.TextArea
              value={fNotas}
              onChange={e => setFNotas(e.target.value)}
              placeholder="Observaciones opcionales"
              rows={2}
              maxLength={500}
            />
          </FormField>

          {formError && (
            <p style={{ color: '#ff4d4f', fontSize: 13, margin: 0 }}>{formError}</p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button
            type="primary"
            loading={saving}
            onClick={handleSaveGasto}
            style={{ background: '#ef4444', borderColor: '#ef4444' }}
          >
            {saving ? 'Guardando...' : editGasto ? 'Guardar cambios' : 'Registrar gasto'}
          </Button>
        </div>
      </Modal>

      {/* ── Drawer: Gestionar Categorías ── */}
      <Drawer
        title={
          <Space>
            <TagOutlined style={{ color: '#0d9488' }} />
            <span>Gestionar categorías</span>
          </Space>
        }
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditCat(null); }}
        width={400}
      >
        {/* Lista de categorías existentes */}
        <div style={{ marginBottom: 24 }}>
          <Text strong style={{ fontSize: 13, color: '#555' }}>
            Categorías activas ({categorias.length})
          </Text>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categorias.length === 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>Sin categorías aún. Crea la primera.</Text>
            )}
            {categorias.map(c => (
              <div
                key={c.id}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '8px 12px', borderRadius: 8,
                  border: '1px solid #f0f0f0',
                  background: editCat?.id === c.id ? '#f0fdfa' : '#fafafa',
                }}
              >
                <span style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: c.color, marginRight: 10, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{c.nombre}</div>
                  {c.descripcion && (
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>{c.descripcion}</div>
                  )}
                  <Badge count={c.countGastos} style={{ backgroundColor: c.color, fontSize: 10 }} />
                </div>
                <Space size={4}>
                  <Button
                    type="text" size="small" icon={<EditOutlined />}
                    onClick={() => startEditCat(c)}
                  />
                  <Button
                    type="text" size="small" danger
                    icon={<DeleteOutlined />}
                    disabled={(c.countGastos ?? 0) > 0}
                    title={(c.countGastos ?? 0) > 0 ? `Tiene ${c.countGastos} gasto(s), no se puede eliminar` : 'Eliminar categoría'}
                    onClick={() => {
                      Modal.confirm({
                        title: 'Eliminar categoría',
                        content: 'Esta acción no se puede deshacer.',
                        okText: 'Eliminar',
                        cancelText: 'Cancelar',
                        okButtonProps: { danger: true },
                        onOk: () => handleDeleteCat(c.id),
                      });
                    }}
                  />
                </Space>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        {/* Formulario nueva / editar categoría */}
        <div ref={drawerFormRef}>
          <Text strong style={{ fontSize: 13 }}>
            {editCat ? 'Editar categoría' : 'Nueva categoría'}
          </Text>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <FormField label="Nombre *">
              <Input
                value={catNombre}
                onChange={e => setCatNombre(e.target.value)}
                placeholder="Ej: Suministros, Servicios, Alquiler..."
                maxLength={80}
              />
            </FormField>

            <FormField label="Color">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {COLORES_PRESET.map(col => (
                  <button
                    key={col}
                    onClick={() => setCatColor(col)}
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: col, border: catColor === col ? '3px solid #333' : '2px solid transparent',
                      cursor: 'pointer', padding: 0,
                    }}
                  />
                ))}
                <ColorPicker
                  value={catColor}
                  onChange={(_, hex) => setCatColor(hex)}
                  size="small"
                />
              </div>
            </FormField>

            <FormField label="Descripción">
              <Input
                value={catDesc}
                onChange={e => setCatDesc(e.target.value)}
                placeholder="Descripción opcional"
                maxLength={200}
              />
            </FormField>

            {catError && (
              <p style={{ color: '#ff4d4f', fontSize: 12, margin: 0 }}>{catError}</p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              {editCat && (
                <Button
                  onClick={() => {
                    setEditCat(null);
                    setCatNombre(''); setCatColor('#0d9488'); setCatDesc('');
                  }}
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="primary"
                icon={editCat ? <EditOutlined /> : <PlusOutlined />}
                loading={savingCat}
                onClick={handleSaveCat}
                block={!editCat}
              >
                {savingCat
                  ? 'Guardando...'
                  : editCat ? 'Guardar cambios' : 'Crear categoría'}
              </Button>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
}
