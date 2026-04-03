/**
 * unidades.service.ts — Catálogo de unidades de medida por tenant.
 * Cada tenant puede crear sus propias unidades ("Onza", "Vaso", "Cucharada").
 */

import { prisma } from '@/lib/prisma'

// ── Tipos ────────────────────────────────────────────────────────────────────

export type UnidadInput = {
  nombre: string
  simbolo?: string | null
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function listUnidades(tenantId: number) {
  return prisma.barberUnidadMedida.findMany({
    where: { tenantId, activa: true },
    orderBy: { nombre: 'asc' },
  })
}

export async function listAllUnidades(tenantId: number) {
  return prisma.barberUnidadMedida.findMany({
    where: { tenantId },
    orderBy: { nombre: 'asc' },
  })
}

export async function getUnidadById(tenantId: number, id: number) {
  return prisma.barberUnidadMedida.findFirst({
    where: { id, tenantId },
  })
}

export async function createUnidad(tenantId: number, data: UnidadInput) {
  return prisma.barberUnidadMedida.create({
    data: {
      tenantId,
      nombre:  data.nombre.trim(),
      simbolo: data.simbolo?.trim() || null,
    },
  })
}

export async function updateUnidad(tenantId: number, id: number, data: UnidadInput) {
  const existing = await prisma.barberUnidadMedida.findFirst({ where: { id, tenantId } })
  if (!existing) throw new Error('Unidad no encontrada')
  return prisma.barberUnidadMedida.update({
    where: { id },
    data: {
      nombre:  data.nombre.trim(),
      simbolo: data.simbolo?.trim() || null,
    },
  })
}

export async function deleteUnidad(tenantId: number, id: number) {
  const existing = await prisma.barberUnidadMedida.findFirst({ where: { id, tenantId } })
  if (!existing) throw new Error('Unidad no encontrada')

  // Verificar que ningún producto activo la use
  const enUso = await prisma.barberProducto.count({
    where: { unidadVentaId: id, activo: true },
  })
  if (enUso > 0) {
    throw new Error(`Esta unidad está en uso por ${enUso} producto(s). Desactiva o edita esos productos primero.`)
  }

  // Desactivar en lugar de eliminar (soft delete)
  return prisma.barberUnidadMedida.update({
    where: { id },
    data: { activa: false },
  })
}
