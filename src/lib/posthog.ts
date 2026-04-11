import { PostHog } from 'posthog-node';

let _client: PostHog | null = null;

function getClient(): PostHog | null {
  const key  = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  if (!key) return null;

  if (!_client) {
    _client = new PostHog(key, {
      host,
      flushAt:       1, // Flush inmediato — necesario en Vercel serverless
      flushInterval: 0,
    });
  }
  return _client;
}

/**
 * Registra un evento de negocio server-side.
 * El distinctId combina tenantId + userId para evitar colisiones entre tenants.
 */
export function captureServerEvent(
  tenantId: string,
  userId:   string,
  event:    string,
  properties?: Record<string, unknown>,
) {
  getClient()?.capture({
    distinctId: `${tenantId}:${userId}`,
    event,
    properties: { tenantId, ...properties },
  });
}
