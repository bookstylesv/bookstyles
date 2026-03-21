'use client'

import { useState } from 'react'
import {
  Card, Table, Tag, Button, Tabs, Modal, Input, Row, Col, Statistic,
  Descriptions, Tooltip, Space, Select
} from 'antd'
import { FileTextOutlined, StopOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { toast } from 'sonner'

interface Venta {
  id: number
  numero: number
  codigoGeneracion: string
  numeroControl: string | null
  tipoDte: string
  clienteNombre: string | null
  clienteDocumento: string | null
  total: number
  iva: number
  estado: string
  simulada: boolean
  createdAt: string
  detalles: { barberoNombre: string; descripcion: string; subtotal: number }[]
  pagos: { metodo: string; monto: number }[]
}

interface NotaCredito {
  id: number
  codigoGeneracion: string
  numeroControl: string | null
  motivo: string
  total: number
  estado: string
  createdAt: string
  ventaOriginal: { numero: number; numeroControl: string | null; total: number } | null
}

const TIPO_LABEL: Record<string, string> = {
  '01': 'Factura',
  '03': 'CCF',
  '05': 'Nota de Crédito',
}

const METODO_LABEL: Record<string, string> = {
  CASH: '💵 Efectivo',
  CARD: '💳 Tarjeta',
  TRANSFER: '🏦 Transferencia',
  QR: '📱 QR',
}

const fmt = (n: number) => `$${Number(n).toFixed(2)}`

export default function PosDocumentosClient({
  ventas: ventasProp,
  notasCredito: ncProp,
}: {
  ventas: Venta[]
  notasCredito: NotaCredito[]
}) {
  const [ventas, setVentas] = useState<Venta[]>(ventasProp)
  const [nc] = useState<NotaCredito[]>(ncProp)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('')
  const [filtroEstado, setFiltroEstado] = useState<string>('')

  // ── Anulación ────────────────────────────────────────────────────────────────
  const [anularModal, setAnularModal] = useState<Venta | null>(null)
  const [motivoAnular, setMotivoAnular] = useState('')
  const [loadingAnular, setLoadingAnular] = useState(false)

  const anular = async () => {
    if (!anularModal || !motivoAnular.trim()) return
    setLoadingAnular(true)
    try {
      const res = await fetch(`/api/pos/venta/${anularModal.id}/anular`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoAnular }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Venta anulada')
      setVentas(prev => prev.map(v => v.id === anularModal.id ? { ...v, estado: 'ANULADA' } : v))
      setAnularModal(null)
      setMotivoAnular('')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingAnular(false)
    }
  }

  // ── Nota de crédito ──────────────────────────────────────────────────────────
  const [ncModal, setNcModal] = useState<Venta | null>(null)
  const [motivoNC, setMotivoNC] = useState('')
  const [loadingNC, setLoadingNC] = useState(false)

  const emitirNC = async () => {
    if (!ncModal || !motivoNC.trim()) return
    setLoadingNC(true)
    try {
      const res = await fetch('/api/pos/nota-credito', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ventaId: ncModal.id, motivo: motivoNC }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Nota de Crédito emitida')
      setNcModal(null)
      setMotivoNC('')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingNC(false)
    }
  }

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const ventasFiltradas = ventas.filter(v => {
    const coincideSearch = !search || v.numero.toString().includes(search) ||
      (v.clienteNombre || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.codigoGeneracion || '').toLowerCase().includes(search.toLowerCase())
    const coincideTipo = !filtroTipo || v.tipoDte === filtroTipo
    const coincideEstado = !filtroEstado || v.estado === filtroEstado
    return coincideSearch && coincideTipo && coincideEstado
  })

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const totalActivas = ventas.filter(v => v.estado === 'ACTIVA').reduce((s, v) => s + v.total, 0)
  const countAnuladas = ventas.filter(v => v.estado === 'ANULADA').length
  const totalIva = ventas.filter(v => v.estado === 'ACTIVA').reduce((s, v) => s + v.iva, 0)

  // ── Columnas ─────────────────────────────────────────────────────────────────
  const columnas = [
    {
      title: '# Venta', dataIndex: 'numero', width: 80,
      render: (v: number) => <b>#{v}</b>,
    },
    {
      title: 'Tipo',
      dataIndex: 'tipoDte',
      render: (v: string) => <Tag color={v === '03' ? 'gold' : 'blue'}>{TIPO_LABEL[v] || v}</Tag>,
      width: 100,
    },
    {
      title: 'Cliente',
      dataIndex: 'clienteNombre',
      render: (v: string | null) => v || 'Consumidor Final',
    },
    {
      title: 'Barberos / Servicios',
      dataIndex: 'detalles',
      render: (d: Venta['detalles']) => (
        <Space direction="vertical" size={0}>
          {d.map((item, i) => (
            <span key={i} style={{ fontSize: 11 }}>
              <b>{item.barberoNombre}</b>: {item.descripcion} {fmt(item.subtotal)}
            </span>
          ))}
        </Space>
      ),
    },
    {
      title: 'Pago',
      dataIndex: 'pagos',
      render: (p: Venta['pagos']) => p.map(x => (
        <Tag key={x.metodo} style={{ fontSize: 10 }}>{METODO_LABEL[x.metodo] || x.metodo} {fmt(x.monto)}</Tag>
      )),
      width: 160,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      render: (v: number) => <b style={{ color: '#0d9488' }}>{fmt(v)}</b>,
      align: 'right' as const,
      width: 90,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      render: (v: string, rec: Venta) => (
        <Space direction="vertical" size={2}>
          <Tag color={v === 'ACTIVA' ? 'green' : 'red'}>{v}</Tag>
          {rec.simulada && <Tag style={{ fontSize: 9 }}>SIM</Tag>}
        </Space>
      ),
      width: 80,
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      render: (v: string) => new Date(v).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' }),
      width: 130,
    },
    {
      title: 'Acciones',
      width: 120,
      render: (_: unknown, rec: Venta) => rec.estado === 'ACTIVA' ? (
        <Space>
          <Tooltip title="Nota de Crédito">
            <Button size="small" icon={<FileTextOutlined />} onClick={() => setNcModal(rec)} />
          </Tooltip>
          <Tooltip title="Anular">
            <Button size="small" danger icon={<StopOutlined />} onClick={() => setAnularModal(rec)} />
          </Tooltip>
        </Space>
      ) : null,
    },
  ]

  const columnasNC = [
    { title: '#', dataIndex: 'id', width: 60 },
    {
      title: 'Venta original',
      dataIndex: 'ventaOriginal',
      render: (v: NotaCredito['ventaOriginal']) => v ? `#${v.numero}` : '—',
    },
    { title: 'Motivo', dataIndex: 'motivo' },
    { title: 'Total NC', dataIndex: 'total', render: (v: number) => <b style={{ color: '#fa8c16' }}>{fmt(v)}</b> },
    { title: 'Estado', dataIndex: 'estado', render: (v: string) => <Tag>{v}</Tag> },
    {
      title: 'Fecha', dataIndex: 'createdAt',
      render: (v: string) => new Date(v).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' }),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* KPIs */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        {[
          { title: 'Total facturado', value: totalActivas, prefix: '$', precision: 2 },
          { title: 'IVA generado', value: totalIva, prefix: '$', precision: 2 },
          { title: 'Documentos activos', value: ventas.filter(v => v.estado === 'ACTIVA').length },
          { title: 'Anulados', value: countAnuladas },
          { title: 'Notas de Crédito', value: nc.length },
        ].map((k, i) => (
          <Col span={Math.floor(24 / 5)} key={i}>
            <Card size="small">
              <Statistic title={k.title} value={k.value} prefix={k.prefix} precision={k.precision || 0}
                valueStyle={{ color: '#0d9488' }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Tabs
        items={[
          {
            key: 'ventas',
            label: `Facturas / CCF (${ventas.length})`,
            children: (
              <Card size="small">
                <Row gutter={8} style={{ marginBottom: 12 }}>
                  <Col span={10}>
                    <Input.Search placeholder="Buscar # venta, cliente, código..." value={search}
                      onChange={e => setSearch(e.target.value)} />
                  </Col>
                  <Col span={6}>
                    <Select placeholder="Tipo" allowClear style={{ width: '100%' }}
                      value={filtroTipo || undefined}
                      onChange={v => setFiltroTipo(v || '')}
                      options={[
                        { value: '01', label: 'Factura CF' },
                        { value: '03', label: 'CCF' },
                      ]}
                    />
                  </Col>
                  <Col span={6}>
                    <Select placeholder="Estado" allowClear style={{ width: '100%' }}
                      value={filtroEstado || undefined}
                      onChange={v => setFiltroEstado(v || '')}
                      options={[
                        { value: 'ACTIVA', label: 'Activa' },
                        { value: 'ANULADA', label: 'Anulada' },
                      ]}
                    />
                  </Col>
                </Row>
                <Table
                  dataSource={ventasFiltradas}
                  columns={columnas}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 20 }}
                  rowClassName={r => r.estado === 'ANULADA' ? 'opacity-50' : ''}
                  expandable={{
                    expandedRowRender: (r: Venta) => (
                      <Descriptions size="small" column={3} bordered>
                        <Descriptions.Item label="Código generación" span={3}>
                          <code style={{ fontSize: 11 }}>{r.codigoGeneracion}</code>
                        </Descriptions.Item>
                        <Descriptions.Item label="N° Control">{r.numeroControl || 'SIM'}</Descriptions.Item>
                        <Descriptions.Item label="Tipo">{TIPO_LABEL[r.tipoDte]}</Descriptions.Item>
                        <Descriptions.Item label="Simulado">{r.simulada ? 'Sí' : 'No'}</Descriptions.Item>
                      </Descriptions>
                    ),
                  }}
                />
              </Card>
            ),
          },
          {
            key: 'nc',
            label: `Notas de Crédito (${nc.length})`,
            children: (
              <Card size="small">
                <Table dataSource={nc} columns={columnasNC} rowKey="id" size="small" pagination={{ pageSize: 20 }} />
              </Card>
            ),
          },
        ]}
      />

      {/* Modal anulación */}
      <Modal
        open={!!anularModal} title={<span><ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> Anular Venta #{anularModal?.numero}</span>}
        onCancel={() => { setAnularModal(null); setMotivoAnular('') }}
        onOk={anular} confirmLoading={loadingAnular}
        okText="Confirmar Anulación" okButtonProps={{ danger: true }}
      >
        <p style={{ color: '#666' }}>Total: <b>{fmt(anularModal?.total || 0)}</b> · Esta acción no se puede deshacer.</p>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Motivo de anulación *</div>
          <Input.TextArea rows={3} placeholder="Describe el motivo de la anulación..."
            value={motivoAnular} onChange={e => setMotivoAnular(e.target.value)} />
        </div>
      </Modal>

      {/* Modal nota de crédito */}
      <Modal
        open={!!ncModal} title={`Nota de Crédito — Venta #${ncModal?.numero}`}
        onCancel={() => { setNcModal(null); setMotivoNC('') }}
        onOk={emitirNC} confirmLoading={loadingNC}
        okText="Emitir Nota de Crédito"
        okButtonProps={{ style: { background: '#0d9488', borderColor: '#0d9488' } }}
      >
        <p style={{ color: '#666' }}>
          Se generará una NC por <b>{fmt(ncModal?.total || 0)}</b> referenciando la venta original.
        </p>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Motivo *</div>
          <Input.TextArea rows={3} placeholder="Motivo de la nota de crédito..."
            value={motivoNC} onChange={e => setMotivoNC(e.target.value)} />
        </div>
      </Modal>
    </div>
  )
}
