'use client';

import { useEffect } from 'react';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Auth Error]', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'hsl(175 60% 8%)',
        color: '#fff',
        fontFamily: 'sans-serif',
        gap: 16,
      }}
    >
      <div style={{ fontSize: 48 }}>⚠️</div>
      <h2 style={{ margin: 0, fontSize: 20 }}>Error al cargar el sistema</h2>
      <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
        {error.message || 'Ocurrió un problema inesperado'}
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: 8,
          padding: '10px 24px',
          background: '#0d9488',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Reintentar
      </button>
    </div>
  );
}
