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

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [{ modules }, branches] = await Promise.all([
    getPlanLimits(user.tenantId),
    // Solo cargamos sucursales si el módulo está habilitado en el plan
    user.role === 'OWNER'
      ? findActiveBranches(user.tenantId)
      : Promise.resolve([]),
  ]);

  return (
    <AntdProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'hsl(var(--bg-page))' }}>
        <DashboardSidebar
          role={user.role}
          slug={user.slug}
          name={user.name}
          enabledModules={modules}
          branches={branches}
          currentBranchId={user.branchId}
        />
        <main style={{ flex: 1, overflow: 'auto', minWidth: 0, padding: 'clamp(12px, 3vw, 24px) clamp(12px, 3vw, 32px)' }}>
          {children}
        </main>
      </div>
    </AntdProvider>
  );
}
