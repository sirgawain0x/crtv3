# WebAssembly Worker Loading Fix

## Problem

The application was experiencing a Web Worker error when XMTP SDK attempted to load WebAssembly (.wasm) files:

```
Uncaught (in promise) TypeError: Failed to execute 'fetch' on 'WorkerGlobalScope': 
Failed to parse URL from /_next/static/media/bindings_wasm_bg.317efc09.wasm
```

### Root Cause

1. **XMTP SDK uses WebAssembly**: The `@xmtp/browser-sdk` package uses `@xmtp/wasm-bindings` which requires loading `.wasm` files
2. **Web Worker Context Issue**: XMTP creates Web Workers internally, and these workers run in a `blob:` URL context
3. **Relative URL Resolution Failure**: When the WASM bindings try to fetch the `.wasm` file using a relative path (e.g., `/_next/static/media/bindings_wasm_bg.317efc09.wasm`), the worker's `blob:` base URL causes the fetch to fail with "Failed to parse URL"

## Solution

Implemented a multi-layered fix to ensure WASM files load correctly:

### 1. Next.js Webpack Configuration (`next.config.mjs`)

Added WebAssembly support to the webpack configuration:

```javascript
webpack: (config, { isServer }) => {
  // Enable async WebAssembly loading
  config.experiments = {
    ...config.experiments,
    asyncWebAssembly: true,
  };

  // Handle .wasm files as asset resources
  config.module.rules.push({
    test: /\.wasm$/,
    type: 'asset/resource',
    generator: {
      filename: 'static/wasm/[name].[contenthash][ext]',
    },
  });

  return config;
}
```

### 2. Global Fetch Patching (`lib/utils/xmtp/wasm-patch.ts`)

Created a utility that patches the global `fetch` function to automatically convert relative WASM URLs to absolute URLs:

- **Main Thread**: Patches `window.fetch` to resolve relative WASM URLs using `window.location.origin`
- **Worker Thread**: Patches `self.fetch` to resolve relative WASM URLs
  - Extracts origin from blob URLs (format: `blob:http://localhost:3000/uuid`)
  - Falls back to stored origin or default
- **Auto-initialization**: Automatically runs when the module is imported
- **Worker Interception**: Intercepts Worker constructor to ensure workers have access to app origin

Key features:
- Detects WASM file requests (`.wasm` extension)
- Converts relative paths (e.g., `/_next/static/media/...`) to absolute URLs
- Handles absolute paths starting with `/` (most common case)
- Handles relative paths (`./`, `../`)
- Extracts origin from blob URLs in worker contexts
- Works in both main thread and Web Worker contexts
- Robust error handling with fallbacks

### 3. Early Initialization

The WASM patch is imported early in the application lifecycle:
- In `app/providers.tsx` - ensures it's loaded before any XMTP code runs
- In `lib/hooks/xmtp/useXmtpClient.ts` - as a backup to ensure patching before client creation

## Files Modified

1. **`next.config.mjs`**: Added webpack configuration for WebAssembly support
2. **`lib/utils/xmtp/wasm-patch.ts`**: New utility for patching fetch to handle WASM URLs
3. **`lib/utils/xmtp/wasm-loader.ts`**: Additional utility for more advanced worker interception (kept for future use)
4. **`lib/hooks/xmtp/useXmtpClient.ts`**: Added WASM patch import
5. **`app/providers.tsx`**: Added WASM patch import for early initialization

## How It Works

1. **Build Time**: Next.js webpack configuration ensures `.wasm` files are properly bundled and served
2. **Runtime**: The WASM patch intercepts all `fetch` calls
3. **URL Resolution**: When a relative WASM URL is detected, it's converted to an absolute URL using `window.location.origin` (or `self.location.origin` in workers)
4. **Fetch Execution**: The patched fetch uses the absolute URL, which works correctly in both main thread and Web Worker contexts

## Testing

To verify the fix:

1. Open browser DevTools Console
2. Look for `[WASM Patch]` log messages (in development mode) showing URL conversions
3. Check Network tab for successful WASM file loads (should show 200 status)
4. Verify XMTP client initializes without errors

## Notes

- The patch only affects `.wasm` file requests - all other fetch calls are unchanged
- The solution works in both development and production environments
- The patch is automatically applied when the module is imported (no manual initialization needed)
- If XMTP SDK updates change how WASM files are loaded, the patch should still work as it intercepts at the fetch level

## Future Improvements

If needed, we could:
1. Add configuration to customize WASM base paths
2. Implement retry logic for failed WASM loads
3. Add metrics/monitoring for WASM load success rates
4. Consider using Next.js's `publicPath` configuration if available

