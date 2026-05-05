/**
 * SECURITY TESTS — Speeddan Barbería ERP
 * Detecta vulnerabilidades: auth bypass, CORS, rate limit, header injection, XSS, etc.
 *
 * Uso: node tests/api/security.test.mjs [BASE_URL]
 * Ejemplo:
 *   node tests/api/security.test.mjs http://localhost:3000
 *   node tests/api/security.test.mjs https://speeddan-barberia.vercel.app
 */

const BASE_URL = (process.argv[2] || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TENANT_SLUG = process.env.TENANT_SLUG || 'speeddan-demo';

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

async function req(path, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      redirect: 'manual',
      ...options,
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

async function testAuthEndpoints() {
  section('AUTH — Protección de endpoints privados');

  // Sin token → debe rechazar
  const routes = [
    '/api/appointments',
    '/api/clients',
    '/api/barbers',
    '/api/pos/venta',
    '/api/planilla',
    '/api/gastos',
    '/api/usuarios',
    '/api/productos',
    '/api/compras',
    '/api/settings',
  ];

  for (const route of routes) {
    const r = await req(route);
    assert(
      `Sin token → ${route} retorna 401`,
      r.status === 401,
      `Recibido: ${r.status}`
    );
  }
}

async function testSuperadminAuth() {
  section('AUTH — Superadmin sin credenciales');

  const superRoutes = [
    '/api/superadmin/dashboard',
    '/api/superadmin/tenants',
    '/api/superadmin/config',
    '/api/superadmin/plans',
  ];

  for (const route of superRoutes) {
    const r = await req(route);
    assert(
      `Superadmin sin API key → ${route} retorna 401`,
      r.status === 401,
      `Recibido: ${r.status}`
    );
  }

  // Con API key falsa
  for (const route of superRoutes) {
    const r = await req(route, {
      headers: { Authorization: 'Bearer sk_fake_invalid_key_12345' },
    });
    assert(
      `Superadmin con key falsa → ${route} retorna 401`,
      r.status === 401,
      `Recibido: ${r.status}`
    );
  }
}

async function testCronProtection() {
  section('AUTH — Cron endpoints (no deben ser públicos)');

  const r1 = await req('/api/cron/expire-pending', { method: 'POST' });
  assert(
    'Cron expire-pending requiere autorización',
    r1.status === 401 || r1.status === 403,
    `Recibido: ${r1.status} — si retorna 200, el cron es público`
  );

  const r2 = await req('/api/cron/clean-login-attempts', { method: 'POST' });
  assert(
    'Cron clean-login-attempts requiere autorización',
    r2.status === 401 || r2.status === 403,
    `Recibido: ${r2.status}`
  );
}

async function testRateLimiting() {
  section('AUTH — Rate limiting en login');

  let blockedAt = null;
  for (let i = 1; i <= 12; i++) {
    const r = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: TENANT_SLUG, email: 'attacker@test.com', password: 'wrong' }),
    });
    if (r.status === 429) {
      blockedAt = i;
      break;
    }
  }
  assert(
    'Rate limit activo: bloquea antes del intento #11',
    blockedAt !== null && blockedAt <= 11,
    blockedAt ? `Bloqueado en intento #${blockedAt}` : 'Nunca bloqueó — VULNERABLE'
  );
}

async function testSecurityHeaders() {
  section('HEADERS — Cabeceras de seguridad');

  const r = await req('/api/health');

  const csp = r.headers.get('content-security-policy');
  assert('Tiene Content-Security-Policy', csp !== null, 'Header ausente');

  const xco = r.headers.get('x-content-type-options');
  assert('Tiene X-Content-Type-Options: nosniff', xco === 'nosniff', `Valor: ${xco}`);

  const xfo = r.headers.get('x-frame-options');
  // /api/book usa ALLOWALL, pero endpoints de API no deberían
  assert(
    'Endpoints API no exponen X-Frame-Options ALLOWALL',
    xfo !== 'ALLOWALL',
    `Valor: ${xfo} — en API general esto sería un problema`
  );

  const sts = r.headers.get('strict-transport-security');
  // Solo aplica en producción (HTTPS)
  const isLocal = BASE_URL.startsWith('http://localhost');
  if (!isLocal) {
    assert('Tiene Strict-Transport-Security (prod)', sts !== null, 'Header ausente en producción');
  } else {
    assert('HSTS omitido en local (OK)', true);
  }
}

async function testCORSPublicBooking() {
  section('CORS — Endpoints públicos /api/book');

  // Origen legítimo (landing)
  const r1 = await req(`/api/book`, {
    headers: {
      Origin: 'https://bookstyle-landing.vercel.app',
    },
  });
  assert(
    'CORS: /api/book acepta origen de landing',
    r1.status !== 0,
    `Status: ${r1.status}`
  );

  // Origen arbitrario — idealmente debería restringirse
  const r2 = await req(`/api/book`, {
    headers: { Origin: 'https://evil-attacker.com' },
  });
  const allowOrigin = r2.headers.get('access-control-allow-origin');
  assert(
    'CORS: /api/book no retorna wildcard * para origen desconocido',
    allowOrigin !== '*',
    `Access-Control-Allow-Origin: ${allowOrigin} — wildcard permite CSRF desde cualquier origen`
  );
}

async function testCORSPrivateAPI() {
  section('CORS — Endpoints privados /api/appointments');

  const r = await req('/api/appointments', {
    headers: { Origin: 'https://evil-attacker.com' },
  });
  const allowOrigin = r.headers.get('access-control-allow-origin');
  assert(
    'CORS privado: /api/appointments no retorna wildcard *',
    allowOrigin !== '*',
    `Valor: ${allowOrigin}`
  );
}

async function testPublicBookingSecurity() {
  section('BOOK — Validación de inputs en endpoints públicos');

  // Slug inexistente → 404, no 500
  const r1 = await req('/api/book/____nonexistent_slug____');
  assert(
    'GET /api/book/slug_inexistente retorna 404 (no 500)',
    r1.status === 404,
    `Recibido: ${r1.status}`
  );

  // POST con payload vacío → 400/422, no 500
  const r2 = await req(`/api/book/${TENANT_SLUG}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert(
    'POST /api/book/[slug] con payload vacío retorna 400/422 (no 500)',
    r2.status === 400 || r2.status === 422,
    `Recibido: ${r2.status}`
  );

  // Payload con XSS en nombre de cliente
  const r3 = await req(`/api/book/${TENANT_SLUG}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientName: '<script>alert(1)</script>',
      clientPhone: '77777777',
      clientEmail: 'xss@test.com',
      serviceId: 1,
      barberId: null,
      date: '2099-01-01',
      time: '10:00',
    }),
  });
  assert(
    'POST booking con XSS en nombre no retorna 500',
    r3.status !== 500,
    `Recibido: ${r3.status} — si 500 hay error no controlado`
  );

  // SQL injection en slug
  const r4 = await req(`/api/book/' OR '1'='1`);
  assert(
    'GET /api/book con SQL injection en slug retorna 404 (no 500)',
    r4.status === 404 || r4.status === 400,
    `Recibido: ${r4.status}`
  );
}

async function testSlotsValidation() {
  section('BOOK — Validación de parámetros en /slots');

  // Sin parámetros requeridos → error controlado
  const r1 = await req(`/api/book/${TENANT_SLUG}/slots`);
  assert(
    'GET /slots sin parámetros retorna 400/422 (no 500)',
    r1.status === 400 || r1.status === 422 || r1.status === 404,
    `Recibido: ${r1.status}`
  );

  // Fecha inválida
  const r2 = await req(`/api/book/${TENANT_SLUG}/slots?date=not-a-date&totalDuration=30&serviceId=1`);
  assert(
    'GET /slots con fecha inválida retorna error controlado (no 500)',
    r2.status !== 500,
    `Recibido: ${r2.status}`
  );

  // Parámetros numéricos negativos
  const r3 = await req(`/api/book/${TENANT_SLUG}/slots?date=2099-01-01&totalDuration=-999&serviceId=-1`);
  assert(
    'GET /slots con valores negativos retorna error controlado (no 500)',
    r3.status !== 500,
    `Recibido: ${r3.status}`
  );
}

async function testSensitiveDataExposure() {
  section('DATOS — Exposición de información sensible');

  // Login fallido no debe revelar si el usuario existe
  const r1 = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: TENANT_SLUG, email: 'existe@speeddan.com', password: 'wrong' }),
  });
  const r2 = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: TENANT_SLUG, email: 'noexiste999@test.com', password: 'wrong' }),
  });

  const msg1 = r1.body?.error || '';
  const msg2 = r2.body?.error || '';
  assert(
    'Login fallido: mensajes de error no distinguen usuario existente vs inexistente',
    msg1 === msg2 || (msg1 === '' && msg2 === ''),
    `\n    Usuario existente: "${msg1}"\n    Usuario inexistente: "${msg2}"`
  );

  // /api/health no debe exponer stack traces o detalles internos
  const r3 = await req('/api/health');
  const bodyStr = JSON.stringify(r3.body || '');
  assert(
    '/api/health no expone stack traces ni rutas internas',
    !bodyStr.includes('at Object') && !bodyStr.includes('node_modules') && !bodyStr.includes('prisma/'),
    'Se encontraron datos internos en la respuesta'
  );
}

async function testMethodNotAllowed() {
  section('HTTP — Métodos no permitidos');

  // DELETE en endpoint que no lo soporta
  const r1 = await req('/api/appointments', { method: 'DELETE' });
  assert(
    'DELETE /api/appointments retorna 405 (no 500)',
    r1.status === 405 || r1.status === 404,
    `Recibido: ${r1.status}`
  );

  // PATCH en endpoint público
  const r2 = await req('/api/book', { method: 'PATCH' });
  assert(
    'PATCH /api/book retorna 405 (no 500)',
    r2.status === 405 || r2.status === 404,
    `Recibido: ${r2.status}`
  );
}

async function testPathTraversal() {
  section('SEGURIDAD — Path traversal en IDs dinámicos');

  const traversalPayloads = [
    '../../etc/passwd',
    '../admin',
    '0/../../superadmin',
  ];

  for (const payload of traversalPayloads) {
    const r = await req(`/api/appointments/${payload}`);
    assert(
      `Path traversal "${payload}" retorna 404/400 (no 500)`,
      r.status === 404 || r.status === 400 || r.status === 401,
      `Recibido: ${r.status}`
    );
  }
}

async function testLargePayload() {
  section('SEGURIDAD — Payloads extremos (DoS)');

  // Payload enorme → no debe causar 500
  const huge = { name: 'A'.repeat(100_000), email: 'a@b.com', password: 'test' };
  const r = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(huge),
  });
  assert(
    'Payload de 100KB en login no causa 500',
    r.status !== 500,
    `Recibido: ${r.status}`
  );
}

// ─── Runner ──────────────────────────────────────────────────────────────────

async function run() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║      SECURITY TESTS — Speeddan Barbería ERP              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`  Base URL : ${BASE_URL}`);
  console.log(`  Tenant   : ${TENANT_SLUG}`);
  console.log(`  Fecha    : ${new Date().toISOString()}`);

  await testAuthEndpoints();
  await testSuperadminAuth();
  await testCronProtection();
  await testRateLimiting();
  await testSecurityHeaders();
  await testCORSPublicBooking();
  await testCORSPrivateAPI();
  await testPublicBookingSecurity();
  await testSlotsValidation();
  await testSensitiveDataExposure();
  await testMethodNotAllowed();
  await testPathTraversal();
  await testLargePayload();

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
