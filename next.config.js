/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    }
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent issues with Node.js modules in the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        child_process: false,
        // Add any other Node.js modules your project uses
        dns: false,
        path: false,
        os: false,
        stream: false,
        crypto: false,
        http: false,
        https: false,
        zlib: false,
        util: false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig; 