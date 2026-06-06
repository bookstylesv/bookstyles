import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/response';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const barberId = parseInt(id);
    if (isNaN(barberId)) return Response.json({ error: { message: 'ID inválido' } }, { status: 400 });

    // Verificar que el barbero pertenece al tenant
    const barber = await prisma.barber.findFirst({
      where: { id: barberId, tenantId: ctx.tenantId },
      include: { user: { select: { fullName: true } } },
    });
    if (!barber) return Response.json({ error: { message: 'Barbero no encontrado' } }, { status: 404 });

    // Citas del barbero
    const appointments = await prisma.barberAppointment.findMany({
      where: { barberId, tenantId: ctx.tenantId },
      include: {
        service: { select: { name: true, price: true } },
        payment: { select: { amount: true, status: true } },
      },
      orderBy: { startTime: 'desc' },
    });

    // KPIs
    const total       = appointments.length;
    const completadas = appointments.filter(a => a.status === 'COMPLETED').length;
    const canceladas  = appointments.filter(a => a.status === 'CANCELLED').length;
    const noShow      = appointments.filter(a => a.status === 'NO_SHOW').length;
    const pendientes  = appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length;

    const ingresos = appointments
      .filter(a => a.payment?.status === 'PAID')
      .reduce((sum, a) => sum + (a.payment?.amount?.toNumber?.() ?? Number(a.payment?.amount) ?? 0), 0);

    const tasaCompletacion = total > 0 ? Math.round((completadas / total) * 100) : 0;

    // Top 5 servicios
    const svcMap = new Map<string, { name: string; count: number; ingresos: number }>();
    for (const a of appointments) {
      const key = a.service.name;
      const prev = svcMap.get(key) ?? { name: key, count: 0, ingresos: 0 };
      const paid = a.payment?.status === 'PAID'
        ? (a.payment?.amount?.toNumber?.() ?? Number(a.payment?.amount) ?? 0)
        : 0;
      svcMap.set(key, { name: key, count: prev.count + 1, ingresos: prev.ingresos + paid });
    }
    const topServicios = Array.from(svcMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Citas por mes (últimos 6 meses)
    const now   = new Date();
    const meses: { label: string; citas: number; ingresos: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('es-SV', { month: 'short', year: '2-digit' });
      const next  = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const inMes = appointments.filter(a => {
        const t = new Date(a.startTime);
        return t >= d && t < next;
      });
      const ingresosMes = inMes
        .filter(a => a.payment?.status === 'PAID')
        .reduce((s, a) => s + (a.payment?.amount?.toNumber?.() ?? Number(a.payment?.amount) ?? 0), 0);
      meses.push({ label, citas: inMes.length, ingresos: Number(ingresosMes.toFixed(2)) });
    }

    return ok({
      barberName: barber.user.fullName,
      kpis: { total, completadas, canceladas, noShow, pendientes, ingresos: Number(ingresos.toFixed(2)), tasaCompletacion },
      topServicios,
      meses,
    });
}, { requiredModule: 'citas' })
