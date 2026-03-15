/**
 * /barbers — Lista de barberos (Server Component).
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listBarbers } from '@/modules/barbers/barbers.service';
import BarbersClient from './BarbersClient';

export default async function BarbersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const barbers = await listBarbers(user.tenantId);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--text-primary))', margin: '0 0 4px' }}>
          Barberos
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))', margin: 0, fontSize: 14 }}>
          Perfiles y horarios del equipo
        </p>
      </div>
      <BarbersClient initialBarbers={barbers} />
    </div>
  );
}
