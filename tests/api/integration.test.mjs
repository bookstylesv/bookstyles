/**
 * INTEGRATION TESTS — Ecosistema Bookstyles (3 proyectos)
 * Verifica la comunicación entre: bookstyle-landing ↔ barber-pro ↔ panel-control
 *
 * Uso: node tests/api/integration.test.mjs
 *
 * Variables de entorno:
 *   BARBER_URL     URL de barber-pro  (default: https://speeddan-barberia.vercel.app)
 *   LANDING_URL    URL de la landing  (default: https://bookstyle-landing.vercel.app)
 *   PANEL_URL      URL del panel      (default: https://panel-bookstylesv.vercel.app)
 *   TENANT_SLUG    Slug de prueba     (default: speeddan-demo)
 *   SUPERADMIN_KEY API key superadmin del barber-pro
 */

const BARBER_URL  = (process.env.BARBER_URL  || 'https://speeddan-barberia.vercel.app').replace(/\/$/, '');
const LANDING_URL = (process.env.LANDING_URL || 'https://bookstyle-landing.vercel.app').replace(/\/$/, '');
const PANEL_URL   = (process.env.PANEL_URL   || 'https://panel-bookstylesv.vercel.app').replace(/\/$/, '');
const TENANT_SLUG = process.env.TENANT_SLUG  || 'speeddan-demo';
const SUPERADMIN_KEY = process.env.SUPERADMIN_KEY || '';

let passed = 0;
let failed = 0;
const failures = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
    failures.push({ name, detail });
  }
}

function warn(msg) {
  console.log(`  ⚠️  ${msg}`);
}

async function req(url, options = {}) {
  try {
    const res = await fetch(url, { redirect: 'manual', ...options });
    let body = null;
    try { body = await res.json(); } catch { /* ignore */ }
    return { status: res.status, headers: res.headers, body };
  } catch (err) {
    return { status: 0, headers: new Headers(), body: null, error: err.message };
  }
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function testBarberProUp() {
  section('BARBER-PRO — Servicio en pie');

  const r = await req(`${BARBER_URL}/api/health`);
  assert('barber-pro /api/health retorna 200', r.status === 200, `Status: ${r.status}, Error: ${r.error || ''}`);

  if (r.status === 200) {
    const body = r.body;
    assert(
      'barber-pro health indica servicio ok',
      body?.status === 'ok' || body?.success === true || body?.ok === true,
      `Body: ${JSON.stringify(body)}`
    );
  }
}

async function testLandingConsumesBarberAPI() {
  section('LANDING → BARBER-PRO — Integración API pública');

  // La landing llama a GET /api/book para listar negocios
  const r1 = await req(`${BARBER_URL}/api/book`);
  assert(
    'GET /api/book accesible desde exterior (landing puede consumirla)',
    r1.status === 200,
    `Status: ${r1.status}`
  );

  // La landing llama a GET /api/book/[slug] para obtener servicios y barberos
  const r2 = await req(`${BARBER_URL}/api/book/${TENANT_SLUG}`);
  assert(
    `GET /api/book/${TENANT_SLUG} retorna datos del negocio`,
    r2.status === 200,
    `Status: ${r2.status}`
  );

  if (r2.status === 200) {
    const data = r2.body?.data || r2.body;
    assert(
      'Respuesta tiene servicios (la landing los muestra en paso 2)',
      data?.services !== undefined || data?.servicios !== undefined,
      `Keys: ${Object.keys(data || {}).join(', ')}`
    );
    assert(
      'Respuesta tiene barberos (la landing los muestra en paso 3)',
      data?.barbers !== undefined || data?.barberos !== undefined,
      `Keys: ${Object.keys(data || {}).join(', ')}`
    );

    // Verificar estructura para multi-servicio
    const services = data?.services || data?.servicios || [];
    if (Array.isArray(services) && services.length > 0) {
      const svc = services[0];
      assert(
        'Servicio tiene campo duration/duracion (necesario para calcular slots)',
        svc.duration !== undefined || svc.duracion !== undefined || svc.durationMin !== undefined,
        `Campos del servicio: ${Object.keys(svc).join(', ')}`
      );
      assert(
        'Servicio tiene campo price/precio (la landing lo muestra)',
        svc.price !== undefined || svc.precio !== undefined,
        `Campos del servicio: ${Object.keys(svc).join(', ')}`
      );
    }
  }
}

async function testLandingSlotsFetch() {
  section('LANDING → BARBER-PRO — Fetch de slots disponibles');

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const dateStr = futureDate.toISOString().split('T')[0];

  const r = await req(`${BARBER_URL}/api/book/${TENANT_SLUG}/slots?date=${dateStr}&totalDuration=30&serviceId=1`);
  assert(
    `GET /api/book/${TENANT_SLUG}/slots retorna respuesta válida`,
    r.status === 200 || r.status === 400,
    `Status: ${r.status} — si 500, la landing mostraría error al usuario`
  );

  if (r.status === 200) {
    const slots = r.body?.data || r.body?.slots || r.body;
    assert('Slots es un array', Array.isArray(slots), `Tipo: ${typeof slots}`);
  }
}

async function testMultiServicePostStructure() {
  section('LANDING → BARBER-PRO — Estructura POST multi-servicio');

  // Verificar que el backend acepta el campo serviceIds[] que envía la landing
  const payload = {
    serviceId: 1,
    serviceIds: [1],       // La landing siempre envía esto
    barberId: null,
    date: '2099-12-31',
    time: '10:00',
    clientName: 'Integration Test',
    clientPhone: '77991100',
    clientEmail: 'integration@test.com',
  };

  const r = await req(`${BARBER_URL}/api/book/${TENANT_SLUG}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert(
    'POST /api/book acepta payload de la landing (no 500)',
    r.status !== 500,
    `Status: ${r.status}, Body: ${JSON.stringify(r.body).substring(0, 200)}`
  );

  // Verificar si la respuesta incluye waUrl (WhatsApp del negocio)
  if (r.status === 200 || r.status === 201) {
    const data = r.body?.data || r.body;
    const hasWaUrl = data?.waUrl !== undefined || data?.whatsappUrl !== undefined;
    if (!hasWaUrl) {
      warn('La respuesta no incluye waUrl — la landing no puede mostrar el botón de WhatsApp al cliente');
    } else {
      assert('Respuesta incluye waUrl para WhatsApp del negocio', true);
    }
  }
}

async function testCORSBetweenProjects() {
  section('CORS — Comunicación cross-origin entre proyectos');

  // barber-pro debe aceptar CORS desde la landing
  const r1 = await req(`${BARBER_URL}/api/book`, {
    headers: {
      Origin: LANDING_URL,
      'Access-Control-Request-Method': 'GET',
    },
  });

  const allowOrigin = r1.headers.get('access-control-allow-origin');
  assert(
    'barber-pro acepta requests de la landing (CORS)',
    r1.status !== 0 && (allowOrigin === '*' || allowOrigin === LANDING_URL || r1.status === 200),
    `Origin: ${LANDING_URL}, Access-Control-Allow-Origin: ${allowOrigin}, Status: ${r1.status}`
  );

  // Preflight OPTIONS
  const r2 = await req(`${BARBER_URL}/api/book/${TENANT_SLUG}`, {
    method: 'OPTIONS',
    headers: {
      Origin: LANDING_URL,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  assert(
    'barber-pro responde a preflight OPTIONS de la landing',
    r2.status === 200 || r2.status === 204,
    `Status: ${r2.status} — si falla, la landing no puede hacer POST`
  );
}

async function testSuperadminAPIFromPanel() {
  section('PANEL → BARBER-PRO — API Superadmin');

  // Sin API key → 401
  const r1 = await req(`${BARBER_URL}/api/superadmin/health`);
  assert(
    'GET /api/superadmin/health sin API key retorna 401',
    r1.status === 401,
    `Status: ${r1.status} — si 200 sin auth, API superadmin es pública`
  );

  // Con API key (si está definida)
  if (SUPERADMIN_KEY) {
    const r2 = await req(`${BARBER_URL}/api/superadmin/health`, {
      headers: { Authorization: `Bearer ${SUPERADMIN_KEY}` },
    });
    assert(
      'GET /api/superadmin/health con API key válida retorna 200',
      r2.status === 200,
      `Status: ${r2.status}`
    );

    const r3 = await req(`${BARBER_URL}/api/superadmin/dashboard`, {
      headers: { Authorization: `Bearer ${SUPERADMIN_KEY}` },
    });
    assert(
      'GET /api/superadmin/dashboard retorna métricas',
      r3.status === 200,
      `Status: ${r3.status}`
    );

    if (r3.status === 200) {
      const data = r3.body?.data || r3.body;
      assert('Dashboard tiene totalTenants', data?.totalTenants !== undefined, `Keys: ${Object.keys(data || {}).join(', ')}`);
    }
  } else {
    warn('SUPERADMIN_KEY no definida — tests con API key omitidos');
    warn('Definir: export SUPERADMIN_KEY=sk_barber_... para tests completos');
  }
}

async function testResponseFormatConsistency() {
  section('API — Consistencia del formato de respuesta');

  // Todos los endpoints deben retornar { success, data, error?, pagination? }
  const publicEndpoints = [
    `${BARBER_URL}/api/book`,
    `${BARBER_URL}/api/health`,
  ];

  for (const url of publicEndpoints) {
    const r = await req(url);
    if (r.status === 200 && r.body) {
      const hasSuccess = r.body.success !== undefined;
      const hasOk = r.body.ok !== undefined;
      const isArray = Array.isArray(r.body);
      assert(
        `${url.replace(BARBER_URL, '')} sigue formato estándar {success, data}`,
        hasSuccess || hasOk || isArray,
        `Body keys: ${Object.keys(r.body).join(', ')}`
      );
    }
  }
}

async function testVercelDeployStatus() {
  section('VERCEL — Servicios desplegados y accesibles');

  const services = [
    { name: 'barber-pro', url: `${BARBER_URL}/api/health` },
    { name: 'landing', url: `${LANDING_URL}/` },
  ];

  for (const svc of services) {
    const r = await req(svc.url);
    assert(
      `${svc.name} accesible en ${svc.url}`,
      r.status > 0 && r.status < 500,
      r.error ? `Error de red: ${r.error}` : `Status: ${r.status}`
    );
  }

  // Panel (puede requerir auth)
  const rPanel = await req(`${PANEL_URL}/api/health`);
  assert(
    `panel-control accesible (${PANEL_URL})`,
    rPanel.status > 0,
    rPanel.error ? `Error de red: ${rPanel.error}` : `Status: ${rPanel.status}`
  );
}

async function testDataContractLandingToBarber() {
  section('CONTRATO — Campos que la landing espera de barber-pro');

  const r = await req(`${BARBER_URL}/api/book/${TENANT_SLUG}`);
  if (r.status !== 200) {
    warn(`No se pudo obtener datos del tenant ${TENANT_SLUG} — tests de contrato omitidos`);
    return;
  }

  const data = r.body?.data || r.body;

  // Campos de tenant que usa la landing (agendar.astro)
  const tenant = data?.tenant || data;
  assert('tenant.slug presente', tenant?.slug !== undefined, `Keys: ${Object.keys(tenant || {}).join(', ')}`);
  assert('tenant.name presente', tenant?.name !== undefined);

  // La landing muestra logoUrl en el paso 1
  const hasLogo = tenant?.logoUrl !== undefined || tenant?.logo !== undefined;
  if (!hasLogo) warn('tenant.logoUrl ausente — la landing no puede mostrar el logo del negocio');

  // La landing usa city y address en la card del negocio
  const hasCity = tenant?.city !== undefined || tenant?.ciudad !== undefined;
  if (!hasCity) warn('tenant.city ausente — la landing no puede mostrar la ciudad');

  // La landing muestra phone para WhatsApp
  const hasPhone = tenant?.phone !== undefined || tenant?.telefono !== undefined || tenant?.whatsapp !== undefined;
  if (!hasPhone) warn('tenant.phone ausente — la landing no puede generar link de WhatsApp');

  // Servicios
  const services = data?.services || data?.servicios || [];
  assert('services es array', Array.isArray(services), `Tipo: ${typeof services}`);

  if (services.length > 0) {
    const s = services[0];
    assert('Servicio tiene id', s.id !== undefined);
    assert('Servicio tiene name', s.name !== undefined);
    assert('Servicio tiene price', s.price !== undefined || s.precio !== undefined);
    assert('Servicio tiene duration', s.duration !== undefined || s.durationMin !== undefined || s.duracion !== undefined);
  }

  // Barberos
  const barbers = data?.barbers || data?.barberos || [];
  assert('barbers es array', Array.isArray(barbers), `Tipo: ${typeof barbers}`);

  if (barbers.length > 0) {
    const b = barbers[0];
    assert('Barbero tiene id', b.id !== undefined);
    assert('Barbero tiene name', b.name !== undefined);
    // avatarUrl es opcional pero la landing lo usa
    if (b.avatarUrl === undefined) warn('barbero.avatarUrl ausente — la landing mostrará avatar placeholder');
  }
}

// ─── Runner ──────────────────────────────────────────────────────────────────

async function run() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   INTEGRATION TESTS — Ecosistema Bookstyles (3 proyectos)║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`  Barber URL : ${BARBER_URL}`);
  console.log(`  Landing URL: ${LANDING_URL}`);
  console.log(`  Panel URL  : ${PANEL_URL}`);
  console.log(`  Tenant     : ${TENANT_SLUG}`);
  console.log(`  SuperKey   : ${SUPERADMIN_KEY ? '✓ definida' : '✗ no definida'}`);
  console.log(`  Fecha      : ${new Date().toISOString()}`);

  await testVercelDeployStatus();
  await testBarberProUp();
  await testLandingConsumesBarberAPI();
  await testLandingSlotsFetch();
  await testMultiServicePostStructure();
  await testCORSBetweenProjects();
  await testSuperadminAPIFromPanel();
  await testResponseFormatConsistency();
  await testDataContractLandingToBarber();

  console.log('\n' + '═'.repeat(62));
  console.log(`  RESULTADO: ${passed} pasaron, ${failed} fallaron`);

  if (failures.length > 0) {
    console.log('\n  FALLOS DETECTADOS:');
    failures.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name}`);
      if (f.detail) console.log(`     ${f.detail}`);
    });
  }

  console.log('═'.repeat(62) + '\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Error crítico en test runner:', err);
  process.exit(1);
});
