/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'snapshotsplugin.s3.us-west-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'locksmith.unlock-protocol.com',
      },
      {
        protocol: 'https',
        hostname: 'obj-store.livepeer.cloud',
      },
      {
        protocol: 'https',
        hostname: 'storage.unlock-protocol.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.dweb.link',
      },
    ],
  },
  // Configure webpack
  webpack: (config, { dev, isServer }) => {
    // Add optimization for large strings
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
      splitChunks: {
        ...config.optimization.splitChunks,
        chunks: 'all',
        minSize: 20000,
        maxSize: 100000,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          largeStrings: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      },
    };

    return config;
  },
};

module.exports = nextConfig;
