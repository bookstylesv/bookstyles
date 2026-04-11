import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn:         process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // 10% de transacciones capturadas — conserva el free tier (5k errores/mes)
  tracesSampleRate: 0.1,

  // Replays desactivados — PostHog cubre sesiones de usuario
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Solo activo en producción para no contaminar con errores de dev
  enabled: process.env.NODE_ENV === 'production',
});
