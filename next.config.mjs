/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost', 's3.tebi.io', 'tebi.io', 'images.unsplash.com'],
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