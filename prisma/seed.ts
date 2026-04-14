/**
 * seed.ts — Datos de prueba para desarrollo.
 * Crea un tenant de demo + usuarios + servicios para poder probar el sistema.
 * Ejecutar: npm run db:seed
 *
 * Credenciales después del seed:
 *   Barbería: speeddan-demo
 *   Admin:    admin@speeddan.com  / Admin@2026!
 *   Barbero:  barber@speeddan.com / Barber@2026!
 *   Cliente:  client@speeddan.com / Client@2026!
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

const PLAN_CONFIGS = [
  {
    plan: 'TRIAL' as const,
    displayName: 'Trial',
    description: 'Prueba gratuita por 30 días',
    maxBarbers: 3,
    maxBranches: 2,
    modules: {
      appointments: true, pos: true, clients: true, products: false,
      expenses: false, reports_basic: false, accounts_receivable: false,
      payroll: false, billing_dte: false, reports_advanced: false,
      branches: false, api_integrations: false, loyalty: false,
    },
  },
  {
    plan: 'BASIC' as const,
    displayName: 'Básico',
    description: 'Plan básico para negocios pequeños',
    maxBarbers: 5,
    maxBranches: 1,
    modules: {
      appointments: true, pos: true, clients: true, products: true,
      expenses: true, reports_basic: true, accounts_receivable: false,
      payroll: false, billing_dte: false, reports_advanced: false,
      branches: false, api_integrations: false, loyalty: false,
    },
  },
  {
    plan: 'PRO' as const,
    displayName: 'Profesional',
    description: 'Plan profesional con módulos avanzados',
    maxBarbers: 10,
    maxBranches: 3,
    modules: {
      appointments: true, pos: true, clients: true, products: true,
      expenses: true, reports_basic: true, accounts_receivable: true,
      payroll: true, billing_dte: true, reports_advanced: true,
      branches: true, api_integrations: false, loyalty: true,
    },
  },
  {
    plan: 'ENTERPRISE' as const,
    displayName: 'Empresarial',
    description: 'Plan completo sin restricciones',
    maxBarbers: 999,
    maxBranches: 10,
    modules: {
      appointments: true, pos: true, clients: true, products: true,
      expenses: true, reports_basic: true, accounts_receivable: true,
      payroll: true, billing_dte: true, reports_advanced: true,
      branches: true, api_integrations: true, loyalty: true,
    },
  },
];

async function main() {
  console.log('🌱  Iniciando seed...\n');

  // ── 0. Plan configs ──────────────────────────────────────
  console.log('📋  Seeding plan configs...');
  for (const cfg of PLAN_CONFIGS) {
    await prisma.barberPlanConfig.upsert({
      where: { plan: cfg.plan },
      update: {
        displayName: cfg.displayName,
        description: cfg.description,
        maxBarbers: cfg.maxBarbers,
        maxBranches: cfg.maxBranches,
        modules: cfg.modules,
      },
      create: cfg,
    });
    console.log(`    ✓ ${cfg.plan} → ${cfg.displayName}`);
  }

  // ── 1. Limpiar datos anteriores del demo ─────────────────
  console.log('🗑️   Limpiando datos demo anteriores...');
  const existing = await prisma.barberTenant.findUnique({ where: { slug: 'speeddan-demo' } });
  if (existing) {
    // Cascade delete limpiará todo lo relacionado
    await prisma.barberTenant.delete({ where: { id: existing.id } });
    console.log('    ✓ Tenant anterior eliminado');
  }

  // ── 2. Crear tenant ──────────────────────────────────────
  console.log('\n🏪  Creando tenant "Speeddan Demo"...');
  const tenant = await prisma.barberTenant.create({
    data: {
      slug:    'speeddan-demo',
      name:    'Speeddan Barbería Demo',
      plan:    'PRO',
      status:  'ACTIVE',
      paidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
      maxBarbers: 5,
      address: 'Av. Principal #123, San Salvador',
      phone:   '+503 7890-1234',
      email:   'info@speeddan.com',
      city:    'San Salvador',
      country: 'SV',
      themeConfig: {},
      modules: {
        appointments: true,
        billing:      true,
        loyalty:      false,
        products:     false,
      },
    },
  });
  console.log(`    ✓ Tenant creado: ID ${tenant.id}, slug: ${tenant.slug}`);

  // ── 3. Crear usuarios ────────────────────────────────────
  console.log('\n👤  Creando usuarios...');

  const [hashAdmin, hashBarber, hashClient] = await Promise.all([
    bcrypt.hash('Admin@2026!', 12),
    bcrypt.hash('Barber@2026!', 12),
    bcrypt.hash('Client@2026!', 12),
  ]);

  const adminUser = await prisma.barberUser.create({
    data: {
      tenantId: tenant.id,
      email:    'admin@speeddan.com',
      password: hashAdmin,
      fullName: 'Daniel Admin',
      phone:    '+503 7000-0001',
      role:     'OWNER',
      active:   true,
    },
  });
  console.log(`    ✓ Admin:   ${adminUser.email} (ID ${adminUser.id})`);

  const barberUser = await prisma.barberUser.create({
    data: {
      tenantId: tenant.id,
      email:    'barber@speeddan.com',
      password: hashBarber,
      fullName: 'Carlos Barbero',
      phone:    '+503 7000-0002',
      role:     'BARBER',
      active:   true,
    },
  });
  console.log(`    ✓ Barbero: ${barberUser.email} (ID ${barberUser.id})`);

  const clientUser = await prisma.barberUser.create({
    data: {
      tenantId: tenant.id,
      email:    'client@speeddan.com',
      password: hashClient,
      fullName: 'Juan Cliente',
      phone:    '+503 7000-0003',
      role:     'CLIENT',
      active:   true,
    },
  });
  console.log(`    ✓ Cliente: ${clientUser.email} (ID ${clientUser.id})`);

  // ── 4. Crear perfil de barbero ───────────────────────────
  console.log('\n✂️   Creando perfil de barbero...');
  const barberProfile = await prisma.barber.create({
    data: {
      tenantId:    tenant.id,
      userId:      barberUser.id,
      bio:         'Especialista en cortes clásicos y modernos. 5 años de experiencia.',
      specialties: ['corte clásico', 'fade', 'barba', 'tratamientos'],
      active:      true,
    },
  });
  console.log(`    ✓ Perfil creado (ID ${barberProfile.id})`);

  // ── 5. Horarios del barbero (Lun-Vie 9am-6pm, Sab 9am-3pm) ──
  console.log('\n🗓️   Creando horarios...');
  const schedules = [
    { dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }, // Lunes
    { dayOfWeek: 2, startTime: '09:00', endTime: '18:00' }, // Martes
    { dayOfWeek: 3, startTime: '09:00', endTime: '18:00' }, // Miércoles
    { dayOfWeek: 4, startTime: '09:00', endTime: '18:00' }, // Jueves
    { dayOfWeek: 5, startTime: '09:00', endTime: '18:00' }, // Viernes
    { dayOfWeek: 6, startTime: '09:00', endTime: '15:00' }, // Sábado
  ];
  await prisma.barberSchedule.createMany({
    data: schedules.map(s => ({ barberId: barberProfile.id, ...s })),
  });
  console.log('    ✓ 6 días de horario creados');

  // ── 6. Servicios ─────────────────────────────────────────
  console.log('\n💈  Creando servicios...');
  const services = await prisma.barberService.createMany({
    data: [
      {
        tenantId:    tenant.id,
        name:        'Corte Clásico',
        description: 'Corte de cabello clásico con acabado profesional',
        price:       8.00,
        duration:    30,
        category:    'cabello',
        active:      true,
      },
      {
        tenantId:    tenant.id,
        name:        'Corte + Barba',
        description: 'Combo completo: corte de cabello y arreglo de barba',
        price:       14.00,
        duration:    50,
        category:    'combo',
        active:      true,
      },
      {
        tenantId:    tenant.id,
        name:        'Arreglo de Barba',
        description: 'Perfilado y arreglo de barba con navaja',
        price:       6.00,
        duration:    20,
        category:    'barba',
        active:      true,
      },
      {
        tenantId:    tenant.id,
        name:        'Fade / Degradado',
        description: 'Corte fade americano o skin fade',
        price:       10.00,
        duration:    40,
        category:    'cabello',
        active:      true,
      },
      {
        tenantId:    tenant.id,
        name:        'Tratamiento Capilar',
        description: 'Tratamiento hidratante y nutrición del cuero cabelludo',
        price:       15.00,
        duration:    45,
        category:    'tratamiento',
        active:      true,
      },
      {
        tenantId:    tenant.id,
        name:        'Corte Infantil',
        description: 'Corte para niños menores de 12 años',
        price:       5.00,
        duration:    25,
        category:    'cabello',
        active:      true,
      },
    ],
  });
  console.log(`    ✓ ${services.count} servicios creados`);

  // ── 7. Citas de muestra ──────────────────────────────────
  console.log('\n📅  Creando citas de muestra...');
  const allServices = await prisma.barberService.findMany({ where: { tenantId: tenant.id } });
  const svc = (name: string) => allServices.find(s => s.name === name)!;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function addHours(d: Date, h: number, m = 0): Date {
    const r = new Date(d);
    r.setHours(h, m, 0, 0);
    return r;
  }

  // Citas de hoy
  const appt1 = await prisma.barberAppointment.create({
    data: {
      tenantId:  tenant.id,
      clientId:  clientUser.id,
      barberId:  barberProfile.id,
      serviceId: svc('Corte Clásico').id,
      startTime: addHours(today, 9, 0),
      endTime:   addHours(today, 9, 30),
      status:    'COMPLETED',
      notes:     'Cliente habitual',
    },
  });
  await prisma.barberPayment.create({
    data: {
      tenantId:      tenant.id,
      appointmentId: appt1.id,
      amount:        8.00,
      method:        'CASH',
      status:        'PAID',
      paidAt:        addHours(today, 9, 35),
    },
  });

  const appt2 = await prisma.barberAppointment.create({
    data: {
      tenantId:  tenant.id,
      clientId:  clientUser.id,
      barberId:  barberProfile.id,
      serviceId: svc('Corte + Barba').id,
      startTime: addHours(today, 11, 0),
      endTime:   addHours(today, 11, 50),
      status:    'CONFIRMED',
    },
  });

  // Cita de mañana
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  await prisma.barberAppointment.create({
    data: {
      tenantId:  tenant.id,
      clientId:  clientUser.id,
      barberId:  barberProfile.id,
      serviceId: svc('Fade / Degradado').id,
      startTime: addHours(tomorrow, 10, 0),
      endTime:   addHours(tomorrow, 10, 40),
      status:    'PENDING',
    },
  });

  console.log('    ✓ 3 citas creadas (2 hoy, 1 mañana)');
  console.log('    ✓ 1 pago registrado ($8.00 CASH)');

  // ── Resumen ──────────────────────────────────────────────
  console.log('\n✅  Seed completado!\n');
  console.log('═══════════════════════════════════════════');
  console.log('  Credenciales de acceso:');
  console.log('  URL:     https://speeddan-barberia.vercel.app/login');
  console.log('  Código:  speeddan-demo');
  console.log('');
  console.log('  Admin:   admin@speeddan.com  / Admin@2026!');
  console.log('  Barbero: barber@speeddan.com / Barber@2026!');
  console.log('  Cliente: client@speeddan.com / Client@2026!');
  console.log('═══════════════════════════════════════════\n');
}

main()
  .catch(err => { console.error('❌ Seed falló:', err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
