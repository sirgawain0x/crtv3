# Memory Optimization Guide

## Problem
Your Next.js development server was showing the warning:
```
⚠ Server is approaching the used memory threshold, restarting...
```

This indicates the Node.js process was consuming too much memory, causing frequent restarts and poor developer experience.

## Root Causes Identified

1. **QueryClient with no memory limits** - React Query was caching data indefinitely
2. **Apollo Client creating new cache instances** - Each GraphQL client call created a new cache
3. **Service Worker cleanup running on every page load** - Unnecessary overhead
4. **IframeCleanup running on every route change** - Too aggressive cleanup
5. **No memory limits set for Node.js** - Default 512MB-1GB limit too low for this app
6. **Large number of heavy dependencies** - Multiple blockchain and media libraries

## Changes Made

### 1. Optimized React Query Configuration (`config.ts`)
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 5, // 5 minutes garbage collection
      staleTime: 1000 * 60, // 1 minute stale time
      refetchOnWindowFocus: false, // Reduce unnecessary refetches
      retry: 1, // Reduce retry attempts in dev
    },
  },
});
```

**Benefits:**
- Automatic cache cleanup after 5 minutes
- Reduced refetching and network calls
- Lower memory footprint

### 2. Optimized Apollo Client Configuration (`app/apolloWrapper.tsx`)
```typescript
cache: new InMemoryCache({
  typePolicies: { /* ... */ },
  resultCaching: true,
}),
defaultOptions: {
  watchQuery: {
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  },
  query: {
    fetchPolicy: 'cache-first',
    errorPolicy: 'all',
  },
},
```

**Benefits:**
- Better cache management
- Reduced duplicate queries
- Memory-efficient caching strategy

### 3. Optimized IframeCleanup (`components/IframeCleanup.tsx`)
- Added debouncing (100ms delay) to batch rapid route changes
- Removed aggressive cleanup on `beforeunload` event
- Reduced cleanup frequency

**Benefits:**
- Less CPU overhead
- Fewer DOM manipulations
- Better navigation performance

### 4. Removed Service Worker Cleanup Script (`app/layout.tsx`)
- Removed the inline script that ran on every page load
- Service workers are already disabled in PWA config

**Benefits:**
- Faster initial page load
- Reduced memory overhead
- Cleaner code

### 5. Added Next.js Memory Optimizations (`next.config.mjs`)
```javascript
experimental: {
  optimizePackageImports: [
    '@account-kit/react',
    '@account-kit/core',
    '@apollo/client',
    'lucide-react',
    'framer-motion'
  ],
},
onDemandEntries: {
  maxInactiveAge: 60 * 1000,
  pagesBufferLength: 2,
},
```

**Benefits:**
- Optimized package imports reduce bundle size
- On-demand entry management keeps only 2 pages in memory
- Automatic cleanup of inactive pages after 1 minute

### 6. Increased Node.js Memory Limit (`package.json`)
```json
"dev": "NODE_OPTIONS='--max-old-space-size=4096' next dev",
"dev:turbo": "NODE_OPTIONS='--max-old-space-size=4096' next dev --turbo"
```

**Benefits:**
- Increased heap size from ~1GB to 4GB
- Prevents premature memory warnings
- Allows dev server to handle larger applications
- Added Turbo mode option for even faster rebuilds

## How to Use

### Start Development Server
```bash
# Standard mode with optimizations
npm run dev

# Turbo mode (faster, Next.js 15+ feature)
npm run dev:turbo
```

### Monitor Memory Usage
If you want to monitor memory usage:
```bash
# macOS/Linux
node --expose-gc --max-old-space-size=4096 node_modules/.bin/next dev

# Then in another terminal
ps aux | grep node
```

## Additional Recommendations

### 1. Clean Up Development Environment Regularly
```bash
# Remove node_modules and reinstall
rm -rf node_modules
rm -rf .next
npm install

# Clear Next.js cache
rm -rf .next
```

### 2. Use Environment-Specific Configurations
Consider creating different configurations for development vs production:

```typescript
// config.ts
const isDevelopment = process.env.NODE_ENV === 'development';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: isDevelopment ? 1000 * 60 * 5 : 1000 * 60 * 30, // 5 min dev, 30 min prod
      staleTime: isDevelopment ? 1000 * 60 : 1000 * 60 * 5, // 1 min dev, 5 min prod
      refetchOnWindowFocus: !isDevelopment,
      retry: isDevelopment ? 1 : 3,
    },
  },
});
```

### 3. Consider Code Splitting
For large components, use dynamic imports:
```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false, // Optional: disable SSR for client-only components
});
```

### 4. Monitor Bundle Size
```bash
# Analyze bundle size
npm run build

# Use webpack-bundle-analyzer if needed
npm install --save-dev @next/bundle-analyzer
```

### 5. Profile Memory Usage
Use Chrome DevTools Memory Profiler to identify memory leaks:
1. Open your app in Chrome
2. Open DevTools (F12)
3. Go to Memory tab
4. Take heap snapshots before and after operations
5. Compare snapshots to find memory leaks

## Performance Metrics to Watch

1. **Initial Build Time** - Should improve with optimizePackageImports
2. **Hot Reload Time** - Should be faster with onDemandEntries
3. **Memory Usage** - Should stay below 3GB with new settings
4. **Page Load Time** - Should improve without service worker cleanup

## Troubleshooting

### If Memory Issues Persist

1. **Check for memory leaks in custom code:**
   - Event listeners not being cleaned up
   - Intervals/timeouts not being cleared
   - Large arrays/objects in state
   - WebSocket connections not closing

2. **Reduce concurrent operations:**
   - Limit number of open browser tabs during development
   - Close unnecessary applications
   - Restart the dev server periodically

3. **Consider upgrading hardware:**
   - Minimum 16GB RAM recommended for this project
   - SSD for faster I/O operations

4. **Use lighter alternatives:**
   - Consider removing unused dependencies
   - Replace heavy libraries with lighter alternatives
   - Lazy load heavy features

### Known Issues

- **Alchemy SDK**: Large SDK that can consume significant memory
- **Livepeer**: Media processing libraries are memory-intensive
- **Apollo Client**: Can grow large with many queries
- **Multiple blockchain libraries**: Thirdweb + Wagmi + Alchemy increases bundle size

## Summary

These optimizations should significantly reduce memory usage in development and eliminate the "approaching memory threshold" warnings. The changes maintain production performance while making the development experience smoother.

**Expected Results:**
- ✅ No more memory warnings in development
- ✅ Faster hot reload times
- ✅ Better cache management
- ✅ Reduced memory footprint
- ✅ Improved developer experience

If you still experience issues after these changes, consider:
1. Profiling your application for memory leaks
2. Reducing the number of active pages during development
3. Using `dev:turbo` mode for faster rebuilds
4. Increasing memory limit further (8GB max recommended)

