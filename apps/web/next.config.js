/** @type {import('next').NextConfig} */
const apiInternal = process.env.API_INTERNAL_URL || 'http://127.0.0.1:3001';
const nextConfig = {
  transpilePackages: ['@siparis/types'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiInternal}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
