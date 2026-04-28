/**
 * prisma.ts — Singleton de PrismaClient con @prisma/adapter-pg.
 * Usa el driver pg (PostgreSQL estándar TCP) para compatibilidad
 * universal: Vercel Node.js Lambda, local dev, scripts de seed.
 * Neon PostgreSQL acepta conexiones TCP estándar sin WebSocket.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL no configurado');
  }

  const pool    = new Pool({ connectionString, max: 10 });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development'
      ? ['error', 'warn']
      : ['error'],
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
let prismaClient: PrismaClient | undefined = globalForPrisma.prisma;

function getPrismaClient() {
  if (!prismaClient) {
    prismaClient = createPrismaClient();

    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prismaClient;
    }
  }

  return prismaClient;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
