'use client';

// ══════════════════════════════════════════════════════════════════════════════
// INVENTARIO — Ant Design 5 Client Component
// KPIs | Tabs: Productos / Kardex general
// Modal crear/editar producto | Drawer kardex de producto
// Modal ajuste de stock (ENTRADA / SALIDA / AJUSTE)
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Table, Card, Button, Row, Col,
  Statistic, Tag, Select, Modal, Input,
  Typography, Tooltip, Drawer, Space,
  Progress, Popconfirm, InputNumber,
  Badge, Switch, Tabs,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  HistoryOutlined, WarningOutlined,
  AppstoreOutlined, InboxOutlined, SwapOutlined,
  SearchOutlined, ShoppingOutlined, TagsOutlined,
} from '@ant-design/icons';
import { FormField } from '@/components/shared/FormField';
import { useBarberTheme } from '@/context/ThemeContext';

const { Text } = Typography;

// ── Tipos ───────────────────────────────────────────────────────────────────

type Categoria = {
  id: number;
  nombre: string;
  color: string;
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
  unidadVenta: { id: number; nombre: string; simbolo: string | null } | null;
  factorConversion: number;
  activo: boolean;
  stockBajo: boolean;
};

type KardexItem = {
  id: number;
  tenantId: number;
  productoId: number;
  tipoMovimiento: string;
  referencia: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  stockAnterior: number;
  stockNuevo: number;
  notas: string | null;
  fecha: string;
  producto?: { id: number; codigo: string; nombre: string; unidadMedida: string } | null;
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
  initialKardex: KardexItem[];
  initialKardexTotal: number;
};

// ── Constantes ──────────────────────────────────────────────────────────────

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

const TIPO_MOVIMIENTO_COLORS: Record<string, string> = {
  COMPRA: 'green',
  ENTRADA: 'blue',
  SALIDA: 'orange',
  AJUSTE: 'purple',
  ANULACION: 'red',
};

const TIPO_MOVIMIENTO_LABELS: Record<string, string> = {
  COMPRA: 'Compra',
  ENTRADA: 'Entrada',
  SALIDA: 'Salida',
  AJUSTE: 'Ajuste',
  ANULACION: 'Anulación',
};

const UNIDADES_MEDIDA = [
  { value: 'UNIDAD', label: 'Unidad' },
  { value: 'KG', label: 'Kilogramo (KG)' },
  { value: 'LITRO', label: 'Litro (L)' },
  { value: 'ML', label: 'Mililitro (ML)' },
  { value: 'G', label: 'Gramo (G)' },
  { value: 'CAJA', label: 'Caja' },
];

const TIPO_AJUSTE_OPTIONS = [
  { value: 'ENTRADA', label: 'Entrada de stock' },
  { value: 'SALIDA', label: 'Salida de stock' },
  { value: 'AJUSTE', label: 'Ajuste de inventario' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatMoney(n: number) { return `$${n.toFixed(2)}`; }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-SV', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?';
}

function stockPercent(actual: number, minimo: number): number {
  if (minimo <= 0) return actual > 0 ? 100 : 0;
  // Porcentaje respecto a 2× el mínimo como referencia de "lleno"
  const ref = minimo * 2;
  return Math.min(100, Math.round((actual / ref) * 100));
}

function stockStatus(actual: number, minimo: number): 'success' | 'exception' | 'normal' {
  if (actual <= 0) return 'exception';
  if (actual <= minimo) return 'exception';
  if (actual <= minimo * 1.2) return 'normal';
  return 'success';
}

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
  unidadMedida: 'UNIDAD',
};

// ── Componente principal ─────────────────────────────────────────────────────

export default function InventarioClient({
  initialProductos,
  initialCategorias,
  initialResumen,
  initialKardex,
  initialKardexTotal,
}: Props) {
  const { theme: barberTheme } = useBarberTheme()
  const primary = barberTheme.colorPrimary
  const router = useRouter()
  const C = {
    bgPage: 'hsl(var(--bg-page))',
    bgSurface: 'hsl(var(--bg-surface))',
    bgSubtle: 'hsl(var(--bg-subtle))',
    bgMuted: 'hsl(var(--bg-muted))',
    bgPrimaryLow: `${primary}18`,
    textPrimary: 'hsl(var(--text-primary))',
    textSecondary: 'hsl(var(--text-secondary))',
    textMuted: 'hsl(var(--text-muted))',
    textDisabled: 'hsl(var(--text-disabled))',
    border: 'hsl(var(--border-default))',
    borderStrong: 'hsl(var(--border-strong))',
  }

  // ── Estado global ──────────────────────────────────────────────────────────
  const [productos, setProductos] = useState<Producto[]>(initialProductos);
  const [categorias, setCategorias] = useState<Categoria[]>(initialCategorias);
  const [resumen, setResumen] = useState<Resumen>(initialResumen);

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'productos' | 'kardex'>('productos');

  // ── Kardex general ─────────────────────────────────────────────────────────
  const [kardexGeneral, setKardexGeneral] = useState<KardexItem[]>(initialKardex);
  const [kardexGeneralTotal, setKardexGeneralTotal] = useState(initialKardexTotal);
  const [kardexGeneralPage, setKardexGeneralPage] = useState(1);
  const [kardexGeneralLoading, setKardexGeneralLoading] = useState(false);

  // ── Filtros de tabla ───────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<number | undefined>(undefined);
  const [soloStockBajo, setSoloStockBajo] = useState(false);

  // ── Modal Producto (crear/editar) ─────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Producto | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({ ...FORM_EMPTY });
  const [newCatName, setNewCatName] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  // ── Drawer Categorías ──────────────────────────────────────────────────────
  const [catDrawerOpen, setCatDrawerOpen] = useState(false);
  const [catFormName, setCatFormName] = useState('');
  const [catFormColor, setCatFormColor] = useState('blue');
  const [catSaving, setCatSaving] = useState(false);
  // Edit
  const [catEditTarget, setCatEditTarget] = useState<Categoria | null>(null);
  const [catEditOpen, setCatEditOpen] = useState(false);
  const [catEditName, setCatEditName] = useState('');
  const [catEditColor, setCatEditColor] = useState('blue');
  const [catEditSaving, setCatEditSaving] = useState(false);

  // ── Drawer Kardex de producto ───────────────────────────────────────────────
  const [kardexOpen, setKardexOpen] = useState(false);
  const [kardexProducto, setKardexProducto] = useState<Producto | null>(null);
  const [kardexItems, setKardexItems] = useState<KardexItem[]>([]);
  const [kardexTotal, setKardexTotal] = useState(0);
  const [kardexLoading, setKardexLoading] = useState(false);

  // ── Modal Ajuste de Stock ──────────────────────────────────────────────────
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [ajusteTarget, setAjusteTarget] = useState<Producto | null>(null);
  // When opened globally (no specific product), allow picking from dropdown
  const [ajusteProductoId, setAjusteProductoId] = useState<number | undefined>(undefined);
  const [ajusteLoading, setAjusteLoading] = useState(false);
  const [ajusteError, setAjusteError] = useState('');
  const [ajusteTipo, setAjusteTipo] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE'>('ENTRADA');
  const [ajusteCantidad, setAjusteCantidad] = useState<number | null>(null);
  const [ajusteCosto, setAjusteCosto] = useState<number | null>(null);
  const [ajusteReferencia, setAjusteReferencia] = useState('');
  const [ajusteNotas, setAjusteNotas] = useState('');

  // ── Lista filtrada ─────────────────────────────────────────────────────────
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
    if (soloStockBajo) {
      list = list.filter(p => p.stockBajo);
    }
    return list;
  }, [productos, search, filterCat, soloStockBajo]);

  // ── Handlers: Producto Modal ───────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null);
    setFormData({ ...FORM_EMPTY });
    setFormError('');
    setNewCatName('');
    setModalOpen(true);
  }

  function openEdit(p: Producto) {
    setEditTarget(p);
    setFormData({
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      categoriaId: p.categoriaId ?? undefined,
      precioVenta: p.precioVenta,
      precioComision: p.precioComision ?? undefined,
      stockMinimo: p.stockMinimo,
      stockInicial: undefined,
      unidadMedida: p.unidadMedida,
    });
    setFormError('');
    setNewCatName('');
    setModalOpen(true);
  }

  async function handleSaveCategoria() {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    try {
      const res = await fetch('/api/productos/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: newCatName.trim(), color: catFormColor }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al crear categoría'); return; }
      const cat: Categoria = json.data;
      setCategorias(prev => [...prev, cat].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setFormData(prev => ({ ...prev, categoriaId: cat.id }));
      setNewCatName('');
      setResumen(prev => ({ ...prev, totalCategorias: prev.totalCategorias + 1 }));
      toast.success(`Categoría "${cat.nombre}" creada`);
    } catch {
      toast.error('Error de red');
    } finally {
      setSavingCat(false);
    }
  }

  // ── Handlers: Categorías Drawer ────────────────────────────────────────────

  async function handleCreateCatDrawer() {
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
    } catch {
      toast.error('Error de red');
    } finally {
      setCatSaving(false);
    }
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
      setCategorias(prev =>
        prev.map(c => c.id === updated.id ? updated : c).sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
      setCatEditOpen(false);
      toast.success(`Categoría "${updated.nombre}" actualizada`);
    } catch {
      toast.error('Error de red');
    } finally {
      setCatEditSaving(false);
    }
  }

  async function handleDeleteCat(cat: Categoria) {
    try {
      const res = await fetch(`/api/productos/categorias/${cat.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al eliminar'); return; }
      setCategorias(prev => prev.filter(c => c.id !== cat.id));
      setResumen(prev => ({ ...prev, totalCategorias: Math.max(0, prev.totalCategorias - 1) }));
      toast.success(`Categoría "${cat.nombre}" eliminada`);
    } catch {
      toast.error('Error de red');
    }
  }

  async function handleSubmitProducto() {
    if (!formData.codigo.trim()) { setFormError('El código es requerido'); return; }
    if (!formData.nombre.trim()) { setFormError('El nombre es requerido'); return; }
    if (!formData.precioVenta || formData.precioVenta <= 0) {
      setFormError('El precio de venta debe ser mayor a 0');
      return;
    }

    setFormLoading(true);
    setFormError('');

    const payload = {
      codigo: formData.codigo.trim().toUpperCase(),
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion?.trim() || undefined,
      categoriaId: formData.categoriaId,
      precioVenta: formData.precioVenta,
      precioComision: formData.precioComision ?? null,
      stockMinimo: formData.stockMinimo ?? 0,
      stockInicial: formData.stockInicial ?? 0,
      unidadMedida: formData.unidadMedida,
    };

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
          productosStockBajo: saved.stockBajo
            ? prev.productosStockBajo + 1
            : prev.productosStockBajo,
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

  // ── Handler: Desactivar ────────────────────────────────────────────────────

  async function handleDeactivate(p: Producto) {
    try {
      const res = await fetch(`/api/productos/${p.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al desactivar'); return; }
      setProductos(prev => prev.filter(x => x.id !== p.id));
      setResumen(prev => ({
        ...prev,
        totalProductos: Math.max(0, prev.totalProductos - 1),
        productosStockBajo: p.stockBajo
          ? Math.max(0, prev.productosStockBajo - 1)
          : prev.productosStockBajo,
      }));
      toast.success(`Producto "${p.nombre}" desactivado`);
    } catch {
      toast.error('Error de red');
    }
  }

  // ── Handler: Kardex ────────────────────────────────────────────────────────

  async function openKardex(p: Producto) {
    setKardexProducto(p);
    setKardexOpen(true);
    setKardexLoading(true);
    try {
      const res = await fetch(`/api/productos/${p.id}/kardex?limit=50`);
      const json = await res.json();
      if (res.ok) {
        setKardexItems(json.data.items);
        setKardexTotal(json.data.total);
      }
    } catch {
      toast.error('Error al cargar kardex');
    } finally {
      setKardexLoading(false);
    }
  }

  // ── Handler: Kardex general (tab, paginación servidor) ───────────────────

  async function loadKardexGeneral(page = 1) {
    setKardexGeneralLoading(true);
    try {
      const res = await fetch(`/api/productos/kardex-general?page=${page}&limit=30`);
      const json = await res.json();
      if (res.ok) {
        setKardexGeneral(json.data.items);
        setKardexGeneralTotal(json.data.total);
        setKardexGeneralPage(page);
      } else {
        toast.error(json.error?.message ?? 'Error al cargar kardex');
      }
    } catch {
      toast.error('Error al cargar kardex');
    } finally {
      setKardexGeneralLoading(false);
    }
  }

  // ── Handler: Ajuste de stock ───────────────────────────────────────────────

  function openAjuste(p?: Producto) {
    setAjusteTarget(p ?? null);
    setAjusteProductoId(p?.id);
    setAjusteTipo('ENTRADA');
    setAjusteCantidad(null);
    setAjusteCosto(p && p.costoPromedio > 0 ? p.costoPromedio : null);
    setAjusteReferencia('');
    setAjusteNotas('');
    setAjusteError('');
    setAjusteOpen(true);
  }

  // Get effective product for ajuste (could be selected from dropdown)
  const ajusteEffectiveProducto = useMemo(() => {
    if (ajusteTarget) return ajusteTarget;
    if (ajusteProductoId) return productos.find(p => p.id === ajusteProductoId) ?? null;
    return null;
  }, [ajusteTarget, ajusteProductoId, productos]);

  async function handleSubmitAjuste() {
    const efectivo = ajusteEffectiveProducto;
    if (!efectivo) { setAjusteError('Selecciona un producto'); return; }
    if (ajusteCantidad === null || ajusteCantidad < 0) {
      setAjusteError('La cantidad debe ser mayor o igual a 0'); return;
    }
    if (!ajusteReferencia.trim()) {
      setAjusteError('La referencia es requerida'); return;
    }

    setAjusteLoading(true);
    setAjusteError('');

    try {
      const res = await fetch(`/api/productos/${efectivo.id}/ajustar-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoMovimiento: ajusteTipo,
          cantidad: ajusteCantidad,
          costoUnitario: ajusteCosto ?? efectivo.costoPromedio,
          referencia: ajusteReferencia.trim(),
          notas: ajusteNotas.trim() || undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        const msg = json.error?.message ?? 'Error al ajustar stock';
        setAjusteError(msg); toast.error(msg); return;
      }

      const updated: Producto = json.data;
      setProductos(prev => prev.map(p => p.id === updated.id ? updated : p));

      // Recalcular resumen (diferencia de stockBajo)
      const wasStockBajo = efectivo.stockBajo;
      const isStockBajo = updated.stockBajo;
      if (wasStockBajo !== isStockBajo) {
        setResumen(prev => ({
          ...prev,
          productosStockBajo: isStockBajo
            ? prev.productosStockBajo + 1
            : Math.max(0, prev.productosStockBajo - 1),
        }));
      }

      toast.success('Stock ajustado correctamente');
      setAjusteOpen(false);

      // Si el kardex drawer está abierto para el mismo producto, refrescar
      if (kardexOpen && kardexProducto?.id === updated.id) {
        openKardex(updated);
      }
    } catch {
      setAjusteError('Error de red'); toast.error('Error de red');
    } finally {
      setAjusteLoading(false);
    }
  }

  // ── Columnas de la tabla ───────────────────────────────────────────────────

  const columns: ColumnsType<Producto> = [
    {
      title: 'Código',
      key: 'codigo',
      width: 110,
      render: (_, r) => (
        <Text code style={{ fontSize: 12 }}>{r.codigo}</Text>
      ),
    },
    {
      title: 'Producto',
      key: 'nombre',
      render: (_, r) => (
        <Space size={10}>
          {/* Avatar con iniciales */}
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: r.stockBajo ? '#fff1f0' : `${primary}18`,
            border: `1px solid ${r.stockBajo ? '#ffa39e' : `${primary}30`}`,
            color: r.stockBajo ? '#cf1322' : primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
          }}>
            {getInitials(r.nombre)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, lineHeight: '18px' }}>
              {r.nombre}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              {r.categoria && (
                <Tag color={(categorias.find(c => c.id === r.categoria?.id)?.color) ?? 'teal'} style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>
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
      title: 'Stock',
      key: 'stock',
      width: 200,
      render: (_, r) => {
        const pct = stockPercent(r.stockActual, r.stockMinimo);
        const status = stockStatus(r.stockActual, r.stockMinimo);
        const factor = Number(r.factorConversion ?? 1);
        const unidVenta = r.unidadVenta?.nombre ?? r.unidadMedida;
        const enCompra = factor > 1 ? (r.stockActual / factor).toFixed(2) : null;
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ fontSize: 13, fontWeight: 600, color: status === 'exception' ? '#cf1322' : primary }}>
                {r.stockActual} {unidVenta}
              </Text>
              {r.stockBajo && (
                <Tooltip title={`Stock mínimo: ${r.stockMinimo}`}>
                  <Tag color="error" style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>Bajo</Tag>
                </Tooltip>
              )}
            </div>
            <Progress
              percent={pct}
              status={status}
              size="small"
              showInfo={false}
              strokeColor={status === 'exception' ? '#ff4d4f' : status === 'normal' ? '#faad14' : primary}
              trailColor={C.bgMuted}
            />
            <Text type="secondary" style={{ fontSize: 10 }}>
              Mín: {r.stockMinimo} {unidVenta}
              {enCompra && (
                <span style={{ marginLeft: 6 }}>
                  · {enCompra} {r.unidadCompra}
                </span>
              )}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Costo prom.',
      key: 'costo',
      width: 110,
      align: 'right',
      responsive: ['md'],
      render: (_, r) => (
        <Text style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(r.costoPromedio)}
        </Text>
      ),
    },
    {
      title: 'Precio venta',
      key: 'precio',
      width: 120,
      align: 'right',
      render: (_, r) => (
        <Text strong style={{ color: primary, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(r.precioVenta)}
        </Text>
      ),
    },
    {
      title: 'Unidad',
      key: 'unidad',
      width: 110,
      responsive: ['lg'],
      render: (_, r) => {
        const factor = Number(r.factorConversion ?? 1);
        const unidVenta = r.unidadVenta?.nombre ?? r.unidadMedida;
        if (factor > 1) {
          return (
            <Tooltip title={`1 ${r.unidadCompra} = ${factor} ${unidVenta}`}>
              <Tag color="blue" style={{ fontSize: 10 }}>
                {r.unidadCompra} / {unidVenta}
              </Tag>
            </Tooltip>
          );
        }
        return <Tag style={{ fontSize: 10 }}>{unidVenta}</Tag>;
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Editar">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(r)}
            />
          </Tooltip>
          <Tooltip title="Kardex / Movimientos">
            <Button
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => openKardex(r)}
            />
          </Tooltip>
          <Tooltip title="Ajustar stock">
            <Button
              size="small"
              icon={<SwapOutlined />}
              onClick={() => openAjuste(r)}
            />
          </Tooltip>
          <Popconfirm
            title="¿Desactivar producto?"
            description="El producto quedará inactivo y no aparecerá en el inventario."
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

  // ── Columnas Kardex ────────────────────────────────────────────────────────

  const kardexColumns: ColumnsType<KardexItem> = [
    {
      title: 'Tipo',
      key: 'tipo',
      width: 110,
      render: (_, k) => (
        <Tag color={TIPO_MOVIMIENTO_COLORS[k.tipoMovimiento] ?? 'default'} style={{ fontSize: 11 }}>
          {TIPO_MOVIMIENTO_LABELS[k.tipoMovimiento] ?? k.tipoMovimiento}
        </Tag>
      ),
    },
    {
      title: 'Referencia',
      key: 'ref',
      render: (_, k) => (
        <div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>{k.referencia}</div>
          {k.notas && (
            <Text type="secondary" style={{ fontSize: 11 }}>{k.notas}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Cantidad',
      key: 'cantidad',
      width: 90,
      align: 'right',
      render: (_, k) => (
        <Text style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
          {k.tipoMovimiento === 'SALIDA' ? '-' : '+'}{Math.abs(k.cantidad)}
        </Text>
      ),
    },
    {
      title: 'Costo unit.',
      key: 'costoU',
      width: 100,
      align: 'right',
      responsive: ['md'],
      render: (_, k) => (
        <Text type="secondary" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(k.costoUnitario)}
        </Text>
      ),
    },
    {
      title: 'Stock',
      key: 'stock',
      width: 130,
      render: (_, k) => (
        <Space>
          <Text type="secondary" style={{ fontSize: 11 }}>{k.stockAnterior}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>→</Text>
          <Text strong style={{ fontSize: 12, color: k.stockNuevo < k.stockAnterior ? '#cf1322' : primary }}>
            {k.stockNuevo}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Fecha',
      key: 'fecha',
      width: 140,
      responsive: ['lg'],
      render: (_, k) => (
        <Text type="secondary" style={{ fontSize: 11 }}>{formatDate(k.fecha)}</Text>
      ),
    },
  ];

  // ── Columnas Kardex general ───────────────────────────────────────────────

  const kardexGeneralColumns: ColumnsType<KardexItem> = [
    {
      title: 'Fecha',
      key: 'fecha',
      width: 145,
      render: (_, k) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(k.fecha)}</Text>
      ),
    },
    {
      title: 'Producto',
      key: 'producto',
      render: (_, k) => k.producto ? (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{k.producto.nombre}</div>
          <Text code style={{ fontSize: 10 }}>{k.producto.codigo}</Text>
        </div>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Tipo',
      key: 'tipo',
      width: 115,
      render: (_, k) => (
        <Tag
          color={TIPO_MOVIMIENTO_COLORS[k.tipoMovimiento] ?? 'default'}
          style={{ fontSize: 11 }}
        >
          {TIPO_MOVIMIENTO_LABELS[k.tipoMovimiento] ?? k.tipoMovimiento}
        </Tag>
      ),
    },
    {
      title: 'Referencia',
      key: 'ref',
      render: (_, k) => (
        <div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>{k.referencia}</div>
          {k.notas && (
            <Text type="secondary" style={{ fontSize: 11 }}>{k.notas}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Cantidad',
      key: 'cantidad',
      width: 90,
      align: 'right',
      render: (_, k) => {
        const esSalida = k.tipoMovimiento === 'SALIDA' || k.tipoMovimiento === 'ANULACION';
        return (
          <Text style={{
            fontVariantNumeric: 'tabular-nums',
            fontSize: 13,
            color: esSalida ? '#cf1322' : '#389e0d',
            fontWeight: 600,
          }}>
            {esSalida ? '-' : '+'}{Math.abs(k.cantidad)}
          </Text>
        );
      },
    },
    {
      title: 'Costo unit.',
      key: 'costoU',
      width: 100,
      align: 'right',
      responsive: ['md'],
      render: (_, k) => (
        <Text type="secondary" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(k.costoUnitario)}
        </Text>
      ),
    },
    {
      title: 'Stock ant. → nuevo',
      key: 'stock',
      width: 140,
      responsive: ['lg'],
      render: (_, k) => (
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: 11 }}>{k.stockAnterior}</Text>
          <Text type="secondary">→</Text>
          <Text strong style={{ fontSize: 12, color: k.stockNuevo < k.stockAnterior ? '#cf1322' : primary }}>
            {k.stockNuevo}
          </Text>
        </Space>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── KPIs ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${primary}` }}>
            <Statistic
              title="Total productos"
              value={resumen.totalProductos}
              prefix={<ShoppingOutlined style={{ color: primary }} />}
              valueStyle={{ color: primary, fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${resumen.productosStockBajo > 0 ? '#ff4d4f' : C.border}` }}>
            <Statistic
              title={
                resumen.productosStockBajo > 0
                  ? <Space size={4}><span>Stock bajo</span><Badge count={resumen.productosStockBajo} size="small" /></Space>
                  : 'Stock bajo'
              }
              value={resumen.productosStockBajo}
              prefix={<WarningOutlined style={{ color: resumen.productosStockBajo > 0 ? '#ff4d4f' : C.textDisabled }} />}
              valueStyle={{ color: resumen.productosStockBajo > 0 ? '#ff4d4f' : C.textDisabled, fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: '3px solid #52c41a' }}>
            <Statistic
              title="Valor inventario"
              value={resumen.valorInventario}
              precision={2}
              prefix={<AppstoreOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: '3px solid #722ed1' }}>
            <Statistic
              title="Categorías"
              value={resumen.totalCategorias}
              prefix={<InboxOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1', fontSize: 22 }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Tabs principales ── */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={k => setActiveTab(k as 'productos' | 'kardex')}
          size="small"
          items={[
            {
              key: 'productos',
              label: `Productos (${resumen.totalProductos})`,
              children: (
                <>
                  {/* Toolbar */}
                  <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 14 }}>
                    <Col flex="1">
                      <Input.Search
                        placeholder="Buscar o escanear código de barras..."
                        allowClear
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ maxWidth: 340 }}
                        onSearch={val => {
                          const q = val.trim().toLowerCase()
                          if (!q) return
                          // Coincidencia exacta por código → abrir kardex directo
                          const exact = productos.find(p => p.codigo.toLowerCase() === q)
                          if (exact) { openKardex(exact); setSearch(''); return }
                          // Un solo resultado parcial → abrir ese
                          const parcial = productos.filter(p =>
                            p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
                          )
                          if (parcial.length === 1) { openKardex(parcial[0]); setSearch('') }
                        }}
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
                      <Space size={6}>
                        <Switch
                          size="small"
                          checked={soloStockBajo}
                          onChange={setSoloStockBajo}
                        />
                        <Text style={{ fontSize: 12 }}>
                          Solo stock bajo
                          {resumen.productosStockBajo > 0 && (
                            <span style={{ marginLeft: 4, color: '#ff4d4f', fontWeight: 600 }}>
                              ({resumen.productosStockBajo})
                            </span>
                          )}
                        </Text>
                      </Space>
                    </Col>
                    <Col>
                      <Button
                        icon={<TagsOutlined />}
                        onClick={() => setCatDrawerOpen(true)}
                      >
                        Categorías
                      </Button>
                    </Col>
                    <Col>
                      <Button
                        icon={<SwapOutlined />}
                        onClick={() => openAjuste(undefined)}
                      >
                        Ajustar stock
                      </Button>
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => router.push('/productos')}
                        style={{ background: primary, borderColor: primary }}
                      >
                        Ir a Productos
                      </Button>
                    </Col>
                  </Row>

                  {/* Alerta stock bajo */}
                  {resumen.productosStockBajo > 0 && !soloStockBajo && (
                    <div style={{
                      background: '#fff1f0',
                      border: '1px solid #ffccc7',
                      borderRadius: 6,
                      padding: '7px 12px',
                      marginBottom: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      <WarningOutlined style={{ color: '#ff4d4f' }} />
                      <Text style={{ color: '#cf1322', fontSize: 13 }}>
                        {resumen.productosStockBajo} {resumen.productosStockBajo === 1 ? 'producto tiene' : 'productos tienen'} stock por debajo del mínimo.{' '}
                      </Text>
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: primary, fontWeight: 600, fontSize: 13, padding: 0 }}
                        onClick={() => setSoloStockBajo(true)}
                      >
                        Ver productos
                      </button>
                    </div>
                  )}

                  <Table
                    dataSource={filtered}
                    columns={columns}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 900 }}
                    rowClassName={r => r.stockBajo ? 'row-stock-bajo' : ''}
                    pagination={{
                      pageSize: 15,
                      showSizeChanger: true,
                      pageSizeOptions: ['15', '30', '50'],
                      showTotal: (t, range) => `${range[0]}–${range[1]} de ${t} productos`,
                    }}
                    locale={{
                      emptyText: (
                        <div style={{ padding: 48, textAlign: 'center' }}>
                          <InboxOutlined style={{ fontSize: 36, color: C.textDisabled }} />
                          <div style={{ marginTop: 10, color: C.textMuted }}>
                            {soloStockBajo ? 'No hay productos con stock bajo' : 'Sin productos registrados'}
                          </div>
                          {!soloStockBajo && (
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/productos')} style={{ marginTop: 12 }}>
                              Ir a Productos
                            </Button>
                          )}
                        </div>
                      ),
                    }}
                  />
                </>
              ),
            },
            {
              key: 'kardex',
              label: `Kardex general (${kardexGeneralTotal})`,
              children: (
                <Table
                  dataSource={kardexGeneral}
                  columns={kardexGeneralColumns}
                  rowKey="id"
                  size="small"
                  scroll={{ x: 720 }}
                  loading={kardexGeneralLoading}
                  pagination={{
                    total: kardexGeneralTotal,
                    current: kardexGeneralPage,
                    pageSize: 30,
                    showTotal: (t, range) => `${range[0]}–${range[1]} de ${t} movimientos`,
                    onChange: (page) => {
                      setKardexGeneralPage(page);
                      loadKardexGeneral(page);
                    },
                  }}
                  locale={{
                    emptyText: (
                      <div style={{ padding: 40, textAlign: 'center' }}>
                        <HistoryOutlined style={{ fontSize: 32, color: C.textDisabled }} />
                        <div style={{ marginTop: 8, color: C.textMuted }}>Sin movimientos de inventario</div>
                      </div>
                    ),
                  }}
                />
              ),
            },
          ]}
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
        width={640}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
          {/* Fila: Código + Nombre */}
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
              optionRender={(opt) => (
                <Space size={6}>
                  <Tag color={categorias.find(c => c.id === opt.value)?.color ?? 'blue'} style={{ margin: 0 }}>
                    {opt.label as string}
                  </Tag>
                </Space>
              )}
              options={categorias.map(c => ({ value: c.id, label: c.nombre }))}
            />
          </FormField>

          {/* Precios */}
          <Row gutter={12}>
            <Col span={12}>
              <FormField label="Precio de venta ($) *">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.01}
                  step={0.01}
                  precision={2}
                  prefix="$"
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
                  min={0}
                  step={0.01}
                  precision={2}
                  prefix="$"
                  value={formData.precioComision}
                  onChange={v => setFormData(p => ({ ...p, precioComision: v ?? undefined }))}
                  placeholder="0.00"
                />
              </FormField>
            </Col>
          </Row>

          {/* Stock mínimo + Stock inicial + Unidad */}
          <Row gutter={12}>
            <Col span={8}>
              <FormField label="Stock mínimo">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={1}
                  value={formData.stockMinimo}
                  onChange={v => setFormData(p => ({ ...p, stockMinimo: v ?? undefined }))}
                  placeholder="0"
                />
              </FormField>
            </Col>
            {!editTarget && (
              <Col span={8}>
                <FormField label="Stock inicial">
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    step={1}
                    value={formData.stockInicial}
                    onChange={v => setFormData(p => ({ ...p, stockInicial: v ?? undefined }))}
                    placeholder="0"
                  />
                </FormField>
              </Col>
            )}
            <Col span={editTarget ? 16 : 8}>
              <FormField label="Unidad de medida">
                <Select
                  style={{ width: '100%' }}
                  value={formData.unidadMedida}
                  onChange={v => setFormData(p => ({ ...p, unidadMedida: v }))}
                  options={UNIDADES_MEDIDA}
                />
              </FormField>
            </Col>
          </Row>

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
          Drawer: Kardex de movimientos
      ══════════════════════════════════════════════════════ */}
      <Drawer
        title={
          <Space>
            <HistoryOutlined style={{ color: primary }} />
            <span>
              Kardex: {kardexProducto?.nombre ?? 'Producto'}
            </span>
          </Space>
        }
        open={kardexOpen}
        onClose={() => setKardexOpen(false)}
        width={720}
        extra={
          kardexProducto && (
            <Button
              size="small"
              icon={<SwapOutlined />}
              onClick={() => {
                setKardexOpen(false);
                openAjuste(kardexProducto);
              }}
            >
              Ajustar stock
            </Button>
          )
        }
      >
        {/* Resumen del producto */}
        {kardexProducto && (
          <Card size="small" style={{ marginBottom: 16, background: `${primary}18`, border: `1px solid ${primary}30` }}>
            <Row gutter={[16, 8]}>
              <Col span={6}>
                <div style={{ fontSize: 11, color: C.textMuted }}>Stock actual</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: kardexProducto.stockBajo ? '#cf1322' : primary }}>
                  {kardexProducto.stockActual} <span style={{ fontSize: 12, fontWeight: 400 }}>{kardexProducto.unidadVenta?.nombre ?? kardexProducto.unidadMedida}</span>
                </div>
                {Number(kardexProducto.factorConversion) > 1 && (
                  <div style={{ fontSize: 10, color: C.textMuted }}>
                    = {(kardexProducto.stockActual / Number(kardexProducto.factorConversion)).toFixed(2)} {kardexProducto.unidadCompra}
                  </div>
                )}
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 11, color: C.textMuted }}>Mínimo</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {kardexProducto.stockMinimo} {kardexProducto.unidadVenta?.nombre ?? kardexProducto.unidadMedida}
                </div>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 11, color: C.textMuted }}>Costo prom.</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{formatMoney(kardexProducto.costoPromedio)}</div>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 11, color: C.textMuted }}>Precio venta</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: primary }}>{formatMoney(kardexProducto.precioVenta)}</div>
              </Col>
            </Row>
          </Card>
        )}

        <Table
          dataSource={kardexItems.filter(k =>
            !kardexProducto || k.productoId === kardexProducto.id
          )}
          columns={kardexColumns}
          rowKey="id"
          size="small"
          loading={kardexLoading}
          scroll={{ x: 600 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (t) => `${t} movimientos`,
          }}
          locale={{
            emptyText: (
              <div style={{ padding: 32, textAlign: 'center', color: C.textMuted }}>
                <HistoryOutlined style={{ fontSize: 28, color: C.textDisabled }} />
                <div style={{ marginTop: 8 }}>Sin movimientos registrados</div>
              </div>
            ),
          }}
        />
      </Drawer>

      {/* ══════════════════════════════════════════════════════
          Drawer: CRUD de Categorías
      ══════════════════════════════════════════════════════ */}
      <Drawer
        title={
          <Space>
            <TagsOutlined style={{ color: '#722ed1' }} />
            <span>Gestión de Categorías</span>
          </Space>
        }
        open={catDrawerOpen}
        onClose={() => setCatDrawerOpen(false)}
        width={500}
        destroyOnHidden
      >
        {/* Formulario crear */}
        <div style={{
          background: C.bgSubtle, borderRadius: 8, padding: 16, marginBottom: 20,
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Nueva categoría</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <FormField label="Nombre *">
              <Input
                value={catFormName}
                onChange={e => setCatFormName(e.target.value)}
                placeholder="Ej: Shampoos, Tintes, Herramientas..."
                maxLength={60}
                onPressEnter={handleCreateCatDrawer}
              />
            </FormField>
            <FormField label="Color">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {CATEGORY_COLORS.map(c => (
                  <Tag
                    key={c.value}
                    color={c.value}
                    style={{
                      cursor: 'pointer', margin: 0,
                      outline: catFormColor === c.value ? '2px solid #1890ff' : 'none',
                      outlineOffset: 2,
                    }}
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
              onClick={handleCreateCatDrawer}
              style={{ background: primary, borderColor: primary, alignSelf: 'flex-start' }}
            >
              Crear categoría
            </Button>
          </div>
        </div>

        {/* Tabla de categorías existentes */}
        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>
          Categorías ({categorias.length})
        </div>
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
                <Tag color={cat.color ?? 'blue'} style={{ margin: 0, fontSize: 13 }}>
                  {cat.nombre}
                </Tag>
                <Space size={4}>
                  <Tooltip title="Editar">
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openEditCat(cat)}
                    />
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

      {/* ══════════════════════════════════════════════════════
          Modal: Editar categoría
      ══════════════════════════════════════════════════════ */}
      <Modal
        open={catEditOpen}
        onCancel={() => setCatEditOpen(false)}
        title={
          <Space>
            <TagsOutlined style={{ color: '#722ed1' }} />
            <span>Editar categoría</span>
          </Space>
        }
        footer={null}
        destroyOnHidden
        width={420}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
          <FormField label="Nombre *">
            <Input
              value={catEditName}
              onChange={e => setCatEditName(e.target.value)}
              maxLength={60}
              onPressEnter={handleUpdateCat}
            />
          </FormField>
          <FormField label="Color">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {CATEGORY_COLORS.map(c => (
                <Tag
                  key={c.value}
                  color={c.value}
                  style={{
                    cursor: 'pointer', margin: 0,
                    outline: catEditColor === c.value ? '2px solid #1890ff' : 'none',
                    outlineOffset: 2,
                  }}
                  onClick={() => setCatEditColor(c.value)}
                >
                  {c.label}
                </Tag>
              ))}
            </div>
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 12, color: C.textMuted }}>Vista previa: </span>
              <Tag color={catEditColor} style={{ margin: 0 }}>{catEditName || 'Ejemplo'}</Tag>
            </div>
          </FormField>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => setCatEditOpen(false)}>Cancelar</Button>
          <Button
            type="primary"
            loading={catEditSaving}
            onClick={handleUpdateCat}
            style={{ background: primary, borderColor: primary }}
          >
            Guardar cambios
          </Button>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          Modal: Ajuste de stock
      ══════════════════════════════════════════════════════ */}
      <Modal
        open={ajusteOpen}
        onCancel={() => setAjusteOpen(false)}
        title={
          <Space>
            <SwapOutlined style={{ color: primary }} />
            <span>
              {ajusteEffectiveProducto
                ? `Ajuste de stock — ${ajusteEffectiveProducto.nombre}`
                : 'Ajuste de stock'}
            </span>
          </Space>
        }
        footer={null}
        destroyOnHidden
        width={500}
      >
        {/* Selector de producto cuando se abre globalmente */}
        {!ajusteTarget && (
          <div style={{ marginBottom: 14 }}>
            <FormField label="Producto *">
              <Select
                showSearch
                style={{ width: '100%' }}
                placeholder="Buscar producto por nombre o código..."
                value={ajusteProductoId}
                onChange={(v) => {
                  setAjusteProductoId(v);
                  const p = productos.find(x => x.id === v);
                  if (p) setAjusteCosto(p.costoPromedio > 0 ? p.costoPromedio : null);
                }}
                filterOption={(input, opt) =>
                  (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={productos.map(p => ({
                  value: p.id,
                  label: `[${p.codigo}] ${p.nombre}`,
                }))}
              />
            </FormField>
          </div>
        )}

        {/* Info del producto seleccionado */}
        {ajusteEffectiveProducto && (
          <Card size="small" style={{ marginBottom: 14, background: C.bgSubtle }}>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ fontSize: 11, color: C.textMuted }}>Stock actual</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: ajusteEffectiveProducto.stockBajo ? '#cf1322' : primary }}>
                  {ajusteEffectiveProducto.stockActual} {ajusteEffectiveProducto.unidadVenta?.nombre ?? ajusteEffectiveProducto.unidadMedida}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 11, color: C.textMuted }}>Stock mínimo</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {ajusteEffectiveProducto.stockMinimo} {ajusteEffectiveProducto.unidadVenta?.nombre ?? ajusteEffectiveProducto.unidadMedida}
                </div>
              </Col>
            </Row>
          </Card>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Tipo de movimiento *">
            <Select
              style={{ width: '100%' }}
              value={ajusteTipo}
              onChange={v => setAjusteTipo(v)}
              options={TIPO_AJUSTE_OPTIONS}
            />
          </FormField>

          <Row gutter={12}>
            <Col span={12}>
              <FormField label={ajusteTipo === 'AJUSTE' ? 'Nuevo stock *' : 'Cantidad *'}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={1}
                  value={ajusteCantidad}
                  onChange={v => setAjusteCantidad(v)}
                  placeholder="0"
                />
              </FormField>
            </Col>
            <Col span={12}>
              <FormField label="Costo unitario ($)">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  precision={2}
                  prefix="$"
                  value={ajusteCosto}
                  onChange={v => setAjusteCosto(v)}
                  placeholder="0.00"
                />
              </FormField>
            </Col>
          </Row>

          <FormField label="Referencia *">
            <Input
              value={ajusteReferencia}
              onChange={e => setAjusteReferencia(e.target.value)}
              placeholder="Ej: Compra factura #001, Conteo físico..."
              maxLength={100}
            />
          </FormField>

          <FormField label="Notas">
            <Input.TextArea
              value={ajusteNotas}
              onChange={e => setAjusteNotas(e.target.value)}
              placeholder="Observaciones opcionales"
              rows={2}
              maxLength={300}
            />
          </FormField>

          {/* Advertencia para SALIDA */}
          {ajusteTipo === 'SALIDA' && ajusteEffectiveProducto && ajusteCantidad !== null && ajusteCantidad > ajusteEffectiveProducto.stockActual && (
            <div style={{
              background: '#fff1f0', border: '1px solid #ffa39e',
              borderRadius: 6, padding: '8px 12px', color: '#cf1322', fontSize: 12,
            }}>
              La cantidad supera el stock actual ({ajusteEffectiveProducto.stockActual} {ajusteEffectiveProducto.unidadVenta?.nombre ?? ajusteEffectiveProducto.unidadMedida}).
            </div>
          )}

          {ajusteError && (
            <p style={{ color: '#ff4d4f', fontSize: 13, margin: 0 }}>{ajusteError}</p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => setAjusteOpen(false)}>Cancelar</Button>
          <Button
            type="primary"
            loading={ajusteLoading}
            onClick={handleSubmitAjuste}
            style={{ background: primary, borderColor: primary }}
          >
            {ajusteLoading ? 'Ajustando...' : 'Confirmar ajuste'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
