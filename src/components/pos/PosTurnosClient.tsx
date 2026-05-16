'use client'

import { useState } from 'react'
import {
  Card, Row, Col, Button, InputNumber, Table, Tag, Statistic,
  Modal, Descriptions, Alert, Space, Divider, Input, theme, Typography,
} from 'antd'
import {
  LockOutlined, UnlockOutlined, DollarCircleOutlined,
  ShoppingCartOutlined, CreditCardOutlined,
  CalculatorOutlined, BankOutlined, QrcodeOutlined, FileTextOutlined,
  EyeOutlined, FilePdfOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { useBarberTheme } from '@/context/ThemeContext'
import { abrirCierrePDF } from '@/lib/dte-viewer'

const { Text } = Typography

interface Turno {
  id: number
  estado: string
  fechaApertura: string
  fechaCierre: string | null
  usuarioApertura: string
  usuarioCierre: string | null
  montoInicial: number
  totalEfectivo: number
  totalTarjeta: number
  totalTransferencia: number
  totalQR: number
  totalVentas: number
  cantidadServicios: number
  montoEsperado: number | null
  montoContado: number | null
  diferencia: number | null
  notasCierre: string | null
  totalVentasCount: number
  arqueoCaja: any
}

const BILLETES = [100, 50, 20, 10, 5, 1]
const MONEDAS = [0.25, 0.10, 0.05, 0.01]

const fmt = (n: number | null | undefined) =>
  n != null ? `$${Number(n).toFixed(2)}` : '—'

function calcTotal(arqueo: Record<string, number>, denominaciones: number[]) {
  return denominaciones.reduce((s, d) => s + d * (arqueo[String(d)] || 0), 0)
}

export default function PosTurnosClient({
  turnoActivo,
  historial: historialProp,
  tenantName,
}: {
  turnoActivo: Turno | null
  historial: Turno[]
  tenantName: string
}) {
  const { theme: barberTheme } = useBarberTheme()
  const primary = barberTheme.colorPrimary
  const { token } = theme.useToken()
  const C = {
    bgPage:        'hsl(var(--bg-page))',
    bgSurface:     'hsl(var(--bg-surface))',
    bgSubtle:      'hsl(var(--bg-subtle))',
    bgMuted:       'hsl(var(--bg-muted))',
    bgPrimaryLow:  `${primary}18`,
    textPrimary:   'hsl(var(--text-primary))',
    textSecondary: 'hsl(var(--text-secondary))',
    textMuted:     'hsl(var(--text-muted))',
    textDisabled:  'hsl(var(--text-disabled))',
    border:        'hsl(var(--border-default))',
    borderStrong:  'hsl(var(--border-strong))',
    colorSuccess:  token.colorSuccess,
    colorError:    token.colorError,
    colorWarning:  token.colorWarning,
    colorWarningBg:token.colorWarningBg,
    colorErrorBg:  token.colorErrorBg,
  }

  const [historial, setHistorial] = useState<Turno[]>(historialProp)
  const [turno, setTurno] = useState<Turno | null>(turnoActivo)

  // ── Abrir turno ─────────────────────────────────────────────────────────────
  const [modalAbrir, setModalAbrir] = useState(false)
  const [montoInicial, setMontoInicial] = useState<number>(0)
  const [loadingAbrir, setLoadingAbrir] = useState(false)

  const abrirTurno = async () => {
    setLoadingAbrir(true)
    try {
      const res = await fetch('/api/pos/turno/abrir', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montoInicial }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Turno abierto correctamente')
      setModalAbrir(false)
      window.location.reload()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingAbrir(false)
    }
  }

  // ── Cerrar turno ────────────────────────────────────────────────────────────
  const [modalCerrar, setModalCerrar] = useState(false)
  const [arqueoBilletes, setArqueoBilletes] = useState<Record<string, number>>({})
  const [arqueoMonedas, setArqueoMonedas] = useState<Record<string, number>>({})
  const [notasCierre, setNotasCierre] = useState('')
  const [loadingCerrar, setLoadingCerrar] = useState(false)

  const totalContadoBilletes = calcTotal(arqueoBilletes, BILLETES)
  const totalContadoMonedas = calcTotal(arqueoMonedas, MONEDAS)
  const totalContado = parseFloat((totalContadoBilletes + totalContadoMonedas).toFixed(2))

  const cerrarTurno = async () => {
    if (!turno) return
    setLoadingCerrar(true)
    try {
      const res = await fetch('/api/pos/turno/cerrar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnoId: turno.id,
          montoContado: totalContado,
          arqueoCaja: {
            billetes: arqueoBilletes,
            monedas: arqueoMonedas,
            totalContado,
          },
          notasCierre,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Turno cerrado correctamente')
      setModalCerrar(false)
      window.location.reload()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingCerrar(false)
    }
  }

  // ── Modal detalle cierre ─────────────────────────────────────────────────────
  const [turnoDetalle, setTurnoDetalle] = useState<Turno | null>(null)

  // ── Columnas historial ───────────────────────────────────────────────────────
  const columns = [
    {
      title: '#',
      render: (_: unknown, __: unknown, idx: number) => historial.length - idx,
      width: 40,
    },
    {
      title: 'Apertura',
      dataIndex: 'fechaApertura',
      render: (v: string) => new Date(v).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' }),
    },
    {
      title: 'Cierre',
      dataIndex: 'fechaCierre',
      render: (v: string | null) => v ? new Date(v).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' }) : '—',
    },
    {
      title: 'Cajero',
      dataIndex: 'usuarioApertura',
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      render: (v: string) => <Tag color={v === 'ABIERTO' ? 'green' : 'default'}>{v}</Tag>,
    },
    {
      title: 'Ventas',
      dataIndex: 'totalVentasCount',
      align: 'center' as const,
    },
    {
      title: 'Total',
      dataIndex: 'totalVentas',
      render: (v: number) => <b style={{ color: primary }}>{fmt(v)}</b>,
      align: 'right' as const,
    },
    {
      title: 'Diferencia',
      dataIndex: 'diferencia',
      align: 'right' as const,
      render: (v: number | null) => {
        if (v == null) return '—'
        const color = v > 0 ? C.colorSuccess : v < 0 ? C.colorError : primary
        return <b style={{ color }}>{v >= 0 ? '+' : ''}{fmt(v)}</b>
      },
    },
    {
      title: '',
      key: 'acciones',
      width: 90,
      render: (_: unknown, record: Turno) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setTurnoDetalle(record)} />
          {record.estado === 'CERRADO' && (
            <Button size="small" icon={<FilePdfOutlined />} style={{ color: primary, borderColor: primary }}
              onClick={() => abrirCierrePDF({ tenantName, ...record })} />
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          {turno ? (
            <Alert
              type="success"
              showIcon
              message={
                <Row justify="space-between" align="middle">
                  <Col>
                    <b style={{ color: primary }}>
                      <Space size={6}><UnlockOutlined style={{ color: primary }} /><span>Turno activo</span></Space>
                    </b>
                    <span style={{ color: C.textSecondary, marginLeft: 12, fontSize: 12 }}>
                      {turno.usuarioApertura} · Desde {new Date(turno.fechaApertura).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </Col>
                  <Col>
                    <Button danger icon={<LockOutlined />} onClick={() => setModalCerrar(true)}>
                      Cerrar Turno
                    </Button>
                  </Col>
                </Row>
              }
            />
          ) : (
            <Alert
              type="warning"
              showIcon
              message={
                <Row justify="space-between" align="middle">
                  <Col><b><Space size={4}><LockOutlined />No hay turno activo</Space></b> — No se pueden registrar ventas</Col>
                  <Col>
                    <Button type="primary" icon={<UnlockOutlined />}
                      style={{ background: primary, borderColor: primary }}
                      onClick={() => setModalAbrir(true)}>
                      Abrir Turno
                    </Button>
                  </Col>
                </Row>
              }
            />
          )}
        </Col>
      </Row>

      {/* KPIs turno activo */}
      {turno && (
        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
          {[
            { title: <Space size={6}><DollarCircleOutlined /><span>Fondo inicial</span></Space>, value: turno.montoInicial, prefix: '$' },
            { title: <Space size={6}><ShoppingCartOutlined /><span>Ventas hoy</span></Space>, value: turno.totalVentasCount },
            { title: <Space size={6}><CalculatorOutlined /><span>Efectivo</span></Space>, value: turno.totalEfectivo, prefix: '$' },
            { title: <Space size={6}><CreditCardOutlined /><span>Tarjeta</span></Space>, value: turno.totalTarjeta, prefix: '$' },
          ].map((k, i) => (
            <Col xs={12} sm={12} md={6} key={i}>
              <Card size="small">
                <Statistic title={k.title} value={k.value} prefix={k.prefix} precision={k.prefix ? 2 : 0}
                  valueStyle={{ color: primary, fontSize: 'clamp(16px, 4vw, 24px)' }} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Historial */}
      <Card title={<Space size={6}><FileTextOutlined /><span>Historial de Turnos</span></Space>} size="small">
        <div style={{ overflowX: 'auto' }}>
          <Table
            dataSource={historial}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ x: 700 }}
            pagination={{ pageSize: 15, size: 'small' }}
          />
        </div>
      </Card>

      {/* Modal abrir turno */}
      <Modal
        open={modalAbrir}
        title={<Space size={8}><UnlockOutlined /><span>Abrir turno de caja</span></Space>}
        onCancel={() => setModalAbrir(false)}
        onOk={abrirTurno}
        confirmLoading={loadingAbrir}
        okText="Abrir Turno"
        okButtonProps={{ style: { background: primary, borderColor: primary } }}
      >
        <p style={{ color: C.textSecondary, marginBottom: 16 }}>
          Ingresa el monto de efectivo con el que abres la caja (fondo de cambio).
        </p>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Monto inicial (efectivo en caja)</div>
          <InputNumber
            size="large" prefix="$" style={{ width: 200 }}
            value={montoInicial} min={0} precision={2}
            onChange={v => setMontoInicial(v || 0)}
            autoFocus
          />
        </div>
      </Modal>

      {/* Modal detalle cierre */}
      <Modal
        open={!!turnoDetalle}
        title={turnoDetalle ? `Detalle — Cierre #${turnoDetalle.id}` : ''}
        onCancel={() => setTurnoDetalle(null)}
        footer={[
          turnoDetalle?.estado === 'CERRADO' && (
            <Button key="pdf" icon={<FilePdfOutlined />} style={{ background: primary, borderColor: primary, color: '#fff' }}
              onClick={() => turnoDetalle && abrirCierrePDF({ tenantName, ...turnoDetalle })}>
              Exportar PDF
            </Button>
          ),
          <Button key="close" onClick={() => setTurnoDetalle(null)}>Cerrar</Button>,
        ]}
        width={600}
      >
        {turnoDetalle && (
          <>
            <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Estado"><Tag color={turnoDetalle.estado === 'ABIERTO' ? 'green' : 'default'}>{turnoDetalle.estado}</Tag></Descriptions.Item>
              <Descriptions.Item label="Cajero apertura">{turnoDetalle.usuarioApertura}</Descriptions.Item>
              <Descriptions.Item label="Apertura">{new Date(turnoDetalle.fechaApertura).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' })}</Descriptions.Item>
              <Descriptions.Item label="Cierre">{turnoDetalle.fechaCierre ? new Date(turnoDetalle.fechaCierre).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</Descriptions.Item>
              <Descriptions.Item label="Cajero cierre">{turnoDetalle.usuarioCierre || '—'}</Descriptions.Item>
              <Descriptions.Item label="Ventas">{turnoDetalle.totalVentasCount}</Descriptions.Item>
            </Descriptions>
            <Card size="small" style={{ marginBottom: 12, background: C.bgSubtle }}>
              <Row gutter={[8, 8]}>
                <Col xs={12} sm={6}><Statistic title="Fondo inicial" value={turnoDetalle.montoInicial} prefix="$" precision={2} valueStyle={{ fontSize: 14 }} /></Col>
                <Col xs={12} sm={6}><Statistic title="Efectivo" value={turnoDetalle.totalEfectivo} prefix="$" precision={2} valueStyle={{ fontSize: 14 }} /></Col>
                <Col xs={12} sm={6}><Statistic title="Tarjeta" value={turnoDetalle.totalTarjeta} prefix="$" precision={2} valueStyle={{ fontSize: 14 }} /></Col>
                <Col xs={12} sm={6}><Statistic title="QR / Transfer." value={(turnoDetalle.totalQR || 0) + (turnoDetalle.totalTransferencia || 0)} prefix="$" precision={2} valueStyle={{ fontSize: 14 }} /></Col>
              </Row>
              <Divider style={{ margin: '8px 0' }} />
              <Row gutter={[8, 8]}>
                <Col xs={8}><Statistic title="Total ventas" value={turnoDetalle.totalVentas} prefix="$" precision={2} valueStyle={{ fontSize: 14, color: primary, fontWeight: 700 }} /></Col>
                <Col xs={8}><Statistic title="Esperado en caja" value={turnoDetalle.montoEsperado ?? 0} prefix="$" precision={2} valueStyle={{ fontSize: 14 }} /></Col>
                <Col xs={8}><Statistic title="Contado" value={turnoDetalle.montoContado ?? 0} prefix="$" precision={2} valueStyle={{ fontSize: 14 }} /></Col>
              </Row>
            </Card>
            {turnoDetalle.diferencia != null && (
              <Card size="small" style={{ marginBottom: 12, background: turnoDetalle.diferencia === 0 ? C.bgPrimaryLow : turnoDetalle.diferencia > 0 ? C.colorWarningBg : C.colorErrorBg }}>
                <Row justify="space-between" align="middle">
                  <Col><Text strong>Diferencia</Text></Col>
                  <Col>
                    <Text strong style={{ fontSize: 18, color: turnoDetalle.diferencia === 0 ? primary : turnoDetalle.diferencia > 0 ? C.colorWarning : C.colorError }}>
                      {turnoDetalle.diferencia >= 0 ? '+' : ''}{fmt(turnoDetalle.diferencia)}
                      {turnoDetalle.diferencia > 0 && ' (SOBRANTE)'}
                      {turnoDetalle.diferencia < 0 && ' (FALTANTE)'}
                      {turnoDetalle.diferencia === 0 && ' (EXACTO)'}
                    </Text>
                  </Col>
                </Row>
              </Card>
            )}
            {turnoDetalle.notasCierre && (
              <Card size="small" title="Notas de cierre"><Text>{turnoDetalle.notasCierre}</Text></Card>
            )}
          </>
        )}
      </Modal>

      {/* Modal cerrar turno con arqueo */}
      <Modal
        open={modalCerrar}
        title="Cierre de Turno — Arqueo de Caja"
        onCancel={() => setModalCerrar(false)}
        onOk={cerrarTurno}
        confirmLoading={loadingCerrar}
        okText="Confirmar Cierre"
        okButtonProps={{ danger: true }}
        width={600}
      >
        {turno && (
          <>
            {/* Resumen sistema */}
            <Card size="small" style={{ marginBottom: 16, background: C.bgPrimaryLow }}>
              <Row gutter={[8, 8]}>
                <Col xs={12} md={8}>
                  <Statistic title={<Space size={6}><DollarCircleOutlined /><span>Fondo inicial</span></Space>} value={turno.montoInicial} prefix="$" precision={2} />
                </Col>
                <Col xs={12} md={8}>
                  <Statistic title={<Space size={6}><CalculatorOutlined /><span>Ventas efectivo</span></Space>} value={turno.totalEfectivo} prefix="$" precision={2} />
                </Col>
                <Col xs={24} md={8}>
                  <Statistic title={<Space size={6}><DollarCircleOutlined /><span>Esperado en caja</span></Space>} value={(turno.montoInicial || 0) + (turno.totalEfectivo || 0)}
                    prefix="$" precision={2} valueStyle={{ color: primary, fontWeight: 700 }} />
                </Col>
              </Row>
              <Divider style={{ margin: '8px 0' }} />
              <Row gutter={[8, 8]}>
                <Col xs={8}>
                  <Statistic title={<Space size={6}><CreditCardOutlined /><span>Tarjeta</span></Space>} value={turno.totalTarjeta} prefix="$" precision={2} />
                </Col>
                <Col xs={8}>
                  <Statistic title={<Space size={6}><BankOutlined /><span>Transfer.</span></Space>} value={turno.totalTransferencia} prefix="$" precision={2} />
                </Col>
                <Col xs={8}>
                  <Statistic title={<Space size={6}><QrcodeOutlined /><span>QR</span></Space>} value={turno.totalQR} prefix="$" precision={2} />
                </Col>
              </Row>
            </Card>

            {/* Arqueo físico */}
            <Row gutter={[8, 16]}>
              <Col xs={24} sm={12}>
                <b>Billetes</b>
                <table style={{ width: '100%', marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', fontWeight: 500, color: C.textMuted, fontSize: 11 }}>Denominación</th>
                      <th style={{ textAlign: 'center', fontWeight: 500, color: C.textMuted, fontSize: 11 }}>Cantidad</th>
                      <th style={{ textAlign: 'right', fontWeight: 500, color: C.textMuted, fontSize: 11 }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BILLETES.map(b => {
                      const cant = arqueoBilletes[String(b)] || 0
                      return (
                        <tr key={b}>
                          <td style={{ padding: '3px 0', fontSize: 12 }}>${b}.00</td>
                          <td style={{ textAlign: 'center' }}>
                            <InputNumber
                              size="small" style={{ width: '100%', maxWidth: 80 }} min={0}
                              value={cant || undefined}
                              onChange={v => setArqueoBilletes(prev => ({ ...prev, [String(b)]: v || 0 }))}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontSize: 12, color: cant > 0 ? primary : C.textDisabled }}>
                            ${(b * cant).toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                    <tr>
                      <td colSpan={2} style={{ fontWeight: 700, paddingTop: 6 }}>Subtotal billetes</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: primary, paddingTop: 6 }}>
                        ${totalContadoBilletes.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Col>

              <Col xs={24} sm={12}>
                <b>Monedas</b>
                <table style={{ width: '100%', marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', fontWeight: 500, color: C.textMuted, fontSize: 11 }}>Denominación</th>
                      <th style={{ textAlign: 'center', fontWeight: 500, color: C.textMuted, fontSize: 11 }}>Cantidad</th>
                      <th style={{ textAlign: 'right', fontWeight: 500, color: C.textMuted, fontSize: 11 }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONEDAS.map(m => {
                      const cant = arqueoMonedas[String(m)] || 0
                      return (
                        <tr key={m}>
                          <td style={{ padding: '3px 0', fontSize: 12 }}>${m.toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <InputNumber
                              size="small" style={{ width: '100%', maxWidth: 80 }} min={0}
                              value={cant || undefined}
                              onChange={v => setArqueoMonedas(prev => ({ ...prev, [String(m)]: v || 0 }))}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontSize: 12, color: cant > 0 ? primary : C.textDisabled }}>
                            ${(m * cant).toFixed(4).replace(/0+$/, '0').replace(/\.$/, '.00')}
                          </td>
                        </tr>
                      )
                    })}
                    <tr>
                      <td colSpan={2} style={{ fontWeight: 700, paddingTop: 6 }}>Subtotal monedas</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: primary, paddingTop: 6 }}>
                        ${totalContadoMonedas.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Col>
            </Row>

            <Divider />

            {/* Resultado */}
            {(() => {
              const esperado = (turno.montoInicial || 0) + (turno.totalEfectivo || 0)
              const diferencia = parseFloat((totalContado - esperado).toFixed(2))
              return (
                <Card size="small" style={{ background: diferencia === 0 ? C.bgPrimaryLow : diferencia > 0 ? C.colorWarningBg : C.colorErrorBg }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <div style={{ fontSize: 12, color: C.textMuted }}>Total contado</div>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>${totalContado.toFixed(2)}</div>
                    </Col>
                    <Col>
                      <div style={{ fontSize: 12, color: C.textMuted }}>Esperado</div>
                      <div style={{ fontSize: 18 }}>${esperado.toFixed(2)}</div>
                    </Col>
                    <Col>
                      <div style={{ fontSize: 12, color: C.textMuted }}>Diferencia</div>
                      <div style={{
                        fontSize: 22, fontWeight: 700,
                        color: diferencia === 0 ? primary : diferencia > 0 ? C.colorWarning : C.colorError
                      }}>
                        {diferencia >= 0 ? '+' : ''}{diferencia.toFixed(2)}
                        {diferencia > 0 && ' (SOBRANTE)'}
                        {diferencia < 0 && ' (FALTANTE)'}
                        {diferencia === 0 && <> <UnlockOutlined /></>}
                      </div>
                    </Col>
                  </Row>
                </Card>
              )
            })()}

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Notas de cierre</div>
              <Input.TextArea rows={2} placeholder="Observaciones del cierre..." value={notasCierre}
                onChange={e => setNotasCierre(e.target.value)} />
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
