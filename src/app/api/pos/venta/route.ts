import { NextRequest } from 'next/server'
import { ok, created } from '@/lib/response';
import { createVenta, getVentas } from '@/modules/pos/pos.service'
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {    const sp = req.nextUrl.searchParams
    const result = await getVentas(ctx.tenantId, {
      estado: sp.get('estado') || undefined,
      tipoDte: sp.get('tipoDte') || undefined,
      turnoId: sp.get('turnoId') ? Number(sp.get('turnoId')) : undefined,
      desde: sp.get('desde') || undefined,
      hasta: sp.get('hasta') || undefined,
      page: Number(sp.get('page') || '1'),
    })
    return ok(result)
}, { requiredModule: 'pos' })

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {    const body = await req.json()
    const result = await createVenta(ctx.tenantId, body)
    return created(result)
}, { requiredModule: 'pos' })
