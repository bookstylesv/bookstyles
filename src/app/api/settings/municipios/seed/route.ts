/**
 * POST /api/settings/municipios/seed
 * Carga los catálogos oficiales MH (CAT-012/013) usando Prisma upsert.
 * Idempotente — se puede ejecutar múltiples veces sin duplicar.
 * Solo accesible para OWNER.
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { DEPARTAMENTOS, MUNICIPIOS } from '@/lib/catalogs/mh-catalog';

export async function POST(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'OWNER') throw new ForbiddenError();

    // Limpiar catálogo anterior (los códigos cambiaron en V1.2)
    await prisma.barberMunicipio.deleteMany({});
    await prisma.barberDepartamento.deleteMany({});

    // Insertar departamentos CAT-012
    for (const depto of DEPARTAMENTOS) {
      await prisma.barberDepartamento.create({
        data: { codigo: depto.codigo, nombre: depto.nombre },
      });
    }

    // Insertar municipios CAT-013 V1.2
    for (const mun of MUNICIPIOS) {
      await prisma.barberMunicipio.create({
        data: { codigo: mun.codigo, nombre: mun.nombre, departamentoCod: mun.departamentoCod },
      });
    }

    const totalDeptos = await prisma.barberDepartamento.count();
    const totalMunis  = await prisma.barberMunicipio.count();

    return ok({ departamentos: totalDeptos, municipios: totalMunis });
  } catch (err) {
    return apiError(err);
  }
}
