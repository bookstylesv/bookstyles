import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getVentas, getNotasCredito } from '@/modules/pos/pos.service'
import PosDocumentosClient from '@/components/pos/PosDocumentosClient'

export const dynamic = 'force-dynamic'

export default async function PosDocumentosPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'OWNER') redirect('/dashboard')

  const [ventasData, ncsData] = await Promise.all([
    getVentas(user.tenantId, { page: 1, limit: 200 } as any),
    getNotasCredito(user.tenantId),
  ])

  return (
    <PosDocumentosClient
      ventas={ventasData.items as any}
      notasCredito={ncsData as any}
    />
  )
}
