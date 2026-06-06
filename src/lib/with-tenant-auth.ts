/**
 * with-tenant-auth.ts — Centralized tenant isolation wrapper for API routes.
 *
 * Guarantees:
 * 1. User is authenticated (JWT verified)
 * 2. tenantId is always injected (no dev discipline needed)
 * 3. branchId is validated against JWT (prevents fabrication)
 * 4. moduleAccess is revalidated server-side against plan limits
 *
 * Usage:
 *   export const GET = withTenantAuth(async (req, ctx) => {
 *     const data = await myService.list(ctx.tenantId, ctx.branchId);
 *     return ok(data);
 *   });
 */

import { NextRequest } from 'next/server';
import { getCurrentUser, type JwtPayload } from '@/lib/auth';
import { getPlanLimits, moduleAccessFromPlanModules } from '@/lib/plan-guard';
import { apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';

export type TenantContext = {
  /** Authenticated user payload from JWT */
  user: JwtPayload;
  /** Guaranteed tenant ID — always present */
  tenantId: number;
  /** User's branch ID from JWT (null = consolidated view for OWNER/SUPERADMIN) */
  branchId: number | null;
  /** Branch slug from JWT */
  branchSlug: string | null;
  /** Server-validated module access list */
  moduleAccess: string[];
};

type RouteHandler = (
  req: NextRequest,
  ctx: TenantContext,
  params?: any,
) => Promise<Response>;

interface WithTenantAuthOptions {
  /** Roles allowed to access this endpoint. Default: all ERP roles */
  allowedRoles?: string[];
  /** Required module key. Rejects if user doesn't have access */
  requiredModule?: string;
  /** If true, validates that requested branchId matches user's JWT branchId */
  enforceBranch?: boolean;
}

/**
 * Wraps an API route handler with centralized tenant isolation.
 * Extracts and validates user, tenantId, branchId, and moduleAccess.
 */
export function withTenantAuth(handler: RouteHandler, options?: WithTenantAuthOptions) {
  return async (req: NextRequest, routeCtx?: any) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new UnauthorizedError();

      // Block non-ERP roles
      if (user.role === 'CLIENT' || user.role === 'BARBER') {
        throw new ForbiddenError('Rol sin acceso al ERP');
      }

      // Check allowed roles if specified
      if (options?.allowedRoles && !options.allowedRoles.includes(user.role)) {
        throw new ForbiddenError('Rol no autorizado para esta operación');
      }

      // Revalidate moduleAccess server-side against plan limits
      const limits = await getPlanLimits(user.tenantId);
      const planModules = moduleAccessFromPlanModules(limits.modules);

      let validatedModuleAccess: string[];
      if (user.role === 'SUPERADMIN') {
        validatedModuleAccess = planModules;
      } else if (user.role === 'GERENTE' || user.role === 'USERS') {
        const assigned = Array.isArray(user.moduleAccess) ? user.moduleAccess : [];
        validatedModuleAccess = assigned.filter(m => planModules.includes(m));
      } else {
        // OWNER — limited modules
        validatedModuleAccess = [];
      }

      // Check required module
      if (options?.requiredModule) {
        const hasAccess =
          user.role === 'SUPERADMIN' ||
          (user.role === 'OWNER' && ['branches', 'settings', 'metas'].includes(options.requiredModule)) ||
          validatedModuleAccess.includes(options.requiredModule);
        if (!hasAccess) {
          throw new ForbiddenError('No tienes acceso a este módulo');
        }
      }

      // Validate branchId if enforcement enabled
      if (options?.enforceBranch && user.branchId !== null) {
        const requestedBranchId = req.nextUrl.searchParams.get('branchId');
        if (requestedBranchId && Number(requestedBranchId) !== user.branchId) {
          throw new ForbiddenError('No tienes acceso a esta sucursal');
        }
      }

      const ctx: TenantContext = {
        user,
        tenantId: user.tenantId,
        branchId: user.branchId,
        branchSlug: user.branchSlug,
        moduleAccess: validatedModuleAccess,
      };

      return await handler(req, ctx, routeCtx);
    } catch (err) {
      return apiError(err);
    }
  };
}
