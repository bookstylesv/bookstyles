import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER' && user.role !== 'BARBER') throw new ForbiddenError();

    const { id } = await params;
    const clientId = parseInt(id);
    if (isNaN(clientId)) return apiError({ status: 400, message: 'ID inválido' });

    const client = await prisma.barberUser.findFirst({
      where: { id: clientId, tenantId: user.tenantId },
      select: { fullName: true },
    });
    if (!client) return apiError({ status: 404, message: 'Cliente no encontrado' });

    const appointments = await prisma.barberAppointment.findMany({
      where: { clientId, tenantId: user.tenantId },
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
  } catch (err) {
    console.error('[GET /api/clients/[id]/history]', err);
    return apiError(err);
  }
}
