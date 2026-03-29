'use client';

// ══════════════════════════════════════════════════════════
// COMPRAS — Ant Design 5
// KPIs + Tabla con filtros + Drawer detalle + Modal crear
// ══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Table,
  Card,
  Button,
  Row,
  Col,
  Statistic,
  Tag,
  Select,
  Input,
  Typography,
  Tooltip,
  Popconfirm,
  Drawer,
  Descriptions,
  Space,
  Modal,
  Divider,
  InputNumber,
  DatePicker,
  Form,
  Spin,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  StopOutlined,
  DeleteOutlined,
  SearchOutlined,
  InboxOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { FormField } from '@/components/shared/FormField';
import { useBarberTheme } from '@/context/ThemeContext';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Option } = Select;

// ── Tipos ────────────────────────────────────────────────────────────────────

type Producto = {
  id: number;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  costoPromedio?: number;
};

type Proveedor = {
  id: number;
  nombre: string;
  nit?: string | null;
  correo?: string | null;
  telefono?: string | null;
};

type DetalleCompra = {
  id: number;
  compraId: number;
  productoId: number | null;
  descripcion: string | null;
  cantidad: number;
  costoUnitario: number;
  descuento: number;
  subtotal: number;
  producto: { id: number; codigo: string; nombre: string; unidadMedida: string } | null;
};

type Compra = {
  id: number;
  tenantId: number;
  proveedorId: number | null;
  numeroDocumento: string;
  tipoDocumento: string;
  tipoCompra: string;
  condicionPago: string;
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  estado: string;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
  proveedor: Proveedor | null;
  detalles: DetalleCompra[];
};

type Stats = {
  comprasHoy: number;
  comprasMes: number;
  pendientesCobro: number;
  totalProductosMes: number;
  totalGastosMes: number;
};

type PagoCxP = {
  id: number;
  compraId: number;
  monto: number;
  metodoPago: string;
  referencia: string | null;
  notas: string | null;
  fecha: string;
  createdAt: string;
};

// Línea editable en el modal
type LineaDetalle = {
  key: string;
  productoId: number | null;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
  descuento: number;
  subtotal: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIPO_DOC_COLORS: Record<string, string> = {
  FACTURA: 'blue',
  CCF: 'geekblue',
  RECIBO: 'cyan',
  TICKET: 'green',
  NOTA: 'orange',
};

const TIPO_COMPRA_COLORS: Record<string, string> = {
  PRODUCTO: 'blue',
  GASTO_SERVICIO: 'purple',
};
const TIPO_COMPRA_LABELS: Record<string, string> = {
  PRODUCTO: 'Producto',
  GASTO_SERVICIO: 'Gasto/Servicio',
};

const CONDICION_COLORS: Record<string, string> = {
  CONTADO: 'green',
  CREDITO: 'orange',
};

const ESTADO_COLORS: Record<string, string> = {
  REGISTRADA: 'blue',
  PAGADA: 'green',
  ANULADA: 'red',
};
const ESTADO_LABELS: Record<string, string> = {
  REGISTRADA: 'Registrada',
  PAGADA: 'Pagada',
  ANULADA: 'Anulada',
};

const METODO_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  QR: 'QR',
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-SV', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatMoney(n: number) {
  return `$${n.toFixed(2)}`;
}

function calcSubtotal(cantidad: number, costo: number, descuento: number): number {
  const base = cantidad * costo;
  return parseFloat((base - base * (descuento / 100)).toFixed(2));
}

let lineaKeyCounter = 1;
function newLineaKey() {
  return `linea-${Date.now()}-${lineaKeyCounter++}`;
}

function emptyLinea(): LineaDetalle {
  return {
    key: newLineaKey(),
    productoId: null,
    descripcion: '',
    cantidad: 1,
    costoUnitario: 0,
    descuento: 0,
    subtotal: 0,
  };
}

// ── Componente ────────────────────────────────────────────────────────────────

type Props = {
  initialCompras: Compra[];
  initialStats: Stats;
};

export default function ComprasClient({ initialCompras, initialStats }: Props) {
  const { theme: barberTheme } = useBarberTheme()
  const primary = barberTheme.colorPrimary
  const { token } = theme.useToken()
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
    colorSuccess: token.colorSuccess,
    colorSuccessBg: token.colorSuccessBg,
    colorError: token.colorError,
    colorErrorBg: token.colorErrorBg,
    colorWarning: token.colorWarning,
    colorWarningBg: token.colorWarningBg,
    colorInfo: token.colorInfo,
    colorInfoBg: token.colorInfoBg,
  }

  const [compras, setCompras] = useState<Compra[]>(initialCompras);
  const [stats, setStats] = useState<Stats>(initialStats);

  // ── Filtros
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string | undefined>(undefined);
  const [filterEstado, setFilterEstado] = useState<string | undefined>(undefined);
  const [filterCond, setFilterCond] = useState<string | undefined>(undefined);

  // ── Drawer detalle
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Compra | null>(null);

  // ── Modal anular desde drawer
  const [anularOpen, setAnularOpen] = useState(false);
  const [motivoAnular, setMotivoAnular] = useState('');
  const [anulando, setAnulando] = useState(false);

  // ── Pagos CxP
  const [pagos, setPagos] = useState<PagoCxP[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [savingPago, setSavingPago] = useState(false);
  const [pagoMonto, setPagoMonto] = useState<number | null>(null);
  const [pagoMetodo, setPagoMetodo] = useState('CASH');
  const [pagoReferencia, setPagoReferencia] = useState('');
  const [pagoNotas, setPagoNotas] = useState('');
  const [pagoError, setPagoError] = useState('');

  // ── Modal crear compra
  const [modalOpen, setModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Datos del encabezado de la nueva compra
  const [nuevaTipoCompra, setNuevaTipoCompra] = useState<string>('PRODUCTO');
  const [nuevoProveedorId, setNuevoProveedorId] = useState<number | null>(null);
  const [nuevoNumDoc, setNuevoNumDoc] = useState('');
  const [nuevoTipoDoc, setNuevoTipoDoc] = useState('FACTURA');
  const [nuevaFecha, setNuevaFecha] = useState<dayjs.Dayjs>(dayjs());
  const [nuevaCondicion, setNuevaCondicion] = useState<string>('CONTADO');
  const [nuevaNotas, setNuevaNotas] = useState('');

  // Líneas de detalle
  const [lineas, setLineas] = useState<LineaDetalle[]>([emptyLinea()]);

  // Búsqueda async de proveedores
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [buscandoProv, setBuscandoProv] = useState(false);

  // Búsqueda async de productos
  const [productosBusqueda, setProductosBusqueda] = useState<Record<string, Producto[]>>({});
  const [buscandoProd, setBuscandoProd] = useState<Record<string, boolean>>({});

  // Error del formulario
  const [formError, setFormError] = useState('');

  // ── Filtrado cliente-side ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = compras;
    if (filterTipo) list = list.filter(c => c.tipoCompra === filterTipo);
    if (filterEstado) list = list.filter(c => c.estado === filterEstado);
    if (filterCond) list = list.filter(c => c.condicionPago === filterCond);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.numeroDocumento.toLowerCase().includes(q) ||
        (c.proveedor?.nombre ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [compras, filterTipo, filterEstado, filterCond, search]);

  // ── Totales calculados del modal ──────────────────────────────────────────

  const totalesModal = useMemo(() => {
    const subtotal = lineas.reduce((s, l) => s + l.subtotal, 0);
    const iva = parseFloat((subtotal * 0.13).toFixed(2));
    const total = parseFloat((subtotal + iva).toFixed(2));
    return { subtotal, iva, total };
  }, [lineas]);

  const saldoPendiente = useMemo(() => {
    if (!selected) return 0;
    const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
    return Math.max(0, selected.total - totalPagado);
  }, [selected, pagos]);

  // ── Handlers: Proveedores ─────────────────────────────────────────────────

  const buscarProveedores = useCallback(async (q: string) => {
    setBuscandoProv(true);
    try {
      const res = await fetch(`/api/proveedores/buscar?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const json = await res.json();
      setProveedores(json.data ?? []);
    } catch {
      // silencioso
    } finally {
      setBuscandoProv(false);
    }
  }, []);

  // ── Handlers: Productos ───────────────────────────────────────────────────

  const buscarProductos = useCallback(async (lineaKey: string, q: string) => {
    if (q.length < 2) return;
    setBuscandoProd(prev => ({ ...prev, [lineaKey]: true }));
    try {
      const res = await fetch(`/api/productos/buscar?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const json = await res.json();
      setProductosBusqueda(prev => ({ ...prev, [lineaKey]: json.data ?? [] }));
    } catch {
      // silencioso
    } finally {
      setBuscandoProd(prev => ({ ...prev, [lineaKey]: false }));
    }
  }, []);

  const onProductoSelect = useCallback((lineaKey: string, productoId: number) => {
    const opts = productosBusqueda[lineaKey] ?? [];
    const prod = opts.find(p => p.id === productoId);
    if (!prod) return;

    setLineas(prev =>
      prev.map(l => {
        if (l.key !== lineaKey) return l;
        const costo = prod.costoPromedio ?? 0;
        const subtotal = calcSubtotal(l.cantidad, costo, l.descuento);
        return {
          ...l,
          productoId: prod.id,
          descripcion: prod.nombre,
          costoUnitario: costo,
          subtotal,
        };
      }),
    );
  }, [productosBusqueda]);

  // ── Handlers: Líneas ──────────────────────────────────────────────────────

  function addLinea() {
    setLineas(prev => [...prev, emptyLinea()]);
  }

  function removeLinea(key: string) {
    setLineas(prev => prev.filter(l => l.key !== key));
  }

  function updateLinea(key: string, field: keyof LineaDetalle, value: unknown) {
    setLineas(prev =>
      prev.map(l => {
        if (l.key !== key) return l;
        const updated = { ...l, [field]: value };
        // Recalcular subtotal en campos numéricos
        if (['cantidad', 'costoUnitario', 'descuento'].includes(field as string)) {
          updated.subtotal = calcSubtotal(
            Number(updated.cantidad),
            Number(updated.costoUnitario),
            Number(updated.descuento),
          );
        }
        return updated;
      }),
    );
  }

  // ── Limpiar modal ─────────────────────────────────────────────────────────

  function resetModal() {
    setNuevaTipoCompra('PRODUCTO');
    setNuevoProveedorId(null);
    setNuevoNumDoc('');
    setNuevoTipoDoc('FACTURA');
    setNuevaFecha(dayjs());
    setNuevaCondicion('CONTADO');
    setNuevaNotas('');
    setLineas([emptyLinea()]);
    setProveedores([]);
    setProductosBusqueda({});
    setFormError('');
  }

  function openModal() {
    resetModal();
    setModalOpen(true);
  }

  // ── Handlers: Drawer ──────────────────────────────────────────────────────

  async function openDetail(compra: Compra) {
    setSelected(compra);
    setPagos([]);
    setDrawerOpen(true);
    // Cargar pagos si es crédito
    if (compra.condicionPago === 'CREDITO') {
      setLoadingPagos(true);
      try {
        const res = await fetch(`/api/compras/${compra.id}/pagos`);
        if (res.ok) {
          const json = await res.json();
          setPagos(json.data ?? []);
        }
      } catch { /* noop */ } finally {
        setLoadingPagos(false);
      }
    }
  }

  function openPagoModal() {
    setPagoMonto(saldoPendiente > 0 ? parseFloat(saldoPendiente.toFixed(2)) : null);
    setPagoMetodo('CASH');
    setPagoReferencia('');
    setPagoNotas('');
    setPagoError('');
    setPagoModalOpen(true);
  }

  async function handleSavePago() {
    if (!selected) return;
    if (!pagoMonto || pagoMonto <= 0) { setPagoError('El monto debe ser mayor a 0'); return; }
    if (pagoMonto > saldoPendiente + 0.001) {
      setPagoError(`El monto excede el saldo pendiente (${formatMoney(saldoPendiente)})`);
      return;
    }
    setSavingPago(true); setPagoError('');
    try {
      const res = await fetch(`/api/compras/${selected.id}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: pagoMonto,
          metodoPago: pagoMetodo,
          referencia: pagoReferencia || null,
          notas: pagoNotas || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setPagoError(json.error?.message ?? 'Error al registrar pago'); return; }
      const nuevoPago: PagoCxP = json.data;
      setPagos(prev => [nuevoPago, ...prev]);
      // Si saldo queda en 0, marcar como PAGADA en tabla
      const nuevoSaldo = saldoPendiente - nuevoPago.monto;
      if (nuevoSaldo <= 0.001) {
        setCompras(prev => prev.map(c => c.id === selected.id ? { ...c, estado: 'PAGADA' } : c));
        setSelected(prev => prev ? { ...prev, estado: 'PAGADA' } : prev);
        setStats(prev => ({ ...prev, pendientesCobro: Math.max(0, prev.pendientesCobro - 1) }));
      }
      setPagoModalOpen(false);
      toast.success(`Pago de ${formatMoney(nuevoPago.monto)} registrado`);
    } catch {
      setPagoError('Error de red');
    } finally { setSavingPago(false); }
  }

  // ── Handlers: Anular ──────────────────────────────────────────────────────

  async function handleAnularInline(compra: Compra, motivo = 'Sin motivo') {
    try {
      const res = await fetch(`/api/compras/${compra.id}/anular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Error al anular');
        return;
      }
      setCompras(prev => prev.map(c => c.id === compra.id ? json.data : c));
      toast.success('Compra anulada correctamente');
    } catch {
      toast.error('Error de red');
    }
  }

  async function handleAnularDesdeDrawer() {
    if (!selected) return;
    if (!motivoAnular.trim()) {
      toast.error('Ingresa un motivo para anular');
      return;
    }
    setAnulando(true);
    try {
      const res = await fetch(`/api/compras/${selected.id}/anular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoAnular.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Error al anular');
        return;
      }
      const updated: Compra = json.data;
      setCompras(prev => prev.map(c => c.id === updated.id ? updated : c));
      setSelected(updated);
      setAnularOpen(false);
      setMotivoAnular('');
      toast.success('Compra anulada correctamente');
    } catch {
      toast.error('Error de red');
    } finally {
      setAnulando(false);
    }
  }

  // ── Handlers: Crear compra ────────────────────────────────────────────────

  async function handleGuardar() {
    setFormError('');

    if (!nuevoNumDoc.trim()) {
      setFormError('El número de documento es requerido');
      return;
    }
    if (lineas.length === 0) {
      setFormError('Agrega al menos un detalle');
      return;
    }
    for (const l of lineas) {
      if (l.cantidad <= 0) {
        setFormError('La cantidad de todas las líneas debe ser mayor a 0');
        return;
      }
    }
    if (totalesModal.total <= 0) {
      setFormError('El total debe ser mayor a 0');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        proveedorId: nuevoProveedorId,
        numeroDocumento: nuevoNumDoc.trim(),
        tipoDocumento: nuevoTipoDoc,
        tipoCompra: nuevaTipoCompra,
        condicionPago: nuevaCondicion,
        fecha: nuevaFecha.toISOString(),
        subtotal: totalesModal.subtotal,
        iva: totalesModal.iva,
        total: totalesModal.total,
        notas: nuevaNotas || null,
        detalles: lineas.map(l => ({
          productoId: nuevaTipoCompra === 'PRODUCTO' ? l.productoId : null,
          descripcion: l.descripcion || null,
          cantidad: l.cantidad,
          costoUnitario: l.costoUnitario,
          descuento: l.descuento,
          subtotal: l.subtotal,
        })),
      };

      const res = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        const msg = json.error?.message ?? 'Error al registrar compra';
        setFormError(msg);
        toast.error(msg);
        return;
      }

      const nueva: Compra = json.data;
      setCompras(prev => [nueva, ...prev]);
      setStats(prev => ({
        ...prev,
        comprasHoy: prev.comprasHoy + nueva.total,
        comprasMes: prev.comprasMes + nueva.total,
        pendientesCobro:
          nuevaCondicion === 'CREDITO'
            ? prev.pendientesCobro + 1
            : prev.pendientesCobro,
        totalProductosMes:
          nuevaTipoCompra === 'PRODUCTO'
            ? prev.totalProductosMes + nueva.total
            : prev.totalProductosMes,
        totalGastosMes:
          nuevaTipoCompra === 'GASTO_SERVICIO'
            ? prev.totalGastosMes + nueva.total
            : prev.totalGastosMes,
      }));

      setModalOpen(false);
      resetModal();
      toast.success(`Compra ${nueva.numeroDocumento} registrada correctamente`);
    } catch {
      const msg = 'Error de red';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setGuardando(false);
    }
  }

  // ── Cambio de tipoCompra: limpiar líneas ──────────────────────────────────

  function onTipoCompraChange(val: string) {
    setNuevaTipoCompra(val);
    setLineas([emptyLinea()]);
    setProductosBusqueda({});
  }

  // ── Columnas tabla ────────────────────────────────────────────────────────

  const columns: ColumnsType<Compra> = [
    {
      title: '# Documento',
      key: 'numDoc',
      width: 160,
      render: (_, r) => (
        <Text
          strong
          style={{ fontFamily: 'monospace', fontSize: 13, color: primary }}
        >
          {r.numeroDocumento}
        </Text>
      ),
    },
    {
      title: 'Proveedor',
      key: 'proveedor',
      render: (_, r) =>
        r.proveedor ? (
          <Text style={{ fontSize: 13 }}>{r.proveedor.nombre}</Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Sin proveedor
          </Text>
        ),
    },
    {
      title: 'Tipo doc',
      key: 'tipoDoc',
      width: 100,
      render: (_, r) => (
        <Tag color={TIPO_DOC_COLORS[r.tipoDocumento] ?? 'default'} style={{ fontSize: 11 }}>
          {r.tipoDocumento}
        </Tag>
      ),
    },
    {
      title: 'Tipo compra',
      key: 'tipoCompra',
      width: 140,
      render: (_, r) => (
        <Tag
          color={TIPO_COMPRA_COLORS[r.tipoCompra] ?? 'default'}
          icon={r.tipoCompra === 'PRODUCTO' ? <InboxOutlined /> : <ToolOutlined />}
          style={{ fontSize: 11 }}
        >
          {TIPO_COMPRA_LABELS[r.tipoCompra] ?? r.tipoCompra}
        </Tag>
      ),
    },
    {
      title: 'Condición',
      key: 'condicion',
      width: 105,
      render: (_, r) => (
        <Tag color={CONDICION_COLORS[r.condicionPago] ?? 'default'} style={{ fontSize: 11 }}>
          {r.condicionPago}
        </Tag>
      ),
    },
    {
      title: 'Fecha',
      key: 'fecha',
      width: 110,
      responsive: ['md'],
      render: (_, r) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatDate(r.fecha)}
        </Text>
      ),
    },
    {
      title: 'Subtotal',
      key: 'subtotal',
      width: 95,
      align: 'right',
      responsive: ['lg'],
      render: (_, r) => (
        <Text style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
          {formatMoney(r.subtotal)}
        </Text>
      ),
    },
    {
      title: 'IVA',
      key: 'iva',
      width: 80,
      align: 'right',
      responsive: ['lg'],
      render: (_, r) => (
        <Text type="secondary" style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
          {formatMoney(r.iva)}
        </Text>
      ),
    },
    {
      title: 'Total',
      key: 'total',
      width: 100,
      align: 'right',
      render: (_, r) => (
        <Text
          strong
          style={{
            fontVariantNumeric: 'tabular-nums',
            fontSize: 14,
            color: r.estado === 'ANULADA' ? C.textMuted : primary,
            textDecoration: r.estado === 'ANULADA' ? 'line-through' : undefined,
          }}
        >
          {formatMoney(r.total)}
        </Text>
      ),
    },
    {
      title: 'Estado',
      key: 'estado',
      width: 110,
      render: (_, r) => (
        <Tag color={ESTADO_COLORS[r.estado] ?? 'default'}>
          {ESTADO_LABELS[r.estado] ?? r.estado}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 100,
      fixed: 'right',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Ver detalle">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => { e.stopPropagation(); openDetail(r); }}
            />
          </Tooltip>
          {r.estado === 'REGISTRADA' && (
            <Popconfirm
              title="Anular compra"
              description="¿Confirmas anular esta compra? El inventario será revertido."
              okText="Anular"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
              onConfirm={(e) => { e?.stopPropagation(); handleAnularInline(r, 'Anulado desde tabla'); }}
              onCancel={(e) => e?.stopPropagation()}
            >
              <Tooltip title="Anular">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ── Columnas tabla de detalles (drawer) ───────────────────────────────────

  const detalleColumns: ColumnsType<DetalleCompra> = [
    {
      title: 'Descripción / Producto',
      key: 'desc',
      render: (_, d) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>
            {d.descripcion ?? d.producto?.nombre ?? '—'}
          </div>
          {d.producto && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {d.producto.codigo} · {d.producto.unidadMedida}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Cant.',
      key: 'cant',
      width: 70,
      align: 'right',
      render: (_, d) => (
        <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{d.cantidad}</Text>
      ),
    },
    {
      title: 'Costo unit.',
      key: 'costo',
      width: 95,
      align: 'right',
      render: (_, d) => (
        <Text style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(d.costoUnitario)}
        </Text>
      ),
    },
    {
      title: 'Desc.%',
      key: 'desc_pct',
      width: 70,
      align: 'right',
      render: (_, d) => (
        <Text type="secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {d.descuento > 0 ? `${d.descuento}%` : '—'}
        </Text>
      ),
    },
    {
      title: 'Subtotal',
      key: 'subtotal',
      width: 95,
      align: 'right',
      render: (_, d) => (
        <Text strong style={{ fontVariantNumeric: 'tabular-nums', color: primary }}>
          {formatMoney(d.subtotal)}
        </Text>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── KPIs ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${C.colorSuccess}` }}>
            <Statistic
              title="Compras hoy"
              value={stats.comprasHoy}
              precision={2}
              prefix={<DollarOutlined style={{ color: C.colorSuccess }} />}
              valueStyle={{ color: C.colorSuccess, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${primary}` }}>
            <Statistic
              title="Compras del mes"
              value={stats.comprasMes}
              precision={2}
              prefix={<ShoppingCartOutlined style={{ color: primary }} />}
              valueStyle={{ color: primary, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${C.colorWarning}` }}>
            <Statistic
              title="Créditos pendientes"
              value={stats.pendientesCobro}
              prefix={<ClockCircleOutlined style={{ color: C.colorWarning }} />}
              valueStyle={{ color: C.colorWarning, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${C.colorInfo}` }}>
            <Statistic
              title="Total del mes"
              value={stats.totalProductosMes + stats.totalGastosMes}
              precision={2}
              prefix={<CheckCircleOutlined style={{ color: C.colorInfo }} />}
              valueStyle={{ color: C.colorInfo, fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Tabla principal ── */}
      <Card>
        {/* Toolbar */}
        <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 12 }}>
          <Col flex="1">
            <Input.Search
              placeholder="Buscar por número de doc. o proveedor..."
              allowClear
              prefix={<SearchOutlined />}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 360 }}
            />
          </Col>
          <Col>
            <Select
              placeholder="Tipo compra"
              allowClear
              style={{ width: 165 }}
              value={filterTipo}
              onChange={v => setFilterTipo(v)}
              options={[
                { value: 'PRODUCTO', label: 'Producto' },
                { value: 'GASTO_SERVICIO', label: 'Gasto/Servicio' },
              ]}
            />
          </Col>
          <Col>
            <Select
              placeholder="Estado"
              allowClear
              style={{ width: 140 }}
              value={filterEstado}
              onChange={v => setFilterEstado(v)}
              options={[
                { value: 'REGISTRADA', label: 'Registrada' },
                { value: 'PAGADA', label: 'Pagada' },
                { value: 'ANULADA', label: 'Anulada' },
              ]}
            />
          </Col>
          <Col>
            <Select
              placeholder="Condición"
              allowClear
              style={{ width: 135 }}
              value={filterCond}
              onChange={v => setFilterCond(v)}
              options={[
                { value: 'CONTADO', label: 'Contado' },
                { value: 'CREDITO', label: 'Crédito' },
              ]}
            />
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
              Registrar compra
            </Button>
          </Col>
        </Row>

        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          size="small"
          scroll={{ x: 1100 }}
          onRow={r => ({
            onClick: () => openDetail(r),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (t, range) => `${range[0]}–${range[1]} de ${t} compras`,
          }}
          locale={{
            emptyText: (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <ShoppingCartOutlined style={{ fontSize: 32, color: C.textDisabled }} />
                <div style={{ marginTop: 8, color: C.textMuted }}>
                  Sin compras registradas
                </div>
              </div>
            ),
          }}
        />
      </Card>

      {/* ══════════════════════════════════════════════
          DRAWER: Detalle de la compra
      ══════════════════════════════════════════════ */}
      <Drawer
        title={
          selected ? (
            <Space>
              <ShoppingCartOutlined style={{ color: primary }} />
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                {selected.numeroDocumento}
              </span>
              <Tag color={ESTADO_COLORS[selected.estado]}>{ESTADO_LABELS[selected.estado]}</Tag>
            </Space>
          ) : (
            'Detalle de compra'
          )
        }
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null); }}
        width={560}
        extra={
          <Space>
            {selected?.condicionPago === 'CREDITO' &&
              selected?.estado !== 'ANULADA' &&
              saldoPendiente > 0 && (
                <Button
                  type="primary"
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={openPagoModal}
                >
                  Registrar pago ({formatMoney(saldoPendiente)})
                </Button>
              )}
            {selected?.estado === 'REGISTRADA' && (
              <Button
                danger
                size="small"
                icon={<StopOutlined />}
                onClick={() => { setMotivoAnular(''); setAnularOpen(true); }}
              >
                Anular
              </Button>
            )}
          </Space>
        }
      >
        {selected && (
          <>
            {/* Datos de cabecera */}
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Fecha" span={1}>
                {formatDate(selected.fecha)}
              </Descriptions.Item>
              <Descriptions.Item label="Condición" span={1}>
                <Tag color={CONDICION_COLORS[selected.condicionPago]}>
                  {selected.condicionPago}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Proveedor" span={2}>
                {selected.proveedor
                  ? (
                    <div>
                      <div style={{ fontWeight: 500 }}>{selected.proveedor.nombre}</div>
                      {selected.proveedor.nit && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          NIT: {selected.proveedor.nit}
                        </Text>
                      )}
                    </div>
                  )
                  : <Text type="secondary">Sin proveedor</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Tipo documento" span={1}>
                <Tag color={TIPO_DOC_COLORS[selected.tipoDocumento]}>{selected.tipoDocumento}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tipo compra" span={1}>
                <Tag
                  color={TIPO_COMPRA_COLORS[selected.tipoCompra]}
                  icon={selected.tipoCompra === 'PRODUCTO' ? <InboxOutlined /> : <ToolOutlined />}
                >
                  {TIPO_COMPRA_LABELS[selected.tipoCompra]}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {/* Detalles de líneas */}
            <Title level={5} style={{ marginBottom: 8 }}>
              Detalle de líneas
            </Title>
            <Table<DetalleCompra>
              dataSource={selected.detalles}
              columns={detalleColumns}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 420 }}
              style={{ marginBottom: 16 }}
            />

            {/* Totales */}
            <div
              style={{
                background: C.bgSubtle,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
              }}
            >
              <Row justify="space-between" style={{ marginBottom: 6 }}>
                <Col><Text type="secondary">Subtotal</Text></Col>
                <Col>
                  <Text style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(selected.subtotal)}
                  </Text>
                </Col>
              </Row>
              <Row justify="space-between" style={{ marginBottom: 6 }}>
                <Col><Text type="secondary">IVA (13%)</Text></Col>
                <Col>
                  <Text style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(selected.iva)}
                  </Text>
                </Col>
              </Row>
              <Divider style={{ margin: '8px 0' }} />
              <Row justify="space-between">
                <Col>
                  <Text strong style={{ fontSize: 15 }}>Total</Text>
                </Col>
                <Col>
                  <Text
                    strong
                    style={{
                      fontSize: 16,
                      color: selected.estado === 'ANULADA' ? C.textMuted : primary,
                      fontVariantNumeric: 'tabular-nums',
                      textDecoration: selected.estado === 'ANULADA' ? 'line-through' : undefined,
                    }}
                  >
                    {formatMoney(selected.total)}
                  </Text>
                </Col>
              </Row>
            </div>

            {/* Pagos CxP (solo si es CREDITO) */}
            {selected.condicionPago === 'CREDITO' && (
              <>
                <Divider style={{ fontSize: 12, color: C.textMuted, margin: '16px 0 10px' }}>
                  Pagos realizados
                </Divider>
                {loadingPagos ? (
                  <div style={{ textAlign: 'center', padding: '12px 0', color: C.textMuted }}>
                    Cargando pagos...
                  </div>
                ) : pagos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '12px 0', color: C.textMuted, fontSize: 13 }}>
                    Sin pagos registrados
                  </div>
                ) : (
                  <Table<PagoCxP>
                    size="small"
                    rowKey="id"
                    dataSource={pagos}
                    pagination={false}
                    style={{ marginBottom: 8 }}
                    columns={[
                      {
                        title: 'Fecha',
                        key: 'fecha',
                        width: 100,
                        render: (_, p) => <Text style={{ fontSize: 12 }}>{formatDate(p.fecha)}</Text>,
                      },
                      {
                        title: 'Método',
                        key: 'metodo',
                        width: 115,
                        render: (_, p) => (
                          <Tag style={{ fontSize: 11 }}>
                            {METODO_LABELS[p.metodoPago] ?? p.metodoPago}
                          </Tag>
                        ),
                      },
                      {
                        title: 'Monto',
                        key: 'monto',
                        align: 'right',
                        render: (_, p) => (
                          <Text strong style={{ color: primary, fontVariantNumeric: 'tabular-nums' }}>
                            {formatMoney(p.monto)}
                          </Text>
                        ),
                      },
                      {
                        title: 'Referencia',
                        key: 'ref',
                        render: (_, p) => (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {p.referencia ?? '—'}
                          </Text>
                        ),
                      },
                    ]}
                  />
                )}
                <div style={{ textAlign: 'right', paddingBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Saldo pendiente: </Text>
                  <Text
                    strong
                    style={{
                      color: saldoPendiente > 0 ? C.colorWarning : C.colorSuccess,
                      fontSize: 14,
                    }}
                  >
                    {formatMoney(saldoPendiente)}
                  </Text>
                </div>
              </>
            )}

            {/* Notas */}
            {selected.notas && (
              <div
                style={{
                  background: C.colorWarningBg,
                  border: `1px solid ${C.colorWarning}40`,
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: C.textPrimary,
                  marginTop: 12,
                }}
              >
                <strong>Notas:</strong> {selected.notas}
              </div>
            )}
          </>
        )}
      </Drawer>

      {/* ── Modal: Anular desde drawer ── */}
      <Modal
        open={anularOpen}
        onCancel={() => setAnularOpen(false)}
        title={
          <Space>
            <StopOutlined style={{ color: C.colorError }} />
            <span>Anular compra</span>
          </Space>
        }
        footer={null}
        destroyOnHidden
        width={440}
      >
        <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Text type="secondary">
            Si esta compra es de tipo <strong>Producto</strong>, el inventario será revertido
            y se crearán entradas de anulación en el kardex.
          </Text>
          <FormField label="Motivo de anulación *">
            <Input.TextArea
              rows={3}
              value={motivoAnular}
              onChange={e => setMotivoAnular(e.target.value)}
              placeholder="Ingresa el motivo..."
              maxLength={300}
              showCount
            />
          </FormField>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => setAnularOpen(false)}>Cancelar</Button>
          <Button
            danger
            type="primary"
            loading={anulando}
            disabled={!motivoAnular.trim()}
            onClick={handleAnularDesdeDrawer}
          >
            Confirmar anulación
          </Button>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════
          MODAL: Registrar pago CxP
      ══════════════════════════════════════════════ */}
      <Modal
        open={pagoModalOpen}
        onCancel={() => setPagoModalOpen(false)}
        title={
          <Space>
            <DollarOutlined style={{ color: primary }} />
            <span>Registrar pago</span>
            {selected && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                — Saldo: {formatMoney(saldoPendiente)}
              </Text>
            )}
          </Space>
        }
        footer={null}
        destroyOnHidden
        width={440}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
          <Row gutter={12}>
            <Col span={12}>
              <FormField label="Monto ($) *">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.01}
                  max={saldoPendiente}
                  step={0.01}
                  precision={2}
                  prefix="$"
                  value={pagoMonto}
                  onChange={v => setPagoMonto(v)}
                  placeholder="0.00"
                />
              </FormField>
            </Col>
            <Col span={12}>
              <FormField label="Método *">
                <Select
                  style={{ width: '100%' }}
                  value={pagoMetodo}
                  onChange={v => setPagoMetodo(v)}
                  options={[
                    { value: 'CASH', label: 'Efectivo' },
                    { value: 'CARD', label: 'Tarjeta' },
                    { value: 'TRANSFER', label: 'Transferencia' },
                    { value: 'QR', label: 'QR' },
                  ]}
                />
              </FormField>
            </Col>
          </Row>
          <FormField label="Referencia">
            <Input
              value={pagoReferencia}
              onChange={e => setPagoReferencia(e.target.value)}
              placeholder="N° de transacción, cheque, etc."
            />
          </FormField>
          <FormField label="Notas">
            <Input
              value={pagoNotas}
              onChange={e => setPagoNotas(e.target.value)}
              placeholder="Observaciones del pago"
            />
          </FormField>
          {pagoError && (
            <p style={{ color: C.colorError, fontSize: 13, margin: 0 }}>{pagoError}</p>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => setPagoModalOpen(false)}>Cancelar</Button>
          <Button
            type="primary"
            loading={savingPago}
            disabled={!pagoMonto || pagoMonto <= 0}
            onClick={handleSavePago}
          >
            {savingPago ? 'Registrando...' : 'Confirmar pago'}
          </Button>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════
          MODAL: Registrar nueva compra
      ══════════════════════════════════════════════ */}
      <Modal
        open={modalOpen}
        onCancel={() => { setModalOpen(false); resetModal(); }}
        title={
          <Space>
            <ShoppingCartOutlined style={{ color: primary }} />
            <span>Registrar compra</span>
          </Space>
        }
        footer={null}
        destroyOnHidden
        width={860}
        style={{ top: 20 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* ── SECCIÓN 1: CABECERA ── */}
          <div
            style={{
              background: C.bgSubtle,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '14px 16px',
              marginBottom: 16,
            }}
          >
            <Title level={5} style={{ margin: '0 0 12px', color: C.textPrimary, fontSize: 13 }}>
              Datos de cabecera
            </Title>
            <Row gutter={[12, 12]}>
              {/* Tipo de compra */}
              <Col xs={24} sm={12} md={8}>
                <FormField label="Tipo de compra *">
                  <Select
                    style={{ width: '100%' }}
                    value={nuevaTipoCompra}
                    onChange={onTipoCompraChange}
                    options={[
                      {
                        value: 'PRODUCTO',
                        label: (
                          <Space size={4}>
                            <InboxOutlined />
                            Producto / Insumo
                          </Space>
                        ),
                      },
                      {
                        value: 'GASTO_SERVICIO',
                        label: (
                          <Space size={4}>
                            <ToolOutlined />
                            Gasto / Servicio
                          </Space>
                        ),
                      },
                    ]}
                  />
                </FormField>
              </Col>

              {/* Número de documento */}
              <Col xs={24} sm={12} md={8}>
                <FormField label="Número de documento *">
                  <Input
                    placeholder="Ej: F-0001"
                    value={nuevoNumDoc}
                    onChange={e => setNuevoNumDoc(e.target.value)}
                  />
                </FormField>
              </Col>

              {/* Tipo de documento */}
              <Col xs={24} sm={12} md={8}>
                <FormField label="Tipo de documento *">
                  <Select
                    style={{ width: '100%' }}
                    value={nuevoTipoDoc}
                    onChange={v => setNuevoTipoDoc(v)}
                    options={[
                      { value: 'FACTURA', label: 'Factura' },
                      { value: 'CCF', label: 'CCF' },
                      { value: 'RECIBO', label: 'Recibo' },
                      { value: 'TICKET', label: 'Ticket' },
                      { value: 'NOTA', label: 'Nota' },
                    ]}
                  />
                </FormField>
              </Col>

              {/* Proveedor */}
              <Col xs={24} sm={12} md={12}>
                <FormField label="Proveedor">
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Buscar proveedor..."
                    showSearch
                    allowClear
                    filterOption={false}
                    value={nuevoProveedorId ?? undefined}
                    onFocus={() => {
                      if (proveedores.length === 0) buscarProveedores('');
                    }}
                    onSearch={buscarProveedores}
                    onChange={(v) => setNuevoProveedorId(v ?? null)}
                    notFoundContent={buscandoProv ? <Spin size="small" /> : 'Sin resultados'}
                    options={proveedores.map(p => ({
                      value: p.id,
                      label: p.nombre,
                    }))}
                  />
                </FormField>
              </Col>

              {/* Fecha */}
              <Col xs={24} sm={12} md={6}>
                <FormField label="Fecha *">
                  <DatePicker
                    style={{ width: '100%' }}
                    value={nuevaFecha}
                    onChange={(d) => d && setNuevaFecha(d)}
                    format="DD/MM/YYYY"
                  />
                </FormField>
              </Col>

              {/* Condición de pago */}
              <Col xs={24} sm={12} md={6}>
                <FormField label="Condición de pago">
                  <Select
                    style={{ width: '100%' }}
                    value={nuevaCondicion}
                    onChange={v => setNuevaCondicion(v)}
                    options={[
                      { value: 'CONTADO', label: 'Contado' },
                      { value: 'CREDITO', label: 'Crédito' },
                    ]}
                  />
                </FormField>
              </Col>
            </Row>
          </div>

          {/* ── SECCIÓN 2: DETALLES ── */}
          <div
            style={{
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '14px 16px',
              marginBottom: 16,
            }}
          >
            <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
              <Col>
                <Title level={5} style={{ margin: 0, color: C.textPrimary, fontSize: 13 }}>
                  Líneas de detalle
                </Title>
              </Col>
              <Col>
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={addLinea}
                  type="dashed"
                >
                  Añadir línea
                </Button>
              </Col>
            </Row>

            {/* Cabecera de columnas */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: nuevaTipoCompra === 'PRODUCTO'
                  ? 'minmax(0, 2fr) minmax(0, 1.4fr) minmax(0, 0.7fr) minmax(0, 0.9fr) minmax(0, 0.7fr) minmax(0, 0.9fr) 32px'
                  : 'minmax(0, 2.5fr) minmax(0, 0.7fr) minmax(0, 0.9fr) minmax(0, 0.7fr) minmax(0, 0.9fr) 32px',
                gap: 6,
                marginBottom: 4,
                padding: '0 4px',
              }}
            >
              {nuevaTipoCompra === 'PRODUCTO' && (
                <Text type="secondary" style={{ fontSize: 11 }}>Producto</Text>
              )}
              <Text type="secondary" style={{ fontSize: 11 }}>Descripción</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>Cantidad</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>Costo unit.</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>Desc.%</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>Subtotal</Text>
              <span />
            </div>

            {lineas.map((linea) => (
              <div
                key={linea.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: nuevaTipoCompra === 'PRODUCTO'
                    ? 'minmax(0, 2fr) minmax(0, 1.4fr) minmax(0, 0.7fr) minmax(0, 0.9fr) minmax(0, 0.7fr) minmax(0, 0.9fr) 32px'
                    : 'minmax(0, 2.5fr) minmax(0, 0.7fr) minmax(0, 0.9fr) minmax(0, 0.7fr) minmax(0, 0.9fr) 32px',
                  gap: 6,
                  marginBottom: 8,
                  alignItems: 'center',
                }}
              >
                {/* Selector de producto (solo PRODUCTO) */}
                {nuevaTipoCompra === 'PRODUCTO' && (
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Buscar producto..."
                    showSearch
                    allowClear
                    filterOption={false}
                    value={linea.productoId ?? undefined}
                    onSearch={(q) => buscarProductos(linea.key, q)}
                    onChange={(v) => v && onProductoSelect(linea.key, Number(v))}
                    notFoundContent={
                      buscandoProd[linea.key] ? <Spin size="small" /> : 'Sin resultados'
                    }
                    options={(productosBusqueda[linea.key] ?? []).map(p => ({
                      value: p.id,
                      label: `${p.codigo} — ${p.nombre}`,
                    }))}
                    size="small"
                  />
                )}

                {/* Descripción */}
                <Input
                  size="small"
                  placeholder="Descripción"
                  value={linea.descripcion}
                  onChange={e => updateLinea(linea.key, 'descripcion', e.target.value)}
                />

                {/* Cantidad */}
                <InputNumber
                  size="small"
                  min={0.01}
                  step={1}
                  precision={2}
                  style={{ width: '100%' }}
                  value={linea.cantidad}
                  onChange={v => updateLinea(linea.key, 'cantidad', v ?? 1)}
                />

                {/* Costo unitario */}
                <InputNumber
                  size="small"
                  min={0}
                  step={0.01}
                  precision={2}
                  prefix="$"
                  style={{ width: '100%' }}
                  value={linea.costoUnitario}
                  onChange={v => updateLinea(linea.key, 'costoUnitario', v ?? 0)}
                />

                {/* Descuento % */}
                <InputNumber
                  size="small"
                  min={0}
                  max={100}
                  step={1}
                  precision={2}
                  suffix="%"
                  style={{ width: '100%' }}
                  value={linea.descuento}
                  onChange={v => updateLinea(linea.key, 'descuento', v ?? 0)}
                />

                {/* Subtotal (readonly) */}
                <Input
                  size="small"
                  readOnly
                  value={formatMoney(linea.subtotal)}
                  style={{
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    color: primary,
                    fontWeight: 600,
                    background: C.bgSubtle,
                  }}
                />

                {/* Eliminar línea */}
                <Tooltip title="Quitar línea">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={lineas.length === 1}
                    onClick={() => removeLinea(linea.key)}
                  />
                </Tooltip>
              </div>
            ))}
          </div>

          {/* ── SECCIÓN 3: TOTALES + NOTAS ── */}
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={14}>
              <FormField label="Notas">
                <Input.TextArea
                  rows={2}
                  placeholder="Observaciones opcionales..."
                  value={nuevaNotas}
                  onChange={e => setNuevaNotas(e.target.value)}
                  maxLength={300}
                  showCount
                />
              </FormField>
            </Col>
            <Col xs={24} sm={10}>
              <div
                style={{
                  background: C.bgPrimaryLow,
                  border: `1px solid ${primary}40`,
                  borderRadius: 8,
                  padding: '12px 16px',
                }}
              >
                <Row justify="space-between" style={{ marginBottom: 4 }}>
                  <Col><Text type="secondary" style={{ fontSize: 12 }}>Subtotal</Text></Col>
                  <Col>
                    <Text style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
                      {formatMoney(totalesModal.subtotal)}
                    </Text>
                  </Col>
                </Row>
                <Row justify="space-between" style={{ marginBottom: 4 }}>
                  <Col><Text type="secondary" style={{ fontSize: 12 }}>IVA (13%)</Text></Col>
                  <Col>
                    <Text style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
                      {formatMoney(totalesModal.iva)}
                    </Text>
                  </Col>
                </Row>
                <Divider style={{ margin: '8px 0' }} />
                <Row justify="space-between">
                  <Col>
                    <Text strong style={{ fontSize: 14 }}>Total</Text>
                  </Col>
                  <Col>
                    <Text
                      strong
                      style={{ fontSize: 18, color: primary, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatMoney(totalesModal.total)}
                    </Text>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>

          {/* Error del formulario */}
          {formError && (
            <p style={{ color: C.colorError, fontSize: 13, margin: '8px 0 0' }}>
              {formError}
            </p>
          )}
        </div>

        {/* Footer del modal */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 20,
            paddingTop: 16,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <Button onClick={() => { setModalOpen(false); resetModal(); }}>
            Cancelar
          </Button>
          <Button
            type="primary"
            loading={guardando}
            disabled={lineas.length === 0 || totalesModal.total <= 0}
            onClick={handleGuardar}
          >
            {guardando ? 'Guardando...' : 'Registrar compra'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
