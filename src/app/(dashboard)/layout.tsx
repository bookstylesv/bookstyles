/**
 * Dashboard layout — sidebar + contenido principal.
 * Colores exclusivamente via CSS variables.
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect }       from 'next/navigation';
import DashboardSidebar   from '@/components/layout/DashboardSidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'hsl(var(--bg-page))' }}>
      <DashboardSidebar role={user.role} slug={user.slug} name={user.name} />
      <main style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        {children}
      </main>
    </div>
  );
}
