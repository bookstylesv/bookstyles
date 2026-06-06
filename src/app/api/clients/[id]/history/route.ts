import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/response';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async (_req: NextRequest, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    const clientId = parseInt(id);
    if (isNaN(clientId)) return Response.json({ error: { message: 'ID inválido' } }, { status: 400 });

    const client = await prisma.barberUser.findFirst({
      where: { id: clientId, tenantId: ctx.tenantId },
      select: { fullName: true },
    });
    if (!client) return Response.json({ error: { message: 'Cliente no encontrado' } }, { status: 404 });

    const appointments = await prisma.barberAppointment.findMany({
      where: { clientId, tenantId: ctx.tenantId },
      include: {
        service: { select: { name: true, price: true, category: true } },
        barber:  { include: { user: { select: { fullName: true } } } },
        payment: { select: { amount: true, status: true, method: true, paidAt: true } },
      },
      orderBy: { startTime: 'desc' },
      take: 50,
    });

    // KPIs
    const total       = appointments.length;
    const completadas = appointments.filter(a => a.status === 'COMPLETED').length;
    const canceladas  = appointments.filter(a => a.status === 'CANCELLED' || a.status === 'NO_SHOW').length;

    const gastado = appointments
      .filter(a => a.payment?.status === 'PAID')
      .reduce((sum, a) => sum + (a.payment?.amount?.toNumber?.() ?? Number(a.payment?.amount) ?? 0), 0);

    const ultimaVisita = appointments.find(a => a.status === 'COMPLETED')?.startTime ?? null;

    // Servicio favorito
    const svcCount = new Map<string, number>();
    for (const a of appointments) {
      svcCount.set(a.service.name, (svcCount.get(a.service.name) ?? 0) + 1);
    }
    const servicioFavorito = Array.from(svcCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Lista serializada
    const lista = appointments.map(a => ({
      id:          a.id,
      startTime:   a.startTime.toISOString(),
      status:      a.status,
      servicio:    a.service.name,
      categoria:   a.service.category,
      precio:      Number(a.service.price),
      barbero:     a.barber.user.fullName,
      pagado:      a.payment?.status === 'PAID',
      montoPagado: a.payment?.amount != null
        ? Number((a.payment.amount as unknown as { toNumber?: () => number })?.toNumber?.() ?? a.payment.amount)
        : null,
      metodoPago:  a.payment?.method ?? null,
    }));

    return ok({
      clientName: client.fullName,
      kpis: {
        total,
        completadas,
        canceladas,
        gastado:        Number(gastado.toFixed(2)),
        ultimaVisita:   ultimaVisita?.toISOString() ?? null,
        servicioFavorito,
      },
      appointments: lista,
    });
}, { requiredModule: 'clients' })
