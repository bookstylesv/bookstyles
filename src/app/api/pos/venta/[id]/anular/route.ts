import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { anularVenta } from '@/modules/pos/pos.service'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (user.role !== 'OWNER') return NextResponse.json({ error: 'Solo el propietario puede anular' }, { status: 403 })

    const { id } = await params
    const { motivo } = await req.json()
    if (!motivo) return NextResponse.json({ error: 'El motivo de anulación es requerido' }, { status: 400 })

    await anularVenta(Number(id), user.tenantId, motivo)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
