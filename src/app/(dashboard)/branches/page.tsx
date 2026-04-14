/**
 * /branches — Gestión de sucursales (solo OWNER).
 * Server Component shell; el CRUD interactivo vive en BranchesClient.
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { branchesService } from '@/modules/branches/branches.service';
import { getPlanLimits } from '@/lib/plan-guard';
import BranchesClient from './BranchesClient';

export default async function BranchesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'OWNER') redirect('/dashboard');

  const [branches, limits] = await Promise.all([
    branchesService.listBranches(user.tenantId),
    getPlanLimits(user.tenantId),
  ]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--text-primary))', margin: '0 0 4px' }}>
          Sucursales
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))', margin: 0, fontSize: 14 }}>
          Gestiona las sedes de tu negocio · {branches.length}/{limits.maxBranches} sucursales
        </p>
      </div>
      <BranchesClient
        initialBranches={branches}
        maxBranches={limits.maxBranches}
        currentBranchId={user.branchId}
      />
    </div>
  );
}
