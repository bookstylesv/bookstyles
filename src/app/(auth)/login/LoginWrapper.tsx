'use client';

/**
 * LoginWrapper — Client Component intermediario.
 * Resuelve el hydration mismatch sin usar ssr:false (que deja pantalla en blanco).
 *
 * Patrón "mounted": en SSR y en el primer render del cliente ambos retornan null
 * → React hidrata sin diferencias. Luego useEffect monta el UI real.
 *
 * Flujo de login:
 *  1. Pantalla neutral → usuario ingresa slug (clave de empresa)
 *  2. API verifica slug → detecta businessType (BARBERIA | SALON)
 *  3. Si SALON → tema salón de belleza (rosa/purpura)
 *     Si BARBERIA → tema barbería (teal/oscuro)
 *  4. Usuario ingresa credenciales con el tema correcto
 */

import { useEffect, useState } from 'react';
import LoginClient from './LoginClient';

type BrandingConfig = {
  brandName: string;
  tagline: string;
  features: { title: string; description: string }[];
};

export default function LoginWrapper({ initialBranding }: { initialBranding: BrandingConfig | null }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ambos (SSR y primer render cliente) retornan null → sin hydration mismatch
  if (!mounted) return null;

  return <LoginClient initialBranding={initialBranding} />;
}
