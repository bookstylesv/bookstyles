import { prisma } from '@/lib/prisma';
import LoginClient from './LoginClient';

const DEFAULT_BRANDING = {
  brandName: 'BookStyles',
  tagline: 'Sistema de gestión para barberías',
  features: [
    { title: 'Gestión de Citas', description: 'Agenda online en tiempo real' },
    { title: 'Reportes y Caja', description: 'Control financiero completo' },
    { title: 'Gestión de Clientes', description: 'Historial y fidelización' },
  ],
};

async function getBranding() {
  try {
    const config = await prisma.barberGlobalConfig.findUnique({ where: { id: 1 } });
    if (!config) return DEFAULT_BRANDING;
    const raw = config.features;
    const features = Array.isArray(raw)
      ? (raw as { title: string; description: string }[])
      : typeof raw === 'string'
        ? (JSON.parse(raw) as { title: string; description: string }[])
        : DEFAULT_BRANDING.features;
    return {
      brandName: config.brandName || DEFAULT_BRANDING.brandName,
      tagline: config.tagline || DEFAULT_BRANDING.tagline,
      features,
    };
  } catch {
    return DEFAULT_BRANDING;
  }
}

export default async function LoginPage() {
  const branding = await getBranding();
  return <LoginClient initialBranding={branding} />;
}
