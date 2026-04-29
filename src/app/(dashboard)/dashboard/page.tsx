/**
 * Dashboard — Server Component.
 * OWNER      → vista ejecutiva (OwnerDashboardClient)
 * USUARIO sin módulos → aviso de configuración pendiente
 * Demás roles → dashboard operativo (DashboardClient)
 */

import { getCurrentUser }          from '@/lib/auth';
import { redirect }                from 'next/navigation';
import { getStats, getOwnerStats } from '@/modules/appointments/appointments.service';
import DashboardClient             from '@/components/dashboard/DashboardClient';
import OwnerDashboardClient        from '@/components/dashboard/OwnerDashboardClient';
import NoModulesNotice             from '@/components/dashboard/NoModulesNotice';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // OWNER → panel ejecutivo
  if (user.role === 'OWNER') {
    const ownerStats = await getOwnerStats(user.tenantId);
    return (
      <div style={{ maxWidth: 1200, width: '100%' }}>
        <OwnerDashboardClient stats={ownerStats} userName={user.name} />
      </div>
    );
  }

  // USUARIO sin módulos asignados → aviso
  if (user.role === 'USUARIO' && (!user.moduleAccess || user.moduleAccess.length === 0)) {
    return (
      <div style={{ maxWidth: 600, width: '100%', margin: '60px auto' }}>
        <NoModulesNotice userName={user.name} />
      </div>
    );
  }

  const stats = await getStats(user.tenantId);
  return (
    <div style={{ maxWidth: 1200, width: '100%' }}>
      <DashboardClient
        stats={stats}
        userName={user.name}
        userRole={user.role}
        tenantSlug={user.slug}
      />
    </div>
  );
}
