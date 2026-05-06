'use client';

/**
 * ThemeContext — sistema de temas visual para BarberPro.
 * Persiste en localStorage ('barber-theme-id').
 * Aplica variables CSS HSL al :root en cada cambio.
 *
 * Anti-FOUC: el estado inicial se lee sincrónicamente desde localStorage
 * (lazy initializer del useState). El inline script en layout.tsx aplica
 * las vars antes de que React hidrate, y este contexto queda sincronizado
 * desde el primer render — sin flash ni doble aplicación visible.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  BARBER_THEMES,
  DEFAULT_THEME_ID,
  applyBarberTheme,
  getThemeById,
  type BarberTheme,
} from '@/config/barber-themes';

const STORAGE_KEY = 'barber-theme-id';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme:     BarberTheme;
  themeId:   string;
  allThemes: BarberTheme[];
  setTheme:  (id: string) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  /**
   * Inicialización lazy: lee localStorage en el primer render del cliente.
   * Evita el FOUC porque el themeId correcto está disponible desde el inicio,
   * sin necesidad de un useEffect que cambie el estado después del mount.
   * En el servidor (SSR) typeof window === 'undefined', se usa el default.
   */
  const [themeId, setThemeId] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME_ID;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && BARBER_THEMES.some(t => t.id === saved)) return saved;
    } catch {
      // localStorage no disponible
    }
    return DEFAULT_THEME_ID;
  });

  // Aplica CSS vars al :root cada vez que cambia el tema.
  // En el primer mount aplica el mismo tema que el inline script ya fijó,
  // por lo que no hay cambio visual perceptible.
  useEffect(() => {
    const theme = getThemeById(themeId);
    applyBarberTheme(theme);
  }, [themeId]);

  const setTheme = useCallback((id: string) => {
    setThemeId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // silencioso
    }
  }, []);

  const theme = useMemo(() => getThemeById(themeId), [themeId]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, themeId, allThemes: BARBER_THEMES, setTheme }),
    [theme, themeId, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBarberTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useBarberTheme debe usarse dentro de <ThemeProvider>');
  }
  return ctx;
}
