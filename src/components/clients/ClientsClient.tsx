'use client';

// ══════════════════════════════════════════════════════════
// CLIENTES — CRUD COMPLETO con datos fiscales DTE
// ══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Table, Card, Input, Button, Space, Row, Col,
  Statistic, Tag, Tooltip, Popconfirm, Typography, Select, Divider, Radio, InputNumber,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined, PlusOutlined, ReloadOutlined,
  TeamOutlined, EditOutlined, DeleteOutlined,
  PhoneOutlined, CheckCircleOutlined, MailOutlined, IdcardOutlined, PercentageOutlined,
} from '@ant-design/icons';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button as SdButton }  from '@/components/ui/button';
import { Input as SdInput }    from '@/components/ui/input';
import { FormField }           from '@/components/shared/FormField';

const { Title, Text } = Typography;

// ── Tipos ──────────────────────────────────────────────────────────────────

type Client = {
  id: number; fullName: string; email: string; phone: string | null;
  active: boolean; createdAt: string; totalAppointments: number; lastVisit: string | null;
  tipoDocumento: string | null; numDocumento: string | null; nrc: string | null;
  nombreComercial: string | null; departamentoCod: string | null;
  municipioCod: string | null; complemento: string | null;
  descuentoTipo: string | null; descuentoValor: number | null;
};

type FormValues = { fullName: string; email: string; phone: string; numDocumento: string; nrc: string; nombreComercial: string; complemento: string; descuentoValor: string };

type Departamento = { id: number; codigo: string; nombre: string; totalMunicipios: number };
type Municipio    = { id: number; codigo: string; nombre: string; departamentoCod: string; departamento: { nombre: string } };

const TIPO_PERSONA_OPTIONS = [
  { label: 'Persona Natural', value: 'NATURAL' },
  { label: 'Empresa / Jurídica', value: 'JURIDICA' },
];

const TIPO_DOC_NATURAL = [
  { label: 'DUI (13)', value: '13' },
  { label: 'Pasaporte (37)', value: '37' },
  { label: 'Cédula extranjera (03)', value: '03' },
  { label: 'Carnet de residente (02)', value: '02' },
];

const TIPO_DOC_LABELS: Record<string, string> = {
  '13': 'DUI', '36': 'NIT', '37': 'Pasaporte', '03': 'Cédula ext.', '02': 'Carnet res.',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 500, color: '#595959', marginBottom: 4 }}>{children}</div>;
}

// ── Componente ─────────────────────────────────────────────────────────────

export default function ClientsClient({ initialClients }: { initialClients: Client[] }) {
  const [clients,       setClients]       = useState<Client[]>(initialClients);
  const [open,          setOpen]          = useState(false);
  const [editing,       setEditing]       = useState<Client | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [search,        setSearch]        = useState('');

  // Datos fiscales (estado local — selects no bindeados a react-hook-form)
  const [tipoPersona,    setTipoPersona]    = useState<'NATURAL' | 'JURIDICA'>('NATURAL');
  const [tipoDocumento,  setTipoDocumento]  = useState<string | undefined>(undefined);
  const [departamentoCod, setDepartamentoCod] = useState<string | undefined>(undefined);
  const [municipioCod,   setMunicipioCod]   = useState<string | undefined>(undefined);
  // Descuento
  const [descuentoTipo,  setDescuentoTipo]  = useState<'PORCENTAJE' | 'MONTO' | undefined>(undefined);

  // Catálogos MH
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [municipios,    setMunicipios]    = useState<Municipio[]>([]);
  const [loadingMunis,  setLoadingMunis]  = useState(false);

  const { register, handleSubmit, reset } = useForm<FormValues>();

  // Cargar departamentos al montar
  useEffect(() => {
    fetch('/api/settings/departamentos')
      .then(r => r.json())
      .then(json => { if (json.success) setDepartamentos(json.data); });
  }, []);

  // Cargar municipios al cambiar departamento
  useEffect(() => {
    if (!departamentoCod) { setMunicipios([]); setMunicipioCod(undefined); return; }
    setLoadingMunis(true);
    fetch(`/api/settings/municipios?departamento=${departamentoCod}`)
      .then(r => r.json())
      .then(json => { if (json.success) setMunicipios(json.data); })
      .finally(() => setLoadingMunis(false));
  }, [departamentoCod]);

  // Filtro cliente-side
  const filtered = clients.filter(c =>
    c.fullName.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search) ||
    (c.numDocumento ?? '').includes(search),
  );

  // ── Abrir modal crear ──────────────────────────────────
  const handleNuevo = () => {
    setEditing(null);
    reset({ fullName: '', email: '', phone: '', numDocumento: '', nrc: '', nombreComercial: '', complemento: '', descuentoValor: '' });
    setTipoPersona('NATURAL');
    setTipoDocumento(undefined);
    setDepartamentoCod(undefined);
    setMunicipioCod(undefined);
    setDescuentoTipo(undefined);
    setError('');
    setOpen(true);
  };

  // ── Abrir modal editar ─────────────────────────────────
  const handleEditar = (c: Client) => {
    setEditing(c);
    reset({
      fullName:        c.fullName,
      email:           c.email,
      phone:           c.phone ?? '',
      numDocumento:    c.numDocumento ?? '',
      nrc:             c.nrc ?? '',
      nombreComercial: c.nombreComercial ?? '',
      complemento:     c.complemento ?? '',
      descuentoValor:  c.descuentoValor != null ? String(c.descuentoValor) : '',
    });
    const esJuridica = c.tipoDocumento === '36';
    setTipoPersona(esJuridica ? 'JURIDICA' : 'NATURAL');
    setTipoDocumento(c.tipoDocumento ?? undefined);
    setDepartamentoCod(c.departamentoCod ?? undefined);
    // Cargar municipios del departamento guardado
    if (c.departamentoCod) {
      fetch(`/api/settings/municipios?departamento=${c.departamentoCod}`)
        .then(r => r.json())
        .then(json => { if (json.success) setMunicipios(json.data); });
    }
    setMunicipioCod(c.municipioCod ?? undefined);
    setDescuentoTipo((c.descuentoTipo as 'PORCENTAJE' | 'MONTO' | null) ?? undefined);
    setError('');
    setOpen(true);
  };

  // ── Cambio de tipo persona ──────────────────────────────
  const handleTipoPersonaChange = (val: 'NATURAL' | 'JURIDICA') => {
    setTipoPersona(val);
    setTipoDocumento(val === 'JURIDICA' ? '36' : undefined);
  };

  // ── Guardar (crear o editar) ───────────────────────────
  async function onSubmit(values: FormValues) {
    setSaving(true); setError('');
    try {
      const esJuridica = tipoPersona === 'JURIDICA';
      const nombreComercialVal = values.nombreComercial.trim();
      const body = {
        fullName:        esJuridica ? (nombreComercialVal || 'Empresa') : values.fullName.trim(),
        email:           values.email?.trim().toLowerCase() || undefined, // backend auto-genera si vacío
        phone:           values.phone?.trim() || undefined,
        tipoDocumento:   tipoDocumento || undefined,
        numDocumento:    values.numDocumento.trim() || undefined,
        nrc:             esJuridica ? (values.nrc.trim() || undefined) : undefined,
        nombreComercial: esJuridica ? (nombreComercialVal || undefined) : undefined,
        departamentoCod: departamentoCod || undefined,
        municipioCod:    municipioCod || undefined,
        complemento:     values.complemento.trim() || undefined,
        descuentoTipo:   descuentoTipo || undefined,
        descuentoValor:  descuentoTipo && values.descuentoValor ? parseFloat(values.descuentoValor) : undefined,
      };
      const url = editing ? `/api/clients/${editing.id}` : '/api/clients';
      const res = await fetch(url, {
        method:  editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error?.message ?? 'Error al guardar';
        setError(msg); toast.error(msg); return;
      }
      if (editing) {
        setClients(prev => prev.map(c => c.id === editing.id ? { ...c, ...json.data } : c));
        toast.success(`"${values.fullName.trim()}" actualizado`);
      } else {
        setClients(prev => [{ ...json.data, totalAppointments: 0, lastVisit: null }, ...prev]);
        toast.success(`Cliente "${values.fullName.trim()}" creado`);
      }
      setOpen(false);
    } catch {
      setError('Error de red'); toast.error('Error de red');
    } finally { setSaving(false); }
  }

  // ── Eliminar ───────────────────────────────────────────
  async function handleEliminar(c: Client) {
    const res = await fetch(`/api/clients/${c.id}`, { method: 'DELETE' });
    if (res.ok) {
      setClients(prev => prev.filter(x => x.id !== c.id));
      toast.success(`"${c.fullName}" eliminado`);
    } else { toast.error('No se pudo eliminar'); }
  }

  // ── Activar / desactivar ───────────────────────────────
  async function toggleActive(c: Client) {
    const next = !c.active;
    const res  = await fetch(`/api/clients/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: next }),
    });
    if (res.ok) {
      setClients(prev => prev.map(x => x.id === c.id ? { ...x, active: next } : x));
      toast.success(`${c.fullName} ${next ? 'activado' : 'desactivado'}`);
    } else { toast.error('No se pudo cambiar el estado'); }
  }

  // ── Columnas ───────────────────────────────────────────
  const columns: ColumnsType<Client> = [
    {
      title:  'Cliente',
      key:    'fullName',
      render: (_, r) => (
        <div style={{ opacity: r.active ? 1 : 0.5 }}>
          <div style={{ fontWeight: 500 }}>{r.fullName}</div>
          {r.nombreComercial && (
            <Text style={{ fontSize: 11, color: '#0d9488' }}>{r.nombreComercial}</Text>
          )}
          {!r.email.includes('@interno.noemail') && (
            <Space size={4} style={{ marginTop: 2 }}>
              <MailOutlined style={{ fontSize: 11, color: '#8c8c8c' }} />
              <Text style={{ fontSize: 12 }} type="secondary">{r.email}</Text>
            </Space>
          )}
        </div>
      ),
    },
    {
      title:  'Teléfono',
      key:    'phone',
      width:  130,
      render: (_, r) => r.phone ? (
        <Space size={4}>
          <PhoneOutlined style={{ fontSize: 11, color: '#8c8c8c' }} />
          <Text style={{ fontSize: 12 }}>{r.phone}</Text>
        </Space>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title:  'Documento',
      key:    'documento',
      width:  150,
      render: (_, r) => r.tipoDocumento && r.numDocumento ? (
        <Space size={4}>
          <IdcardOutlined style={{ fontSize: 11, color: '#8c8c8c' }} />
          <div>
            <Tag style={{ fontSize: 10, padding: '0 4px' }}>{TIPO_DOC_LABELS[r.tipoDocumento] ?? r.tipoDocumento}</Tag>
            <Text style={{ fontSize: 12 }}>{r.numDocumento}</Text>
          </div>
        </Space>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title:  'Descuento',
      key:    'descuento',
      width:  110,
      render: (_, r) => {
        if (!r.descuentoTipo || r.descuentoValor == null) return <Text type="secondary">—</Text>;
        return r.descuentoTipo === 'PORCENTAJE'
          ? <Tag color="orange" icon={<PercentageOutlined />}>{r.descuentoValor}%</Tag>
          : <Tag color="gold">${r.descuentoValor.toFixed(2)}</Tag>;
      },
    },
    {
      title:  'Citas',
      dataIndex: 'totalAppointments',
      key:    'totalAppointments',
      width:  70,
      align:  'center',
      render: (v: number) => (
        <Tag color={v > 0 ? 'blue' : 'default'} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: v > 0 ? 600 : 400 }}>
          {v}
        </Tag>
      ),
    },
    {
      title:  'Última visita',
      key:    'lastVisit',
      width:  130,
      render: (_, r) => <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(r.lastVisit)}</Text>,
    },
    {
      title:  'Estado',
      key:    'active',
      width:  90,
      render: (_, r) => (
        <Tag color={r.active ? 'success' : 'default'} style={{ cursor: 'pointer' }} onClick={() => toggleActive(r)}>
          {r.active ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
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
            title="¿Eliminar este cliente?"
            description="Si tiene citas asociadas se desactivará en su lugar."
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

  // ── KPIs ───────────────────────────────────────────────
  const activeCount   = clients.filter(c => c.active).length;
  const phoneCount    = clients.filter(c => c.phone).length;
  const docCount      = clients.filter(c => c.numDocumento).length;

  return (
    <>
      {/* ── KPIs ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Total Clientes" value={clients.length} prefix={<TeamOutlined style={{ color: '#0d9488' }} />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Activos" value={activeCount} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Con Teléfono" value={phoneCount} prefix={<PhoneOutlined style={{ color: '#722ed1' }} />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Con Documento" value={docCount} prefix={<IdcardOutlined style={{ color: '#fa8c16' }} />} />
          </Card>
        </Col>
      </Row>

      {/* ── Tabla ── */}
      <Card
        title={<Title level={5} style={{ margin: 0 }}>Clientes</Title>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNuevo}>Nuevo cliente</Button>
        }
      >
        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={14} md={10}>
            <Input
              placeholder="Buscar por nombre, email, teléfono o documento..."
              prefix={<SearchOutlined />}
              allowClear
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </Col>
          <Col>
            <Tooltip title="Limpiar búsqueda">
              <Button icon={<ReloadOutlined />} onClick={() => setSearch('')} />
            </Tooltip>
          </Col>
        </Row>

        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          size="small"
          scroll={{ x: 700 }}
          pagination={{
            pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'],
            showTotal: (t, range) => `${range[0]}–${range[1]} de ${t} clientes`,
          }}
          locale={{
            emptyText: (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <TeamOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
                <div style={{ marginTop: 8, color: '#8c8c8c' }}>
                  {search ? 'Sin resultados.' : 'No hay clientes aún. Usa "+ Nuevo cliente".'}
                </div>
              </div>
            ),
          }}
        />
      </Card>

      {/* ── Modal Crear / Editar ── */}
      <Dialog open={open} onOpenChange={v => { if (!v) setOpen(false); }}>
        <DialogContent style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* ─ Datos de identificación (solo persona natural) ─ */}
              {tipoPersona === 'NATURAL' && (
                <>
                  <Text strong style={{ fontSize: 13, color: '#0d9488' }}>Datos de identificación</Text>
                  <Row gutter={[12, 10]}>
                    <Col span={24}>
                      <FormField label="Nombre completo *">
                        <SdInput {...register('fullName', { required: tipoPersona === 'NATURAL' })} placeholder="Juan Pérez" autoFocus />
                      </FormField>
                    </Col>
                    <Col xs={24} sm={12}>
                      <FormField label="Teléfono">
                        <SdInput {...register('phone')} placeholder="+503 7000-0000" />
                      </FormField>
                    </Col>
                    <Col xs={24} sm={12}>
                      <FormField label="Email">
                        <SdInput type="email" {...register('email')} placeholder="juan@ejemplo.com (opcional)" />
                      </FormField>
                    </Col>
                  </Row>
                </>
              )}

              <Divider style={{ margin: '4px 0' }} />

              {/* ─ Datos fiscales ─ */}
              <Text strong style={{ fontSize: 13, color: '#0d9488' }}>Datos fiscales (DTE)</Text>

              <div>
                <FieldLabel>Tipo de persona</FieldLabel>
                <Radio.Group
                  options={TIPO_PERSONA_OPTIONS}
                  value={tipoPersona}
                  onChange={e => handleTipoPersonaChange(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  size="small"
                />
              </div>

              <Row gutter={[12, 10]}>
                {tipoPersona === 'NATURAL' ? (
                  <>
                    <Col xs={24} sm={12}>
                      <FieldLabel>Tipo de documento</FieldLabel>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Seleccionar..."
                        value={tipoDocumento}
                        onChange={v => setTipoDocumento(v)}
                        allowClear
                        options={TIPO_DOC_NATURAL}
                        size="small"
                      />
                    </Col>
                    <Col xs={24} sm={12}>
                      <FormField label="Número de documento">
                        <SdInput {...register('numDocumento')} placeholder="Ej: 01234567-8" />
                      </FormField>
                    </Col>
                  </>
                ) : (
                  <>
                    <Col xs={24} sm={12}>
                      <FormField label="NIT">
                        <SdInput {...register('numDocumento')} placeholder="0000-000000-000-0" />
                      </FormField>
                    </Col>
                    <Col xs={24} sm={12}>
                      <FormField label="NRC">
                        <SdInput {...register('nrc')} placeholder="000000-0" />
                      </FormField>
                    </Col>
                    <Col span={24}>
                      <FormField label="Nombre comercial / Razón social">
                        <SdInput {...register('nombreComercial')} placeholder="Empresa S.A. de C.V." />
                      </FormField>
                    </Col>
                  </>
                )}
              </Row>

              <Divider style={{ margin: '4px 0' }} />

              {/* ─ Dirección fiscal ─ */}
              <Text strong style={{ fontSize: 13, color: '#0d9488' }}>Dirección fiscal</Text>
              <Row gutter={[12, 10]}>
                <Col xs={24} sm={12}>
                  <FieldLabel>Departamento</FieldLabel>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Seleccionar departamento..."
                    value={departamentoCod}
                    onChange={v => { setDepartamentoCod(v); setMunicipioCod(undefined); }}
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    size="small"
                    options={departamentos.map(d => ({ value: d.codigo, label: `${d.codigo} - ${d.nombre}` }))}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <FieldLabel>Municipio</FieldLabel>
                  <Select
                    style={{ width: '100%' }}
                    placeholder={departamentoCod ? 'Seleccionar municipio...' : 'Primero selecciona departamento'}
                    value={municipioCod}
                    onChange={v => setMunicipioCod(v)}
                    disabled={!departamentoCod}
                    loading={loadingMunis}
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    size="small"
                    options={municipios.map(m => ({ value: m.codigo, label: `${m.codigo} - ${m.nombre}` }))}
                  />
                </Col>
                <Col span={24}>
                  <FormField label="Dirección / Complemento">
                    <SdInput {...register('complemento')} placeholder="Calle, colonia, número..." />
                  </FormField>
                </Col>
              </Row>

              <Divider style={{ margin: '4px 0' }} />

              {/* ─ Descuento ─ */}
              <Text strong style={{ fontSize: 13, color: '#0d9488' }}>Descuento por convenio</Text>
              <Row gutter={[12, 10]}>
                <Col xs={24} sm={12}>
                  <FieldLabel>Tipo de descuento</FieldLabel>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Sin descuento"
                    value={descuentoTipo}
                    onChange={v => { setDescuentoTipo(v as 'PORCENTAJE' | 'MONTO' | undefined); }}
                    allowClear
                    size="small"
                    options={[
                      { label: '% Porcentaje', value: 'PORCENTAJE' },
                      { label: '$ Monto fijo', value: 'MONTO' },
                    ]}
                  />
                </Col>
                {descuentoTipo && (
                  <Col xs={24} sm={12}>
                    <FormField label={descuentoTipo === 'PORCENTAJE' ? 'Porcentaje (%)' : 'Monto fijo ($)'}>
                      <SdInput
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={descuentoTipo === 'PORCENTAJE' ? '100' : undefined}
                        {...register('descuentoValor')}
                        placeholder={descuentoTipo === 'PORCENTAJE' ? 'Ej: 10' : 'Ej: 5.00'}
                      />
                    </FormField>
                  </Col>
                )}
              </Row>

              {error && <p style={{ color: 'hsl(var(--status-error))', fontSize: 13, margin: 0 }}>{error}</p>}
            </div>

            <DialogFooter style={{ marginTop: 16 }}>
              <SdButton type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</SdButton>
              <SdButton type="submit" disabled={saving}>
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear cliente'}
              </SdButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
