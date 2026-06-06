import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
const { id } = await routeCtx.params;const ventaId = parseInt(id)
  if (isNaN(ventaId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const venta = await prisma.barberVenta.findFirst({
    where: { id: ventaId, tenantId: ctx.tenantId },
    select: { dteJson: true, codigoGeneracion: true, tipoDte: true },
  })

  if (!venta) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
  if (!venta.dteJson) return NextResponse.json({ error: 'Esta venta no tiene DTE generado' }, { status: 404 })

  return NextResponse.json({ dte: venta.dteJson })
}, { requiredModule: 'pos' })
