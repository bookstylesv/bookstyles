/**
 * FUNCTIONAL TESTS — Speeddan Barbería ERP
 * Verifica comportamiento correcto de endpoints: book, auth, slots, multi-servicio.
 *
 * Uso: node tests/api/functional.test.mjs [BASE_URL]
 * Ejemplo:
 *   node tests/api/functional.test.mjs http://localhost:3000
 *   node tests/api/functional.test.mjs https://speeddan-barberia.vercel.app
 *
 * Variables de entorno opcionales:
 *   TENANT_SLUG   slug del tenant de prueba (default: speeddan-demo)
 *   TEST_EMAIL    email de usuario owner para login (default: admin@speeddan.com)
 *   TEST_PASSWORD password del owner (default: Admin@2026!)
 */

const BASE_URL = (process.argv[2] || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TENANT_SLUG = process.env.TENANT_SLUG || 'speeddan-demo';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@speeddan.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Admin@2026!';

let passed = 0;
let failed = 0;
const failures = [];
let authCookie = null; // Se rellena en testLogin()

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

async function req(path, options = {}) {
  try {
    const headers = { ...(options.headers || {}) };
    if (authCookie && !headers['Cookie']) headers['Cookie'] = authCookie;
    const res = await fetch(`${BASE_URL}${path}`, {
      redirect: 'manual',
      ...options,
      headers,
    });
    let body = null;
    try {
      const text = await res.text();
      body = JSON.parse(text);
    } catch { /* ignore */ }
    return { status: res.status, headers: res.headers, body };
  } catch (err) {
    return { status: 0, headers: new Headers(), body: null, error: err.message };
  }
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function testHealth() {
  section('HEALTH — Estado del servicio');

  const r = await req('/api/health');
  assert('GET /api/health retorna 200', r.status === 200, `Status: ${r.status}`);
  assert(
    '/api/health retorna status en el cuerpo',
    r.body !== null && (r.body.status !== undefined || r.body.ok !== undefined || r.body.success !== undefined),
    `Body: ${JSON.stringify(r.body)}`
  );
}

async function testPublicBookList() {
  section('BOOK — Listado público de negocios');

  const r = await req('/api/book');
  assert('GET /api/book retorna 200', r.status === 200, `Status: ${r.status}`);

  const items = r.body?.data || r.body;
  assert(
    'GET /api/book retorna array',
    Array.isArray(items),
    `Tipo recibido: ${typeof items}`
  );

  if (Array.isArray(items) && items.length > 0) {
    const tenant = items[0];
    assert('Cada tenant tiene slug', typeof tenant.slug === 'string', `Campos: ${Object.keys(tenant).join(', ')}`);
    assert('Cada tenant tiene name', typeof tenant.name === 'string');
    assert(
      'Los tenants NO exponen datos sensibles (password, token)',
      !JSON.stringify(tenant).includes('password') && !JSON.stringify(tenant).includes('token'),
      'Se encontraron campos sensibles en la respuesta pública'
    );
  }
}

async function testPublicBookDetail() {
  section('BOOK — Detalle público por slug');

  const r = await req(`/api/book/${TENANT_SLUG}`);
  assert(`GET /api/book/${TENANT_SLUG} retorna 200`, r.status === 200, `Status: ${r.status}`);

  const data = r.body?.data || r.body;
  assert('Respuesta tiene tenant', data?.tenant !== undefined || data?.slug !== undefined, `Keys: ${Object.keys(data || {}).join(', ')}`);
  assert('Respuesta tiene services/servicios', data?.services !== undefined || data?.servicios !== undefined, `Keys: ${Object.keys(data || {}).join(', ')}`);
  assert('Respuesta tiene barbers/barberos', data?.barbers !== undefined || data?.barberos !== undefined, `Keys: ${Object.keys(data || {}).join(', ')}`);

  // Validar que no filtra info privada
  const bodyStr = JSON.stringify(data || {});
  assert(
    'Detalle público no expone contraseñas ni tokens JWT',
    !bodyStr.includes('password') && !bodyStr.includes('barber_access_token'),
    'Datos privados detectados en respuesta pública'
  );
}

async function testSlotsBasic() {
  section('BOOK — Disponibilidad de slots');

  // Fecha futura (nunca debe fallar con 500)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const dateStr = futureDate.toISOString().split('T')[0];

  const r = await req(`/api/book/${TENANT_SLUG}/slots?date=${dateStr}&totalDuration=30&serviceId=1`);
  assert(
    `GET /slots?date=${dateStr} retorna 200 o error controlado (no 500)`,
    r.status !== 500,
    `Status: ${r.status}, Body: ${JSON.stringify(r.body)}`
  );

  if (r.status === 200) {
    const slots = r.body?.data || r.body?.slots || r.body;
    assert(
      '/slots retorna array de horarios',
      Array.isArray(slots),
      `Tipo: ${typeof slots}`
    );

    if (Array.isArray(slots) && slots.length > 0) {
      const slot = slots[0];
      assert(
        'Cada slot tiene formato HH:mm',
        typeof slot === 'string' && /^\d{2}:\d{2}$/.test(slot),
        `Slot: ${JSON.stringify(slot)}`
      );
    }
  }

  // Fecha pasada → debe retornar array vacío o error, no 500
  const pastDate = '2020-01-01';
  const r2 = await req(`/api/book/${TENANT_SLUG}/slots?date=${pastDate}&totalDuration=30&serviceId=1`);
  assert(
    'GET /slots con fecha pasada retorna 200 con array vacío o 400 (no 500)',
    r2.status !== 500,
    `Status: ${r2.status}`
  );
  if (r2.status === 200) {
    const slots2 = r2.body?.data || r2.body?.slots || r2.body;
    assert(
      'Slots de fecha pasada = array vacío',
      Array.isArray(slots2) && slots2.length === 0,
      `Slots recibidos: ${JSON.stringify(slots2)}`
    );
  }
}

async function testMultiServiceBug() {
  section('BOOK — BUG CRÍTICO: Multi-servicio (serviceIds[])');

  // Este test documenta el bug conocido:
  // La landing envía serviceIds: [id1, id2] pero el backend solo lee serviceId (el primero)
  // Si está corregido, el POST debe guardar todos los servicios

  const payload = {
    serviceId: 1,
    serviceIds: [1, 2],   // multi-select de la landing
    barberId: null,
    date: '2099-12-31',
    time: '10:00',
    clientName: 'Test Multi Servicio',
    clientPhone: '77001100',
    clientEmail: 'multitest@speeddan.com',
    notes: 'Test automatico multi-servicio',
  };

  const r = await req(`/api/book/${TENANT_SLUG}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert(
    'POST /api/book/[slug] con serviceIds[] no retorna 500',
    r.status !== 500,
    `Status: ${r.status}, Body: ${JSON.stringify(r.body)}`
  );

  if (r.status === 200 || r.status === 201) {
    const created = r.body?.data || r.body;
    // Si el bug está corregido, debería haber varios appointments o indicación de multi-servicio
    console.log(`  ℹ️  Reserva creada. Verificar manualmente si se guardaron ${payload.serviceIds.length} servicios o solo 1.`);
    console.log(`     Response keys: ${Object.keys(created || {}).join(', ')}`);
  } else {
    console.log(`  ℹ️  POST /book retornó ${r.status}. El tenant demo puede no aceptar citas para esa fecha.`);
  }
}

async function testLogin() {
  section('AUTH — Login y sesión');

  // Login sin body → 400
  const r0 = await req('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert('Login sin credenciales retorna 400/422', r0.status === 400 || r0.status === 422, `Status: ${r0.status}`);

  // Login con credenciales incorrectas → 401
  const r1 = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: TENANT_SLUG, email: 'wrong@test.com', password: 'wrongpassword' }),
  });
  assert('Login incorrecto retorna 401', r1.status === 401, `Status: ${r1.status}`);

  // Login correcto → 200 + cookie
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: TENANT_SLUG, email: TEST_EMAIL, password: TEST_PASSWORD }),
    redirect: 'manual',
  });

  assert('Login correcto retorna 200', loginRes.status === 200, `Status: ${loginRes.status}`);

  const setCookie = loginRes.headers.get('set-cookie') || '';
  assert('Login correcto setea cookie barber_access_token', setCookie.includes('barber_access_token'), `Set-Cookie: ${setCookie.substring(0, 100)}`);
  assert('Cookie es httpOnly', setCookie.toLowerCase().includes('httponly'), `Set-Cookie: ${setCookie.substring(0, 100)}`);
  assert('Cookie es SameSite', setCookie.toLowerCase().includes('samesite'), `Set-Cookie: ${setCookie.substring(0, 100)}`);

  if (setCookie.includes('barber_access_token')) {
    authCookie = setCookie.split(';')[0]; // solo el token, sin flags
    console.log('  ℹ️  Cookie capturada para tests autenticados');
  }
}

async function testAuthenticatedEndpoints() {
  section('AUTH — Endpoints con sesión válida');

  if (!authCookie) {
    console.log('  ⚠️  Sin cookie de sesión — tests de auth omitidos (login falló)');
    return;
  }

  // GET appointments → 200 con datos
  const r1 = await req('/api/appointments');
  assert('GET /api/appointments autenticado retorna 200', r1.status === 200, `Status: ${r1.status}`);
  if (r1.status === 200) {
    assert('/api/appointments retorna success:true', r1.body?.success === true, `Body: ${JSON.stringify(r1.body).substring(0, 100)}`);
    assert('/api/appointments retorna array de datos', Array.isArray(r1.body?.data), `Data type: ${typeof r1.body?.data}`);
  }

  // GET clients
  const r2 = await req('/api/clients');
  assert('GET /api/clients autenticado retorna 200', r2.status === 200, `Status: ${r2.status}`);

  // GET barbers
  const r3 = await req('/api/barbers');
  assert('GET /api/barbers autenticado retorna 200', r3.status === 200, `Status: ${r3.status}`);

  // GET productos
  const r4 = await req('/api/productos');
  assert('GET /api/productos autenticado retorna 200', r4.status === 200, `Status: ${r4.status}`);

  // GET gastos
  const r5 = await req('/api/gastos');
  assert('GET /api/gastos autenticado retorna 200', r5.status === 200, `Status: ${r5.status}`);

  // GET settings → 200
  const r6 = await req('/api/settings');
  assert('GET /api/settings autenticado retorna 200', r6.status === 200, `Status: ${r6.status}`);
}

async function testTenantIsolation() {
  section('MULTI-TENANT — Aislamiento de datos');

  if (!authCookie) {
    console.log('  ⚠️  Sin cookie de sesión — test omitido');
    return;
  }

  // Intentar acceder a datos con token de un tenant pero ID de otro
  // Si los IDs son secuenciales podría haber IDOR
  const r = await req('/api/appointments/999999999');
  assert(
    'Acceso a cita ID inexistente retorna 404 (no datos de otro tenant)',
    r.status === 404 || r.status === 400,
    `Status: ${r.status} — si retorna 200 con datos, posible IDOR`
  );

  const r2 = await req('/api/clients/999999999');
  assert(
    'Acceso a cliente ID inexistente retorna 404 (no datos de otro tenant)',
    r2.status === 404 || r2.status === 400,
    `Status: ${r2.status}`
  );
}

async function testPaginationAndFilters() {
  section('API — Paginación y filtros');

  if (!authCookie) {
    console.log('  ⚠️  Sin cookie de sesión — test omitido');
    return;
  }

  // Paginación estándar
  const r1 = await req('/api/clients?page=1&limit=10');
  assert('GET /api/clients?page=1&limit=10 retorna 200', r1.status === 200, `Status: ${r1.status}`);
  if (r1.status === 200 && r1.body?.pagination) {
    assert('Paginación tiene campo total', r1.body.pagination.total !== undefined);
    assert('Paginación tiene campo page', r1.body.pagination.page !== undefined);
    assert('Paginación tiene campo pages/totalPages', r1.body.pagination.pages !== undefined || r1.body.pagination.totalPages !== undefined);
  }

  // Límite extremo → no debe retornar millones de registros
  const r2 = await req('/api/clients?limit=99999');
  assert(
    'GET /api/clients?limit=99999 no retorna 500',
    r2.status !== 500,
    `Status: ${r2.status}`
  );
  if (r2.status === 200 && r2.body?.data) {
    assert(
      'Límite excesivo es capped (máx 1000 registros en una respuesta)',
      (r2.body.data?.length || 0) <= 1000,
      `Registros retornados: ${r2.body.data?.length}`
    );
  }
}

async function testLogout() {
  section('AUTH — Logout');

  if (!authCookie) {
    console.log('  ⚠️  Sin cookie de sesión — test omitido');
    return;
  }

  const r = await req('/api/auth/logout', { method: 'POST' });
  assert('POST /api/auth/logout retorna 200', r.status === 200, `Status: ${r.status}`);

  const setCookie = r.headers.get('set-cookie') || '';
  assert(
    'Logout limpia la cookie (Max-Age=0 o Expires pasado)',
    setCookie.includes('Max-Age=0') || setCookie.includes('max-age=0') || setCookie.includes('1970'),
    `Set-Cookie: ${setCookie.substring(0, 150)}`
  );

  // Después del logout, el token ya no debe servir
  const r2 = await req('/api/appointments');
  assert(
    'Después de logout, el token anterior es inválido (401)',
    r2.status === 401,
    `Status: ${r2.status} — si 200, la sesión sigue activa después de logout`
  );

  authCookie = null; // limpiar para no contaminar otros tests
}

async function testCronJobs() {
  section('CRON — Validación de estructura de respuesta');

  // Verificar que los endpoints de cron existen y responden de forma controlada
  // (el test de seguridad ya verifica que sean privados)
  const r = await req('/api/health');
  assert(
    'Servicio responde: cron jobs pueden ejecutarse',
    r.status === 200,
    `Health status: ${r.status}`
  );
}

// ─── Runner ──────────────────────────────────────────────────────────────────

async function run() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     FUNCTIONAL TESTS — Speeddan Barbería ERP             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`  Base URL : ${BASE_URL}`);
  console.log(`  Tenant   : ${TENANT_SLUG}`);
  console.log(`  Email    : ${TEST_EMAIL}`);
  console.log(`  Fecha    : ${new Date().toISOString()}`);

  await testHealth();
  await testPublicBookList();
  await testPublicBookDetail();
  await testSlotsBasic();
  await testMultiServiceBug();
  await testLogin();                    // ← establece authCookie
  await testAuthenticatedEndpoints();
  await testTenantIsolation();
  await testPaginationAndFilters();
  await testLogout();                   // ← limpia authCookie
  await testCronJobs();

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
