'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Row, Col, Card, Statistic, Progress, Select, Form, InputNumber,
  Button, Checkbox, Space, Spin, Typography, Divider, Table, Tag, Tooltip,
} from 'antd';
import {
  TrophyOutlined, RiseOutlined, FallOutlined, DollarOutlined,
  EditOutlined, SaveOutlined, ReloadOutlined,
} from '@ant-design/icons';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartTooltip, Legend,
} from 'recharts';
import { toast } from 'sonner';

const { Title, Text } = Typography;

const MESES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DEDUCTIONS = [
  { key: 'compras',      label: 'Compras',          defaultChecked: true },
  { key: 'gastos',       label: 'Gastos',            defaultChecked: true },
  { key: 'planilla',     label: 'Planilla',          defaultChecked: true },
  { key: 'notasCredito', label: 'Notas de Crédito',  defaultChecked: true },
];

type Branch  = { id: number; name: string; slug: string; isHeadquarters: boolean };
type Meta    = { branchId: number; month: number; objetivo: number };
type Monthly = { branchId: number | null; month: number; total: number };
type PlanillaMonth = { month: number; total: number };

type Resumen = {
  year:              number;
  branches:          Branch[];
  metas:             Meta[];
  ventasPorMes:      Monthly[];
  comprasPorMes:     Monthly[];
  gastosPorMes:      Monthly[];
  planillaPorMes:    PlanillaMonth[];
  notasCreditoPorMes: Monthly[];
};

type Props = {
  role:     string;
  branchId: number | null;
  tenantId: number;
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

function sumForBranch(
  data: Monthly[],
  branchId: number | null,
  month: number,
  allBranches: boolean,
): number {
  if (allBranches) {
    return data.filter(d => d.month === month).reduce((s, d) => s + d.total, 0);
  }
  return data.find(d => d.branchId === branchId && d.month === month)?.total ?? 0;
}

export default function MetasClient({ role, branchId: userBranchId }: Props) {
  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year,          setYear]          = useState(currentYear);
  const [selectedBranch, setSelectedBranch] = useState<number | 'all'>(
    userBranchId ?? 'all',
  );
  const [resumen,       setResumen]       = useState<Resumen | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [deductions,    setDeductions]    = useState<Record<string, boolean>>(
    Object.fromEntries(DEDUCTIONS.map(d => [d.key, d.defaultChecked])),
  );
  // Meta editing
  const [editYear,      setEditYear]      = useState<number>(currentYear);
  const [editMonth,     setEditMonth]     = useState<number>(currentMonth);
  const [editBranch,    setEditBranch]    = useState<number | null>(userBranchId);
  const [editObjetivo,  setEditObjetivo]  = useState<number | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [loadingMeta,   setLoadingMeta]   = useState(false);

  const canEdit = role === 'SUPERADMIN' || role === 'GERENTE';

  // ── Fetch resumen ──────────────────────────────────────────────────────────
  const fetchResumen = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/metas/resumen?year=${year}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Error');
      setResumen(json.data as Resumen);

      // Init editBranch if not set
      if (!userBranchId && json.data.branches?.length > 0) {
        setEditBranch(json.data.branches[0].id);
      }
    } catch {
      toast.error('Error al cargar los datos de metas');
    } finally {
      setLoading(false);
    }
  }, [year, userBranchId]);

  useEffect(() => { fetchResumen(); }, [fetchResumen]);

  // Precarga el objetivo existente cuando cambia año/mes/sucursal del formulario
  useEffect(() => {
    if (!editBranch) return;

    // Si el año del form coincide con el año del display, usar resumen ya cargado
    if (editYear === year && resumen) {
      const existing = resumen.metas.find(m => m.branchId === editBranch && m.month === editMonth);
      setEditObjetivo(existing ? existing.objetivo : null);
      return;
    }

    // Si el año es diferente, consultar la API
    setLoadingMeta(true);
    fetch(`/api/metas?year=${editYear}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const existing = (json.data as Meta[]).find(
            m => m.branchId === editBranch && m.month === editMonth,
          );
          setEditObjetivo(existing ? existing.objetivo : null);
        }
      })
      .catch(() => setEditObjetivo(null))
      .finally(() => setLoadingMeta(false));
  }, [editBranch, editMonth, editYear, year, resumen]);

  // ── Save meta ──────────────────────────────────────────────────────────────
  async function saveMeta() {
    if (!editBranch || editObjetivo === null || editObjetivo === undefined) {
      toast.error('Selecciona sucursal, mes y monto de la meta');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/metas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ branchId: editBranch, year: editYear, month: editMonth, objetivo: editObjetivo }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Error');
      toast.success(`Meta de ${MESES[editMonth]} ${editYear} guardada`);
      fetchResumen();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  // ── Computed data ──────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!resumen) return [];
    const allBranches = selectedBranch === 'all';
    const bId = allBranches ? null : (selectedBranch as number);

    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;

      // Meta: sum all branches if 'all', else specific branch
      const meta = allBranches
        ? resumen.metas.filter(x => x.month === m).reduce((s, x) => s + x.objetivo, 0)
        : resumen.metas.find(x => x.branchId === bId && x.month === m)?.objetivo ?? 0;

      const ingresos = sumForBranch(resumen.ventasPorMes, bId, m, allBranches);

      let deducciones = 0;
      if (deductions.compras)      deducciones += sumForBranch(resumen.comprasPorMes,      bId, m, allBranches);
      if (deductions.gastos)       deducciones += sumForBranch(resumen.gastosPorMes,       bId, m, allBranches);
      if (deductions.notasCredito) deducciones += sumForBranch(resumen.notasCreditoPorMes, bId, m, allBranches);
      if (deductions.planilla)     deducciones += resumen.planillaPorMes.find(p => p.month === m)?.total ?? 0;

      const utilidad = Math.max(0, ingresos - deducciones);

      return { mes: MESES[m].slice(0, 3), meta, ingresos, utilidad };
    });
  }, [resumen, selectedBranch, deductions]);

  // ── Current month KPIs ─────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!resumen) return null;
    const allBranches = selectedBranch === 'all';
    const bId = allBranches ? null : (selectedBranch as number);
    const m   = currentMonth;

    const meta = allBranches
      ? resumen.metas.filter(x => x.month === m).reduce((s, x) => s + x.objetivo, 0)
      : resumen.metas.find(x => x.branchId === bId && x.month === m)?.objetivo ?? 0;

    const ingresos = sumForBranch(resumen.ventasPorMes, bId, m, allBranches);

    let deducciones = 0;
    if (deductions.compras)      deducciones += sumForBranch(resumen.comprasPorMes,      bId, m, m > 0 && allBranches);
    if (deductions.gastos)       deducciones += sumForBranch(resumen.gastosPorMes,       bId, m, allBranches);
    if (deductions.notasCredito) deducciones += sumForBranch(resumen.notasCreditoPorMes, bId, m, allBranches);
    if (deductions.planilla)     deducciones += resumen.planillaPorMes.find(p => p.month === m)?.total ?? 0;

    const utilidad = ingresos - deducciones;
    const progreso = meta > 0 ? Math.round((ingresos / meta) * 100) : 0;
    const diferencia = ingresos - meta;

    return { meta, ingresos, utilidad, progreso, diferencia };
  }, [resumen, selectedBranch, deductions, currentMonth]);

  // ── Table of monthly summary ───────────────────────────────────────────────
  const tableData = useMemo(() => {
    if (!resumen) return [];
    const allBranches = selectedBranch === 'all';
    const bId = allBranches ? null : (selectedBranch as number);

    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const meta = allBranches
        ? resumen.metas.filter(x => x.month === m).reduce((s, x) => s + x.objetivo, 0)
        : resumen.metas.find(x => x.branchId === bId && x.month === m)?.objetivo ?? 0;

      const ingresos = sumForBranch(resumen.ventasPorMes, bId, m, allBranches);

      let ded = 0;
      if (deductions.compras)      ded += sumForBranch(resumen.comprasPorMes,      bId, m, allBranches);
      if (deductions.gastos)       ded += sumForBranch(resumen.gastosPorMes,       bId, m, allBranches);
      if (deductions.notasCredito) ded += sumForBranch(resumen.notasCreditoPorMes, bId, m, allBranches);
      if (deductions.planilla)     ded += resumen.planillaPorMes.find(p => p.month === m)?.total ?? 0;

      const utilidad   = ingresos - ded;
      const diferencia = ingresos - meta;
      const progreso   = meta > 0 ? Math.round((ingresos / meta) * 100) : 0;
      return { key: m, mes: MESES[m], meta, ingresos, utilidad, diferencia, progreso };
    });
  }, [resumen, selectedBranch, deductions]);

  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - i).map(y => ({ value: y, label: String(y) }));

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  const branches = resumen?.branches ?? [];

  return (
    <div style={{ padding: '16px 24px', maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <TrophyOutlined style={{ color: '#0d9488', marginRight: 8 }} />
            Metas Mensuales
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Seguimiento de objetivos de ingreso por sucursal
          </Text>
        </div>

        <Space wrap>
          {/* Selector año */}
          <Select
            value={year}
            onChange={y => setYear(y)}
            options={yearOptions}
            style={{ width: 100 }}
            size="middle"
          />

          {/* Selector sucursal (OWNER/SUPERADMIN) */}
          {branches.length > 1 && (role === 'OWNER' || role === 'SUPERADMIN') && (
            <Select
              value={selectedBranch}
              onChange={v => setSelectedBranch(v)}
              style={{ width: 180 }}
              size="middle"
              options={[
                { value: 'all', label: 'Todas las sucursales' },
                ...branches.map(b => ({ value: b.id, label: b.name + (b.isHeadquarters ? ' ★' : '') })),
              ]}
            />
          )}

          <Button icon={<ReloadOutlined />} onClick={fetchResumen} size="middle">
            Actualizar
          </Button>
        </Space>
      </div>

      {/* ── KPI Cards + Progress Ring ──────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={5}>
          <Card size="small" style={{ borderRadius: 10, textAlign: 'center' }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Meta {MESES[currentMonth]}</span>}
              value={kpis?.meta ?? 0}
              precision={2}
              prefix="$"
              valueStyle={{ fontSize: 18, color: '#0d9488' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <Card size="small" style={{ borderRadius: 10, textAlign: 'center' }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Ingresos {MESES[currentMonth]}</span>}
              value={kpis?.ingresos ?? 0}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ fontSize: 18, color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <Card size="small" style={{ borderRadius: 10, textAlign: 'center' }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Utilidad Neta</span>}
              value={kpis?.utilidad ?? 0}
              precision={2}
              prefix="$"
              valueStyle={{ fontSize: 18, color: (kpis?.utilidad ?? 0) >= 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <Card size="small" style={{ borderRadius: 10, textAlign: 'center' }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>{(kpis?.diferencia ?? 0) >= 0 ? 'Superávit' : 'Déficit'}</span>}
              value={Math.abs(kpis?.diferencia ?? 0)}
              precision={2}
              prefix={(kpis?.diferencia ?? 0) >= 0 ? <RiseOutlined /> : <FallOutlined />}
              valueStyle={{ fontSize: 18, color: (kpis?.diferencia ?? 0) >= 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={24} lg={4}>
          <Card size="small" style={{ borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 8 }}>Progreso del mes</div>
            <Progress
              type="circle"
              percent={Math.min((kpis?.progreso ?? 0), 100)}
              size={72}
              strokeColor={(kpis?.progreso ?? 0) >= 100 ? '#52c41a' : '#0d9488'}
              format={p => <span style={{ fontSize: 12, fontWeight: 700 }}>{p}%</span>}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* ── Deducciones checklist ─────────────────────────────────────────── */}
        <Col xs={24} lg={6}>
          <Card
            size="small"
            title={<span style={{ fontSize: 13 }}>Deducciones a considerar</span>}
            style={{ borderRadius: 10, height: '100%' }}
          >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Selecciona qué gastos restar a los ingresos para calcular la utilidad neta.
              </Text>
              {DEDUCTIONS.map(d => (
                <Checkbox
                  key={d.key}
                  checked={deductions[d.key]}
                  onChange={e => setDeductions(prev => ({ ...prev, [d.key]: e.target.checked }))}
                >
                  <span style={{ fontSize: 13 }}>{d.label}</span>
                </Checkbox>
              ))}
            </Space>
          </Card>
        </Col>

        {/* ── Establecer meta (solo SUPERADMIN y GERENTE) ───────────────────── */}
        {canEdit && (
          <Col xs={24} lg={18}>
            <Card
              size="small"
              title={
                <Space>
                  <EditOutlined style={{ color: '#0d9488' }} />
                  <span style={{ fontSize: 13 }}>Establecer Meta Mensual</span>
                </Space>
              }
              style={{ borderRadius: 10 }}
            >
              <Row gutter={[12, 12]} align="middle">
                {/* Branch selector */}
                {role === 'SUPERADMIN' && branches.length > 0 && (
                  <Col xs={24} sm={6}>
                    <div style={{ fontSize: 12, marginBottom: 4, color: 'rgba(0,0,0,0.45)' }}>Sucursal</div>
                    <Select
                      value={editBranch}
                      onChange={v => setEditBranch(v)}
                      style={{ width: '100%' }}
                      size="middle"
                      options={branches.map(b => ({ value: b.id, label: b.name + (b.isHeadquarters ? ' ★' : '') }))}
                    />
                  </Col>
                )}
                {role === 'GERENTE' && (
                  <Col xs={24} sm={6}>
                    <div style={{ fontSize: 12, marginBottom: 4, color: 'rgba(0,0,0,0.45)' }}>Sucursal</div>
                    <div style={{ padding: '6px 11px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 13 }}>
                      {branches.find(b => b.id === userBranchId)?.name ?? 'Mi sucursal'}
                    </div>
                  </Col>
                )}

                {/* Año */}
                <Col xs={24} sm={4}>
                  <div style={{ fontSize: 12, marginBottom: 4, color: 'rgba(0,0,0,0.45)' }}>Año</div>
                  <Select
                    value={editYear}
                    onChange={v => setEditYear(v)}
                    style={{ width: '100%' }}
                    size="middle"
                    options={yearOptions}
                  />
                </Col>

                {/* Mes */}
                <Col xs={24} sm={5}>
                  <div style={{ fontSize: 12, marginBottom: 4, color: 'rgba(0,0,0,0.45)' }}>Mes</div>
                  <Select
                    value={editMonth}
                    onChange={v => setEditMonth(v)}
                    style={{ width: '100%' }}
                    size="middle"
                    options={MESES.slice(1).map((m, i) => ({ value: i + 1, label: m }))}
                  />
                </Col>

                {/* Objetivo */}
                <Col xs={24} sm={5}>
                  <div style={{ fontSize: 12, marginBottom: 4, color: 'rgba(0,0,0,0.45)' }}>
                    Objetivo ($) {loadingMeta && <span style={{ fontSize: 10, color: '#0d9488' }}>cargando...</span>}
                  </div>
                  <InputNumber
                    value={editObjetivo}
                    onChange={v => setEditObjetivo(v)}
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="0.00"
                    prefix="$"
                    size="middle"
                  />
                </Col>

                {/* Guardar */}
                <Col xs={24} sm={4} style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={saveMeta}
                    loading={saving}
                    style={{ width: '100%', background: '#0d9488', borderColor: '#0d9488' }}
                  >
                    Guardar
                  </Button>
                </Col>
              </Row>
            </Card>
          </Col>
        )}
      </Row>

      {/* ── Gráfica de líneas ─────────────────────────────────────────────────── */}
      <Card
        size="small"
        title={<span style={{ fontSize: 13 }}>Meta vs Ingresos vs Utilidad Neta — {year}</span>}
        style={{ borderRadius: 10, marginBottom: 16 }}
      >
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} tick={{ fontSize: 11 }} width={55} />
            <RechartTooltip
              formatter={(value, name) => [fmt(Number(value)), String(name)]}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone" dataKey="meta" name="Meta"
              stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3"
              dot={{ r: 3 }} activeDot={{ r: 5 }}
            />
            <Line
              type="monotone" dataKey="ingresos" name="Ingresos"
              stroke="#0d9488" strokeWidth={2.5}
              dot={{ r: 3 }} activeDot={{ r: 5 }}
            />
            <Line
              type="monotone" dataKey="utilidad" name="Utilidad neta"
              stroke="#52c41a" strokeWidth={2}
              dot={{ r: 3 }} activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Tabla resumen mensual ─────────────────────────────────────────────── */}
      <Card
        size="small"
        title={<span style={{ fontSize: 13 }}>Resumen Mensual {year}</span>}
        style={{ borderRadius: 10 }}
      >
        <Table
          size="small"
          dataSource={tableData}
          pagination={false}
          rowClassName={r => r.key === currentMonth ? 'ant-table-row-selected' : ''}
          columns={[
            {
              title: 'Mes', dataIndex: 'mes', key: 'mes', width: 110,
              render: (v, r) => (
                <span style={{ fontWeight: r.key === currentMonth ? 700 : 400 }}>{v}</span>
              ),
            },
            {
              title: 'Meta', dataIndex: 'meta', key: 'meta', align: 'right',
              render: v => <span style={{ color: '#f59e0b' }}>{fmt(v)}</span>,
            },
            {
              title: 'Ingresos', dataIndex: 'ingresos', key: 'ingresos', align: 'right',
              render: v => <span style={{ color: '#0d9488', fontWeight: 600 }}>{fmt(v)}</span>,
            },
            {
              title: 'Utilidad Neta', dataIndex: 'utilidad', key: 'utilidad', align: 'right',
              render: v => <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>{fmt(v)}</span>,
            },
            {
              title: 'Progreso', dataIndex: 'progreso', key: 'progreso', align: 'center', width: 120,
              render: v => (
                <Tooltip title={`${v}% de la meta alcanzado`}>
                  <Progress
                    percent={Math.min(v, 100)}
                    size="small"
                    strokeColor={v >= 100 ? '#52c41a' : '#0d9488'}
                    format={p => `${p}%`}
                    style={{ marginBottom: 0 }}
                  />
                </Tooltip>
              ),
            },
            {
              title: 'Resultado', dataIndex: 'diferencia', key: 'diferencia', align: 'right',
              render: (v, r) => {
                if (r.meta === 0) return <Tag color="default">Sin meta</Tag>;
                return v >= 0
                  ? <Tag color="success" icon={<RiseOutlined />}>+{fmt(v)}</Tag>
                  : <Tag color="error"   icon={<FallOutlined />}>{fmt(v)}</Tag>;
              },
            },
          ]}
        />
      </Card>

      <Divider style={{ margin: '16px 0 8px' }} />
      <Text type="secondary" style={{ fontSize: 11 }}>
        * Planilla incluida como deducción a nivel de toda la empresa (no por sucursal).
        Ingresos = ventas POS activas. Notas de crédito = devoluciones descontadas de ingresos al activar la casilla.
      </Text>
    </div>
  );
}
