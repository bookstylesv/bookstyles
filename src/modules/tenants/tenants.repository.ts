/**
 * tenants.repository.ts — Acceso a datos de tenants.
 * Solo queries Prisma. Sin lógica de negocio.
 * Máximo 150 líneas por archivo.
 */

import { prisma } from '@/lib/prisma';

export const tenantsRepository = {
  async findBySlug(slug: string) {
    return prisma.barberTenant.findUnique({
      where: { slug, deletedAt: null },
    });
  },

  async findById(id: number) {
    return prisma.barberTenant.findUnique({
      where: { id, deletedAt: null },
    });
  },

  async create(data: {
    slug: string;
    name: string;
    email?: string;
    phone?: string;
    city?: string;
  }) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);
    return prisma.barberTenant.create({
      data: { ...data, trialEndsAt },
    });
  },

  async updateTheme(tenantId: number, themeConfig: Record<string, string>) {
    return prisma.barberTenant.update({
      where: { id: tenantId },
      data:  { themeConfig },
    });
  },

  async updateInfo(tenantId: number, data: {
    name?:    string;
    email?:   string;
    phone?:   string;
    address?: string;
    city?:    string;
    logoUrl?: string;
  }) {
    return prisma.barberTenant.update({
      where: { id: tenantId },
      data,
    });
  },

  async updateBusinessHours(tenantId: number, businessHours: BusinessHourEntry[]) {
    return prisma.barberTenant.update({
      where: { id: tenantId },
      data:  { businessHours: businessHours as object[] },
    });
  },

  async suspend(tenantId: number) {
    return prisma.barberTenant.update({
      where: { id: tenantId },
      data:  { status: 'SUSPENDED', suspendedAt: new Date() },
    });
  },
};

export type BusinessHourEntry = {
  dayOfWeek: number;   // 0=Dom … 6=Sáb
  active:    boolean;
  startTime: string;   // "08:00"
  endTime:   string;   // "17:00"
};
