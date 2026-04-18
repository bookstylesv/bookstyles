import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT = {
  brandName: 'BookStyles',
  tagline: 'Sistema de gestión para barberías',
  features: [
    { title: 'Gestión de Citas', description: 'Agenda online en tiempo real' },
    { title: 'Reportes y Caja', description: 'Control financiero completo' },
    { title: 'Gestión de Clientes', description: 'Historial y fidelización' },
  ],
};

function parseFeatures(raw: unknown): { title: string; description: string }[] {
  try {
    if (Array.isArray(raw)) return raw as { title: string; description: string }[];
    if (typeof raw === 'string') return JSON.parse(raw);
  } catch { /* usa default */ }
  return DEFAULT.features;
}

export async function GET() {
  try {
    const config = await prisma.barberGlobalConfig.findUnique({ where: { id: 1 } });
    if (!config) return NextResponse.json(DEFAULT);
    return NextResponse.json({
      brandName: config.brandName || DEFAULT.brandName,
      tagline: config.tagline || DEFAULT.tagline,
      features: parseFeatures(config.features),
    });
  } catch (err) {
    console.error('[public/branding] error:', err);
    return NextResponse.json(DEFAULT);
  }
}
