import { NextRequest } from 'next/server'
import { created } from '@/lib/response';
import { abrirTurno } from '@/modules/pos/pos.service'
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
    const { montoInicial } = await req.json()
    const turno = await abrirTurno(ctx.tenantId, Number(ctx.user.sub), montoInicial || 0)
    return created({ turno })
}, { requiredModule: 'pos' })
