/**
 * clients.repository.ts — Capa de datos para clientes (BarberUser con role CLIENT).
 * Todas las queries filtran por tenantId.
 */

import { prisma } from '@/lib/prisma';

export type ClientCreateInput = {
  email:           string;
  fullName:        string;
  phone?:          string;
  password?:       string;
  // Datos fiscales DTE
  tipoDocumento?:   string;
  numDocumento?:    string;
  nrc?:             string;
  nombreComercial?: string;
  descActividad?:   string;
  departamentoCod?: string;
  municipioCod?:    string;
  complemento?:     string;
  // Descuento por convenio
  descuentoTipo?:   string;
  descuentoValor?:  number;
};

export type ClientUpdateInput = Partial<Omit<ClientCreateInput, 'password'>>;

const CLIENT_SELECT = {
  id:              true,
  email:           true,
  fullName:        true,
  phone:           true,
  active:          true,
  createdAt:       true,
  // Datos fiscales
  tipoDocumento:   true,
  numDocumento:    true,
  nrc:             true,
  nombreComercial: true,
  descActividad:   true,
  departamentoCod: true,
  municipioCod:    true,
  complemento:     true,
  // Descuento por convenio
  descuentoTipo:   true,
  descuentoValor:  true,
} as const;

export async function findAllClients(tenantId: number) {
  const clients = await prisma.barberUser.findMany({
    where:   { tenantId, role: 'CLIENT' },
    select:  CLIENT_SELECT,
    orderBy: { createdAt: 'desc' },
  });

  // Contar citas por cliente
  const ids = clients.map(c => c.id);
  const counts = await prisma.barberAppointment.groupBy({
    by:    ['clientId'],
    where: { tenantId, clientId: { in: ids } },
    _count: { id: true },
  });

  const countMap = Object.fromEntries(counts.map(r => [r.clientId, r._count.id]));

  // Última cita por cliente
  const lastAppts = await Promise.all(
    ids.map(id =>
      prisma.barberAppointment.findFirst({
        where:   { tenantId, clientId: id },
        orderBy: { startTime: 'desc' },
        select:  { startTime: true },
      }),
    ),
  );

  return clients.map((c, i) => ({
    ...c,
    totalAppointments: countMap[c.id] ?? 0,
    lastVisit:         lastAppts[i]?.startTime ?? null,
  }));
}

export async function findClientById(id: number, tenantId: number) {
  const client = await prisma.barberUser.findFirst({
    where:  { id, tenantId, role: 'CLIENT' },
    select: CLIENT_SELECT,
  });
  if (!client) return null;

  const appointments = await prisma.barberAppointment.findMany({
    where:   { tenantId, clientId: id },
    include: {
      service: { select: { id: true, name: true, price: true } },
      barber:  { include: { user: { select: { fullName: true } } } },
    },
    orderBy: { startTime: 'desc' },
    take:    10,
  });

  return { ...client, appointments };
}

export async function createClient(tenantId: number, data: ClientCreateInput) {
  const bcrypt = await import('bcryptjs');
  const password = data.password
    ? await bcrypt.hash(data.password, 10)
    : await bcrypt.hash(Math.random().toString(36).slice(2, 10), 10);

  return prisma.barberUser.create({
    data: {
      tenantId,
      email:           data.email,
      fullName:        data.fullName,
      phone:           data.phone,
      password,
      role:            'CLIENT',
      active:          true,
      tipoDocumento:   data.tipoDocumento,
      numDocumento:    data.numDocumento,
      nrc:             data.nrc,
      nombreComercial: data.nombreComercial,
      descActividad:   data.descActividad,
      departamentoCod: data.departamentoCod,
      municipioCod:    data.municipioCod,
      complemento:     data.complemento,
      descuentoTipo:   data.descuentoTipo,
      descuentoValor:  data.descuentoValor,
    },
    select: CLIENT_SELECT,
  });
}

export async function updateClient(id: number, tenantId: number, data: ClientUpdateInput) {
  return prisma.barberUser.update({
    where:  { id },
    data: {
      ...(data.fullName        !== undefined && { fullName:        data.fullName }),
      ...(data.email           !== undefined && { email:           data.email }),
      ...(data.phone           !== undefined && { phone:           data.phone }),
      ...(data.tipoDocumento   !== undefined && { tipoDocumento:   data.tipoDocumento || null }),
      ...(data.numDocumento    !== undefined && { numDocumento:    data.numDocumento || null }),
      ...(data.nrc             !== undefined && { nrc:             data.nrc || null }),
      ...(data.nombreComercial !== undefined && { nombreComercial: data.nombreComercial || null }),
      ...(data.descActividad   !== undefined && { descActividad:   data.descActividad   || null }),
      ...(data.departamentoCod !== undefined && { departamentoCod: data.departamentoCod || null }),
      ...(data.municipioCod    !== undefined && { municipioCod:    data.municipioCod || null }),
      ...(data.complemento     !== undefined && { complemento:     data.complemento || null }),
      ...(data.descuentoTipo   !== undefined && { descuentoTipo:   data.descuentoTipo   || null }),
      ...(data.descuentoValor  !== undefined && { descuentoValor:  data.descuentoValor  ?? null }),
    },
    select: CLIENT_SELECT,
  });
}

export async function findClientsWithDescuento(tenantId: number) {
  return prisma.barberUser.findMany({
    where:   { tenantId, role: 'CLIENT', active: true, NOT: { descuentoTipo: null } },
    select: {
      id:              true,
      fullName:        true,
      tipoDocumento:   true,
      numDocumento:    true,
      nombreComercial: true,
      descuentoTipo:   true,
      descuentoValor:  true,
    },
    orderBy: { fullName: 'asc' },
  });
}

export async function toggleClientActive(id: number, tenantId: number, active: boolean) {
  return prisma.barberUser.update({
    where:  { id },
    data:   { active },
    select: CLIENT_SELECT,
  });
}

export async function deleteClient(id: number, tenantId: number) {
  const hasAppts = await prisma.barberAppointment.count({
    where: { clientId: id, tenantId },
  });
  if (hasAppts > 0) {
    return prisma.barberUser.update({
      where: { id },
      data:  { active: false },
      select: CLIENT_SELECT,
    });
  }
  return prisma.barberUser.delete({ where: { id } });
}
