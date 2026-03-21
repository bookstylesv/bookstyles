import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createNotaCredito, getNotasCredito } from '@/modules/pos/pos.service'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ncs = await getNotasCredito(user.tenantId)
    return NextResponse.json({ notasCredito: ncs })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (user.role !== 'OWNER') return NextResponse.json({ error: 'Solo el propietario puede emitir NC' }, { status: 403 })

    const { ventaId, motivo } = await req.json()
    if (!ventaId || !motivo) return NextResponse.json({ error: 'ventaId y motivo son requeridos' }, { status: 400 })

    const nc = await createNotaCredito(user.tenantId, Number(ventaId), motivo)
    return NextResponse.json({ notaCredito: nc }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
