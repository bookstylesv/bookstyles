/**
 * login-rate-limit.ts — Rate limiting para intentos de login fallidos.
 *
 * Estrategia: tabla barber_login_attempts en BD (persiste entre instancias serverless).
 * Ventana: 15 min — máx 10 intentos fallidos por IP + slug de tenant.
 * Login exitoso limpia el historial de esa IP+slug.
 */

import { prisma } from '@/lib/prisma';

const WINDOW_MS  = 15 * 60 * 1000; // 15 minutos
const MAX_FAILED = 10;

export async function checkLoginRateLimit(ip: string, slug: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const count = await prisma.barberLoginAttempt.count({
    where: { ip, slug, failedAt: { gte: since } },
  });
  return count < MAX_FAILED;
}

export async function recordFailedAttempt(ip: string, slug: string): Promise<void> {
  await prisma.barberLoginAttempt.create({ data: { ip, slug } });
}

export async function clearFailedAttempts(ip: string, slug: string): Promise<void> {
  await prisma.barberLoginAttempt.deleteMany({ where: { ip, slug } });
}
