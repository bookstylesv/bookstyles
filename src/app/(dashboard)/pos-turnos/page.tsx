import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTurnoActivo, getTurnos } from '@/modules/pos/pos.service'
import PosTurnosClient from '@/components/pos/PosTurnosClient'

export const dynamic = 'force-dynamic'

export default async function PosTurnosPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role === 'OWNER') redirect('/dashboard')

  const [turnoData, historialData] = await Promise.all([
    getTurnoActivo(user.tenantId),
    getTurnos(user.tenantId, 1),
  ])

  // Turno activo serializado para el cliente
  const turnoActivo = turnoData ? {
    id: turnoData.id,
    estado: 'ABIERTO',
    fechaApertura: turnoData.fechaApertura,
    fechaCierre: null,
    usuarioApertura: turnoData.usuarioApertura,
    usuarioCierre: null,
    montoInicial: turnoData.montoInicial,
    totalEfectivo: 0,
    totalTarjeta: 0,
    totalTransferencia: 0,
    totalQR: 0,
    totalVentas: 0,
    cantidadServicios: 0,
    montoEsperado: null,
    montoContado: null,
    diferencia: null,
    notasCierre: null,
    totalVentasCount: turnoData.totalVentas,
    arqueoCaja: null,
  } : null

  return (
    <PosTurnosClient
      turnoActivo={turnoActivo}
      historial={historialData.items}
    />
  )
}
