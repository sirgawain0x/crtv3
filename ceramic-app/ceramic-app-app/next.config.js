/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-icons/fa': 'react-icons/fa/index.js',
    };
    return config;
  },
};

module.exports = nextConfig;
