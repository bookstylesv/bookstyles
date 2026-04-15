/**
 * POST /api/auth/login
 * Autenticación en 2 pasos: ya llegó con el slug del tenant.
 * Rate limiting por IP+slug persiste en BD (compatible con serverless).
 * Máx 10 intentos fallidos por IP+slug en ventana de 15 min.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authService }  from '@/modules/auth/auth.service';
import { setAuthCookies } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import {
  checkLoginRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
} from '@/lib/login-rate-limit';

const loginSchema = z.object({
  email:    z.string().min(3, 'Usuario requerido').toLowerCase(),
  password: z.string().min(1, 'Contraseña requerida'),
  slug:     z.string().min(1, 'Código de empresa requerido').toLowerCase(),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return apiError({ statusCode: 422, code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } as any);
    }

    const ip   = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
              ?? req.headers.get('x-real-ip')
              ?? 'unknown';
    const ua   = req.headers.get('user-agent') ?? undefined;
    const slug = parsed.data.slug;

    // ── Rate limit: bloquear IP+slug con demasiados intentos fallidos ──
    const allowed = await checkLoginRateLimit(ip, slug);
    if (!allowed) {
      return apiError({ statusCode: 429, code: 'RATE_LIMIT', message: 'Demasiados intentos fallidos. Espera 15 minutos.' } as any);
    }

    let result;
    try {
      result = await authService.login(parsed.data.email, parsed.data.password, slug, { ip, ua });
    } catch (err) {
      // Registrar intento fallido (credenciales inválidas, tenant no existe, etc.)
      await recordFailedAttempt(ip, slug);
      throw err;
    }

    // Login exitoso — limpiar historial de intentos
    await clearFailedAttempts(ip, slug);
    await setAuthCookies(result.accessToken, result.refreshToken);

    return ok({ user: result.user });
  } catch (err) {
    return apiError(err);
  }
}
