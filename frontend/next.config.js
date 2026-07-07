/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow backend API calls during development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:5000/api/:path*",
      },
    ];
  },

  // Increase proxy timeout for large CSV processing
  experimental: {
    proxyTimeout: 300000, // 5 minutes
  },
};

module.exports = nextConfig;
