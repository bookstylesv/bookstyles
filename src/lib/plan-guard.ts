/**
 * plan-guard.ts — Helpers para validar módulos y límites según el plan del tenant.
 *
 * Resolución del plan:
 *   1. tenant.planSlug → slug de un plan custom creado desde el panel
 *   2. tenant.plan (enum) → fallback: "BASIC" → slug "basic"
 *   3. Si no hay BarberPlanConfig, usa maxBarbers del tenant y módulos vacíos.
 *   4. BarberTenant.modules actúa como override opcional por tenant.
 */

import { prisma } from '@/lib/prisma';

export type PlanModules = Record<string, boolean>;

export type PlanLimits = {
  maxBarbers:  number;
  maxBranches: number;
  modules:     PlanModules;
};

const configCache = new Map<string, PlanLimits>();

export async function getPlanLimits(tenantId: number): Promise<PlanLimits> {
  const cacheKey = String(tenantId);
  if (configCache.has(cacheKey)) return configCache.get(cacheKey)!;

  const tenant = await prisma.barberTenant.findUnique({
    where:  { id: tenantId },
    select: { plan: true, planSlug: true, modules: true, maxBarbers: true },
  });

  if (!tenant) return { maxBarbers: 3, maxBranches: 1, modules: {} };

  // Resolver el slug: custom plan tiene prioridad sobre el enum
  const slug = tenant.planSlug ?? tenant.plan.toLowerCase();

  const planConfig = await prisma.barberPlanConfig.findUnique({
    where:  { slug },
    select: { maxBarbers: true, maxBranches: true, modules: true },
  });

  if (!planConfig) {
    return { maxBarbers: tenant.maxBarbers, maxBranches: 1, modules: (tenant.modules as PlanModules) ?? {} };
  }

  const planModules    = (planConfig.modules as PlanModules) ?? {};
  const tenantOverride = (tenant.modules    as PlanModules) ?? {};

  const resolved: PlanModules = { ...planModules };
  for (const key of Object.keys(tenantOverride)) {
    if (typeof tenantOverride[key] === 'boolean') resolved[key] = tenantOverride[key];
  }

  const limits: PlanLimits = {
    maxBarbers:  planConfig.maxBarbers,
    maxBranches: planConfig.maxBranches,
    modules:     resolved,
  };

  configCache.set(cacheKey, limits);
  return limits;
}

export async function isModuleEnabled(tenantId: number, module: string): Promise<boolean> {
  const limits = await getPlanLimits(tenantId);
  return limits.modules[module] === true;
}

export async function checkBarberLimit(
  tenantId: number,
): Promise<{ allowed: boolean; current: number; max: number }> {
  const [limits, current] = await Promise.all([
    getPlanLimits(tenantId),
    prisma.barber.count({ where: { tenantId, active: true } }),
  ]);
  return { allowed: current < limits.maxBarbers, current, max: limits.maxBarbers };
}

export async function checkBranchLimit(
  tenantId: number,
): Promise<{ allowed: boolean; current: number; max: number }> {
  const [limits, current] = await Promise.all([
    getPlanLimits(tenantId),
    prisma.barberBranch.count({ where: { tenantId, status: 'ACTIVE' } }),
  ]);
  return { allowed: current < limits.maxBranches, current, max: limits.maxBranches };
}
