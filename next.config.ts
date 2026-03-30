import type { NextConfig } from "next";

const SUPERADMIN_CORS_HEADERS = [
  { key: 'Access-Control-Allow-Origin',  value: process.env.SUPERADMIN_ALLOW_ORIGIN ?? 'https://speeddan-control.vercel.app' },
  { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
  { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
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
    ];
  },
};

export default nextConfig;
