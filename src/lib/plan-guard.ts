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
import { MODULE_KEYS } from '@/lib/module-guard';

export type PlanModules = Record<string, boolean>;

export type PlanLimits = {
  maxBarbers:  number;
  maxBranches: number;
  modules:     PlanModules;
};

const configCache = new Map<string, PlanLimits>();

const MODULE_ALIASES: Record<string, string> = {
  billing: 'pos_dte',
  billing_dte: 'pos_dte',
  dte: 'pos_dte',
  gastos: 'expenses',
  cxp: 'expenses',
  compras: 'products',
  proveedores: 'products',
  inventario: 'products',
  productos: 'products',
  servicios: 'services',
  citas: 'appointments',
  agenda: 'appointments',
  usuarios: 'usuarios',
};

function canonicalModuleKey(key: string) {
  return MODULE_ALIASES[key] ?? key;
}

function normalizeModules(modules: PlanModules | null | undefined): PlanModules {
  const normalized: PlanModules = {};
  for (const [rawKey, enabled] of Object.entries(modules ?? {})) {
    if (typeof enabled !== 'boolean') continue;
    normalized[canonicalModuleKey(rawKey)] = enabled;
  }
  return normalized;
}

export function moduleAccessFromPlanModules(modules: PlanModules): string[] {
  return MODULE_KEYS.filter(module => modules[module] === true);
}

export async function getPlanLimits(tenantId: number): Promise<PlanLimits> {
  const cacheKey = String(tenantId);
  if (configCache.has(cacheKey)) return configCache.get(cacheKey)!;

  const tenant = await prisma.barberTenant.findUnique({
    where:  { id: tenantId },
    select: { plan: true, planSlug: true, status: true, modules: true, maxBarbers: true },
  });

  if (!tenant) return { maxBarbers: 3, maxBranches: 1, modules: {} };

  // Mientras el tenant esta en prueba, los limites efectivos son los del plan TRIAL.
  // El campo tenant.plan puede quedar como BASIC/PRO para indicar el plan elegido al convertir,
  // pero no debe abrir modulos mientras status siga en TRIAL.
  const slug = tenant.status === 'TRIAL'
    ? 'trial'
    : tenant.planSlug ?? tenant.plan.toLowerCase();

  const planConfig = await prisma.barberPlanConfig.findUnique({
    where:  { slug },
    select: { maxBarbers: true, maxBranches: true, modules: true },
  });

  if (!planConfig) {
    const fallbackModules = normalizeModules(tenant.modules as PlanModules);
    return { maxBarbers: tenant.maxBarbers, maxBranches: 1, modules: fallbackModules };
  }

  const planModules    = normalizeModules(planConfig.modules as PlanModules);
  const tenantOverride = normalizeModules(tenant.modules    as PlanModules);

  const resolved: PlanModules = {};
  for (const module of MODULE_KEYS) {
    const planEnabled = planModules[module] === true;
    const override = tenantOverride[module];
    // El override del tenant solo puede apagar modulos del plan, no encender extras.
    resolved[module] = planEnabled && (typeof override === 'boolean' ? override : true);
  }

  if (tenant.status !== 'TRIAL' && tenant.plan === 'ENTERPRISE') {
    for (const module of MODULE_KEYS) resolved[module] = true;
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
