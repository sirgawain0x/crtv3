
import { logger } from '@/lib/utils/logger';
/**
 * WASM Debugging Utility
 * 
 * Helps diagnose WASM loading issues in XMTP
 */

export interface WasmDebugInfo {
  patchApplied: boolean;
  origin: string | null;
  context: 'main' | 'worker' | 'unknown';
  urlConstructorPatched: boolean;
  fetchPatched: boolean;
  workerInterceptionEnabled: boolean;
}

/**
 * Get debug information about WASM patching status
 */
export function getWasmDebugInfo(): WasmDebugInfo {
  const isMain = typeof window !== 'undefined';
  const isWorker = typeof self !== 'undefined' && typeof window === 'undefined';
  
  let origin: string | null = null;
  if (isMain && window.location) {
    origin = window.location.origin;
  } else if (isWorker) {
    origin = (self as any).__WASM_APP_ORIGIN__ || null;
    if (!origin && self.location) {
      if (self.location.href.startsWith('blob:')) {
        const match = self.location.href.match(/^blob:(https?:\/\/[^/]+)/);
        if (match) origin = match[1];
      } else {
        try {
          origin = new URL(self.location.href).origin;
        } catch (e) {
          // Ignore
        }
      }
    }
  }

  // Check if URL constructor is patched
  const urlConstructorPatched = isMain
    ? (window as any).URL !== (window as any).__ORIGINAL_URL__
    : (self as any).URL !== (self as any).__ORIGINAL_URL__;

  // Check if fetch is patched (we can't easily detect this, so we check for our marker)
  const fetchPatched = isMain
    ? !!(window as any).__WASM_FETCH_PATCHED__
    : !!(self as any).__WASM_FETCH_PATCHED__;

  const workerInterceptionEnabled = isMain && (window as any).Worker !== (window as any).__ORIGINAL_WORKER__;

  return {
    patchApplied: urlConstructorPatched || fetchPatched,
    origin,
    context: isMain ? 'main' : isWorker ? 'worker' : 'unknown',
    urlConstructorPatched,
    fetchPatched,
    workerInterceptionEnabled,
  };
}

/**
 * Log debug information to console
 */
export function logWasmDebugInfo(): void {
  const info = getWasmDebugInfo();
  console.group('[WASM Debug] Patch Status');
  logger.debug('Context:', info.context);
  logger.debug('Origin:', info.origin || 'NOT SET');
  logger.debug('URL Constructor Patched:', info.urlConstructorPatched);
  logger.debug('Fetch Patched:', info.fetchPatched);
  logger.debug('Worker Interception Enabled:', info.workerInterceptionEnabled);
  logger.debug('Overall Patch Applied:', info.patchApplied);
  console.groupEnd();
}

/**
 * Test WASM URL resolution
 */
export function testWasmUrlResolution(): void {
  const info = getWasmDebugInfo();
  const testUrl = '/_next/static/media/bindings_wasm_bg.317efc09.wasm';
  
  console.group('[WASM Debug] URL Resolution Test');
  logger.debug('Test URL:', testUrl);
  logger.debug('Origin:', info.origin);
  
  if (!info.origin) {
    logger.error('❌ No origin available - patches may not work!');
    console.groupEnd();
    return;
  }

  try {
    const resolved = new URL(testUrl, info.origin);
    logger.debug('✅ URL Resolution Success:', resolved.href);
  } catch (e) {
    logger.error('❌ URL Resolution Failed:', e);
  }
  
  try {
    const fetchResult = fetch(testUrl).catch(e => {
      logger.error('❌ Fetch Failed:', e);
      return null;
    });
    logger.debug('Fetch test initiated (check network tab)');
  } catch (e) {
    logger.error('❌ Fetch Test Error:', e);
  }
  
  console.groupEnd();
}


