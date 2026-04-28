/**
 * Dashboard layout — sidebar + contenido principal.
 * Colores exclusivamente via CSS variables.
 */

import { getCurrentUser }      from '@/lib/auth';
import { getPlanLimits }       from '@/lib/plan-guard';
import { findActiveBranches }  from '@/modules/branches/branches.repository';
import { redirect }            from 'next/navigation';
import DashboardSidebar        from '@/components/layout/DashboardSidebar';
import AntdProvider            from '@/components/shared/AntdProvider';
import { prisma }              from '@/lib/prisma';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const showBranches = user.role === 'OWNER' || user.role === 'SUPERADMIN';

  const [{ modules }, branches, globalConfig] = await Promise.all([
    getPlanLimits(user.tenantId),
    showBranches ? findActiveBranches(user.tenantId) : Promise.resolve([]),
    prisma.barberGlobalConfig.findUnique({ where: { id: 1 }, select: { brandName: true } }),
  ]);
  const brandName = globalConfig?.brandName || 'BookStyles';

  return (
    <AntdProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'hsl(var(--bg-page))' }}>
        <DashboardSidebar
          role={user.role}
          slug={user.slug}
          name={user.name}
          enabledModules={modules}
          userModuleAccess={user.moduleAccess}
          branches={branches}
          currentBranchId={user.branchId}
          brandName={brandName}
        />
        <main style={{ flex: 1, overflow: 'auto', minWidth: 0, padding: 'clamp(12px, 3vw, 24px) clamp(12px, 3vw, 32px)' }}>
          {children}
        </main>
      </div>
    </AntdProvider>
  );
}
