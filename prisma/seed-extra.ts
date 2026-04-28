/**
 * seed-extra.ts — Agrega 25 clientes, 10 barberos y más servicios al tenant demo.
 * NO borra datos existentes — sólo agrega.
 * Ejecutar: npx tsx prisma/seed-extra.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL!;
const pool    = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

// ─── Datos de clientes ────────────────────────────────────────────────────────

const clientesData = [
  { fullName: 'Alejandro Martínez',  email: 'alejandro.martinez@gmail.com',  phone: '+503 7001-0001' },
  { fullName: 'Bryan Hernández',     email: 'bryan.hernandez@gmail.com',      phone: '+503 7001-0002' },
  { fullName: 'Carlos Ramos',        email: 'carlos.ramos@gmail.com',         phone: '+503 7001-0003' },
  { fullName: 'David López',         email: 'david.lopez@gmail.com',          phone: '+503 7001-0004' },
  { fullName: 'Eduardo Salazar',     email: 'eduardo.salazar@gmail.com',      phone: '+503 7001-0005' },
  { fullName: 'Fernando García',     email: 'fernando.garcia@gmail.com',      phone: '+503 7001-0006' },
  { fullName: 'Giovanni Perez',      email: 'giovanni.perez@gmail.com',       phone: '+503 7001-0007' },
  { fullName: 'Héctor Mejía',        email: 'hector.mejia@gmail.com',         phone: '+503 7001-0008' },
  { fullName: 'Israel Romero',       email: 'israel.romero@gmail.com',        phone: '+503 7001-0009' },
  { fullName: 'José Alfaro',         email: 'jose.alfaro@gmail.com',          phone: '+503 7001-0010' },
  { fullName: 'Kevin Castro',        email: 'kevin.castro@gmail.com',         phone: '+503 7001-0011' },
  { fullName: 'Luis Flores',         email: 'luis.flores@gmail.com',          phone: '+503 7001-0012' },
  { fullName: 'Miguel Ángel Torres', email: 'miguel.torres@gmail.com',        phone: '+503 7001-0013' },
  { fullName: 'Nelson Guardado',     email: 'nelson.guardado@gmail.com',      phone: '+503 7001-0014' },
  { fullName: 'Oscar Reyes',         email: 'oscar.reyes@gmail.com',          phone: '+503 7001-0015' },
  { fullName: 'Pablo Montes',        email: 'pablo.montes@gmail.com',         phone: '+503 7001-0016' },
  { fullName: 'Raúl Quintanilla',    email: 'raul.quintanilla@gmail.com',     phone: '+503 7001-0017' },
  { fullName: 'Samuel Aguilar',      email: 'samuel.aguilar@gmail.com',       phone: '+503 7001-0018' },
  { fullName: 'Tomás Velásquez',     email: 'tomas.velasquez@gmail.com',      phone: '+503 7001-0019' },
  { fullName: 'Ulises Bonilla',      email: 'ulises.bonilla@gmail.com',       phone: '+503 7001-0020' },
  { fullName: 'Víctor Orellana',     email: 'victor.orellana@gmail.com',      phone: '+503 7001-0021' },
  { fullName: 'William Chávez',      email: 'william.chavez@gmail.com',       phone: '+503 7001-0022' },
  { fullName: 'Xavier Morales',      email: 'xavier.morales@gmail.com',       phone: '+503 7001-0023' },
  { fullName: 'Yeferson Díaz',       email: 'yeferson.diaz@gmail.com',        phone: '+503 7001-0024' },
  { fullName: 'Zuriely Molina',      email: 'zuriely.molina@gmail.com',       phone: '+503 7001-0025' },
]

// ─── Datos de barberos ────────────────────────────────────────────────────────

const barberosData = [
  {
    fullName: 'Andrés Portillo',
    email: 'andres.portillo@speeddan.com',
    phone: '+503 7002-0001',
    bio: 'Especialista en fade americano y skin fade. 7 años de experiencia.',
    specialties: ['fade americano', 'skin fade', 'corte moderno'],
  },
  {
    fullName: 'Brayan Contreras',
    email: 'brayan.contreras@speeddan.com',
    phone: '+503 7002-0002',
    bio: 'Experto en barba y diseño de líneas. Formado en academia de peluquería.',
    specialties: ['arreglo de barba', 'diseño de líneas', 'navaja'],
  },
  {
    fullName: 'César Guzmán',
    email: 'cesar.guzman@speeddan.com',
    phone: '+503 7002-0003',
    bio: 'Cortes clásicos y pompadour. Especialista en cera y fijadores.',
    specialties: ['corte clásico', 'pompadour', 'retro'],
  },
  {
    fullName: 'Diego Merino',
    email: 'diego.merino@speeddan.com',
    phone: '+503 7002-0004',
    bio: 'Maestro del undercut y cortes texturizados. Instagram: @diego_cuts.',
    specialties: ['undercut', 'texturizado', 'corte moderno'],
  },
  {
    fullName: 'Emilio Soriano',
    email: 'emilio.soriano@speeddan.com',
    phone: '+503 7002-0005',
    bio: 'Especialista en cabello rizado y afro. Tratamientos capilares premium.',
    specialties: ['cabello rizado', 'afro', 'tratamientos capilares'],
  },
  {
    fullName: 'Félix Zamora',
    email: 'felix.zamora@speeddan.com',
    phone: '+503 7002-0006',
    bio: 'Cortes infantiles y teen. Paciencia y mano suave con los más pequeños.',
    specialties: ['corte infantil', 'corte teen', 'cabello liso'],
  },
  {
    fullName: 'Gustavo Pineda',
    email: 'gustavo.pineda@speeddan.com',
    phone: '+503 7002-0007',
    bio: 'Barbero senior con 12 años de experiencia. Especialista en coloración.',
    specialties: ['coloración', 'mechas', 'decoloración', 'corte clásico'],
  },
  {
    fullName: 'Harold Barrera',
    email: 'harold.barrera@speeddan.com',
    phone: '+503 7002-0008',
    bio: 'Experto en diseños y cejas. Arte en cada corte.',
    specialties: ['diseños en cabello', 'cejas', 'fade creativo'],
  },
  {
    fullName: 'Ivan Escobar',
    email: 'ivan.escobar@speeddan.com',
    phone: '+503 7002-0009',
    bio: 'Cortes urbanos y streetwear. Referente en estilo moderno urbano.',
    specialties: ['corte urbano', 'fade bajo', 'diseños geométricos'],
  },
  {
    fullName: 'Jonathan Leiva',
    email: 'jonathan.leiva@speeddan.com',
    phone: '+503 7002-0010',
    bio: 'Nuevo talento. Técnicas europeas aprendidas en España.',
    specialties: ['corte europeo', 'texturizado', 'barba corta'],
  },
]

// ─── Servicios adicionales ────────────────────────────────────────────────────

const serviciosExtra = [
  // Cabello
  { name: 'Corte Texturizado',       description: 'Corte con técnica de texturizado para dar volumen y movimiento',        price: 10.00, duration: 35, category: 'cabello' },
  { name: 'Undercut',                description: 'Corte undercut clásico o moderno con degradado lateral',                price: 12.00, duration: 40, category: 'cabello' },
  { name: 'Pompadour',               description: 'Corte pompadour clásico con peinado incluido',                         price: 12.00, duration: 45, category: 'cabello' },
  { name: 'Corte Urbano / Streetwear', description: 'Estilos urbanos modernos para jóvenes',                             price: 11.00, duration: 40, category: 'cabello' },
  { name: 'Corte Europeo',           description: 'Técnica europea con tijera, suave y natural',                          price: 13.00, duration: 45, category: 'cabello' },
  { name: 'Afro / Cabello Rizado',   description: 'Especialidad en cabello rizado, afro y coily',                         price: 14.00, duration: 50, category: 'cabello' },
  { name: 'Corte Teen',              description: 'Estilos para adolescentes de 13 a 17 años',                            price: 7.00,  duration: 30, category: 'cabello' },
  // Barba
  { name: 'Barba con Diseño',        description: 'Arreglo de barba con diseño de líneas y formas personalizadas',        price: 8.00,  duration: 25, category: 'barba'   },
  { name: 'Rasurado con Navaja',     description: 'Rasurado tradicional con navaja recta, toalla caliente y aftershave',  price: 9.00,  duration: 30, category: 'barba'   },
  { name: 'Perfilado de Cejas',      description: 'Depilación y perfilado de cejas con cera o navaja',                    price: 4.00,  duration: 15, category: 'barba'   },
  { name: 'Barba Corta',             description: 'Recorte y mantenimiento de barba corta (< 1 cm)',                      price: 5.00,  duration: 15, category: 'barba'   },
  // Combos
  { name: 'Fade + Barba',            description: 'Corte fade con arreglo de barba incluido',                             price: 15.00, duration: 55, category: 'combo'   },
  { name: 'Corte + Barba + Diseño',  description: 'Servicio completo premium: corte, barba con diseño de líneas',         price: 18.00, duration: 65, category: 'combo'   },
  { name: 'Corte Infantil + Cejas',  description: 'Para niños: corte + perfilado de cejas',                               price: 8.00,  duration: 35, category: 'combo'   },
  { name: 'Combo VIP',               description: 'Corte + barba con navaja + tratamiento capilar + masaje cuero cabelludo', price: 25.00, duration: 80, category: 'combo' },
  // Tratamientos
  { name: 'Masaje Cuero Cabelludo',  description: 'Masaje relajante de cuero cabelludo con aceites esenciales',           price: 8.00,  duration: 20, category: 'tratamiento' },
  { name: 'Keratina Express',        description: 'Tratamiento de keratina para alisar y nutrir el cabello',               price: 20.00, duration: 60, category: 'tratamiento' },
  { name: 'Tinte / Coloración',      description: 'Coloración completa con tinte profesional',                            price: 18.00, duration: 60, category: 'tratamiento' },
  { name: 'Mechas',                  description: 'Mechas californianas o balayage',                                      price: 22.00, duration: 75, category: 'tratamiento' },
  { name: 'Anti-caída / Anticaspa',  description: 'Tratamiento especializado para cabello débil y caspa',                 price: 12.00, duration: 30, category: 'tratamiento' },
]

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Iniciando seed adicional...\n')

  // Buscar tenant demo
  const tenant = await prisma.barberTenant.findUnique({ where: { slug: 'speeddan-demo' } })
  if (!tenant) {
    console.error('❌  Tenant "speeddan-demo" no encontrado. Ejecuta npm run db:seed primero.')
    process.exit(1)
  }
  console.log(`✅  Tenant encontrado: ${tenant.name} (ID ${tenant.id})\n`)

  // Actualizar maxBarbers para acomodar los 10 nuevos barberos
  await prisma.barberTenant.update({
    where: { id: tenant.id },
    data: { maxBarbers: 15, modules: { appointments: true, billing: true, loyalty: false, products: false, esContribuyente: false } },
  })
  console.log('    ✓ maxBarbers actualizado a 15')

  // ── 1. Clientes ──────────────────────────────────────────────────────────
  console.log('\n👤  Agregando 25 clientes...')
  const hashCliente = await bcrypt.hash('Client@2026!', 12)

  let clientesCreados = 0
  for (const c of clientesData) {
    const existe = await prisma.barberUser.findFirst({ where: { tenantId: tenant.id, email: c.email } })
    if (existe) {
      console.log(`    ↷  Ya existe: ${c.email}`)
      continue
    }
    await prisma.barberUser.create({
      data: {
        tenantId: tenant.id,
        email:    c.email,
        password: hashCliente,
        fullName: c.fullName,
        phone:    c.phone,
        role:     'CLIENT',
        active:   true,
      },
    })
    clientesCreados++
  }
  console.log(`    ✓ ${clientesCreados} clientes creados`)

  // ── 2. Barberos ──────────────────────────────────────────────────────────
  console.log('\n✂️   Agregando 10 barberos...')
  const hashBarbero = await bcrypt.hash('Barber@2026!', 12)

  let barberosCreados = 0
  for (const b of barberosData) {
    const existe = await prisma.barberUser.findFirst({ where: { tenantId: tenant.id, email: b.email } })
    if (existe) {
      console.log(`    ↷  Ya existe: ${b.email}`)
      continue
    }
    const usuario = await prisma.barberUser.create({
      data: {
        tenantId: tenant.id,
        email:    b.email,
        password: hashBarbero,
        fullName: b.fullName,
        phone:    b.phone,
        role:     'CLIENT',
        active:   true,
      },
    })

    const perfil = await prisma.barber.create({
      data: {
        tenantId:    tenant.id,
        userId:      usuario.id,
        bio:         b.bio,
        specialties: b.specialties,
        active:      true,
      },
    })

    // Horarios Lun-Sab
    await prisma.barberSchedule.createMany({
      data: [
        { barberId: perfil.id, dayOfWeek: 1, startTime: '09:00', endTime: '18:00' },
        { barberId: perfil.id, dayOfWeek: 2, startTime: '09:00', endTime: '18:00' },
        { barberId: perfil.id, dayOfWeek: 3, startTime: '09:00', endTime: '18:00' },
        { barberId: perfil.id, dayOfWeek: 4, startTime: '09:00', endTime: '18:00' },
        { barberId: perfil.id, dayOfWeek: 5, startTime: '09:00', endTime: '18:00' },
        { barberId: perfil.id, dayOfWeek: 6, startTime: '09:00', endTime: '15:00' },
      ],
    })

    barberosCreados++
    console.log(`    ✓ ${b.fullName}`)
  }
  console.log(`    ✓ ${barberosCreados} barberos creados`)

  // ── 3. Servicios adicionales ─────────────────────────────────────────────
  console.log('\n💈  Agregando servicios adicionales...')

  let serviciosCreados = 0
  for (const s of serviciosExtra) {
    const existe = await prisma.barberService.findFirst({ where: { tenantId: tenant.id, name: s.name } })
    if (existe) {
      console.log(`    ↷  Ya existe: ${s.name}`)
      continue
    }
    await prisma.barberService.create({
      data: {
        tenantId:    tenant.id,
        name:        s.name,
        description: s.description,
        price:       s.price,
        duration:    s.duration,
        category:    s.category,
        active:      true,
      },
    })
    serviciosCreados++
  }
  console.log(`    ✓ ${serviciosCreados} servicios creados`)

  // ── Resumen ──────────────────────────────────────────────────────────────
  const [totalClientes, totalBarberos, totalServicios] = await Promise.all([
    prisma.barberUser.count({ where: { tenantId: tenant.id, role: 'CLIENT' } }),
    prisma.barber.count({ where: { tenantId: tenant.id } }),
    prisma.barberService.count({ where: { tenantId: tenant.id } }),
  ])

  console.log('\n✅  Seed adicional completado!\n')
  console.log('═══════════════════════════════════════════')
  console.log(`  Total clientes:  ${totalClientes}`)
  console.log(`  Total barberos:  ${totalBarberos}`)
  console.log(`  Total servicios: ${totalServicios}`)
  console.log('')
  console.log('  Contraseña barberos: Barber@2026!')
  console.log('  Contraseña clientes: Client@2026!')
  console.log('═══════════════════════════════════════════\n')
}

main()
  .catch(err => { console.error('❌ Seed falló:', err); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
