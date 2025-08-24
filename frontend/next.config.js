/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  
  // API rewrites for development
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/admin/:path*',
          destination: 'http://localhost:3001/api/:path*'
        },
        {
          source: '/api/files/:path*',
          destination: 'http://localhost:3002/api/:path*'
        }
      ];
    }
    return [];
  },

  // Environment variables
  env: {
    ADMIN_API_BASE: process.env.NEXT_PUBLIC_ADMIN_BASE || 'http://localhost:3001',
    FILES_API_BASE: process.env.NEXT_PUBLIC_FILES_BASE || 'http://localhost:3002'
  },

  // Add health check endpoint
  async headers() {
    return [
      {
        source: '/health',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;