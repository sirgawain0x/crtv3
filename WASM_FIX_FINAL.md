# WASM Worker Loading Fix - Final Solution

## Problem

The XMTP SDK creates Web Workers that try to load WebAssembly files using relative URLs. In a worker context with a blob URL, these relative URLs cannot be resolved, causing:

```
Failed to execute 'fetch' on 'WorkerGlobalScope': Failed to parse URL from /_next/static/media/bindings_wasm_bg.317efc09.wasm
```

## Root Cause

1. XMTP's `bindings_wasm.js` uses `new URL('bindings_wasm_bg.wasm', import.meta.url)` to construct the WASM file path
2. In a worker with a blob URL, `import.meta.url` is a blob URL (e.g., `blob:http://localhost:3000/uuid`)
3. When constructing a relative URL from a blob URL, the result is invalid
4. The fetch call fails because it can't parse the malformed URL

## Solution

Since we cannot modify XMTP's bundled worker code directly, we use a multi-layered approach:

### 1. Runtime Fetch Patching (`lib/utils/xmtp/wasm-patch.ts`)

Patches `fetch` in both main thread and worker contexts to convert relative WASM URLs to absolute URLs:

- **Main Thread**: Patches `window.fetch`
- **Worker Thread**: Patches `self.fetch` immediately when detected
- **Origin Extraction**: Extracts origin from blob URLs (`blob:http://localhost:3000/uuid` → `http://localhost:3000`)

### 2. Next.js Configuration (`next.config.mjs`)

- Configures WASM files to be served from `/_next/static/media/`
- Sets `publicPath` to `/_next/` for proper asset resolution
- Attempts to use webpack plugin (may not work with Turbopack)

### 3. Early Initialization

The patch is imported early in the application lifecycle:
- `app/providers.tsx` - Loads before any XMTP code
- `lib/hooks/xmtp/useXmtpClient.ts` - Backup initialization

## How It Works

1. **Module Loads**: `wasm-patch.ts` auto-initializes when imported
2. **Main Thread**: Patches `window.fetch` immediately
3. **Worker Detection**: When code runs in worker context, patches `self.fetch`
4. **Origin Extraction**: Extracts app origin from blob URL or uses stored origin
5. **URL Conversion**: When a WASM file request is detected:
   - Detects `.wasm` extension
   - Checks if URL is relative (doesn't start with `http://`, `https://`, or `blob:`)
   - Converts to absolute URL: `/_next/static/media/bindings_wasm_bg.317efc09.wasm` → `http://localhost:3000/_next/static/media/bindings_wasm_bg.317efc09.wasm`
6. **Fetch Execution**: Uses the absolute URL which works correctly

## Testing

After restarting your dev server:

1. **Check Console**: Look for `[WASM Patch]` messages showing URL conversions
2. **Check Network Tab**: WASM file should load successfully (200 status)
3. **Verify XMTP**: XMTP client should initialize without errors

## Troubleshooting

If the error persists:

1. **Check if patch is running**: Look for `[WASM Patch]` console messages
2. **Check origin extraction**: Look for `[WASM Patch] Worker: Extracted origin` messages
3. **Verify WASM file path**: Check Network tab to see what URL is being requested
4. **Check worker context**: Verify the worker is using the patched fetch

## Limitations

- The patch relies on intercepting `fetch` calls, which should work in most cases
- If XMTP uses a different method to load WASM files, the patch won't work
- With Turbopack (Next.js 16 default), webpack plugins may not run
- The patch must be loaded before XMTP code runs

## Alternative Solutions

If this solution doesn't work, consider:

1. **Disable Turbopack**: Use `next dev` instead of `next dev --turbo` to use webpack
2. **Contact XMTP**: Request they fix WASM loading in workers
3. **Use Different XMTP Version**: Try a version that doesn't use workers
4. **Custom XMTP Build**: Build XMTP SDK with custom WASM loading logic

