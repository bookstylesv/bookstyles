/**
 * branches.service.ts — Lógica de negocio para sucursales.
 * Valida límites del plan antes de crear.
 */

import * as repo from './branches.repository';
import { checkBranchLimit } from '@/lib/plan-guard';
import { ForbiddenError, NotFoundError, ConflictError } from '@/lib/errors';
import type { BranchCreateInput, BranchUpdateInput } from './branches.repository';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const branchesService = {
  async listBranches(tenantId: number) {
    return repo.findAllBranches(tenantId);
  },

  async listActiveBranches(tenantId: number) {
    return repo.findActiveBranches(tenantId);
  },

  async getBranch(id: number, tenantId: number) {
    const branch = await repo.findBranchById(id, tenantId);
    if (!branch) throw new NotFoundError('Sucursal');
    return branch;
  },

  async createBranch(tenantId: number, data: Omit<BranchCreateInput, 'slug'> & { slug?: string }) {
    // Verificar límite del plan
    const limit = await checkBranchLimit(tenantId);
    if (!limit.allowed) {
      throw new ForbiddenError(
        `Tu plan permite máximo ${limit.max} sucursal(es). Actualmente tienes ${limit.current}.`,
      );
    }

    // Generar slug si no viene
    const slug = data.slug ? slugify(data.slug) : slugify(data.name);

    // Verificar unicidad del slug en el tenant
    const existing = await repo.findBranchBySlug(slug, tenantId);
    if (existing) throw new ConflictError('Ya existe una sucursal con ese nombre (slug duplicado)');

    return repo.createBranch(tenantId, { ...data, slug });
  },

  async updateBranch(id: number, tenantId: number, data: BranchUpdateInput) {
    const branch = await repo.findBranchById(id, tenantId);
    if (!branch) throw new NotFoundError('Sucursal');
    return repo.updateBranch(id, tenantId, data);
  },

  async deleteBranch(id: number, tenantId: number) {
    const branch = await repo.findBranchById(id, tenantId);
    if (!branch) throw new NotFoundError('Sucursal');

    // No se puede eliminar la casa matriz
    if (branch.isHeadquarters) {
      throw new ForbiddenError('No se puede eliminar la sucursal principal (casa matriz)');
    }

    // No se puede eliminar si tiene datos asociados
    const hasData = await repo.hasBranchData(id, tenantId);
    if (hasData) {
      throw new ForbiddenError(
        'No se puede eliminar una sucursal con citas, ventas o gastos registrados. Desactívala en su lugar.',
      );
    }

    return repo.deleteBranch(id, tenantId);
  },

  async deactivateBranch(id: number, tenantId: number) {
    const branch = await repo.findBranchById(id, tenantId);
    if (!branch) throw new NotFoundError('Sucursal');
    if (branch.isHeadquarters) throw new ForbiddenError('No se puede desactivar la sucursal principal');
    return repo.updateBranch(id, tenantId, { status: 'INACTIVE' });
  },

  async assignBarber(branchId: number, tenantId: number, barberId: number, isPrimary = false) {
    const branch = await repo.findBranchById(branchId, tenantId);
    if (!branch) throw new NotFoundError('Sucursal');
    return repo.assignBarberToBranch(branchId, barberId, isPrimary);
  },

  async removeBarber(branchId: number, tenantId: number, barberId: number) {
    const branch = await repo.findBranchById(branchId, tenantId);
    if (!branch) throw new NotFoundError('Sucursal');
    return repo.removeBarberFromBranch(branchId, barberId);
  },

  async getBarbersForBranch(branchId: number, tenantId: number) {
    const branch = await repo.findBranchById(branchId, tenantId);
    if (!branch) throw new NotFoundError('Sucursal');
    return repo.getBarbersForBranch(branchId);
  },
};
