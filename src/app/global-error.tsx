'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: 12 }}>Algo salió mal</h2>
          <button
            onClick={reset}
            style={{ padding: '8px 20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #ccc' }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
