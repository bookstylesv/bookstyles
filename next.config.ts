import type { NextConfig } from "next";

const SUPERADMIN_CORS_HEADERS = [
  { key: 'Access-Control-Allow-Origin',  value: process.env.SUPERADMIN_ALLOW_ORIGIN ?? 'https://speeddan-control.vercel.app' },
  { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
  { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
];

const BOOKING_CORS_HEADERS = [
  { key: 'Access-Control-Allow-Origin',  value: '*' },
  { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
  { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
];

const nextConfig: NextConfig = {
  transpilePackages: [
    'antd',
    '@ant-design/icons',
    '@ant-design/cssinjs',
    'rc-util',
    'rc-pagination',
    'rc-picker',
    'rc-table',
    'rc-tree',
    'rc-select',
    'rc-field-form',
  ],
  async headers() {
    return [
      {
        source:  '/api/superadmin/:path*',
        headers: SUPERADMIN_CORS_HEADERS,
      },
      {
        // Permite que /book/ sea embebido en iframe desde cualquier origen
        source: '/book/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
      {
        // CORS para GET /api/book (lista de negocios — sin sub-ruta)
        source: '/api/book',
        headers: BOOKING_CORS_HEADERS,
      },
      {
        // CORS para /api/book/[slug] y /api/book/[slug]/slots
        source: '/api/book/:path*',
        headers: BOOKING_CORS_HEADERS,
      },
    ];
  },
};

export default nextConfig;
