import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listTarjetas } from '@/modules/loyalty/loyalty.service'
import LoyaltyClient from '@/components/loyalty/LoyaltyClient'

export const dynamic = 'force-dynamic'

export default async function LoyaltyPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role === 'CLIENT') redirect('/dashboard')

  const tarjetas = await listTarjetas(user.tenantId)

  const data = tarjetas.map(t => ({
    id:            t.id,
    codigo:        t.codigo,
    nombre:        t.nombre,
    tipo:          t.tipo as 'SELLOS' | 'PUNTOS',
    meta:          t.meta,
    dolarsPorPunto: t.dolarsPorPunto ? Number(t.dolarsPorPunto) : undefined,
    saldoActual:   t.saldoActual,
    estado:        t.estado as 'ACTIVA' | 'PENDIENTE_CANJE',
    createdAt:     t.createdAt.toISOString(),
    totalMovimientos: t._count.movimientos,
  }))

  return <LoyaltyClient initialTarjetas={data} />
}
