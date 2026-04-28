/**
 * auth.service.ts — Lógica de autenticación.
 * Responsabilidad única: autenticar usuarios y gestionar tokens.
 */

import bcrypt from 'bcryptjs';
import { authRepository } from './auth.repository';
import { tenantsRepository } from '@/modules/tenants/tenants.repository';
import { signAccessToken, signRefreshToken, resolveBranchForLogin } from '@/lib/auth';
import { UnauthorizedError, NotFoundError, TenantSuspendedError } from '@/lib/errors';

export const authService = {
  async login(email: string, password: string, tenantSlug: string, meta?: { ip?: string; ua?: string }) {
    // 1. Verificar tenant
    const tenant = await tenantsRepository.findBySlug(tenantSlug);
    if (!tenant)                              throw new NotFoundError('Empresa');
    if (tenant.status === 'SUSPENDED')        throw new TenantSuspendedError();
    if (tenant.status === 'CANCELLED')        throw new TenantSuspendedError();

    // 2. Verificar usuario
    const user = await authRepository.findUserByEmail(email.toLowerCase(), tenant.id);
    if (!user || !user.active)                throw new UnauthorizedError('Credenciales inválidas');

    // 3. Bloquear roles sin acceso al ERP
    if (user.role === 'CLIENT') {
      throw new UnauthorizedError('Este portal es exclusivo para el equipo administrativo');
    }

    // 4. Verificar contraseña
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)                               throw new UnauthorizedError('Credenciales inválidas');

    // 5. Resolver sucursal activa según el rol del usuario
    const { branchId, branchSlug } = await resolveBranchForLogin(user.id, tenant.id, user.role);

    // 6. Obtener módulos asignados (solo para rol USUARIO)
    const moduleAccess = user.role === 'USUARIO'
      ? (Array.isArray(user.moduleAccess) ? user.moduleAccess as string[] : null)
      : null;

    // 7. Generar tokens
    const payload = {
      sub:          String(user.id),
      tenantId:     tenant.id,
      role:         user.role,
      slug:         tenant.slug,
      name:         user.fullName,
      branchId,
      branchSlug,
      moduleAccess,
    };
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(payload),
      signRefreshToken(user.id),
    ]);

    // 6. Persistir sesión (refresh token)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepository.createSession({
      userId:       user.id,
      tenantId:     tenant.id,
      refreshToken,
      expiresAt,
      ipAddress:    meta?.ip,
      userAgent:    meta?.ua,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id:       user.id,
        fullName: user.fullName,
        email:    user.email,
        role:     user.role,
        tenantId: tenant.id,
        slug:     tenant.slug,
      },
    };
  },

  async logout(refreshToken: string) {
    await authRepository.deleteSession(refreshToken);
  },

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  },
};
