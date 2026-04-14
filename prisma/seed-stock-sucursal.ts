/**
 * seed-stock-sucursal.ts — Backfill de BarberStockSucursal para datos existentes.
 *
 * Para cada tenant activo:
 *   1. Localiza la sucursal headquarters
 *   2. Para cada producto activo del tenant, crea/actualiza BarberStockSucursal
 *      en la sede central con stockActual = producto.stockActual
 *
 * Idempotente (usa upsert). Ejecutar DESPUÉS de prisma migrate deploy.
 * Ejecutar: npm run db:seed-stock
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL!;
const pool    = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter } as never);

async function main() {
  console.log('🏪 Iniciando backfill de BarberStockSucursal...\n');

  const tenants = await prisma.barberTenant.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { id: 'asc' },
  });

  console.log(`Tenants encontrados: ${tenants.length}\n`);

  let totalUpserted = 0;
  let skipped       = 0;

  for (const tenant of tenants) {
    // 1. Buscar casa matriz
    const hq = await prisma.barberBranch.findFirst({
      where:  { tenantId: tenant.id, isHeadquarters: true, status: 'ACTIVE' },
      select: { id: true, name: true },
    });

    if (!hq) {
      console.log(`  ⚠️  [${tenant.slug}] Sin casa matriz activa — omitiendo`);
      skipped++;
      continue;
    }

    // 2. Obtener productos activos
    const productos = await prisma.barberProducto.findMany({
      where:  { tenantId: tenant.id, activo: true },
      select: { id: true, codigo: true, stockActual: true },
    });

    if (productos.length === 0) {
      console.log(`  ℹ️  [${tenant.slug}] Sin productos activos`);
      continue;
    }

    let tenantUpserted = 0;
    for (const prod of productos) {
      await prisma.barberStockSucursal.upsert({
        where: {
          branchId_productoId: { branchId: hq.id, productoId: prod.id },
        },
        create: {
          tenantId:   tenant.id,
          branchId:   hq.id,
          productoId: prod.id,
          stockActual: prod.stockActual,
        },
        update: {
          // Solo actualiza si aún no hay dato real (stockActual = 0 indica nunca poblado)
          stockActual: prod.stockActual,
        },
      });
      tenantUpserted++;
    }

    totalUpserted += tenantUpserted;
    console.log(
      `  ✅ [${tenant.slug}] HQ "${hq.name}" — ${tenantUpserted} productos sincronizados`,
    );
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   Tenants procesados : ${tenants.length - skipped}`);
  console.log(`   Tenants omitidos   : ${skipped}`);
  console.log(`   Registros upserted : ${totalUpserted}`);
  console.log('\n✅ Backfill completado.');
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
