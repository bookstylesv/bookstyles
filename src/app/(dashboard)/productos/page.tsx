/**
 * /productos — Catálogo de productos
 * Server Component: carga inicial y pasa datos al Client Component.
 * Solo OWNER. El stock/kardex se gestiona en /inventario.
 */

import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listProductos, listCategorias, getResumenInventario } from '@/modules/productos/productos.service'
import { listUnidades } from '@/modules/unidades/unidades.service'
import ProductosClient from '@/components/productos/ProductosClient'

export const dynamic = 'force-dynamic'

export default async function ProductosPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'OWNER') redirect('/dashboard')

  const [productosResult, categorias, resumen, unidades] = await Promise.all([
    listProductos(user.tenantId, { limit: '200' }),
    listCategorias(user.tenantId),
    getResumenInventario(user.tenantId),
    listUnidades(user.tenantId),
  ])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: 'hsl(var(--text-primary))',
          margin: '0 0 4px',
        }}>
          Productos
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))', margin: 0, fontSize: 14 }}>
          Catálogo de productos — precios, unidades y configuración de fracciones
        </p>
      </div>

      <ProductosClient
        initialProductos={productosResult.items}
        initialCategorias={categorias}
        initialResumen={resumen}
        initialUnidades={unidades}
      />
    </div>
  )
}
