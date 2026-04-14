/**
 * Dashboard layout — sidebar + contenido principal.
 * Colores exclusivamente via CSS variables.
 */

import { getCurrentUser } from '@/lib/auth';
import { getPlanLimits }  from '@/lib/plan-guard';
import { redirect }       from 'next/navigation';
import DashboardSidebar   from '@/components/layout/DashboardSidebar';
import AntdProvider       from '@/components/shared/AntdProvider';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { modules } = await getPlanLimits(user.tenantId);

  return (
    <AntdProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'hsl(var(--bg-page))' }}>
        <DashboardSidebar role={user.role} slug={user.slug} name={user.name} enabledModules={modules} />
        <main style={{ flex: 1, overflow: 'auto', minWidth: 0, padding: 'clamp(12px, 3vw, 24px) clamp(12px, 3vw, 32px)' }}>
          {children}
        </main>
      </div>
    </AntdProvider>
  );
}
