/**
 * Dashboard — Server Component.
 * OWNER      → vista ejecutiva con tabs y filtro mes/año (OwnerDashboardClient)
 * USUARIO sin módulos → aviso de configuración pendiente
 * Demás roles → dashboard operativo (DashboardClient)
 */

import { Suspense }                    from 'react';
import { getCurrentUser }              from '@/lib/auth';
import { redirect }                    from 'next/navigation';
import { getStats, getOwnerStats }     from '@/modules/appointments/appointments.service';
import { getOwnerExtendedStats }        from '@/modules/owner/owner.service';
import DashboardClient                 from '@/components/dashboard/DashboardClient';
import OwnerDashboardClient            from '@/components/dashboard/OwnerDashboardClient';
import NoModulesNotice                 from '@/components/dashboard/NoModulesNotice';

type SearchParams = Promise<{ tab?: string; mes?: string; anio?: string }>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // OWNER → panel ejecutivo con filtro mes/año
  if (user.role === 'OWNER') {
    const { mes: mesParam, anio: anioParam } = await searchParams;
    const now   = new Date();
    const mes   = mesParam  ? parseInt(mesParam,  10) : now.getMonth() + 1;
    const anio  = anioParam ? parseInt(anioParam, 10) : now.getFullYear();
    const mesNum   = Math.max(1, Math.min(12, mes));
    const anioNum  = Math.max(2020, Math.min(now.getFullYear() + 1, anio));

    const [ownerStats, extendedStats] = await Promise.all([
      getOwnerStats(user.tenantId, mesNum, anioNum),
      getOwnerExtendedStats(user.tenantId, mesNum, anioNum),
    ]);

    return (
      <div style={{ maxWidth: 1300, width: '100%' }}>
        <Suspense>
          <OwnerDashboardClient
            stats={ownerStats}
            extendedStats={extendedStats}
            userName={user.name}
            mesFiltro={mesNum}
            anioFiltro={anioNum}
          />
        </Suspense>
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
