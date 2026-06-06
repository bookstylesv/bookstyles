import { NextRequest } from 'next/server'
import { ok } from '@/lib/response'
import { withTenantAuth } from '@/lib/with-tenant-auth'
import { canjearLoyalty } from '@/modules/loyalty/loyalty.service'

export const dynamic = 'force-dynamic'

export const POST = withTenantAuth(async (req: NextRequest, ctx, routeCtx) => {
  const { codigo } = await routeCtx.params
  const body = await req.json().catch(() => ({}))
  const { nota } = body

  try {
    const tarjeta = await canjearLoyalty(ctx.tenantId, codigo, nota)
    return ok(tarjeta)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al registrar canje'
    return Response.json({ error: { message: msg } }, { status: 400 })
  }
}, { requiredModule: 'loyalty' })
