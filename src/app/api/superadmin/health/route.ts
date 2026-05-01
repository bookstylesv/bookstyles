import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const start = Date.now();

  try {
    // BD: latencia + versión + hora del servidor
    const [, dbMeta] = await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      prisma.$queryRaw<{ version: string; now: Date }[]>`
        SELECT version(), now() AS now
      `,
    ]);
    const latency = Date.now() - start;

    const dbVersion = (dbMeta[0]?.version ?? '').split(' ').slice(0, 2).join(' ');
    const serverTime = dbMeta[0]?.now?.toISOString() ?? null;

    // Tenants por estado
    const tenantCounts = await prisma.tenant.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const countMap = Object.fromEntries(
      tenantCounts.map((r) => [r.status, r._count._all])
    );

    // Proceso y memoria — sin exponer rutas ni env vars
    const mem = process.memoryUsage();

    console.log(`[superadmin/health] ok — latencia:${latency}ms uptime:${Math.floor(process.uptime())}s`);

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        latency_ms: latency,
        version: dbVersion,
        server_time: serverTime,
      },
      process: {
        uptime_seconds: Math.floor(process.uptime()),
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        environment: process.env.NODE_ENV ?? 'unknown',
        pid: process.pid,
        memory: {
          rss_mb:        Math.round(mem.rss        / 1024 / 1024),
          heap_used_mb:  Math.round(mem.heapUsed   / 1024 / 1024),
          heap_total_mb: Math.round(mem.heapTotal  / 1024 / 1024),
          external_mb:   Math.round(mem.external   / 1024 / 1024),
        },
      },
      tenants: {
        total:       tenantCounts.reduce((s, r) => s + r._count._all, 0),
        activos:     countMap['ACTIVE']    ?? 0,
        en_trial:    countMap['TRIAL']     ?? 0,
        suspendidos: countMap['SUSPENDED'] ?? 0,
        cancelados:  countMap['CANCELLED'] ?? 0,
      },
    });
  } catch (err) {
    console.error(`[superadmin/health] error — ${Date.now() - start}ms`, err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        db_latency_ms: Date.now() - start,
      },
      { status: 503 }
    );
  }
}
