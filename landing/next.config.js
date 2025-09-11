/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  trailingSlash: false,
  poweredByHeader: false,
  compress: true,
  
  async rewrites() {
    return [
      {
        source: '/app/:path*',
        destination: 'http://app:3000/:path*', // 转发到应用工具
      },
      {
        source: '/api/:path*',
        destination: 'http://backend:8000/api/:path*', // 转发到后端API
      }
    ];
  },

  experimental: {
    optimizePackageImports: ['@heroicons/react', 'lucide-react']
  }
};

module.exports = nextConfig;