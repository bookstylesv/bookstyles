import { NextRequest, NextResponse } from 'next/server'
import { getTurnos } from '@/modules/pos/pos.service'
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (req: NextRequest, ctx) => {
  try {
const page = Number(req.nextUrl.searchParams.get('page') || '1')
    const result = await getTurnos(ctx.tenantId, page)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}, { requiredModule: 'pos' })
