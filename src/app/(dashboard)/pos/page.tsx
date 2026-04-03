import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PosClient from '@/components/pos/PosClient'

export const dynamic = 'force-dynamic'

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ appointmentId?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'OWNER' && user.role !== 'BARBER') redirect('/dashboard')

  const { appointmentId } = await searchParams
  const preloadAppointmentId = appointmentId ? Number(appointmentId) : undefined

  // Cargar barberos activos del tenant
  const barbers = await prisma.barber.findMany({
    where: { tenantId: user.tenantId, active: true },
    include: { user: { select: { fullName: true } } },
    orderBy: { user: { fullName: 'asc' } },
  })

  // Cargar servicios activos y productos activos en paralelo
  const [services, productosDB] = await Promise.all([
    prisma.barberService.findMany({
      where: { tenantId: user.tenantId, active: true },
      orderBy: [{ category: 'asc' }, { price: 'asc' }],
    }),
    prisma.barberProducto.findMany({
      where: { tenantId: user.tenantId, activo: true },
      include: {
        categoria: { select: { nombre: true } },
        unidadVenta: { select: { nombre: true, simbolo: true } },
      },
      orderBy: [{ nombre: 'asc' }],
    }),
  ])

  const barberos = barbers.map(b => ({ id: b.id, nombre: b.user.fullName }))
  const servicios = services.map(s => ({
    id: s.id,
    name: s.name,
    price: s.price.toNumber(),
    category: s.category || undefined,
  }))
  const productos = productosDB.map(p => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    precio: Number(p.precioVenta),
    stock: Number(p.stockActual),
    stockMinimo: Number(p.stockMinimo),
    categoria: p.categoria?.nombre ?? 'Sin categoría',
    unidad: p.unidadVenta?.nombre ?? p.unidadMedida,
    unidadCompra: p.unidadCompra,
    factorConversion: Number(p.factorConversion ?? 1),
    esFraccionable: Number(p.factorConversion ?? 1) > 1,
  }))

  return (
    <PosClient
      barberos={barberos}
      servicios={servicios}
      productos={productos}
      preloadAppointmentId={preloadAppointmentId}
    />
  )
}
