import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';
import { PostHogProvider } from '@/providers/PostHogProvider';
import { BARBER_THEMES, DEFAULT_THEME_ID } from '@/config/barber-themes';
import '@/app/globals.css';

const inter     = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair  = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title:       'Speeddan Barbería',
  description: 'Sistema de gestión profesional para barberías y salones',
};

/**
 * Script anti-FOUC generado dinámicamente desde BARBER_THEMES.
 * Se ejecuta sincrónicamente antes de que el navegador pinte cualquier pixel.
 * Al generarlo desde la misma fuente de verdad (barber-themes.ts) siempre
 * estará en sincronía con los temas disponibles — sin mantenimiento manual.
 */
const themeMap = Object.fromEntries(BARBER_THEMES.map(t => [t.id, t.vars]));
const THEME_INIT_SCRIPT = `(function(){try{
var T=${JSON.stringify(themeMap)};
var id=localStorage.getItem('barber-theme-id')||'${DEFAULT_THEME_ID}';
var v=T[id]||T['${DEFAULT_THEME_ID}'];
var r=document.documentElement;
r.setAttribute('data-theme',id);
for(var k in v){r.style.setProperty(k,v[k]);}
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Bloquea el render hasta aplicar el tema correcto → elimina FOUC */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${inter.variable} ${playfair.variable}`}>
        <PostHogProvider>
          {children}
        </PostHogProvider>
        <Analytics />
        <Toaster
          position="top-right"
          expand={false}
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: 'var(--font-inter, Inter, sans-serif)',
              fontSize: '13.5px',
              borderRadius: '10px',
              border: '1px solid hsl(246 8% 88%)',
              boxShadow: '0 4px 24px rgba(93,100,116,0.14), 0 1px 4px rgba(93,100,116,0.08)',
            },
            classNames: {
              toast:       'speeddan-toast',
              success:     'speeddan-toast--success',
              error:       'speeddan-toast--error',
              warning:     'speeddan-toast--warning',
              info:        'speeddan-toast--info',
              loading:     'speeddan-toast--loading',
            },
          }}
        />
      </body>
    </html>
  );
}
