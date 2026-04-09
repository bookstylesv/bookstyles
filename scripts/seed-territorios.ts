import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { DEPARTAMENTOS, MUNICIPIOS } from '../src/lib/catalogs/mh-catalog';

const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

async function main() {
  console.log('Limpiando catálogo anterior...');
  await prisma.barberMunicipio.deleteMany({});
  await prisma.barberDepartamento.deleteMany({});
  console.log('  ✓ Registros anteriores eliminados');

  console.log('Cargando departamentos (CAT-012 V1.2)...');
  for (const d of DEPARTAMENTOS) {
    await prisma.barberDepartamento.create({
      data: { codigo: d.codigo, nombre: d.nombre },
    });
  }
  const totalD = await prisma.barberDepartamento.count();
  console.log(`  ✓ ${totalD} departamentos`);

  console.log('Cargando municipios (CAT-013 V1.2 — 44 municipios vigentes)...');
  for (const m of MUNICIPIOS) {
    await prisma.barberMunicipio.create({
      data: { codigo: m.codigo, nombre: m.nombre, departamentoCod: m.departamentoCod },
    });
  }
  const totalM = await prisma.barberMunicipio.count();
  console.log(`  ✓ ${totalM} municipios/distritos`);

  console.log('\nCatálogo MH V1.2 cargado correctamente.');
  console.log('Los 44 nuevos municipios están vigentes desde el 01/11/2024.');
}

main()
  .then(() => { pool.end(); })
  .catch(e => { console.error(e); pool.end(); process.exit(1); });
