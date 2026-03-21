import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getBarberosHoy } from '@/modules/pos/pos.service'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const data = await getBarberosHoy(user.tenantId)
    return NextResponse.json({ barberos: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
