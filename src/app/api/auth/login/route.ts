/**
 * POST /api/auth/login
 * Autenticación en 2 pasos: ya llegó con el slug del tenant.
 * Rate limiting básico por IP (TODO: mejorar con Redis).
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authService }  from '@/modules/auth/auth.service';
import { setAuthCookies } from '@/lib/auth';
import { ok, apiError, created } from '@/lib/response';

const loginSchema = z.object({
  email:    z.string().email('Email inválido').toLowerCase(),
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

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    const ua = req.headers.get('user-agent') ?? undefined;

    const result = await authService.login(
      parsed.data.email,
      parsed.data.password,
      parsed.data.slug,
      { ip, ua },
    );

    await setAuthCookies(result.accessToken, result.refreshToken);

    return ok({ user: result.user });
  } catch (err) {
    return apiError(err);
  }
}
