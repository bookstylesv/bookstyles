'use client';

// ══════════════════════════════════════════════════════════
// CONFIGURACIÓN — Datos, horarios y catálogo MH
// ══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Card, Button, Input, Row, Col, Tag, Typography, Space, Spin, Switch, TimePicker,
  Tabs, Table, Select, Popconfirm, Tooltip, Modal,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SaveOutlined, SettingOutlined, InfoCircleOutlined, ClockCircleOutlined,
  GlobalOutlined, PlusOutlined, EditOutlined, DeleteOutlined, SyncOutlined,
  BgColorsOutlined, CheckCircleFilled,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';

const { Title, Text } = Typography;

// ── Tipos ───────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
  TRIAL: 'Prueba', BASIC: 'Básico', PRO: 'Pro', ENTERPRISE: 'Empresarial',
};
const PLAN_COLORS: Record<string, string> = {
  TRIAL: 'default', BASIC: 'blue', PRO: 'purple', ENTERPRISE: 'gold',
};

type Tenant = {
  id: number; slug: string; name: string; email: string | null;
  phone: string | null; address: string | null; city: string | null;
  country: string; logoUrl: string | null; plan: string; status: string;
  businessType: 'BARBERIA' | 'SALON';
  themeConfig: Record<string, string>; trialEndsAt: string | null; paidUntil: string | null;
};
type InfoForm  = { name: string; email: string; phone: string; address: string; city: string };
type BusinessHourEntry = { dayOfWeek: number; active: boolean; startTime: string; endTime: string };

type Departamento = { id: number; codigo: string; nombre: string; totalMunicipios: number };
type Municipio    = { id: number; codigo: string; nombre: string; departamentoCod: string; departamento: { nombre: string } };

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DEFAULT_HOURS: BusinessHourEntry[] = [
  { dayOfWeek: 0, active: false, startTime: '08:00', endTime: '17:00' },
  { dayOfWeek: 1, active: false, startTime: '08:00', endTime: '17:00' },
  { dayOfWeek: 2, active: true,  startTime: '08:00', endTime: '17:00' },
  { dayOfWeek: 3, active: true,  startTime: '08:00', endTime: '17:00' },
  { dayOfWeek: 4, active: true,  startTime: '08:00', endTime: '17:00' },
  { dayOfWeek: 5, active: true,  startTime: '08:00', endTime: '17:00' },
  { dayOfWeek: 6, active: true,  startTime: '08:00', endTime: '17:00' },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 500, color: '#595959', marginBottom: 4 }}>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// TAB 1+2: Negocio + Horarios (contenido original)
// ══════════════════════════════════════════════════════════

function TabNegocio() {
  const [tenant,       setTenant]       = useState<Tenant | null>(null);
  const [infoLoading,  setInfoLoading]  = useState(false);
  const [infoError,    setInfoError]    = useState('');
  const [hours,        setHours]        = useState<BusinessHourEntry[]>(DEFAULT_HOURS);
  const [hoursLoading, setHoursLoading] = useState(false);

  const { register: regInfo, handleSubmit: handleInfo, reset: resetInfo } = useForm<InfoForm>();

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setTenant(json.data);
          resetInfo({
            name:    json.data.name    ?? '',
            email:   json.data.email   ?? '',
            phone:   json.data.phone   ?? '',
            address: json.data.address ?? '',
            city:    json.data.city    ?? '',
          });
        }
      });
    fetch('/api/settings/schedule')
      .then(r => r.json())
      .then(json => { if (json.success) setHours(json.data); });
  }, [resetInfo]);

  async function onInfoSubmit(values: InfoForm) {
    setInfoLoading(true); setInfoError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) { const msg = json.error?.message ?? 'Error al guardar'; setInfoError(msg); toast.error(msg); return; }
      setTenant(json.data);
      toast.success('Información actualizada correctamente');
    } catch { setInfoError('Error de red'); toast.error('Error de red'); }
    finally { setInfoLoading(false); }
  }

  function toggleDay(dayOfWeek: number, active: boolean) {
    setHours(prev => prev.map(h => h.dayOfWeek === dayOfWeek ? { ...h, active } : h));
  }
  function setTime(dayOfWeek: number, field: 'startTime' | 'endTime', value: Dayjs | null) {
    if (!value) return;
    setHours(prev => prev.map(h => h.dayOfWeek === dayOfWeek ? { ...h, [field]: value.format('HH:mm') } : h));
  }
  async function saveHours() {
    setHoursLoading(true);
    try {
      const res  = await fetch('/api/settings/schedule', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hours),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al guardar horarios'); return; }
      setHours(json.data);
      toast.success('Horarios guardados y sincronizados con los barberos');
    } catch { toast.error('Error de red'); }
    finally { setHoursLoading(false); }
  }

  if (!tenant) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Spin size="large" /></div>;
  }

  return (
    <>
      {/* Plan y estado */}
      <Card title={<Space><InfoCircleOutlined style={{ color: '#0d9488' }} /><span>Plan y estado</span></Space>} size="small" style={{ marginBottom: 16 }}>
        <Space wrap size={24}>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Plan</Text>
            <Tag color={PLAN_COLORS[tenant.plan] ?? 'default'} style={{ fontWeight: 600 }}>{PLAN_LABELS[tenant.plan] ?? tenant.plan}</Tag>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Estado</Text>
            <Tag color={tenant.status === 'ACTIVE' ? 'success' : 'warning'}>{tenant.status === 'ACTIVE' ? 'Activo' : tenant.status}</Tag>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Subdominio</Text>
            <code style={{ fontSize: 13, background: '#f5f5f5', padding: '2px 8px', borderRadius: 4, border: '1px solid #e8e8e8' }}>{tenant.slug}</code>
          </div>
          {tenant.trialEndsAt && (
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Trial hasta</Text>
              <Text style={{ fontSize: 13 }}>{new Date(tenant.trialEndsAt).toLocaleDateString('es-SV')}</Text>
            </div>
          )}
        </Space>
      </Card>

      {/* Información del negocio */}
      <Card title={<Space><InfoCircleOutlined style={{ color: '#0d9488' }} /><span>Información del negocio</span></Space>} size="small" style={{ marginBottom: 16 }}>
        <form onSubmit={handleInfo(onInfoSubmit)}>
          <Row gutter={[16, 12]}>
            <Col xs={24} md={12}>
              <FieldLabel>Nombre del negocio *</FieldLabel>
              <Input {...regInfo('name', { required: true })} placeholder="Speeddan Barbería" />
            </Col>
            <Col xs={24} md={12}>
              <FieldLabel>Email de contacto</FieldLabel>
              <Input type="email" {...regInfo('email')} placeholder="info@barberia.com" />
            </Col>
            <Col xs={24} md={12}>
              <FieldLabel>Teléfono</FieldLabel>
              <Input {...regInfo('phone')} placeholder="+503 2222-0000" />
            </Col>
            <Col xs={24} md={12}>
              <FieldLabel>Ciudad</FieldLabel>
              <Input {...regInfo('city')} placeholder="San Salvador" />
            </Col>
            <Col xs={24}>
              <FieldLabel>Dirección</FieldLabel>
              <Input {...regInfo('address')} placeholder="Calle Principal #123, Col. Centro" />
            </Col>
          </Row>
          {infoError && <p style={{ color: '#ff4d4f', fontSize: 13, marginTop: 10, marginBottom: 0 }}>{infoError}</p>}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" htmlType="submit" loading={infoLoading} icon={<SaveOutlined />}>
              {infoLoading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Horarios */}
      <Card
        title={<Space><ClockCircleOutlined style={{ color: '#0d9488' }} /><span>Horarios de trabajo</span></Space>}
        size="small"
        extra={<Button type="primary" icon={<SaveOutlined />} loading={hoursLoading} onClick={saveHours} size="small">Guardar horarios</Button>}
      >
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
          Configura los días y horarios en que atiende tu barbería.
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hours.map(h => (
            <Row key={h.dayOfWeek} align="middle" gutter={12}>
              <Col style={{ width: 32 }}>
                <Switch size="small" checked={h.active} onChange={val => toggleDay(h.dayOfWeek, val)} style={{ background: h.active ? '#0d9488' : undefined }} />
              </Col>
              <Col style={{ width: 96 }}>
                <Text style={{ fontSize: 13, color: h.active ? undefined : '#bfbfbf', fontWeight: h.active ? 500 : 400 }}>{DAY_NAMES[h.dayOfWeek]}</Text>
              </Col>
              {h.active ? (
                <>
                  <Col>
                    <TimePicker size="small" format="HH:mm" minuteStep={30} value={dayjs(h.startTime, 'HH:mm')} onChange={val => setTime(h.dayOfWeek, 'startTime', val)} allowClear={false} style={{ width: 90 }} />
                  </Col>
                  <Col><Text type="secondary" style={{ fontSize: 12 }}>a</Text></Col>
                  <Col>
                    <TimePicker size="small" format="HH:mm" minuteStep={30} value={dayjs(h.endTime, 'HH:mm')} onChange={val => setTime(h.dayOfWeek, 'endTime', val)} allowClear={false} style={{ width: 90 }} />
                  </Col>
                </>
              ) : (
                <Col><Text type="secondary" style={{ fontSize: 12 }}>Cerrado</Text></Col>
              )}
            </Row>
          ))}
        </div>
      </Card>
    </>
  );
}

// ══════════════════════════════════════════════════════════
// TAB 3: Catálogo MH — Departamentos y Municipios
// ══════════════════════════════════════════════════════════

function TabCatalogoMH() {
  const [deptos,         setDeptos]         = useState<Departamento[]>([]);
  const [municipios,     setMunicipios]     = useState<Municipio[]>([]);
  const [activeSubTab,   setActiveSubTab]   = useState<'departamentos' | 'municipios'>('departamentos');
  const [loadingDeptos,  setLoadingDeptos]  = useState(false);
  const [loadingMunis,   setLoadingMunis]   = useState(false);
  const [seeding,        setSeeding]        = useState(false);
  const [filterDepto,    setFilterDepto]    = useState<string | undefined>(undefined);

  // Modales
  const [deptoModal,    setDeptoModal]    = useState(false);
  const [muniModal,     setMuniModal]     = useState(false);
  const [editDepto,     setEditDepto]     = useState<Departamento | null>(null);
  const [editMuni,      setEditMuni]      = useState<Municipio | null>(null);
  const [savingDepto,   setSavingDepto]   = useState(false);
  const [savingMuni,    setSavingMuni]    = useState(false);

  // Formulario departamento
  const [dCodigo, setDCodigo] = useState('');
  const [dNombre, setDNombre] = useState('');
  // Formulario municipio
  const [mCodigo,      setMCodigo]      = useState('');
  const [mNombre,      setMNombre]      = useState('');
  const [mDeptoCod,    setMDeptoCod]    = useState<string | undefined>(undefined);

  const loadDeptos = () => {
    setLoadingDeptos(true);
    fetch('/api/settings/departamentos')
      .then(r => r.json())
      .then(json => { if (json.success) setDeptos(json.data); })
      .finally(() => setLoadingDeptos(false));
  };

  const loadMunicipios = (deptoCod?: string) => {
    setLoadingMunis(true);
    const url = deptoCod ? `/api/settings/municipios?departamento=${deptoCod}` : '/api/settings/municipios';
    fetch(url)
      .then(r => r.json())
      .then(json => { if (json.success) setMunicipios(json.data); })
      .finally(() => setLoadingMunis(false));
  };

  useEffect(() => { loadDeptos(); loadMunicipios(); }, []);

  // ── Seed catálogo oficial ──────────────────────────────
  async function handleSeed() {
    setSeeding(true);
    try {
      const res  = await fetch('/api/settings/municipios/seed', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al cargar catálogo'); return; }
      toast.success(`Catálogo cargado: ${json.data.departamentos} departamentos, ${json.data.municipios} municipios`);
      loadDeptos();
      loadMunicipios(filterDepto);
    } catch { toast.error('Error de red'); }
    finally { setSeeding(false); }
  }

  // ── CRUD Departamento ──────────────────────────────────
  function openNuevoDepto() {
    setEditDepto(null); setDCodigo(''); setDNombre(''); setDeptoModal(true);
  }
  function openEditarDepto(d: Departamento) {
    setEditDepto(d); setDCodigo(d.codigo); setDNombre(d.nombre); setDeptoModal(true);
  }
  async function saveDepto() {
    setSavingDepto(true);
    try {
      const body = { codigo: dCodigo.trim(), nombre: dNombre.trim() };
      const url  = editDepto ? `/api/settings/departamentos/${editDepto.id}` : '/api/settings/departamentos';
      const res  = await fetch(url, {
        method: editDepto ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al guardar'); return; }
      toast.success(editDepto ? 'Departamento actualizado' : 'Departamento creado');
      setDeptoModal(false);
      loadDeptos();
    } catch { toast.error('Error de red'); }
    finally { setSavingDepto(false); }
  }
  async function deleteDepto(d: Departamento) {
    const res = await fetch(`/api/settings/departamentos/${d.id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Departamento eliminado'); loadDeptos(); }
    else { const json = await res.json(); toast.error(json.error?.message ?? 'Error al eliminar'); }
  }

  // ── CRUD Municipio ──────────────────────────────────────
  function openNuevoMuni() {
    setEditMuni(null); setMCodigo(''); setMNombre(''); setMDeptoCod(undefined); setMuniModal(true);
  }
  function openEditarMuni(m: Municipio) {
    setEditMuni(m); setMCodigo(m.codigo); setMNombre(m.nombre); setMDeptoCod(m.departamentoCod); setMuniModal(true);
  }
  async function saveMuni() {
    setSavingMuni(true);
    try {
      const body = { codigo: mCodigo.trim(), nombre: mNombre.trim(), departamentoCod: mDeptoCod };
      const url  = editMuni ? `/api/settings/municipios/${editMuni.id}` : '/api/settings/municipios';
      const res  = await fetch(url, {
        method: editMuni ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al guardar'); return; }
      toast.success(editMuni ? 'Municipio actualizado' : 'Municipio creado');
      setMuniModal(false);
      loadMunicipios(filterDepto);
    } catch { toast.error('Error de red'); }
    finally { setSavingMuni(false); }
  }
  async function deleteMuni(m: Municipio) {
    const res = await fetch(`/api/settings/municipios/${m.id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Municipio eliminado'); loadMunicipios(filterDepto); }
    else { const json = await res.json(); toast.error(json.error?.message ?? 'Error al eliminar'); }
  }

  // ── Columnas departamentos ─────────────────────────────
  const colsDepto: ColumnsType<Departamento> = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 80, align: 'center',
      render: (v: string) => <Tag style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v}</Tag> },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    { title: 'Municipios', dataIndex: 'totalMunicipios', key: 'totalMunicipios', width: 100, align: 'center',
      render: (v: number) => <Tag color="blue">{v}</Tag> },
    {
      title: 'Acciones', key: 'actions', width: 90, fixed: 'right',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Editar">
            <Button size="small" type="primary" ghost icon={<EditOutlined />} onClick={() => openEditarDepto(r)} />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar departamento?"
            description="Solo se puede eliminar si no tiene municipios."
            okText="Eliminar" cancelText="Cancelar" okButtonProps={{ danger: true }}
            onConfirm={() => deleteDepto(r)}
          >
            <Tooltip title="Eliminar">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Columnas municipios ────────────────────────────────
  const colsMuni: ColumnsType<Municipio> = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 80, align: 'center',
      render: (v: string) => <Tag style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v}</Tag> },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    { title: 'Departamento', key: 'departamento', width: 160,
      render: (_, r) => <Text style={{ fontSize: 12 }}>{r.departamentoCod} — {r.departamento.nombre}</Text> },
    {
      title: 'Acciones', key: 'actions', width: 90, fixed: 'right',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Editar">
            <Button size="small" type="primary" ghost icon={<EditOutlined />} onClick={() => openEditarMuni(r)} />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar municipio?"
            okText="Eliminar" cancelText="Cancelar" okButtonProps={{ danger: true }}
            onConfirm={() => deleteMuni(r)}
          >
            <Tooltip title="Eliminar">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title={<Space><GlobalOutlined style={{ color: '#0d9488' }} /><span>Catálogo MH — Territorios El Salvador</span></Space>}
        size="small"
        extra={
          <Popconfirm
            title="¿Cargar catálogo oficial?"
            description="Se cargarán los 14 departamentos y ~262 municipios del MH. Es idempotente."
            okText="Cargar" cancelText="Cancelar"
            onConfirm={handleSeed}
          >
            <Button type="default" icon={<SyncOutlined spin={seeding} />} loading={seeding} size="small">
              Cargar catálogo oficial MH
            </Button>
          </Popconfirm>
        }
      >
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
          Catálogos CAT-012 (departamentos) y CAT-013 (municipios) requeridos para facturación DTE.
          Usa el botón <strong>"Cargar catálogo oficial MH"</strong> para poblar todos los registros de una sola vez.
        </Text>

        <Tabs
          size="small"
          activeKey={activeSubTab}
          onChange={k => setActiveSubTab(k as 'departamentos' | 'municipios')}
          items={[
            {
              key: 'departamentos',
              label: `Departamentos (${deptos.length})`,
              children: (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openNuevoDepto}>
                      Agregar departamento
                    </Button>
                  </div>
                  <Table
                    dataSource={deptos}
                    columns={colsDepto}
                    rowKey="id"
                    size="small"
                    loading={loadingDeptos}
                    pagination={{ pageSize: 20, showSizeChanger: false, showTotal: t => `${t} departamentos` }}
                  />
                </>
              ),
            },
            {
              key: 'municipios',
              label: `Municipios (${municipios.length})`,
              children: (
                <>
                  <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                    <Col xs={24} sm={10}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Filtrar por departamento..."
                        value={filterDepto}
                        onChange={v => { setFilterDepto(v); loadMunicipios(v); }}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        size="small"
                        options={deptos.map(d => ({ value: d.codigo, label: `${d.codigo} - ${d.nombre}` }))}
                      />
                    </Col>
                    <Col style={{ marginLeft: 'auto' }}>
                      <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openNuevoMuni}>
                        Agregar municipio
                      </Button>
                    </Col>
                  </Row>
                  <Table
                    dataSource={municipios}
                    columns={colsMuni}
                    rowKey="id"
                    size="small"
                    loading={loadingMunis}
                    pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'], showTotal: t => `${t} municipios` }}
                    scroll={{ x: 550 }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* ── Modal Departamento ── */}
      <Modal
        title={editDepto ? 'Editar departamento' : 'Nuevo departamento'}
        open={deptoModal}
        onCancel={() => setDeptoModal(false)}
        onOk={saveDepto}
        okText={savingDepto ? 'Guardando...' : 'Guardar'}
        confirmLoading={savingDepto}
        width={360}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          <div>
            <FieldLabel>Código (CAT-012) *</FieldLabel>
            <Input value={dCodigo} onChange={e => setDCodigo(e.target.value)} placeholder="Ej: 01" maxLength={2} disabled={!!editDepto} />
          </div>
          <div>
            <FieldLabel>Nombre *</FieldLabel>
            <Input value={dNombre} onChange={e => setDNombre(e.target.value)} placeholder="Ej: San Salvador" />
          </div>
        </div>
      </Modal>

      {/* ── Modal Municipio ── */}
      <Modal
        title={editMuni ? 'Editar municipio' : 'Nuevo municipio'}
        open={muniModal}
        onCancel={() => setMuniModal(false)}
        onOk={saveMuni}
        okText={savingMuni ? 'Guardando...' : 'Guardar'}
        confirmLoading={savingMuni}
        width={400}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          <div>
            <FieldLabel>Departamento *</FieldLabel>
            <Select
              style={{ width: '100%' }}
              placeholder="Seleccionar..."
              value={mDeptoCod}
              onChange={v => setMDeptoCod(v)}
              showSearch
              optionFilterProp="label"
              disabled={!!editMuni}
              options={deptos.map(d => ({ value: d.codigo, label: `${d.codigo} - ${d.nombre}` }))}
            />
          </div>
          <div>
            <FieldLabel>Código (CAT-013) *</FieldLabel>
            <Input value={mCodigo} onChange={e => setMCodigo(e.target.value)} placeholder="Ej: 23" maxLength={2} disabled={!!editMuni} />
          </div>
          <div>
            <FieldLabel>Nombre *</FieldLabel>
            <Input value={mNombre} onChange={e => setMNombre(e.target.value)} placeholder="Ej: San Salvador" />
          </div>
        </div>
      </Modal>
    </>
  );
}

// ══════════════════════════════════════════════════════════
// TAB 4: Tema de Login
// ══════════════════════════════════════════════════════════

type LoginThemeId =
  | 'barberia-teal' | 'barberia-clasica' | 'barberia-carbon' | 'barberia-navy'
  | 'salon-rose'    | 'salon-lila'       | 'salon-dorado'    | 'salon-esmeralda';

const BARBERIA_THEMES: { id: LoginThemeId; label: string; desc: string; from: string; to: string }[] = [
  { id: 'barberia-teal',    label: 'Oceánico',  desc: 'Verde/teal — estilo premium',    from: 'hsl(175 60% 18%)', to: '#6498AF' },
  { id: 'barberia-clasica', label: 'Clásica',   desc: 'Marrón cuero + dorado vintage',  from: '#3d2010',          to: '#D4A853' },
  { id: 'barberia-carbon',  label: 'Carbón',    desc: 'Negro carbón + plata urbano',    from: 'hsl(220 14% 7%)',  to: '#9ca3af' },
  { id: 'barberia-navy',    label: 'Navy',      desc: 'Azul marino + rojo — gentleman', from: 'hsl(214 52% 7%)',  to: '#e74c3c' },
];

const SALON_THEMES: { id: LoginThemeId; label: string; desc: string; from: string; to: string }[] = [
  { id: 'salon-rose',       label: 'Rose',      desc: 'Rosa/fucsia — beauty studio',    from: '#54142e',          to: '#E06F98' },
  { id: 'salon-lila',       label: 'Lila',      desc: 'Lavanda + plata — elegante',     from: 'hsl(262 45% 8%)', to: '#a78bfa' },
  { id: 'salon-dorado',     label: 'Dorado',    desc: 'Champagne + oro — lujo premium', from: 'hsl(40 58% 7%)',  to: '#c9a84c' },
  { id: 'salon-esmeralda',  label: 'Esmeralda', desc: 'Verde esmeralda — spa natural',  from: 'hsl(158 55% 7%)', to: '#2d8a65' },
];

function TabLoginTema() {
  const [tenant,    setTenant]    = useState<Tenant | null>(null);
  const [current,   setCurrent]   = useState<LoginThemeId | null>(null);
  const [saving,    setSaving]    = useState<LoginThemeId | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setTenant(json.data);
          setCurrent((json.data.themeConfig?.loginTheme as LoginThemeId) || null);
        }
      });
  }, []);

  async function selectTheme(themeId: LoginThemeId) {
    setSaving(themeId);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeConfig: { loginTheme: themeId } }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? 'Error al guardar'); return; }
      setCurrent(themeId);
      toast.success('Tema de login actualizado');
    } catch { toast.error('Error de red'); }
    finally { setSaving(null); }
  }

  if (!tenant) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Spin size="large" /></div>;
  }

  const themes = (tenant.businessType === 'SALON') ? SALON_THEMES : BARBERIA_THEMES;

  return (
    <Card
      title={<Space><BgColorsOutlined style={{ color: '#0d9488' }} /><span>Tema de Login</span></Space>}
      size="small"
    >
      <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 20 }}>
        Elige el tema visual que verán tus clientes en la pantalla de acceso.
      </Text>
      <Row gutter={[16, 16]}>
        {themes.map(t => {
          const isActive = current === t.id;
          const isSavingThis = saving === t.id;
          return (
            <Col key={t.id} xs={24} sm={12} md={6}>
              <div
                onClick={() => !saving && selectTheme(t.id)}
                style={{
                  borderRadius: 12, overflow: 'hidden', cursor: saving ? 'wait' : 'pointer',
                  border: isActive ? '2.5px solid #0d9488' : '2px solid #e8e8e8',
                  boxShadow: isActive ? '0 0 0 3px rgba(13,148,136,0.18)' : '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'all 0.2s', position: 'relative', opacity: saving && !isSavingThis ? 0.6 : 1,
                }}
              >
                {/* Preview gradiente */}
                <div style={{
                  height: 100, position: 'relative',
                  background: `linear-gradient(135deg, ${t.from} 0%, ${t.to} 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {/* Mini scissor/sparkle icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: 'rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.28)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 22 }}>{t.id.startsWith('salon-') ? '✦' : '✂'}</span>
                  </div>
                  {isActive && (
                    <CheckCircleFilled style={{
                      position: 'absolute', top: 8, right: 8,
                      fontSize: 20, color: '#0d9488',
                      background: '#fff', borderRadius: '50%',
                    }} />
                  )}
                  {isSavingThis && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Spin size="small" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div style={{ padding: '10px 12px', background: '#fff' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: '#8c8c8c', lineHeight: 1.4 }}>{t.desc}</div>
                  {isActive && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#0d9488', fontWeight: 600 }}>Tema activo</div>
                  )}
                </div>
              </div>
            </Col>
          );
        })}
      </Row>
      <div style={{ marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          URL de login: <code style={{ fontSize: 12, background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>
            /login/{tenant.slug}
          </code>
        </Text>
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════

export default function SettingsPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: '0 0 4px' }}>
          <SettingOutlined style={{ marginRight: 8, color: '#0d9488' }} />
          Configuración
        </Title>
        <Text type="secondary">Datos, horarios y catálogos de tu barbería</Text>
      </div>

      <Tabs
        defaultActiveKey="negocio"
        type="card"
        items={[
          {
            key:      'negocio',
            label:    <Space><InfoCircleOutlined />Negocio y Horarios</Space>,
            children: <TabNegocio />,
          },
          {
            key:      'catalogo',
            label:    <Space><GlobalOutlined />Catálogo MH</Space>,
            children: <TabCatalogoMH />,
          },
          {
            key:      'login-tema',
            label:    <Space><BgColorsOutlined />Tema de Login</Space>,
            children: <TabLoginTema />,
          },
        ]}
      />
    </div>
  );
}
