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
  turbopack: {
    // Exclude test files and other non-essential files from processing
    resolveAlias: {
      // This helps prevent processing of test files
    },
  },
  // Optimize memory usage in development
  experimental: {
    // Reduce memory usage by optimizing compilation
    optimizePackageImports: ['@account-kit/react', '@account-kit/core', '@apollo/client', 'lucide-react', 'framer-motion'],
  },
  // External packages that should not be processed by the bundler
  // Note: Only externalize if they're causing build issues
  // serverComponentsExternalPackages: ['thread-stream'],
  // Webpack configuration for WebAssembly support
  webpack: (config, { isServer, webpack }) => {
    // Enable async WebAssembly loading (required for XMTP WASM bindings)
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Configure resolve to ignore problematic patterns
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
    };

    // Tell webpack not to parse test files and other non-essential files
    config.module = config.module || {};
    config.module.noParse = config.module.noParse || [];
    // Add regex patterns for files that shouldn't be parsed
    if (Array.isArray(config.module.noParse)) {
      config.module.noParse.push(/node_modules\/thread-stream\/test/);
      config.module.noParse.push(/node_modules\/thread-stream\/.*\.test\./);
      config.module.noParse.push(/node_modules\/thread-stream\/.*\.spec\./);
    }

    // Ignore test files and other non-essential files from node_modules
    // This prevents Turbopack/webpack from trying to process test files
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream\/test/,
      })
    );

    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream\/.*\.(test|spec)\./,
      })
    );

    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream\/.*\.(md|txt|zip|sh|LICENSE)/,
      })
    );

    // Handle .wasm files as asset resources
    // Place them in static/media/ to match Next.js default behavior
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/media/[name].[contenthash][ext]',
        publicPath: '/_next/static/media/',
      },
    });

    // Ensure proper public path resolution for WASM files
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
      };

      // Note: Webpack plugins may not work with Turbopack
      // The runtime patch in wasm-patch.ts should handle this
      // But we can try to add the plugin for non-Turbopack builds
      try {
        const WasmWorkerPlugin = require('./lib/webpack/wasm-worker-plugin.js');
        config.plugins.push(new WasmWorkerPlugin());
      } catch (e) {
        // Plugin not available or not needed (Turbopack mode)
        console.warn('WasmWorkerPlugin not loaded (may be using Turbopack):', e.message);
      }

      // Set publicPath to ensure WASM files are served correctly
      // This helps with resolving paths in workers
      if (!config.output.publicPath) {
        config.output.publicPath = '/_next/';
      }
    }

    return config;
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
