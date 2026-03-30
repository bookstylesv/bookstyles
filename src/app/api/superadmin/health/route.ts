import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db_latency_ms: latency,
    });
  } catch {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      db_latency_ms: Date.now() - start,
    }, { status: 503 });
  }
}
