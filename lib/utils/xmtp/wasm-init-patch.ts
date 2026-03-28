
import { logger } from '@/lib/utils/logger';
/**
 * WASM Initialization Patch
 * 
 * This module patches the __wbg_init function directly to fix WASM loading
 * in Web Workers. This is a more direct approach than patching fetch.
 */

/**
 * Patches the __wbg_init function to use absolute URLs for WASM files
 */
export function patchWasmInit(): void {
  if (typeof self === 'undefined') {
    return; // Only run in worker context
  }

  // Get app origin
  let appOrigin = 'http://localhost:3000';
  try {
    if (self.location && self.location.href) {
      if (self.location.href.startsWith('blob:')) {
        const match = self.location.href.match(/^blob:(https?:\/\/[^/]+)/);
        if (match && match[1]) {
          appOrigin = match[1];
        }
      } else {
        appOrigin = new URL(self.location.href).origin;
      }
    }
  } catch (e) {
    // Use fallback
  }

  // Store origin globally
  (self as any).__WASM_APP_ORIGIN__ = appOrigin;

  // Try to patch __wbg_init if it exists
  if (typeof (self as any).__wbg_init !== 'undefined') {
    const originalInit = (self as any).__wbg_init;
    
    (self as any).__wbg_init = async function(module_or_path: any) {
      // If module_or_path is undefined or a relative path, convert to absolute
      if (typeof module_or_path === 'undefined') {
        // Construct absolute URL for WASM file
        module_or_path = new URL('/_next/static/media/bindings_wasm_bg.317efc09.wasm', appOrigin);
      } else if (typeof module_or_path === 'string') {
        // If it's a string and not absolute, make it absolute
        if (!module_or_path.startsWith('http://') && !module_or_path.startsWith('https://') && !module_or_path.startsWith('blob:')) {
          if (module_or_path.startsWith('/')) {
            module_or_path = new URL(module_or_path, appOrigin);
          } else {
            module_or_path = new URL('/_next/static/media/' + module_or_path, appOrigin);
          }
        } else {
          module_or_path = new URL(module_or_path);
        }
      } else if (module_or_path instanceof URL) {
        // If URL is relative, convert to absolute
        if (!module_or_path.href.startsWith('http://') && !module_or_path.href.startsWith('https://') && !module_or_path.href.startsWith('blob:')) {
          const path = module_or_path.pathname || module_or_path.href;
          if (path.startsWith('/')) {
            module_or_path = new URL(path, appOrigin);
          } else {
            module_or_path = new URL('/_next/static/media/' + path, appOrigin);
          }
        }
      }

      // Call original __wbg_init with the absolute URL
      return originalInit(module_or_path);
    };
  }

  // Also patch fetch as backup
  const originalFetch = self.fetch.bind(self);
  self.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
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
        let absoluteUrl: string;
        if (url.startsWith('/')) {
          absoluteUrl = appOrigin + url;
        } else if (url.startsWith('./') || url.startsWith('../')) {
          const basePath = url.replace(/^\.\//, '').replace(/^\.\.\//, '');
          absoluteUrl = appOrigin + '/_next/static/media/' + basePath;
        } else {
          absoluteUrl = appOrigin + '/' + url;
        }
        
        if (process.env.NODE_ENV === 'development') {
          logger.debug('[WASM Init Patch] Converting URL:', url, '->', absoluteUrl);
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
      logger.error('[WASM Init Patch] Error:', error);
      return originalFetch(input, init);
    }
  };
}

// Auto-initialize in worker context
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  patchWasmInit();
}

