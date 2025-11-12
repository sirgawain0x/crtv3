import createPWA from "next-pwa";

const withPWA = createPWA({
  dest: "public",
  disable: true, // Temporarily disable PWA to test if service worker is causing abort signal issues
  // disable: process.env.NODE_ENV === "development",
  // Disable PWA for Vercel builds to avoid routes-manifest.json issues
  // disable: process.env.NODE_ENV === "development" || process.env.VERCEL === "1",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack configuration (Next.js 16 uses Turbopack by default)
  turbopack: {},
  // Optimize memory usage in development
  experimental: {
    // Reduce memory usage by optimizing compilation
    optimizePackageImports: ['@account-kit/react', '@account-kit/core', '@apollo/client', 'lucide-react', 'framer-motion'],
  },
  // Reduce unnecessary rebuilds
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.ipfs.w3s.link",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "w3s.link",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.ipfs.storacha.link",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storacha.link",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.ipfs.dweb.link",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "dweb.link",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "4everland.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "nft.storage",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "gateway.lighthouse.storage",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.lighthouse.storage",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "snapshotsplugin.s3.us-west-2.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.livepeer.studio",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.livepeer.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.livepeercdn.studio",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.livepeercdn.com",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
