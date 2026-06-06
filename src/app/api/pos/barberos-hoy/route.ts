import { NextRequest, NextResponse } from 'next/server'
import { getBarberosHoy } from '@/modules/pos/pos.service'
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx) => {
  try {
const data = await getBarberosHoy(ctx.tenantId)
    return NextResponse.json({ barberos: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}, { requiredModule: 'pos' })
