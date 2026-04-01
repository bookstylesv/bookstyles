import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/modules/auth/auth.service';
import { clearAuthCookies, getRefreshTokenFromCookie } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const refreshToken = await getRefreshTokenFromCookie();
    if (refreshToken) await authService.logout(refreshToken);
    await clearAuthCookies();

    const acceptsHtml = req.headers.get('accept')?.includes('text/html');
    const isNavigation = req.headers.get('sec-fetch-dest') === 'document';

    if (acceptsHtml || isNavigation) {
      return NextResponse.redirect(new URL('/login', req.url), {
        status: 303,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    return ok({ message: 'Sesion cerrada' });
  } catch (err) {
    return apiError(err);
  }
}
