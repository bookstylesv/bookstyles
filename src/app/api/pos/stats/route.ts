import { NextRequest, NextResponse } from 'next/server'
import { getPosStats } from '@/modules/pos/pos.service'
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {
  try {
const stats = await getPosStats(ctx.tenantId)
    return NextResponse.json(stats)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}, { requiredModule: 'pos' })
