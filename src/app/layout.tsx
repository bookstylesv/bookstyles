import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title:       'Speeddan Barbería',
  description: 'Sistema de gestión profesional para barberías y salones',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.variable}>
        {children}
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
