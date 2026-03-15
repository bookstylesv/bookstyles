/**
 * /services — Página de gestión de servicios (Server Component shell).
 * Carga la lista inicial en el servidor; el CRUD interactivo vive en ServicesClient.
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listServices } from '@/modules/services/services.service';
import ServicesClient from './ServicesClient';

export default async function ServicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const services = await listServices(user.tenantId);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--text-primary))', margin: '0 0 4px' }}>
          Servicios
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))', margin: 0, fontSize: 14 }}>
          Gestiona los servicios que ofrece tu barbería
        </p>
      </div>
      <ServicesClient initialServices={services} />
    </div>
  );
}
