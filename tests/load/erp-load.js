import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TENANT_SLUG = __ENV.TENANT_SLUG || 'speeddan-demo';
const EMAIL = __ENV.ERP_EMAIL || '';
const PASSWORD = __ENV.ERP_PASSWORD || '';
const PROFILE = __ENV.PROFILE || 'smoke';
const WRITE_BOOKING = __ENV.WRITE_BOOKING === 'true';
const LOGIN_EVERY_ITERATION = __ENV.LOGIN_EVERY_ITERATION === 'true';

const profiles = {
  smoke: {
    vus: 1,
    duration: '30s',
    thresholds: {
      http_req_failed: ['rate<0.05'],
      http_req_duration: ['p(95)<1500'],
    },
  },
  load: {
    stages: [
      { duration: '2m', target: 25 },
      { duration: '5m', target: 100 },
      { duration: '5m', target: 250 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.03'],
      http_req_duration: ['p(95)<2000'],
    },
  },
  stress: {
    stages: [
      { duration: '3m', target: 100 },
      { duration: '5m', target: 300 },
      { duration: '5m', target: 600 },
      { duration: '5m', target: 1000 },
      { duration: '3m', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.10'],
      http_req_duration: ['p(95)<5000'],
    },
  },
};

export const options = profiles[PROFILE] || profiles.smoke;

function authHeaders(cookies) {
  return cookies ? { headers: { Cookie: cookies } } : {};
}

function login() {
  if (!EMAIL || !PASSWORD) return null;

  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      slug: TENANT_SLUG,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, {
    'login status is 200': r => r.status === 200,
    'login returns auth cookie': r => Boolean(r.cookies.barber_access_token?.[0]?.value),
  });

  const accessToken = res.cookies.barber_access_token?.[0]?.value;
  const refreshToken = res.cookies.barber_refresh_token?.[0]?.value;
  if (!accessToken) return null;

  return [
    `barber_access_token=${accessToken}`,
    refreshToken ? `barber_refresh_token=${refreshToken}` : '',
  ].filter(Boolean).join('; ');
}

function futureDate(daysFromNow = 2) {
  const d = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function setup() {
  return {
    cookies: login(),
  };
}

export default function (data) {
  const cookies = LOGIN_EVERY_ITERATION ? login() : data.cookies;
  const protectedParams = authHeaders(cookies);

  group('public booking read flow', () => {
    const info = http.get(`${BASE_URL}/api/book/${TENANT_SLUG}`);
    check(info, {
      'public booking info is 200': r => r.status === 200,
    });

    const body = info.json();
    const serviceId = body?.services?.[0]?.id;
    if (serviceId) {
      const slots = http.get(
        `${BASE_URL}/api/book/${TENANT_SLUG}/slots?date=${futureDate()}&serviceId=${serviceId}`,
      );
      check(slots, {
        'booking slots is 200': r => r.status === 200,
      });
    }

    if (WRITE_BOOKING && serviceId) {
      const booking = http.post(
        `${BASE_URL}/api/book/${TENANT_SLUG}`,
        JSON.stringify({
          serviceId,
          date: futureDate(3),
          time: '09:00',
          clientName: `Load Test ${__VU}-${__ITER}`,
          clientPhone: `+503 70${String(__VU).padStart(2, '0')}${String(__ITER).padStart(4, '0')}`,
          clientEmail: `loadtest-${__VU}-${__ITER}@example.com`,
          notes: 'k6 load test',
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
      check(booking, {
        'optional booking write is 201 or controlled conflict': r => [201, 409, 429].includes(r.status),
      });
    }
  });

  group('erp protected read flow', () => {
    if (!cookies) return;

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
      const res = http.get(`${BASE_URL}${endpoint}`, protectedParams);
      check(res, {
        [`${endpoint} is allowed`]: r => r.status === 200,
      });
    }
  });

  sleep(1);
}
