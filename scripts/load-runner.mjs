const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TENANT_SLUG = process.env.TENANT_SLUG || 'speeddan-demo';
const EMAIL = process.env.ERP_EMAIL || '';
const PASSWORD = process.env.ERP_PASSWORD || '';
const PROFILE = process.env.PROFILE || 'smoke';
const WRITE_BOOKING = process.env.WRITE_BOOKING === 'true';

const profiles = {
  smoke: { vus: 2, durationSec: 30 },
  load: { vus: 100, durationSec: 300 },
  stress: { vus: 300, durationSec: 300 },
};

const profile = profiles[PROFILE] || profiles.smoke;
const stopAt = Date.now() + profile.durationSec * 1000;
const stats = [];

function futureDate(daysFromNow = 2) {
  const d = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function record(name, status, durationMs, ok) {
  stats.push({ name, status, durationMs, ok });
}

async function timed(name, fn, okStatus = [200]) {
  const start = performance.now();
  try {
    const res = await fn();
    const durationMs = performance.now() - start;
    const ok = okStatus.includes(res.status);
    record(name, res.status, durationMs, ok);
    return res;
  } catch {
    record(name, 0, performance.now() - start, false);
    return null;
  }
}

function cookieHeader(res) {
  const raw = res?.headers?.getSetCookie?.() || [];
  const fallback = res?.headers?.get?.('set-cookie');
  if (raw.length === 0 && fallback) raw.push(fallback);
  return raw
    .map(cookie => cookie.split(';')[0])
    .filter(cookie => cookie.startsWith('barber_'))
    .join('; ');
}

async function login() {
  if (!EMAIL || !PASSWORD) return '';
  const res = await timed('POST /api/auth/login', () => fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, slug: TENANT_SLUG }),
  }));
  return cookieHeader(res);
}

async function getJson(name, url, headers = {}) {
  const res = await timed(name, () => fetch(url, { headers }));
  if (!res || res.status !== 200) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function runVu(vu) {
  const cookies = await login();
  const headers = cookies ? { Cookie: cookies } : {};

  while (Date.now() < stopAt) {
    const info = await getJson('GET /api/book/[slug]', `${BASE_URL}/api/book/${TENANT_SLUG}`);
    const serviceId = info?.services?.[0]?.id;

    if (serviceId) {
      await timed(
        'GET /api/book/[slug]/slots',
        () => fetch(`${BASE_URL}/api/book/${TENANT_SLUG}/slots?date=${futureDate()}&serviceId=${serviceId}`),
      );
    }

    if (WRITE_BOOKING && serviceId) {
      await timed('POST /api/book/[slug]', () => fetch(`${BASE_URL}/api/book/${TENANT_SLUG}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId,
          date: futureDate(3),
          time: '09:00',
          clientName: `Load Test ${vu}`,
          clientPhone: `+503 70${String(vu).padStart(2, '0')}${String(Date.now()).slice(-4)}`,
          clientEmail: `loadtest-${vu}-${Date.now()}@example.com`,
          notes: 'node load test',
        }),
      }), [201, 409, 429]);
    }

    if (cookies) {
      const endpoints = [
        '/api/health',
        '/api/appointments/stats',
        '/api/appointments',
        '/api/pos/stats',
        '/api/gastos',
        '/api/clients',
        '/api/services',
      ];

      for (const endpoint of endpoints) {
        await timed(`GET ${endpoint}`, () => fetch(`${BASE_URL}${endpoint}`, { headers }));
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function printSummary() {
  const total = stats.length;
  const failed = stats.filter(s => !s.ok).length;
  const durations = stats.map(s => s.durationMs);
  const elapsedSec = profile.durationSec;

  console.log('\nLoad test summary');
  console.log(`Profile: ${PROFILE}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Virtual users: ${profile.vus}`);
  console.log(`Requests: ${total}`);
  console.log(`RPS: ${(total / elapsedSec).toFixed(2)}`);
  console.log(`Failed: ${failed} (${total ? ((failed / total) * 100).toFixed(2) : 0}%)`);
  console.log(`p50: ${percentile(durations, 0.50).toFixed(0)} ms`);
  console.log(`p95: ${percentile(durations, 0.95).toFixed(0)} ms`);
  console.log(`p99: ${percentile(durations, 0.99).toFixed(0)} ms`);

  const byName = new Map();
  for (const item of stats) {
    const items = byName.get(item.name) || [];
    items.push(item);
    byName.set(item.name, items);
  }
  console.log('\nBy endpoint');
  for (const [name, items] of byName.entries()) {
    const endpointFailed = items.filter(s => !s.ok).length;
    const endpointDurations = items.map(s => s.durationMs);
    console.log(`${name}: count=${items.length} failed=${endpointFailed} p95=${percentile(endpointDurations, 0.95).toFixed(0)}ms`);
  }
}

console.log(`Running ${PROFILE} load test against ${BASE_URL} with ${profile.vus} VUs for ${profile.durationSec}s`);
await Promise.all(Array.from({ length: profile.vus }, (_, index) => runVu(index + 1)));
printSummary();
