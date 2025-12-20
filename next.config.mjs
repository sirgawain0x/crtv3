import createPWA from "next-pwa";
import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";

// Debug logging helper
const logPath = join(process.cwd(), '.cursor', 'debug.log');
const log = (location, message, data, hypothesisId) => {
  try {
    const dir = join(process.cwd(), '.cursor');
    try {
      mkdirSync(dir, { recursive: true });
    } catch (e) {
      // Directory might already exist
    }
    const logEntry = JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId,
    }) + '\n';
    appendFileSync(logPath, logEntry, 'utf8');
  } catch (e) {
    // Silent fail if log file can't be written
    console.error('Log error:', e.message);
  }
};

// #region agent log
log('next.config.mjs:1', 'config file loaded', { cwd: process.cwd() }, 'H4');
// #endregion

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
  // Externalize thread-stream and pino packages on server to avoid bundling test files
  serverExternalPackages: ['thread-stream', 'pino', 'pino-pretty', 'node-datachannel'],
  // Webpack configuration for WebAssembly support
  webpack: (config, { isServer, webpack }) => {
    // #region agent log
    log('next.config.mjs:29', 'webpack config called', { isServer }, 'H4');
    // #endregion

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
    // Prevent webpack from resolving test files and benchmarks
    config.resolve.modules = config.resolve.modules || ['node_modules'];

    // Add resolve plugins to filter out problematic files
    if (!config.resolve.plugins) {
      config.resolve.plugins = [];
    }

    // Custom resolve plugin to log thread-stream module resolution attempts
    // #region agent log
    config.resolve.plugins.push({
      apply(resolver) {
        resolver.hooks.resolve.tapAsync('ThreadStreamResolver', (request, resolveContext, callback) => {
          if (request.request && (request.request.includes('thread-stream') || request.request.includes('tap') || request.request.includes('desm') || request.request.includes('why-is-node-running'))) {
            log('next.config.mjs:58', 'resolve attempt', {
              request: request.request,
              context: request.context || '',
              issuer: request.context?.issuer || '',
            }, 'H5');
          }
          callback();
        });
      },
    });
    // #endregion

    // Tell webpack not to parse test files and other non-essential files
    config.module = config.module || {};
    config.module.noParse = config.module.noParse || [];
    // Add regex patterns for files that shouldn't be parsed
    if (Array.isArray(config.module.noParse)) {
      config.module.noParse.push(/node_modules\/thread-stream\/test/);
      config.module.noParse.push(/node_modules\/thread-stream\/.*\.test\./);
      config.module.noParse.push(/node_modules\/thread-stream\/.*\.spec\./);
      config.module.noParse.push(/node_modules\/thread-stream\/bench\.js/);
    }

    // Ensure plugins array exists
    if (!config.plugins) {
      config.plugins = [];
    }

    // Use IgnorePlugin with multiple patterns to catch all test file references
    // Pattern 1: Ignore test directory imports
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/test\//,
        contextRegExp: /thread-stream/,
        checkResource(resource, context) {
          // #region agent log
          const shouldIgnore = /^\.\/test\//.test(resource) && /thread-stream/.test(context || '');
          if (/thread-stream/.test(resource || '') || /thread-stream/.test(context || '')) {
            log('next.config.mjs:77', 'IgnorePlugin pattern1 check', {
              resource,
              context,
              shouldIgnore,
            }, 'H1');
          }
          // #endregion
          return shouldIgnore;
        },
      })
    );

    // Pattern 2: Ignore all files in thread-stream/test directory
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream[\/\\]test[\/\\]/,
        checkResource(resource) {
          // #region agent log
          const shouldIgnore = /thread-stream[\/\\]test[\/\\]/.test(resource || '');
          if (/thread-stream/.test(resource || '')) {
            log('next.config.mjs:91', 'IgnorePlugin pattern2 check', {
              resource,
              shouldIgnore,
            }, 'H1');
          }
          // #endregion
          return shouldIgnore;
        },
      })
    );

    // Pattern 3: Ignore bench.js file
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream[\/\\]bench\.js$/,
        checkResource(resource) {
          // #region agent log
          const shouldIgnore = /thread-stream[\/\\]bench\.js$/.test(resource || '');
          if (/thread-stream/.test(resource || '')) {
            log('next.config.mjs:106', 'IgnorePlugin pattern3 check', {
              resource,
              shouldIgnore,
            }, 'H1');
          }
          // #endregion
          return shouldIgnore;
        },
      })
    );

    // Pattern 4: Ignore test files by extension
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream.*\.(test|spec)\.(js|mjs|ts)$/,
        checkResource(resource) {
          // #region agent log
          const shouldIgnore = /thread-stream.*\.(test|spec)\.(js|mjs|ts)$/.test(resource || '');
          if (/thread-stream/.test(resource || '')) {
            log('next.config.mjs:121', 'IgnorePlugin pattern4 check', {
              resource,
              shouldIgnore,
            }, 'H1');
          }
          // #endregion
          return shouldIgnore;
        },
      })
    );

    // Use NormalModuleReplacementPlugin to replace problematic test file imports with empty module
    // This catches imports that reference test files directly
    const emptyModulePath = require.resolve('./lib/webpack/empty-module.js');
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /thread-stream[\/\\]test[\/\\].*\.(js|mjs|ts)$/,
        (resource) => {
          // #region agent log
          log('next.config.mjs:133', 'NormalModuleReplacementPlugin test files', {
            resource: resource.request || resource,
            replacing: true,
          }, 'H2');
          // #endregion
          resource.request = emptyModulePath;
        }
      )
    );

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /thread-stream[\/\\]bench\.js$/,
        (resource) => {
          // #region agent log
          log('next.config.mjs:143', 'NormalModuleReplacementPlugin bench', {
            resource: resource.request || resource,
            replacing: true,
          }, 'H2');
          // #endregion
          resource.request = emptyModulePath;
        }
      )
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
      config.resolve.alias = {
        ...config.resolve.alias,
        'pino': false,
        'thread-stream': false,
        'pino-pretty': false,
        'lokijs': false,
        'encoding': false,
      };

      config.resolve.fallback = {
        ...config.resolve.fallback,
        'pino': false,
        'thread-stream': false,
        'pino-pretty': false,
        'lokijs': false,
        'encoding': false,
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
