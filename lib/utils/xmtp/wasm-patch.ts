
import { logger } from '@/lib/utils/logger';
/**
 * WASM Patch for XMTP - Direct URL Resolution
 * 
 * This module provides a more direct approach to fixing WASM loading
 * by patching the global fetch before any XMTP code runs.
 * 
 * This should be imported early in the application lifecycle.
 */

/**
 * Resolves a relative WASM URL to an absolute URL
 * Handles both absolute paths (starting with /) and relative paths
 */
function resolveWasmUrl(url: string, baseOrigin: string): string {
  // If already absolute, return as-is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }

  // Handle absolute paths from root (most common case)
  // e.g., /_next/static/media/bindings_wasm_bg.317efc09.wasm
  if (url.startsWith('/')) {
    try {
      return new URL(url, baseOrigin).href;
    } catch (e) {
      // Fallback: manually construct URL
      return `${baseOrigin}${url}`;
    }
  }

  // Handle relative paths
  // XMTP WASM files are typically in /_next/static/media/ or /_next/static/chunks/
  if (url.startsWith('./') || url.startsWith('../')) {
    const basePath = url.replace(/^\.\//, '').replace(/^\.\.\//, '');

    // Try common Next.js WASM paths
    const possiblePaths = [
      `/_next/static/media/${basePath}`,
      `/_next/static/chunks/${basePath}`,
      `/_next/static/wasm/${basePath}`,
      `/${basePath}`,
    ];

    try {
      return new URL(possiblePaths[0], baseOrigin).href;
    } catch (e) {
      return `${baseOrigin}${possiblePaths[0]}`;
    }
  }

  // Default: resolve relative to origin
  try {
    return new URL(url, baseOrigin).href;
  } catch (e) {
    // Fallback: assume it's a path from root
    return `${baseOrigin}/${url}`;
  }
}

/**
 * Gets the application origin, handling both main thread and worker contexts
 */
function getAppOrigin(): string {
  // In main thread, use window.location.origin
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }

  // In worker context, check if we have a stored origin
  if (typeof self !== 'undefined') {
    // First, check if we have a stored origin (set during initialization)
    const storedOrigin = (self as any).__WASM_APP_ORIGIN__;
    if (storedOrigin) {
      return storedOrigin;
    }

    // Try to get origin from worker's location
    try {
      const workerLocation = self.location;
      if (workerLocation && workerLocation.href) {
        // If it's a blob URL, extract origin from it
        if (workerLocation.href.startsWith('blob:')) {
          // Blob URLs are like: blob:http://localhost:3000/uuid
          // Extract the origin from the blob URL
          const blobMatch = workerLocation.href.match(/^blob:(https?:\/\/[^/]+)/);
          if (blobMatch && blobMatch[1]) {
            // Store it for future use
            (self as any).__WASM_APP_ORIGIN__ = blobMatch[1];
            return blobMatch[1];
          }
        } else {
          // Not a blob URL, use it directly
          const origin = new URL(workerLocation.href).origin;
          // Store it for future use
          (self as any).__WASM_APP_ORIGIN__ = origin;
          return origin;
        }
      }
    } catch (e) {
      // Fall through to default
      if (process.env.NODE_ENV === 'development') {
        logger.warn('[WASM Patch] Error getting origin from worker location:', e);
      }
    }
  }

  // Fallback - try to infer from common development ports
  // This is a last resort and should rarely be used
  if (process.env.NODE_ENV === 'development') {
    logger.warn('[WASM Patch] Using fallback origin. This may cause issues.');
  }
  return typeof window !== 'undefined' && window.location
    ? window.location.origin
    : 'http://localhost:3000';
}

/**
 * Patches fetch to handle WASM file loading with absolute URLs
 * Works in both main thread and Web Worker contexts
 */
export function patchGlobalFetch(): void {
  if (typeof window === 'undefined' && typeof self === 'undefined') {
    return;
  }

  const context = typeof window !== 'undefined' ? window : self;

  // CRITICAL: Check if already patched to prevent infinite recursion
  if ((context as any).__WASM_FETCH_PATCHED__) {
    return;
  }

  // Store REAL original fetch before any patching
  const originalFetch = (context as any).__ORIGINAL_FETCH__ || context.fetch.bind(context);

  // Store original for reference and future calls
  (context as any).__ORIGINAL_FETCH__ = originalFetch;

  // Mark as patched
  (context as any).__WASM_FETCH_PATCHED__ = true;

  // Patch fetch
  context.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    try {
      // Convert input to string URL
      let url: string;
      let needsConversion = false;

      if (typeof input === 'string') {
        url = input;

        // CRITICAL FIX: The Livepeer SDK has a bug where it requests 'playback.livepeer.studio/whip'
        // instead of 'ingest.livepeer.studio/whip'. We intercept and fix this here.
        if (url.includes('playback.livepeer.studio/whip')) {
          const fixedUrl = url.replace('playback.livepeer.studio', 'ingest.livepeer.studio');
          logger.warn('[WASM Patch] Repairing incorrect Livepeer URL:', url, '->', fixedUrl);
          return originalFetch(fixedUrl, init);
        }

        // CRITICAL: Skip patching for ANY fully-qualified URL
        // Only patch relative paths to .wasm files
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.includes('livepeer.studio')) {
          return originalFetch(input, init);
        }
        // Check if it's a relative or absolute path that needs conversion
        if (url.endsWith('.wasm')) {
          needsConversion = true;
        }
      } else if (input instanceof URL) {
        url = input.href;
        // Skip patching for ANY fully-qualified URL
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.includes('livepeer.studio')) {
          return originalFetch(input, init);
        }
        // Check if URL object has a relative path
        if (url.endsWith('.wasm')) {
          needsConversion = true;
        }
      } else if (input instanceof Request) {
        url = input.url;
        // Skip patching for ANY fully-qualified URL
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.includes('livepeer.studio')) {
          return originalFetch(input, init);
        }
        if (url.endsWith('.wasm')) {
          needsConversion = true;
        }
      } else {
        // Fallback for other types
        return originalFetch(input, init);
      }

      // Check if this is a WASM file request that needs URL conversion
      if (needsConversion) {
        // For relative or absolute paths, resolve against app origin
        const appOrigin = getAppOrigin();
        const absoluteUrl = resolveWasmUrl(url, appOrigin);

        if (process.env.NODE_ENV === 'development') {
          logger.debug('[WASM Patch] Converting WASM URL:', url, '->', absoluteUrl, '(context:', typeof window !== 'undefined' ? 'main' : 'worker', ', origin:', appOrigin, ')');
        }

        // Use original fetch with absolute URL
        if (typeof input === 'string') {
          return originalFetch(absoluteUrl, init);
        } else if (input instanceof URL) {
          return originalFetch(new URL(absoluteUrl), init);
        } else if (input instanceof Request) {
          return originalFetch(new Request(absoluteUrl, input), init);
        }
      }

      // For all other requests, use original fetch
      return originalFetch(input, init);
    } catch (error) {
      // If patching fails, try original fetch as fallback
      logger.error('[WASM Patch] Error in fetch patch:', error);
      return originalFetch(input, init);
    }
  };
}

/**
 * Creates a worker initialization script that patches fetch immediately
 */
function createWorkerPatchScript(appOrigin: string): string {
  return `
(function() {
  'use strict';
  const appOrigin = ${JSON.stringify(appOrigin)};
  
  // Store origin globally in worker
  self.__WASM_APP_ORIGIN__ = appOrigin;
  
  // Patch fetch immediately
  const originalFetch = self.fetch.bind(self);
  
  self.fetch = async function(input, init) {
    try {
      let url = '';
      let needsConversion = false;
      
      if (typeof input === 'string') {
        url = input;
        if (url.endsWith('.wasm') && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('blob:')) {
          needsConversion = true;
        }
      } else if (input instanceof URL) {
        url = input.href;
        if (url.endsWith('.wasm') && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('blob:')) {
          needsConversion = true;
        }
      } else if (input instanceof Request) {
        url = input.url;
        if (url.endsWith('.wasm') && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('blob:')) {
          needsConversion = true;
        }
      } else {
        return originalFetch(input, init);
      }
      
      if (needsConversion) {
        let absoluteUrl;
        if (url.startsWith('/')) {
          absoluteUrl = appOrigin + url;
        } else if (url.startsWith('./') || url.startsWith('../')) {
          const basePath = url.replace(/^\\.\\//, '').replace(/^\\.\\.\\//, '');
          absoluteUrl = appOrigin + '/_next/static/media/' + basePath;
        } else {
          absoluteUrl = appOrigin + '/' + url;
        }
        
        if (typeof input === 'string') {
          return originalFetch(absoluteUrl, init);
        } else if (input instanceof URL) {
          return originalFetch(new URL(absoluteUrl), init);
        } else if (input instanceof Request) {
          return originalFetch(new Request(absoluteUrl, input), init);
        }
      }
      
      return originalFetch(input, init);
    } catch (error) {
      logger.error('[WASM Patch] Error in worker fetch patch:', error);
      return originalFetch(input, init);
    }
  };
})();
`;
}

/**
 * Intercepts Worker creation to inject fetch patching code
 * This ensures workers have the correct origin for WASM loading
 */
function interceptWorkerCreation(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const OriginalWorker = window.Worker;
  const appOrigin = window.location.origin;

  // Store original for reference
  (window as any).__ORIGINAL_WORKER__ = OriginalWorker;

  // Store origin globally for workers to access
  (window as any).__WASM_APP_ORIGIN__ = appOrigin;

  window.Worker = class PatchedWorker extends OriginalWorker {
    constructor(scriptURL: string | URL, options?: WorkerOptions) {
      try {
        // Call original constructor
        super(scriptURL, options);

        // Immediately send origin to worker via postMessage
        // This must happen as early as possible
        try {
          // Use setTimeout to ensure worker is ready
          setTimeout(() => {
            try {
              this.postMessage({
                type: 'WASM_ORIGIN',
                origin: appOrigin
              });
            } catch (e) {
              // Ignore if worker not ready
            }
          }, 0);
        } catch (e) {
          // Ignore
        }
      } catch (e) {
        // Fallback to original worker if patching fails
        super(scriptURL, options);
      }
    }
  } as typeof Worker;

  logger.debug('[WASM Patch] Worker interception enabled, origin:', appOrigin);
}

/**
 * Patches URL constructor to handle relative paths in worker contexts
 */
function patchURLConstructor(): void {
  if (typeof URL === 'undefined') {
    return;
  }

  const context = typeof window !== 'undefined' ? window : self;
  const OriginalURL = context.URL;

  // Get app origin
  const getOrigin = () => {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.origin;
    }
    if (typeof self !== 'undefined') {
      const stored = (self as any).__WASM_APP_ORIGIN__;
      if (stored) return stored;
      if (self.location && self.location.href) {
        if (self.location.href.startsWith('blob:')) {
          const match = self.location.href.match(/^blob:(https?:\/\/[^/]+)/);
          if (match && match[1]) return match[1];
        } else {
          try {
            return new OriginalURL(self.location.href).origin;
          } catch (e) {
            // Ignore
          }
        }
      }
    }
    return 'http://localhost:3000';
  };

  // Store original for reference
  (context as any).__ORIGINAL_URL__ = OriginalURL;

  // Patch URL constructor
  context.URL = class PatchedURL extends OriginalURL {
    constructor(url: string | URL, base?: string | URL) {
      try {
        // Convert URL to string if it's a URL object
        const urlString = typeof url === 'string' ? url : url.href;
        const appOrigin = getOrigin();

        // CRITICAL: If constructing a WASM file URL, always use app origin
        // This handles the case where XMTP does: new URL('/_next/static/media/...', blobUrl)
        if (urlString.endsWith('.wasm')) {
          // If base is a blob URL or missing, always use app origin
          const baseIsBlob = base && typeof base === 'string' && base.startsWith('blob:');
          const baseIsInvalid = base && typeof base === 'string' && !base.startsWith('http');

          if (!base || baseIsBlob || baseIsInvalid || (typeof self !== 'undefined' && typeof window === 'undefined')) {
            // Handle absolute paths (starting with /)
            if (urlString.startsWith('/')) {
              super(urlString, appOrigin);
              if (process.env.NODE_ENV === 'development') {
                logger.debug('[WASM Patch] URL constructor: Fixed absolute WASM path', {
                  original: urlString,
                  base: base ? (typeof base === 'string' ? base : base.href) : 'none',
                  resolved: new URL(urlString, appOrigin).href,
                  context: typeof window !== 'undefined' ? 'main' : 'worker',
                });
              }
              return;
            }

            // Handle relative paths
            const cleanPath = urlString.replace(/^\.\//, '').replace(/^\.\.\//, '');
            const absolutePath = cleanPath.startsWith('/') ? cleanPath : `/_next/static/media/${cleanPath}`;
            super(absolutePath, appOrigin);
            if (process.env.NODE_ENV === 'development') {
              logger.debug('[WASM Patch] URL constructor: Fixed relative WASM path', {
                original: urlString,
                resolved: new URL(absolutePath, appOrigin).href,
                context: typeof window !== 'undefined' ? 'main' : 'worker',
              });
            }
            return;
          }
        }

        // For non-WASM URLs, check if base is problematic
        if (base && typeof base === 'string' && base.startsWith('blob:')) {
          const urlString = typeof url === 'string' ? url : url.href;
          if (typeof urlString === 'string' && !urlString.startsWith('http') && !urlString.startsWith('blob:')) {
            const absolutePath = urlString.startsWith('/') ? urlString : `/${urlString}`;
            super(absolutePath, appOrigin);
            return;
          }
        }

        // If no base provided in worker context, use app origin
        if (!base && typeof self !== 'undefined' && typeof window === 'undefined') {
          const urlString = typeof url === 'string' ? url : url.href;
          if (typeof urlString === 'string' && !urlString.startsWith('http') && !urlString.startsWith('blob:')) {
            const absolutePath = urlString.startsWith('/') ? urlString : `/_next/static/media/${urlString}`;
            super(absolutePath, appOrigin);
            return;
          }
        }

        // Default: use original URL constructor
        super(url, base);
      } catch (error) {
        // If URL construction fails, try with app origin as fallback
        try {
          const appOrigin = getOrigin();
          const urlString = typeof url === 'string' ? url : url.href;
          if (typeof urlString === 'string') {
            const absolutePath = urlString.startsWith('/') ? urlString : `/_next/static/media/${urlString}`;
            super(absolutePath, appOrigin);
            if (process.env.NODE_ENV === 'development') {
              logger.debug('[WASM Patch] URL constructor: Fallback resolution', {
                original: urlString,
                resolved: new URL(absolutePath, appOrigin).href,
              });
            }
            return;
          }
        } catch (fallbackError) {
          // Last resort: throw original error with more context
          const isDev = process.env.NODE_ENV === 'development';
          if (isDev) {
            logger.error('[WASM Patch] URL construction failed:', {
              url: typeof url === 'string' ? url : url.href,
              base: base ? (typeof base === 'string' ? base : base.href) : 'none',
              error: error,
              context: typeof window !== 'undefined' ? 'main' : 'worker',
              origin: getOrigin(),
            });
          }
          throw error;
        }
      }
    }
  } as typeof URL;

  // Mark as patched
  (context as any).__WASM_URL_PATCHED__ = true;
}

/**
 * Initialize WASM patching - call this as early as possible
 */
export function initWasmPatch(): void {
  // Patch URL constructor first (handles new URL() calls)
  patchURLConstructor();

  // Patch fetch immediately
  patchGlobalFetch();

  // Intercept Worker creation to ensure workers have access to app origin
  if (typeof window !== 'undefined') {
    interceptWorkerCreation();

    // Store app origin globally so workers can access it
    (window as any).__WASM_APP_ORIGIN__ = window.location.origin;

    // Also patch when DOM is ready (for main thread)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        patchURLConstructor();
        patchGlobalFetch();
      });
    } else {
      patchURLConstructor();
      patchGlobalFetch();
    }
  }

  // In worker context, try to get origin from main thread or blob URL
  if (typeof self !== 'undefined' && typeof window === 'undefined') {
    // CRITICAL: Patch fetch and URL constructor immediately in worker
    // This must happen before any WASM loading
    patchURLConstructor();
    patchGlobalFetch();

    // Try to get origin from multiple sources
    let appOrigin: string | null = null;

    // 1. Check for stored origin from main thread
    if ((self as any).__WASM_APP_ORIGIN__) {
      appOrigin = (self as any).__WASM_APP_ORIGIN__;
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[WASM Patch] Worker: Using stored origin:', appOrigin);
      }
    }

    // 2. Try to extract from blob URL
    if (!appOrigin && self.location && self.location.href) {
      if (self.location.href.startsWith('blob:')) {
        const blobMatch = self.location.href.match(/^blob:(https?:\/\/[^/]+)/);
        if (blobMatch && blobMatch[1]) {
          appOrigin = blobMatch[1];
          (self as any).__WASM_APP_ORIGIN__ = appOrigin;
          if (process.env.NODE_ENV === 'development') {
            logger.debug('[WASM Patch] Worker: Extracted origin from blob URL:', appOrigin);
          }
        }
      } else {
        try {
          appOrigin = new URL(self.location.href).origin;
          (self as any).__WASM_APP_ORIGIN__ = appOrigin;
          if (process.env.NODE_ENV === 'development') {
            logger.debug('[WASM Patch] Worker: Using location origin:', appOrigin);
          }
        } catch (e) {
          // Ignore
        }
      }
    }

    // 3. Listen for origin from main thread (most reliable)
    if (typeof addEventListener !== 'undefined') {
      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === 'WASM_ORIGIN') {
          const receivedOrigin = event.data.origin;
          (self as any).__WASM_APP_ORIGIN__ = receivedOrigin;
          if (process.env.NODE_ENV === 'development') {
            logger.debug('[WASM Patch] Worker: Received origin from main thread:', receivedOrigin);
          }
          // Re-patch with correct origin
          patchURLConstructor();
          patchGlobalFetch();
          // Remove listener after receiving origin
          removeEventListener('message', messageHandler);
        }
      };
      addEventListener('message', messageHandler);
    }

    if (process.env.NODE_ENV === 'development') {
      logger.debug('[WASM Patch] Worker: Patches applied, origin:', appOrigin || 'pending');
    }
  }
}

// Auto-initialize if this module is imported
if (typeof window !== 'undefined' || typeof self !== 'undefined') {
  initWasmPatch();
}

// Also import the init patch for worker contexts
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  // In worker context, try to import the init patch
  // This will patch __wbg_init directly if available
  try {
    // Dynamic import might not work in all worker contexts
    // So we rely on the fetch patch above
  } catch (e) {
    // Ignore
  }
}

