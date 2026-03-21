import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPosStats } from '@/modules/pos/pos.service'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const stats = await getPosStats(user.tenantId)
    return NextResponse.json(stats)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
