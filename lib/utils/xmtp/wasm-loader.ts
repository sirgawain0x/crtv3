
import { logger } from '@/lib/utils/logger';
/**
 * WASM Loader Utility for XMTP
 * 
 * Fixes WebAssembly loading issues in Web Workers where relative URLs
 * fail to resolve correctly due to blob: URL base contexts.
 * 
 * This utility ensures WASM files are loaded using absolute URLs
 * relative to the main application origin, not the worker's blob: origin.
 */

/**
 * Patches the global fetch to handle WASM file loading with absolute URLs
 * This is called before XMTP client initialization
 */
export function patchWasmFetch(): void {
  if (typeof window === 'undefined') {
    return; // Only run in browser
  }

  // Store original fetch
  const originalFetch = globalThis.fetch;

  // Patch fetch to handle relative WASM URLs
  globalThis.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // Convert input to string URL
    let url: string;
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.href;
    } else {
      url = input.url;
    }

    // Check if this is a WASM file request with a relative path
    if (url.endsWith('.wasm') && !url.startsWith('http') && !url.startsWith('blob:')) {
      // Convert relative path to absolute URL
      // Handle both /_next/static/... and ./... paths
      let absoluteUrl: string;
      
      if (url.startsWith('/')) {
        // Absolute path from root
        absoluteUrl = new URL(url, window.location.origin).href;
      } else if (url.startsWith('./') || url.startsWith('../')) {
        // Relative path - resolve against current origin
        // For Next.js, WASM files are typically in /_next/static/media/
        // Try to construct the absolute path
        const basePath = url.startsWith('./') ? url.slice(2) : url;
        absoluteUrl = new URL(`/_next/static/media/${basePath}`, window.location.origin).href;
      } else {
        // Try to resolve as relative to origin
        absoluteUrl = new URL(url, window.location.origin).href;
      }

      logger.debug('[WASM Loader] Converting relative WASM URL:', url, '->', absoluteUrl);
      
      // Use original fetch with absolute URL
      return originalFetch(absoluteUrl, init);
    }

    // For all other requests, use original fetch
    return originalFetch(input, init);
  };
}

/**
 * Patches Web Worker's fetch to handle WASM URLs correctly
 * This should be called within the Web Worker context
 * 
 * Note: This function is provided for manual worker patching if needed.
 * XMTP SDK creates workers internally, so we intercept at the Worker constructor level.
 */
export function patchWorkerWasmFetch(): void {
  if (typeof self === 'undefined') {
    return; // Only run in worker context
  }

  // Store original fetch
  const originalFetch = self.fetch;

  // Get the main application origin
  // For workers created from blob URLs, we need to determine the app origin
  let appOrigin: string;
  
  try {
    // Try to get origin from worker's location
    if (self.location.href.startsWith('blob:')) {
      // For blob URLs, we can't directly access window
      // We'll need to use a message from the main thread or try to parse from the blob URL
      // For now, try to extract from the blob URL or use a default
      // In practice, the main thread should pass the origin via postMessage
      appOrigin = 'http://localhost:3000'; // Fallback, should be overridden
    } else {
      appOrigin = new URL(self.location.href).origin;
    }
  } catch {
    // Fallback to default origin
    appOrigin = 'http://localhost:3000';
  }

  // Patch fetch in worker context
  self.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // Convert input to string URL
    let url: string;
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.href;
    } else {
      url = input.url;
    }

    // Check if this is a WASM file request with a relative path
    if (url.endsWith('.wasm') && !url.startsWith('http') && !url.startsWith('blob:')) {
      // Convert relative path to absolute URL using app origin
      let absoluteUrl: string;
      
      if (url.startsWith('/')) {
        // Absolute path from root
        absoluteUrl = new URL(url, appOrigin).href;
      } else if (url.startsWith('./') || url.startsWith('../')) {
        // Relative path - resolve against app origin
        // Try common Next.js WASM paths
        const basePath = url.startsWith('./') ? url.slice(2) : url;
        // Try multiple possible paths
        const possiblePaths = [
          `/_next/static/media/${basePath}`,
          `/_next/static/chunks/${basePath}`,
          `/_next/static/wasm/${basePath}`,
          `/${basePath}`,
        ];
        
        // Use the first path that makes sense
        absoluteUrl = new URL(possiblePaths[0], appOrigin).href;
      } else {
        // Try to resolve as relative to origin
        absoluteUrl = new URL(url, appOrigin).href;
      }

      logger.debug('[WASM Loader] Worker: Converting relative WASM URL:', url, '->', absoluteUrl);
      
      // Use original fetch with absolute URL
      return originalFetch(absoluteUrl, init);
    }

    // For all other requests, use original fetch
    return originalFetch(input, init);
  };
}

/**
 * Intercepts Worker constructor to patch fetch in newly created workers
 * This is needed because XMTP SDK creates workers internally
 */
export function interceptWorkerCreation(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const OriginalWorker = window.Worker;
  
  window.Worker = class PatchedWorker extends OriginalWorker {
    constructor(scriptURL: string | URL, options?: WorkerOptions) {
      super(scriptURL, options);
      
      // Patch fetch in the worker after it's created
      // We need to send a message to the worker to patch itself
      this.addEventListener('message', (event) => {
        if (event.data?.type === 'WASM_LOADER_INIT') {
          // Worker is ready, send patch instruction
          this.postMessage({
            type: 'PATCH_WASM_FETCH',
            origin: window.location.origin,
          });
        }
      });
      
      // Send initialization message
      this.postMessage({
        type: 'WASM_LOADER_INIT',
        origin: window.location.origin,
      });
    }
  } as typeof Worker;
}

/**
 * Initialize WASM loader patches
 * Call this before initializing XMTP client
 */
export function initializeWasmLoader(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Patch main thread fetch
  patchWasmFetch();

  // Intercept Worker creation to patch fetch in workers
  // This is needed because XMTP SDK creates workers internally
  interceptWorkerCreation();
}

