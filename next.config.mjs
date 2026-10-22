import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.tebi.io',
      },
      {
        protocol: 'https',
        hostname: 'tebi.io',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.b-cdn.net',
      },
      {
        protocol: 'https',
        hostname: '*.bunnycdn.com',
      },
      {
        protocol: 'https',
        hostname: '*.bunny.net',
      },
    ],
    unoptimized: false,
    maximumDiskCacheSize: 256 * 1024 * 1024,
    maximumResponseBody: 12 * 1024 * 1024,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  compress: true,
  poweredByHeader: false,
  trailingSlash: false,
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Content-Security-Policy', value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'" },
      ],
    }];
  },
  webpack: (config, { dev, isServer }) => {
    // Ant Design React uyumsuzluk uyarısını bastır
    if (dev && !isServer) {
      const originalWarn = console.warn;
      const originalError = console.error;
      
      console.warn = (...args) => {
        if (
          args[0] &&
          typeof args[0] === 'string' &&
          (args[0].includes('[antd: compatible]') || 
           args[0].includes('antd v5 support React is 16 ~ 18'))
        ) {
          return;
        }
        originalWarn(...args);
      };

      console.error = (...args) => {
        if (
          args[0] &&
          typeof args[0] === 'string' &&
          (args[0].includes('[antd: compatible]') || 
           args[0].includes('antd v5 support React is 16 ~ 18'))
        ) {
          return;
        }
        originalError(...args);
      };
    }
    return config;
  },
};

export default nextConfig;
