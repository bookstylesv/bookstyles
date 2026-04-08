'use client';

import React, { useState, useCallback } from 'react';
import {
  Row, Col, Card, Statistic, Table, Button, Modal, Drawer,
  Tabs, Tag, DatePicker, InputNumber, Form, Select, Switch,
  Tooltip, Space, Typography, Divider, Alert, Badge,
} from 'antd';
import {
  PlusOutlined, EyeOutlined, CheckCircleOutlined,
  DeleteOutlined, SettingOutlined, UserOutlined,
  TeamOutlined, CalendarOutlined, EditOutlined,
  ReloadOutlined, SafetyOutlined, BankOutlined,
  PercentageOutlined, GiftOutlined, SunOutlined,
  PrinterOutlined, DollarCircleOutlined, FilePdfOutlined,
} from '@ant-design/icons';
import {
  abrirPlanillaPDF, abrirComprobanteBarbero, abrirConstanciaLaboral,
  type PlanillaViewerData, type PlanillaDetalle,
} from '@/lib/planilla-viewer';
import { toast } from 'sonner';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

// ── Tipos ─────────────────────────────────────────────
interface DetallePlanilla {
  id: number; barberoId: number; nombre: string; tipoPago: string;
  unidades: number; salarioBruto: number; isss: number; afp: number;
  renta: number; otrasDeducciones: number; totalDeducciones: number;
  salarioNeto: number; isssPatronal: number; afpPatronal: number; insaforp: number;
}
interface Planilla {
  id: number; periodo: string; estado: string;
  totalBruto: number; totalISS: number; totalAFP: number; totalRenta: number;
  totalDeducciones: number; totalNeto: number;
  totalPatronalISS: number; totalPatronalAFP: number; totalINSAFORP: number;
  detalles: Array<Partial<DetallePlanilla> & { id: number }>;
  createdAt?: string;
}
interface BarberoResumen {
  id: number; nombre: string; cargo: string; tipoPago: string | null;
  salarioBase: number; valorPorUnidad: number;
  porcentajeServicio: number; aplicaRenta: boolean;
  fechaIngreso: string | null; configurado: boolean;
}
interface ConfigItem {
  id: number; clave: string; valor: number;
  descripcion: string | null; topeMaximo: number | null;
}
interface PrestacionItem {
  barberoId: number; nombre: string; salario: number; tipoPago: string;
  fechaIngreso: string; monto: number; dias?: number;
  esProporcional: boolean; mesesTrabajados: number;
  antiguedadAnios?: number; aplica?: boolean;
}
interface Props {
  planillasInit: Planilla[];
  barberosInit: BarberoResumen[];
  configInit: ConfigItem[];
  barberosConfigInit: unknown[];
  hasConfig: boolean;
  negocio: string;
}

const TIPO_PAGO_LABELS: Record<string, string> = {
  FIJO: 'Salario Fijo', POR_DIA: 'Por Día',
  POR_SEMANA: 'Por Semana', POR_HORA: 'Por Hora', POR_SERVICIO: 'Por Servicio',
};
const TIPO_PAGO_UNIDAD: Record<string, string> = {
  FIJO: '', POR_DIA: 'días', POR_SEMANA: 'semanas',
  POR_HORA: 'horas', POR_SERVICIO: 'servicios',
};
const ESTADO_COLOR: Record<string, string> = {
  BORRADOR: 'default', APROBADA: 'success', PAGADA: 'processing',
};

// ── Grupos de config ────────────────────────────────
const ISSS_KEYS     = ['isss_pct', 'isss_tope', 'isss_patronal_pct', 'isss_patronal_tope'];
const AFP_KEYS      = ['afp_pct', 'afp_patronal_pct'];
const INSAFORP_KEYS = ['insaforp_pct'];
const ISR_KEYS      = ['isr_t1_max', 'isr_t2_max', 'isr_t3_max',
                       'isr_t2_pct', 'isr_t3_pct', 'isr_t4_pct',
                       'isr_t2_exceso_desde', 'isr_t3_exceso_desde', 'isr_t4_exceso_desde',
                       'isr_t2_cuota', 'isr_t3_cuota', 'isr_t4_cuota'];

function fmt(n: number) { return `$${(n ?? 0).toFixed(2)}`; }
function pct(n: number) { return `${(n ?? 0).toFixed(2)}%`; }

export default function PlanillaClient({
  planillasInit, barberosInit, configInit, hasConfig, negocio,
}: Props) {
  const [planillas, setPlanillas]   = useState<Planilla[]>(planillasInit);
  const [barberos]                  = useState<BarberoResumen[]>(barberosInit);
  const [config, setConfig]         = useState<ConfigItem[]>(configInit);
  const [loading, setLoading]       = useState(false);
  const [activeTab, setActiveTab]   = useState('planillas');

  // Modales / Drawers
  const [modalNueva, setModalNueva]           = useState(false);
  const [drawerDetalle, setDrawerDetalle]     = useState<Planilla | null>(null);
  const [drawerLoading, setDrawerLoading]     = useState(false);
  const [modalConfig, setModalConfig]         = useState<BarberoResumen | null>(null);

  // Prestaciones
  const [aguinaldo,   setAguinaldo]   = useState<{ items: PrestacionItem[]; total: number; anio: number } | null>(null);
  const [vacaciones,  setVacaciones]  = useState<{ items: PrestacionItem[]; total: number } | null>(null);
  const [quincena25,  setQuincena25]  = useState<{ items: PrestacionItem[]; total: number; anio: number; aplican: number; noAplican: number } | null>(null);
  const [loadingPrest, setLoadingPrest] = useState(false);
  const [anioAguinaldo, setAnioAguinaldo]  = useState(new Date().getFullYear());
  const [anioQuincena,  setAnioQuincena]   = useState(Math.max(new Date().getFullYear(), 2027));
  const [completo, setCompleto]            = useState(false);
  const [printingId, setPrintingId]        = useState<number | null>(null);
  const [modalConstancia, setModalConstancia] = useState<BarberoResumen | null>(null);
  const [constanciaProposito, setConstanciaProposito] = useState('para los fines que convengan');

  // Form generación
  const [periodo, setPeriodo]   = useState<string>('');
  const [inputs,  setInputs]    = useState<Record<number, number>>({});
  const [generating, setGenerating] = useState(false);

  // Comisiones POS del período
  const [comisionesPOS, setComisionesPOS] = useState<
    Array<{ barberoId: number; totalComision: number; detalle: { desc: string; cant: number; comision: number }[] }>
  >([]);
  const [loadingComisiones, setLoadingComisiones] = useState(false);

  // Form config barbero
  const [formConfig, setFormConfig] = useState<{
    tipoPago: string; salarioBase: number; valorPorUnidad: number;
    porcentajeServicio: number; aplicaRenta: boolean; fechaIngreso: string | null;
  }>({ tipoPago: 'FIJO', salarioBase: 0, valorPorUnidad: 0, porcentajeServicio: 0, aplicaRenta: true, fechaIngreso: null });

  // ── Helpers fetch ──────────────────────────────────
  const reload = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch('/api/planilla'); if (r.ok) setPlanillas(await r.json()); }
    finally { setLoading(false); }
  }, []);

  const loadAguinaldo = async () => {
    setLoadingPrest(true);
    try {
      const r = await fetch(`/api/planilla/aguinaldo?anio=${anioAguinaldo}&completo=${completo}`);
      if (r.ok) {
        const d = await r.json();
        setAguinaldo({ items: d.items, total: d.totalAguinaldo, anio: d.anio });
      }
    } finally { setLoadingPrest(false); }
  };

  const loadVacaciones = async () => {
    setLoadingPrest(true);
    try {
      const r = await fetch('/api/planilla/vacaciones');
      if (r.ok) {
        const d = await r.json();
        setVacaciones({ items: d.items, total: d.totalVacaciones });
      }
    } finally { setLoadingPrest(false); }
  };

  const loadQuincena25 = async () => {
    setLoadingPrest(true);
    try {
      const r = await fetch(`/api/planilla/quincena25?anio=${anioQuincena}`);
      if (r.ok) {
        const d = await r.json();
        setQuincena25({ items: d.items, total: d.totalQuincena25, anio: d.anio, aplican: d.totalAplican, noAplican: d.totalNoAplican });
      }
    } finally { setLoadingPrest(false); }
  };

  // ── Cargar comisiones POS cuando cambia el período ─
  const handlePeriodoChange = async (d: ReturnType<typeof dayjs> | null) => {
    const p = d ? d.format('YYYY-MM') : '';
    setPeriodo(p);
    setComisionesPOS([]);
    if (!p) return;

    // Auto-pre-fill barberos POR_SERVICIO con sus comisiones del período
    const hayPorServicio = barberos.some(b => b.configurado && b.tipoPago === 'POR_SERVICIO');
    if (!hayPorServicio) return;

    setLoadingComisiones(true);
    try {
      const r = await fetch(`/api/planilla/comisiones?periodo=${p}`);
      if (r.ok) {
        const data = await r.json();
        const lista = data.data as typeof comisionesPOS;
        setComisionesPOS(lista);
        // Pre-llenar inputs para barberos POR_SERVICIO
        setInputs(prev => {
          const next = { ...prev };
          for (const barb of barberos) {
            if (barb.configurado && barb.tipoPago === 'POR_SERVICIO') {
              const com = lista.find(c => c.barberoId === barb.id);
              if (com !== undefined) {
                next[barb.id] = com.totalComision;
              }
            }
          }
          return next;
        });
      }
    } finally { setLoadingComisiones(false); }
  };

  // ── Generar planilla ───────────────────────────────
  const handleGenerar = async () => {
    if (!periodo) { toast.error('Selecciona el período'); return; }
    const barberosConConfig = barberos.filter(b => b.configurado);
    if (!barberosConConfig.length) { toast.error('Configura el tipo de pago de al menos un barbero'); return; }
    const barberoInputs = barberosConConfig.map(b => ({
      barberoId: b.id,
      unidades: b.tipoPago === 'FIJO' ? 0 : (inputs[b.id] ?? 0),
    }));
    setGenerating(true);
    try {
      const r = await fetch('/api/planilla', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo, barberos: barberoInputs }),
      });
      const data = await r.json();
      if (!r.ok) { toast.error(data.error || 'Error al generar planilla'); return; }
      toast.success(`Planilla ${periodo} generada`);
      setModalNueva(false); setPeriodo(''); setInputs({}); setComisionesPOS([]);
      await reload();
    } finally { setGenerating(false); }
  };

  // ── Aprobar / Eliminar ─────────────────────────────
  const handleAprobar = (id: number) => {
    Modal.confirm({
      title: '¿Aprobar planilla?',
      content: 'Una vez aprobada no podrá ser eliminada.',
      okText: 'Aprobar', cancelText: 'Cancelar', okType: 'primary',
      onOk: async () => {
        const r = await fetch(`/api/planilla/${id}/aprobar`, { method: 'PATCH' });
        if (r.ok) { toast.success('Planilla aprobada'); await reload(); }
        else toast.error('Error al aprobar');
      },
    });
  };
  const handleEliminar = (id: number) => {
    Modal.confirm({
      title: '¿Eliminar planilla?', okText: 'Eliminar', okType: 'danger', cancelText: 'Cancelar',
      onOk: async () => {
        const r = await fetch(`/api/planilla/${id}`, { method: 'DELETE' });
        const d = await r.json();
        if (r.ok) { toast.success('Planilla eliminada'); await reload(); }
        else toast.error(d.error || 'Error al eliminar');
      },
    });
  };

  const handlePagar = (id: number) => {
    Modal.confirm({
      title: '¿Marcar planilla como Pagada?',
      content: 'Confirma que se realizaron todos los pagos a los empleados. Esta acción no se puede revertir.',
      okText: 'Confirmar Pago', cancelText: 'Cancelar', okType: 'primary',
      okButtonProps: { style: { background: '#0d9488', borderColor: '#0d9488' } },
      onOk: async () => {
        const r = await fetch(`/api/planilla/${id}/pagar`, { method: 'PATCH' });
        const d = await r.json();
        if (r.ok) { toast.success('Planilla marcada como Pagada'); await reload(); }
        else toast.error(d.error || 'Error al marcar como pagada');
      },
    });
  };

  const handleImprimir = async (r: Planilla) => {
    setPrintingId(r.id);
    try {
      // Si el drawer tiene el detalle completo de esta planilla, úsalo
      const cached = drawerDetalle?.id === r.id && (drawerDetalle.detalles as DetallePlanilla[]).some(d => d.nombre);
      let data: Planilla | null = cached ? drawerDetalle : null;
      if (!data) {
        const res = await fetch(`/api/planilla/${r.id}`);
        if (res.ok) data = await res.json();
      }
      if (data) abrirPlanillaPDF(data as unknown as PlanillaViewerData, negocio);
    } finally { setPrintingId(null); }
  };

  // ── Config barbero ─────────────────────────────────
  const handleSaveConfigBarbero = async () => {
    if (!modalConfig) return;
    const r = await fetch('/api/planilla/barberos-config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barberoId: modalConfig.id, ...formConfig }),
    });
    if (r.ok) { toast.success('Configuración guardada'); setModalConfig(null); }
    else toast.error('Error al guardar');
  };

  // ── Config parámetros ──────────────────────────────
  const handleSaveConfig = async () => {
    const r = await fetch('/api/planilla/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (r.ok) toast.success('Parámetros guardados');
    else toast.error('Error al guardar');
  };
  const handleSeedConfig = async () => {
    const r = await fetch('/api/planilla/config', { method: 'POST' });
    if (r.ok) {
      toast.success('Parámetros inicializados con valores por defecto');
      const u = await fetch('/api/planilla/config');
      if (u.ok) setConfig(await u.json());
    }
  };

  // ── Helper para leer/editar config ────────────────
  const getVal  = (clave: string) => config.find(c => c.clave === clave)?.valor ?? 0;
  const setVal  = (clave: string, v: number) =>
    setConfig(prev => prev.map(c => c.clave === clave ? { ...c, valor: v } : c));

  // ── KPIs ───────────────────────────────────────────
  const configurados   = barberos.filter(b => b.configurado).length;
  const ultimaPlanilla = planillas[0];
  const totalPatronal  = ultimaPlanilla
    ? ultimaPlanilla.totalPatronalISS + ultimaPlanilla.totalPatronalAFP + ultimaPlanilla.totalINSAFORP : 0;

  // ── Columnas planillas ─────────────────────────────
  const colsPlanilla = [
    { title: 'Período', dataIndex: 'periodo', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Estado', dataIndex: 'estado', render: (v: string) => <Tag color={ESTADO_COLOR[v] || 'default'}>{v}</Tag> },
    { title: 'Barberos', dataIndex: 'detalles', align: 'center' as const, render: (d: unknown[]) => d.length },
    { title: 'Bruto', dataIndex: 'totalBruto', render: (v: number) => fmt(v) },
    { title: 'Deducciones', dataIndex: 'totalDeducciones', render: (v: number) => <Text type="danger">{fmt(v)}</Text> },
    { title: 'Neto', dataIndex: 'totalNeto', render: (v: number) => <Text strong style={{ color: '#0d9488' }}>{fmt(v)}</Text> },
    { title: 'Costo Patronal', render: (r: Planilla) => <Text type="secondary">{fmt(r.totalPatronalISS + r.totalPatronalAFP + r.totalINSAFORP)}</Text> },
    {
      title: 'Acciones',
      render: (r: Planilla) => (
        <Space>
          <Tooltip title="Ver detalle">
            <Button size="small" icon={<EyeOutlined />} onClick={async () => {
              setDrawerLoading(true); setDrawerDetalle(r);
              try { const res = await fetch(`/api/planilla/${r.id}`); if (res.ok) setDrawerDetalle(await res.json()); }
              finally { setDrawerLoading(false); }
            }} />
          </Tooltip>
          <Tooltip title="Imprimir / PDF">
            <Button
              size="small" icon={<PrinterOutlined />}
              loading={printingId === r.id}
              onClick={() => handleImprimir(r)}
            />
          </Tooltip>
          {r.estado === 'BORRADOR' && (<>
            <Tooltip title="Aprobar">
              <Button size="small" icon={<CheckCircleOutlined />} type="primary" onClick={() => handleAprobar(r.id)} />
            </Tooltip>
            <Tooltip title="Eliminar">
              <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleEliminar(r.id)} />
            </Tooltip>
          </>)}
          {r.estado === 'APROBADA' && (
            <Tooltip title="Marcar como Pagada">
              <Button
                size="small" icon={<DollarCircleOutlined />} type="primary"
                style={{ background: '#059669', borderColor: '#059669' }}
                onClick={() => handlePagar(r.id)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // ── Columnas detalle planilla ──────────────────────
  const colsDetalle = [
    { title: 'Barbero',    dataIndex: 'nombre',          render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Tipo',       dataIndex: 'tipoPago',        render: (v: string) => <Tag>{TIPO_PAGO_LABELS[v] || v}</Tag> },
    { title: 'Bruto',      dataIndex: 'salarioBruto',    render: (v: number) => fmt(v) },
    { title: 'ISSS',       dataIndex: 'isss',            render: (v: number) => <Text type="danger">{fmt(v)}</Text> },
    { title: 'AFP',        dataIndex: 'afp',             render: (v: number) => <Text type="danger">{fmt(v)}</Text> },
    { title: 'Renta',      dataIndex: 'renta',           render: (v: number) => <Text type="danger">{fmt(v)}</Text> },
    { title: 'Total Ded.', dataIndex: 'totalDeducciones',render: (v: number) => <Text type="danger">{fmt(v)}</Text> },
    { title: 'Neto',       dataIndex: 'salarioNeto',     render: (v: number) => <Text strong style={{ color: '#0d9488' }}>{fmt(v)}</Text> },
    { title: 'ISSS Pat.',  dataIndex: 'isssPatronal',    render: (v: number) => <Text type="secondary">{fmt(v)}</Text> },
    { title: 'AFP Pat.',   dataIndex: 'afpPatronal',     render: (v: number) => <Text type="secondary">{fmt(v)}</Text> },
    { title: 'INSAFORP',   dataIndex: 'insaforp',        render: (v: number) => <Text type="secondary">{fmt(v)}</Text> },
  ];

  // ── Columnas barberos (config) ─────────────────────
  const colsBarberos = [
    { title: 'Barbero', key: 'nombre', render: (r: BarberoResumen) => r.nombre },
    {
      title: 'Tipo de Pago',
      render: (r: BarberoResumen) => r.configurado
        ? <Tag color="cyan">{TIPO_PAGO_LABELS[r.tipoPago!] || r.tipoPago}</Tag>
        : <Tag color="orange">Sin configurar</Tag>,
    },
    {
      title: 'Salario/Valor',
      render: (r: BarberoResumen) => {
        if (!r.configurado) return '—';
        if (r.tipoPago === 'FIJO') return fmt(r.salarioBase);
        if (r.tipoPago === 'POR_SERVICIO' && r.porcentajeServicio > 0) return `${r.porcentajeServicio}% del servicio`;
        return `${fmt(r.valorPorUnidad)} / ${TIPO_PAGO_UNIDAD[r.tipoPago!] || 'unidad'}`;
      },
    },
    { title: 'Fecha Ingreso', render: (r: BarberoResumen) => r.fechaIngreso ? dayjs(r.fechaIngreso).format('DD/MM/YYYY') : <Text type="secondary">No definida</Text> },
    { title: 'Renta', render: (r: BarberoResumen) => r.configurado ? (r.aplicaRenta ? <Tag color="blue">Aplica</Tag> : <Tag>No aplica</Tag>) : '—' },
    {
      title: 'Acciones',
      render: (r: BarberoResumen) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />}
            onClick={() => {
              setFormConfig({
                tipoPago: r.tipoPago || 'FIJO', salarioBase: r.salarioBase || 0,
                valorPorUnidad: r.valorPorUnidad || 0, porcentajeServicio: r.porcentajeServicio || 0,
                aplicaRenta: r.aplicaRenta ?? true, fechaIngreso: r.fechaIngreso,
              });
              setModalConfig(r);
            }}>
            {r.configurado ? 'Editar' : 'Configurar'}
          </Button>
          <Tooltip title="Generar constancia laboral">
            <Button
              size="small"
              icon={<FilePdfOutlined />}
              onClick={() => { setConstanciaProposito('para los fines que convengan'); setModalConstancia(r); }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ── Columnas Aguinaldo ─────────────────────────────
  const colsAguinaldo = [
    { title: 'Barbero', dataIndex: 'nombre', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Salario', dataIndex: 'salario', render: (v: number) => fmt(v) },
    { title: 'Antigüedad', dataIndex: 'antiguedadAnios', render: (v: number) => `${v} años` },
    { title: 'Días', dataIndex: 'dias', render: (v: number) => v.toFixed(2) },
    { title: 'Tipo', dataIndex: 'esProporcional', render: (v: boolean) => <Tag color={v ? 'orange' : 'green'}>{v ? 'Proporcional' : 'Completo'}</Tag> },
    { title: 'Monto', dataIndex: 'monto', render: (v: number) => <Text strong style={{ color: '#0d9488' }}>{fmt(v)}</Text> },
  ];

  // ── Columnas Vacaciones ────────────────────────────
  const colsVacaciones = [
    { title: 'Barbero', dataIndex: 'nombre', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Salario', dataIndex: 'salario', render: (v: number) => fmt(v) },
    { title: 'Meses', dataIndex: 'mesesTrabajados', render: (v: number) => `${v} meses` },
    { title: 'Días', dataIndex: 'dias', render: (v: number) => v.toFixed(2) },
    { title: 'Tipo', dataIndex: 'esProporcional', render: (v: boolean) => <Tag color={v ? 'orange' : 'green'}>{v ? 'Proporcional' : 'Completo'}</Tag> },
    { title: 'Monto (+30%)', dataIndex: 'monto', render: (v: number) => <Text strong style={{ color: '#0d9488' }}>{fmt(v)}</Text> },
  ];

  // ── Columnas Quincena 25 ───────────────────────────
  const colsQuincena = [
    { title: 'Barbero', dataIndex: 'nombre', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Salario', dataIndex: 'salario', render: (v: number) => fmt(v) },
    { title: 'Aplica', dataIndex: 'aplica', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Sí (≤$1,500)' : 'No (>$1,500)'}</Tag> },
    { title: 'Tipo', dataIndex: 'esProporcional', render: (v: boolean, r: PrestacionItem) => r.aplica ? <Tag color={v ? 'orange' : 'green'}>{v ? 'Proporcional' : 'Completo'}</Tag> : '—' },
    { title: 'Monto (50%)', dataIndex: 'monto', render: (v: number, r: PrestacionItem) => r.aplica ? <Text strong style={{ color: '#0d9488' }}>{fmt(v)}</Text> : <Text type="secondary">—</Text> },
  ];

  // ── Componente Config separada ─────────────────────
  const ConfigParametros = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Text type="secondary">Tasas y tramos según legislación El Salvador — editables ante cambios del gobierno</Text>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleSeedConfig}>Inicializar por defecto</Button>
          <Button type="primary" onClick={handleSaveConfig} style={{ background: '#0d9488', borderColor: '#0d9488' }}>
            Guardar Todos los Cambios
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* ── ISSS / Seguro Social ── */}
        <Col xs={24} md={12}>
          <Card
            title={<span><SafetyOutlined style={{ color: '#1677ff', marginRight: 8 }} />ISSS — Seguro Social</span>}
            size="small" style={{ height: '100%' }}
          >
            <Row gutter={[12, 16]}>
              <Col span={24}>
                <Text type="secondary" style={{ fontSize: 12 }}>EMPLEADO</Text>
              </Col>
              <Col span={12}>
                <div>
                  <Text strong style={{ fontSize: 12 }}>Tasa empleado</Text>
                  <div style={{ marginTop: 4 }}>
                    <InputNumber
                      value={getVal('isss_pct')} min={0} max={100} precision={2}
                      addonAfter="%" style={{ width: '100%' }}
                      onChange={v => setVal('isss_pct', v ?? 0)}
                    />
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <Text strong style={{ fontSize: 12 }}>Tope salarial empleado</Text>
                  <div style={{ marginTop: 4 }}>
                    <InputNumber
                      value={getVal('isss_tope')} min={0} precision={2}
                      addonBefore="$" style={{ width: '100%' }}
                      onChange={v => setVal('isss_tope', v ?? 0)}
                    />
                  </div>
                </div>
              </Col>
              <Col span={24}>
                <Divider style={{ margin: '4px 0' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>PATRONAL</Text>
              </Col>
              <Col span={12}>
                <div>
                  <Text strong style={{ fontSize: 12 }}>Tasa patronal</Text>
                  <div style={{ marginTop: 4 }}>
                    <InputNumber
                      value={getVal('isss_patronal_pct')} min={0} max={100} precision={2}
                      addonAfter="%" style={{ width: '100%' }}
                      onChange={v => setVal('isss_patronal_pct', v ?? 0)}
                    />
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <Text strong style={{ fontSize: 12 }}>Tope salarial patronal</Text>
                  <div style={{ marginTop: 4 }}>
                    <InputNumber
                      value={getVal('isss_patronal_tope')} min={0} precision={2}
                      addonBefore="$" style={{ width: '100%' }}
                      onChange={v => setVal('isss_patronal_tope', v ?? 0)}
                    />
                  </div>
                </div>
              </Col>
              <Col span={24}>
                <Divider style={{ margin: '4px 0' }} />
                <div>
                  <Text strong style={{ fontSize: 12 }}>INSAFORP / INCAF (patronal)</Text>
                  <div style={{ marginTop: 4 }}>
                    <InputNumber
                      value={getVal('insaforp_pct')} min={0} max={100} precision={2}
                      addonAfter="%" style={{ width: '100%' }}
                      onChange={v => setVal('insaforp_pct', v ?? 0)}
                    />
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* ── AFP ── */}
        <Col xs={24} md={12}>
          <Card
            title={<span><BankOutlined style={{ color: '#52c41a', marginRight: 8 }} />AFP — Fondo de Pensiones</span>}
            size="small" style={{ height: '100%' }}
          >
            <Row gutter={[12, 16]}>
              <Col span={24}>
                <Text type="secondary" style={{ fontSize: 12 }}>EMPLEADO</Text>
              </Col>
              <Col span={24}>
                <div>
                  <Text strong style={{ fontSize: 12 }}>Tasa empleado (sin tope máximo)</Text>
                  <div style={{ marginTop: 4 }}>
                    <InputNumber
                      value={getVal('afp_pct')} min={0} max={100} precision={4}
                      addonAfter="%" style={{ width: '100%' }}
                      onChange={v => setVal('afp_pct', v ?? 0)}
                    />
                  </div>
                </div>
              </Col>
              <Col span={24}>
                <Divider style={{ margin: '4px 0' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>PATRONAL</Text>
              </Col>
              <Col span={24}>
                <div>
                  <Text strong style={{ fontSize: 12 }}>Tasa patronal</Text>
                  <div style={{ marginTop: 4 }}>
                    <InputNumber
                      value={getVal('afp_patronal_pct')} min={0} max={100} precision={4}
                      addonAfter="%" style={{ width: '100%' }}
                      onChange={v => setVal('afp_patronal_pct', v ?? 0)}
                    />
                  </div>
                </div>
              </Col>
              <Col span={24} style={{ marginTop: 12 }}>
                <Alert type="info" showIcon message="El AFP no tiene tope salarial — se aplica sobre el salario bruto completo." />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* ── Renta / ISR ── */}
        <Col span={24}>
          <Card
            title={<span><PercentageOutlined style={{ color: '#f5222d', marginRight: 8 }} />Renta — Impuesto Sobre la Renta (ISR)</span>}
            size="small"
            extra={<Text type="secondary" style={{ fontSize: 12 }}>Base imponible = Salario Bruto − ISSS − AFP</Text>}
          >
            <Alert
              type="warning" showIcon style={{ marginBottom: 16 }}
              message="La tabla ISR se aplica sobre la base imponible (Bruto − ISSS − AFP). Modifica los tramos si el gobierno actualiza las tasas."
            />
            <div style={{ overflowX: 'auto' }}>
            <Table
              size="small"
              scroll={{ x: 'max-content' }}
              pagination={false}
              dataSource={[
                {
                  key: 't1', tramo: 'Tramo 1 (Exento)',
                  hasta: getVal('isr_t1_max'), desde: 0,
                  cuota: 0, pct: 0,
                  clavePct: null, claveCuota: null, claveHasta: 'isr_t1_max',
                },
                {
                  key: 't2', tramo: 'Tramo 2',
                  desde: getVal('isr_t2_exceso_desde'), hasta: getVal('isr_t2_max'),
                  cuota: getVal('isr_t2_cuota'), pct: getVal('isr_t2_pct'),
                  clavePct: 'isr_t2_pct', claveCuota: 'isr_t2_cuota',
                  claveHasta: 'isr_t2_max', claveDesde: 'isr_t2_exceso_desde',
                },
                {
                  key: 't3', tramo: 'Tramo 3',
                  desde: getVal('isr_t3_exceso_desde'), hasta: getVal('isr_t3_max'),
                  cuota: getVal('isr_t3_cuota'), pct: getVal('isr_t3_pct'),
                  clavePct: 'isr_t3_pct', claveCuota: 'isr_t3_cuota',
                  claveHasta: 'isr_t3_max', claveDesde: 'isr_t3_exceso_desde',
                },
                {
                  key: 't4', tramo: 'Tramo 4',
                  desde: getVal('isr_t4_exceso_desde'), hasta: null,
                  cuota: getVal('isr_t4_cuota'), pct: getVal('isr_t4_pct'),
                  clavePct: 'isr_t4_pct', claveCuota: 'isr_t4_cuota',
                  claveHasta: null, claveDesde: 'isr_t4_exceso_desde',
                },
              ]}
              columns={[
                { title: 'Tramo', dataIndex: 'tramo', width: 140, render: (v: string) => <Text strong>{v}</Text> },
                {
                  title: 'Desde ($)',
                  render: (r: any) => r.key === 't1' ? '$0' :
                    r.claveDesde ? (
                      <InputNumber value={r.desde} min={0} precision={2} size="small" style={{ width: 110 }}
                        onChange={v => setVal(r.claveDesde, v ?? 0)} addonBefore="$" />
                    ) : `$${r.desde.toFixed(2)}`,
                },
                {
                  title: 'Hasta ($)',
                  render: (r: any) => r.key === 't4' ? <Text type="secondary">En adelante</Text> :
                    r.claveHasta ? (
                      <InputNumber value={r.hasta} min={0} precision={2} size="small" style={{ width: 110 }}
                        onChange={v => setVal(r.claveHasta, v ?? 0)} addonBefore="$" />
                    ) : `$${(r.hasta ?? 0).toFixed(2)}`,
                },
                {
                  title: 'Cuota Fija ($)',
                  render: (r: any) => r.claveCuota ? (
                    <InputNumber value={r.cuota} min={0} precision={2} size="small" style={{ width: 110 }}
                      onChange={v => setVal(r.claveCuota, v ?? 0)} addonBefore="$" />
                  ) : <Text type="secondary">$0</Text>,
                },
                {
                  title: '% sobre exceso',
                  render: (r: any) => r.clavePct ? (
                    <InputNumber value={r.pct} min={0} max={100} precision={2} size="small" style={{ width: 100 }}
                      onChange={v => setVal(r.clavePct, v ?? 0)} addonAfter="%" />
                  ) : <Text type="secondary">0%</Text>,
                },
                {
                  title: 'Fórmula',
                  render: (r: any) => {
                    if (r.key === 't1') return <Text type="secondary">Sin retención</Text>;
                    return <Text code style={{ fontSize: 11 }}>${r.cuota.toFixed(2)} + {r.pct}% × (base − ${r.desde.toFixed(2)})</Text>;
                  },
                },
              ]}
            />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );

  void dayjs;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0d9488' }}>Planilla</Title>
          <Text type="secondary">Gestión de salarios, deducciones y prestaciones de ley</Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={reload} loading={loading} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalNueva(true)}
            style={{ background: '#0d9488', borderColor: '#0d9488' }}>
            Nueva Planilla
          </Button>
        </Space>
      </div>

      {/* ── KPIs ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Barberos Configurados" value={configurados} suffix={`/ ${barberos.length}`}
              prefix={<TeamOutlined />} valueStyle={{ color: '#0d9488' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Último Período" value={ultimaPlanilla?.periodo ?? '—'}
              prefix={<CalendarOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Total Neto (Último Mes)" value={ultimaPlanilla?.totalNeto ?? 0}
              prefix="$" precision={2} valueStyle={{ color: '#0d9488' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Costo Patronal (Último)" value={totalPatronal}
              prefix="$" precision={2} valueStyle={{ color: '#f59e0b' }} />
          </Card>
        </Col>
      </Row>

      {!hasConfig && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }}
          message="Configura los parámetros de planilla antes de generar"
          action={<Button size="small" onClick={() => setActiveTab('config')}>Ir a Configuración</Button>}
        />
      )}

      {/* ── Tabs principales ── */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          /* ── 1. Planillas ── */
          {
            key: 'planillas',
            label: <span><CalendarOutlined /> Planillas</span>,
            children: (
              <div style={{ overflowX: 'auto' }}>
                <Table dataSource={planillas} columns={colsPlanilla} rowKey="id"
                  loading={loading} size="middle" pagination={{ pageSize: 10 }}
                  scroll={{ x: 'max-content' }}
                  locale={{ emptyText: 'No hay planillas generadas' }} />
              </div>
            ),
          },

          /* ── 2. Aguinaldo ── */
          {
            key: 'aguinaldo',
            label: <span><GiftOutlined /> Aguinaldo</span>,
            children: (
              <div>
                <Alert type="info" showIcon style={{ marginBottom: 16 }}
                  message="Art. 196-202 Código de Trabajo — 1 a 3 años: 15 días | 3 a 10 años: 19 días | 10+ años: 21 días. Pago antes del 20 de diciembre." />
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <Text strong style={{ marginRight: 8 }}>Año:</Text>
                    <InputNumber value={anioAguinaldo} min={2020} max={2100}
                      onChange={v => setAnioAguinaldo(v ?? new Date().getFullYear())} style={{ width: 100 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text strong>Otorgar completo a todos:</Text>
                    <Switch checked={completo} onChange={setCompleto} checkedChildren="Sí" unCheckedChildren="No" />
                  </div>
                  <Button type="primary" onClick={loadAguinaldo} loading={loadingPrest}
                    style={{ background: '#0d9488', borderColor: '#0d9488' }}>
                    Calcular Aguinaldo
                  </Button>
                </div>
                {aguinaldo && (
                  <>
                    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                      <Col xs={24} sm={8}>
                        <Card size="small">
                          <Statistic title="Total Aguinaldo" value={aguinaldo.total} prefix="$" precision={2}
                            valueStyle={{ color: '#0d9488' }} />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card size="small">
                          <Statistic title="Barberos" value={aguinaldo.items.length} />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card size="small">
                          <Statistic title="Promedio por Barbero"
                            value={aguinaldo.items.length ? aguinaldo.total / aguinaldo.items.length : 0}
                            prefix="$" precision={2} />
                        </Card>
                      </Col>
                    </Row>
                    <div style={{ overflowX: 'auto' }}>
                      <Table dataSource={aguinaldo.items} columns={colsAguinaldo}
                        rowKey="barberoId" size="small" pagination={false}
                        scroll={{ x: 'max-content' }} />
                    </div>
                  </>
                )}
              </div>
            ),
          },

          /* ── 3. Vacaciones ── */
          {
            key: 'vacaciones',
            label: <span><SunOutlined /> Vacaciones</span>,
            children: (
              <div>
                <Alert type="info" showIcon style={{ marginBottom: 16 }}
                  message="Art. 177 Código de Trabajo — 15 días de vacaciones con 30% de recargo adicional sobre el salario de esos días." />
                <div style={{ marginBottom: 16 }}>
                  <Button type="primary" onClick={loadVacaciones} loading={loadingPrest}
                    style={{ background: '#0d9488', borderColor: '#0d9488' }}>
                    Calcular Vacaciones
                  </Button>
                </div>
                {vacaciones && (
                  <>
                    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                      <Col xs={24} sm={8}>
                        <Card size="small">
                          <Statistic title="Total Vacaciones (inc. 30%)" value={vacaciones.total}
                            prefix="$" precision={2} valueStyle={{ color: '#0d9488' }} />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card size="small">
                          <Statistic title="Barberos" value={vacaciones.items.length} />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card size="small">
                          <Statistic title="Promedio por Barbero"
                            value={vacaciones.items.length ? vacaciones.total / vacaciones.items.length : 0}
                            prefix="$" precision={2} />
                        </Card>
                      </Col>
                    </Row>
                    <div style={{ overflowX: 'auto' }}>
                      <Table dataSource={vacaciones.items} columns={colsVacaciones}
                        rowKey="barberoId" size="small" pagination={false}
                        scroll={{ x: 'max-content' }} />
                    </div>
                  </>
                )}
              </div>
            ),
          },

          /* ── 4. Quincena 25 ── */
          {
            key: 'quincena25',
            label: <span><BankOutlined /> Quincena 25</span>,
            children: (
              <div>
                <Alert type="warning" showIcon style={{ marginBottom: 16 }}
                  message="Decreto Legislativo 499 — vigente desde enero 2027. 50% del salario mensual para empleados con salario ≤ $1,500. Se paga el 25 de enero de cada año." />
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <Text strong style={{ marginRight: 8 }}>Año:</Text>
                    <InputNumber value={anioQuincena} min={2027} max={2100}
                      onChange={v => setAnioQuincena(v ?? 2027)} style={{ width: 100 }} />
                  </div>
                  <Button type="primary" onClick={loadQuincena25} loading={loadingPrest}
                    style={{ background: '#0d9488', borderColor: '#0d9488' }}>
                    Calcular Quincena 25
                  </Button>
                </div>
                {quincena25 && (
                  <>
                    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                      <Col xs={12} sm={6}>
                        <Card size="small">
                          <Statistic title="Total Quincena 25" value={quincena25.total}
                            prefix="$" precision={2} valueStyle={{ color: '#0d9488' }} />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card size="small">
                          <Statistic title="Aplican (≤$1,500)" value={quincena25.aplican}
                            valueStyle={{ color: '#52c41a' }} />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card size="small">
                          <Statistic title="No Aplican (>$1,500)" value={quincena25.noAplican}
                            valueStyle={{ color: '#f5222d' }} />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card size="small">
                          <Statistic title="Total Barberos" value={quincena25.aplican + quincena25.noAplican} />
                        </Card>
                      </Col>
                    </Row>
                    <div style={{ overflowX: 'auto' }}>
                      <Table dataSource={quincena25.items} columns={colsQuincena}
                        rowKey="barberoId" size="small" pagination={false}
                        scroll={{ x: 'max-content' }} />
                    </div>
                  </>
                )}
              </div>
            ),
          },

          /* ── 5. Configuración ── */
          {
            key: 'config',
            label: <span><SettingOutlined /> Configuración</span>,
            children: (
              <Tabs items={[
                {
                  key: 'parametros',
                  label: 'Parámetros de Ley',
                  children: <ConfigParametros />,
                },
                {
                  key: 'barberos',
                  label: 'Configuración de Empleados',
                  children: (
                    <Alert
                      type="info"
                      showIcon
                      message="Configuración de pago movida al módulo de Empleados"
                      description={
                        <span>
                          El tipo de pago, salario, fecha de ingreso y deducciones de cada empleado
                          ahora se configuran directamente en{' '}
                          <a href="/barbers" style={{ color: '#0d9488', fontWeight: 600 }}>
                            Módulo de Empleados → perfil del empleado → pestaña &quot;Configuración de Pago&quot;
                          </a>.
                          Esto permite gestionar toda la información del empleado en un solo lugar.
                        </span>
                      }
                      style={{ margin: '16px 0' }}
                    />
                  ),
                },
              ]} />
            ),
          },
        ]} />
      </Card>

      {/* ── Modal: Nueva Planilla ── */}
      <Modal open={modalNueva}
        title={<span><CalendarOutlined /> Generar Nueva Planilla</span>}
        onCancel={() => { setModalNueva(false); setPeriodo(''); setInputs({}); setComisionesPOS([]); }}
        onOk={handleGenerar} okText="Generar Planilla"
        confirmLoading={generating}
        okButtonProps={{ style: { background: '#0d9488', borderColor: '#0d9488' } }}
        width="min(700px, 96vw)"
        style={{ maxWidth: '96vw' }}>
        <div style={{ marginBottom: 16 }}>
          <Text strong>Período:</Text>
          <div style={{ marginTop: 8 }}>
            <DatePicker picker="month" format="YYYY-MM" placeholder="Selecciona mes y año"
              onChange={handlePeriodoChange} style={{ width: '100%' }} />
          </div>
        </div>
        {loadingComisiones && (
          <Alert type="info" showIcon style={{ marginBottom: 12 }}
            message="Cargando comisiones del período desde POS..." />
        )}
        {!loadingComisiones && comisionesPOS.length > 0 && (
          <Alert type="success" showIcon style={{ marginBottom: 12 }}
            message={`Comisiones cargadas automáticamente desde POS — ${comisionesPOS.length} barbero(s) con comisiones`} />
        )}
        <Divider>Barberos y Unidades Trabajadas</Divider>
        {barberos.length === 0 ? (
          <Alert type="warning" message="No hay barberos activos" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
        <Table
            dataSource={barberos.filter(b => b.configurado)} rowKey="id" size="small" pagination={false}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'Ningún barbero configurado. Ve a Empleados → perfil del empleado → Configuración de Pago.' }}
            columns={[
              { title: 'Barbero', dataIndex: 'nombre' },
              { title: 'Tipo', dataIndex: 'tipoPago', render: (v: string) => <Tag>{TIPO_PAGO_LABELS[v] || v}</Tag> },
              {
                title: 'Base / Unidades',
                render: (r: BarberoResumen) => {
                  if (r.tipoPago === 'FIJO') return <Text type="secondary">Fijo: {fmt(r.salarioBase)}</Text>;
                  const comPOS = comisionesPOS.find(c => c.barberoId === r.id);
                  const isAutoFilled = r.tipoPago === 'POR_SERVICIO' && !!comPOS;
                  return (
                    <div>
                      <InputNumber
                        placeholder={r.tipoPago === 'POR_SERVICIO' ? '$ comisión total' : `N° ${TIPO_PAGO_UNIDAD[r.tipoPago!] || 'unidades'}`}
                        min={0} precision={2}
                        addonBefore={r.tipoPago === 'POR_SERVICIO' ? '$' : undefined}
                        style={{ width: 180 }} value={inputs[r.id]}
                        onChange={v => setInputs(prev => ({ ...prev, [r.id]: v ?? 0 }))}
                      />
                      {isAutoFilled && comPOS.detalle.length > 0 && (
                        <Tooltip title={
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>Desglose POS:</div>
                            {comPOS.detalle.map((d, i) => (
                              <div key={i}>{d.desc} ×{d.cant} = {fmt(d.comision)}</div>
                            ))}
                          </div>
                        }>
                          <Tag color="cyan" style={{ marginTop: 4, cursor: 'help', display: 'block' }}>
                            Auto POS: {fmt(comPOS.totalComision)}
                          </Tag>
                        </Tooltip>
                      )}
                    </div>
                  );
                },
              },
              {
                title: 'Bruto Est.',
                render: (r: BarberoResumen) => {
                  let b = 0;
                  const isPorServicioComision = r.tipoPago === 'POR_SERVICIO' && r.valorPorUnidad === 0 && r.porcentajeServicio === 0;
                  if (r.tipoPago === 'FIJO') b = r.salarioBase;
                  else if (isPorServicioComision) b = inputs[r.id] ?? 0;
                  else if (r.tipoPago === 'POR_SERVICIO' && r.porcentajeServicio > 0)
                    b = (inputs[r.id] ?? 0) * (r.porcentajeServicio / 100);
                  else b = r.valorPorUnidad * (inputs[r.id] ?? 0);
                  return <Text strong style={{ color: '#0d9488' }}>{fmt(b)}</Text>;
                },
              },
            ]}
          />
        </div>
        )}
        {!hasConfig && (
          <Alert type="error" showIcon style={{ marginTop: 16 }}
            message="Parámetros no configurados. Ve a Configuración → Parámetros." />
        )}
      </Modal>

      {/* ── Drawer: Detalle planilla ── */}
      <Drawer open={!!drawerDetalle} onClose={() => setDrawerDetalle(null)}
        title={<span>Planilla — Período: <Text strong>{drawerDetalle?.periodo}</Text></span>}
        width={typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : '90%'}
        extra={
          <Space>
            <Tag color={ESTADO_COLOR[drawerDetalle?.estado || 'BORRADOR']}>{drawerDetalle?.estado}</Tag>
            <Tooltip title="Imprimir planilla completa (PDF)">
              <Button
                icon={<FilePdfOutlined />} size="small"
                onClick={() => drawerDetalle && abrirPlanillaPDF(drawerDetalle as unknown as PlanillaViewerData, negocio)}
                disabled={drawerLoading || !drawerDetalle}
              >
                Imprimir Planilla
              </Button>
            </Tooltip>
          </Space>
        }>
        {drawerDetalle && (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              {[
                { label: 'Total Bruto',       value: drawerDetalle.totalBruto },
                { label: 'ISSS Empleados',    value: drawerDetalle.totalISS },
                { label: 'AFP Empleados',     value: drawerDetalle.totalAFP },
                { label: 'Renta (ISR)',        value: drawerDetalle.totalRenta },
                { label: 'Total Deducciones', value: drawerDetalle.totalDeducciones },
                { label: 'Total Neto',        value: drawerDetalle.totalNeto },
                { label: 'ISSS Patronal',     value: drawerDetalle.totalPatronalISS },
                { label: 'AFP Patronal',      value: drawerDetalle.totalPatronalAFP },
                { label: 'INSAFORP',          value: drawerDetalle.totalINSAFORP },
              ].map(item => (
                <Col key={item.label} xs={12} sm={8} md={6}>
                  <Statistic title={item.label} value={item.value} prefix="$" precision={2}
                    valueStyle={{ fontSize: 16, color: item.label === 'Total Neto' ? '#0d9488' : undefined }} />
                </Col>
              ))}
            </Row>
            <Divider>Detalle por Barbero</Divider>
            <Table
              dataSource={drawerDetalle.detalles as DetallePlanilla[]}
              columns={[
                ...colsDetalle,
                {
                  title: 'Comprobante',
                  render: (d: DetallePlanilla) => (
                    <Tooltip title="Imprimir comprobante de pago individual">
                      <Button
                        size="small" icon={<PrinterOutlined />}
                        onClick={() => abrirComprobanteBarbero(
                          drawerDetalle as unknown as PlanillaViewerData,
                          d,
                          negocio,
                        )}
                      />
                    </Tooltip>
                  ),
                },
              ]}
              rowKey="id" size="small"
              scroll={{ x: true }} pagination={false} loading={drawerLoading}
            />
          </>
        )}
      </Drawer>

      {/* ── Modal: Config pago barbero ── */}
      <Modal open={!!modalConfig}
        title={<span><UserOutlined /> Configurar Pago — {modalConfig?.nombre}</span>}
        onCancel={() => setModalConfig(null)} onOk={handleSaveConfigBarbero}
        okText="Guardar"
        okButtonProps={{ style: { background: '#0d9488', borderColor: '#0d9488' } }}
        width="min(500px, 96vw)"
        style={{ maxWidth: '96vw' }}>
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Tipo de Pago">
            <Select value={formConfig.tipoPago} onChange={v => setFormConfig(p => ({ ...p, tipoPago: v }))}>
              {Object.entries(TIPO_PAGO_LABELS).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}
            </Select>
          </Form.Item>

          {formConfig.tipoPago === 'FIJO' && (
            <Form.Item label="Salario Mensual ($)">
              <InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="$"
                value={formConfig.salarioBase}
                onChange={v => setFormConfig(p => ({ ...p, salarioBase: v ?? 0 }))} />
            </Form.Item>
          )}
          {['POR_DIA', 'POR_SEMANA', 'POR_HORA'].includes(formConfig.tipoPago) && (
            <Form.Item label={`Valor por ${TIPO_PAGO_UNIDAD[formConfig.tipoPago]} ($)`}>
              <InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="$"
                value={formConfig.valorPorUnidad}
                onChange={v => setFormConfig(p => ({ ...p, valorPorUnidad: v ?? 0 }))} />
            </Form.Item>
          )}
          {formConfig.tipoPago === 'POR_SERVICIO' && (<>
            <Form.Item label="Valor por Servicio ($) — dejar 0 si usa porcentaje">
              <InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="$"
                value={formConfig.valorPorUnidad}
                onChange={v => setFormConfig(p => ({ ...p, valorPorUnidad: v ?? 0 }))} />
            </Form.Item>
            <Form.Item label="Porcentaje del ingreso del servicio (%)">
              <InputNumber style={{ width: '100%' }} min={0} max={100} precision={2} addonAfter="%"
                value={formConfig.porcentajeServicio}
                onChange={v => setFormConfig(p => ({ ...p, porcentajeServicio: v ?? 0 }))} />
            </Form.Item>
          </>)}

          <Form.Item label="Salario de referencia ($) — para Aguinaldo/Vacaciones/Quincena25"
            tooltip="Si el barbero cobra por día/hora/servicio, coloca aquí su salario mensual estimado para calcular prestaciones de ley">
            <InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="$"
              value={formConfig.salarioBase}
              onChange={v => setFormConfig(p => ({ ...p, salarioBase: v ?? 0 }))} />
          </Form.Item>

          <Form.Item label="Fecha de Ingreso (para prestaciones de ley)">
            <DatePicker
              style={{ width: '100%' }}
              value={formConfig.fechaIngreso ? dayjs(formConfig.fechaIngreso) : null}
              format="DD/MM/YYYY"
              placeholder="Fecha de contratación"
              onChange={d => setFormConfig(p => ({ ...p, fechaIngreso: d ? d.toISOString() : null }))}
            />
          </Form.Item>

          <Form.Item label="Aplica Retención de Renta (ISR)">
            <Switch checked={formConfig.aplicaRenta}
              onChange={v => setFormConfig(p => ({ ...p, aplicaRenta: v }))}
              checkedChildren="Sí" unCheckedChildren="No" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal: Constancia Laboral ── */}
      <Modal
        open={!!modalConstancia}
        title={<span><FilePdfOutlined /> Constancia Laboral — {modalConstancia?.nombre}</span>}
        onCancel={() => setModalConstancia(null)}
        onOk={() => {
          if (!modalConstancia) return;
          abrirConstanciaLaboral({
            nombre:       modalConstancia.nombre,
            cargo:        modalConstancia.cargo || 'Barbero',
            fechaIngreso: modalConstancia.fechaIngreso,
            salario:      modalConstancia.salarioBase,
            tipoPago:     modalConstancia.tipoPago || 'FIJO',
            negocio,
            proposito:    constanciaProposito,
          });
          setModalConstancia(null);
        }}
        okText="Generar Constancia"
        okButtonProps={{ style: { background: '#0d9488', borderColor: '#0d9488' } }}
        width="min(420px, 96vw)"
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Empleado: <strong>{modalConstancia?.nombre}</strong> · Cargo: <strong>{modalConstancia?.cargo || 'Barbero'}</strong>
            </Text>
            {modalConstancia?.fechaIngreso && (
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                Fecha ingreso: {dayjs(modalConstancia.fechaIngreso).format('DD/MM/YYYY')}
              </div>
            )}
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Propósito de la constancia:</Text>
            <Select
              style={{ width: '100%' }}
              value={constanciaProposito}
              onChange={setConstanciaProposito}
              options={[
                { value: 'para los fines que convengan',          label: 'Uso general' },
                { value: 'para trámites bancarios',               label: 'Trámites bancarios' },
                { value: 'para trámites de arrendamiento',        label: 'Arrendamiento / alquiler' },
                { value: 'para trámites de visa',                 label: 'Trámites de visa' },
                { value: 'para trámites de crédito',              label: 'Crédito / financiamiento' },
                { value: 'para presentar ante el ISSS',           label: 'ISSS' },
                { value: 'para presentar ante el AFP',            label: 'AFP' },
                { value: 'para trámites legales y administrativos', label: 'Trámites legales' },
              ]}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
