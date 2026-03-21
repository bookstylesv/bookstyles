import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTurnoActivo } from '@/modules/pos/pos.service'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const turno = await getTurnoActivo(user.tenantId)
    return NextResponse.json({ turno })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
