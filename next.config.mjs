/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost'],
    unoptimized: false,
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
  webpack: (config, { dev, isServer }) => {
    // Ant Design React uyumsuzluk uyarısını bastır
    if (dev && !isServer) {
      const originalWarn = console.warn;
      console.warn = (...args) => {
        if (
          args[0] &&
          typeof args[0] === 'string' &&
          args[0].includes('[antd: compatible]')
        ) {
          return;
        }
        originalWarn(...args);
      };
    }
    return config;
  },
};

export default nextConfig; 