import { NextRequest, NextResponse } from 'next/server'
import { getTurnoActivo } from '@/modules/pos/pos.service'
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {
  try {
const turno = await getTurnoActivo(ctx.tenantId)
    return NextResponse.json({ turno })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}, { requiredModule: 'pos' })
