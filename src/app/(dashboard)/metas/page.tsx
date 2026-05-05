import { getCurrentUser } from '@/lib/auth';
import { redirect }       from 'next/navigation';
import MetasClient        from '@/components/metas/MetasClient';

export const metadata = { title: 'Metas | BookStyles' };

export default async function MetasPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const allowed = ['OWNER', 'SUPERADMIN', 'GERENTE'];
  if (!allowed.includes(user.role)) redirect('/dashboard');

  return (
    <MetasClient
      role={user.role}
      branchId={user.branchId ?? null}
      tenantId={user.tenantId}
    />
  );
}
