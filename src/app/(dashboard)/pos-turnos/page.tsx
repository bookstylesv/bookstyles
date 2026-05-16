import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTurnoActivo, getTurnos } from '@/modules/pos/pos.service'
import { prisma } from '@/lib/prisma'
import PosTurnosClient from '@/components/pos/PosTurnosClient'

export const dynamic = 'force-dynamic'

export default async function PosTurnosPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role === 'OWNER') redirect('/dashboard')

  const [turnoData, historialData, tenant] = await Promise.all([
    getTurnoActivo(user.tenantId),
    getTurnos(user.tenantId, 1),
    prisma.barberTenant.findFirst({ where: { id: user.tenantId }, select: { name: true } }),
  ])
  const tenantName = tenant?.name || ''

  // Turno activo serializado para el cliente
  const turnoActivo = turnoData ? {
    id: turnoData.id,
    estado: 'ABIERTO',
    fechaApertura: turnoData.fechaApertura,
    fechaCierre: null,
    usuarioApertura: turnoData.usuarioApertura,
    usuarioCierre: null,
    montoInicial: turnoData.montoInicial,
    totalEfectivo: turnoData.totalEfectivo,
    totalTarjeta: turnoData.totalTarjeta,
    totalTransferencia: turnoData.totalTransferencia,
    totalQR: turnoData.totalQR,
    totalVentas: turnoData.totalVentas,
    cantidadServicios: 0,
    montoEsperado: null,
    montoContado: null,
    diferencia: null,
    notasCierre: null,
    totalVentasCount: turnoData.totalVentasCount,
    arqueoCaja: null,
  } : null

  return (
    <PosTurnosClient
      turnoActivo={turnoActivo}
      historial={historialData.items}
      tenantName={tenantName}
    />
  )
}
