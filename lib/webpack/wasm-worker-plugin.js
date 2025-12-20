/**
 * Webpack plugin to fix WASM loading in Web Workers
 * 
 * This plugin injects code into worker bundles to patch fetch
 * and ensure WASM files load with absolute URLs.
 */

class WasmWorkerPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('WasmWorkerPlugin', (compilation) => {
      // Hook into the optimize phase to modify worker chunks
      compilation.hooks.optimizeChunkAssets.tap('WasmWorkerPlugin', (chunks) => {
        chunks.forEach((chunk) => {
          // Check if this chunk is a worker chunk
          if (chunk.canBeInitial()) {
            return; // Skip initial chunks
          }

          chunk.files.forEach((fileName) => {
            // Only process JavaScript files that might be workers
            if (!fileName.endsWith('.js')) {
              return;
            }

            const asset = compilation.assets[fileName];
            if (!asset) {
              return;
            }

            let source = asset.source();

            // Check if this file contains WASM-related code
            // Look for patterns like __wbg_init or bindings_wasm
            if (
              source.includes('__wbg_init') ||
              source.includes('bindings_wasm') ||
              source.includes('.wasm')
            ) {
              // Inject our fetch patch at the beginning of the worker code
              const patchCode = `
// WASM Worker Patch - Injected by WasmWorkerPlugin
(function() {
  'use strict';
  
  // Get app origin from blob URL or use fallback
  let appOrigin = 'http://localhost:3000';
  try {
    if (self.location && self.location.href) {
      if (self.location.href.startsWith('blob:')) {
        const match = self.location.href.match(/^blob:(https?:\\/\\/[^/]+)/);
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
  self.__WASM_APP_ORIGIN__ = appOrigin;
  
  // Patch fetch to handle WASM URLs
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
      console.error('[WASM Worker Patch] Error:', error);
      return originalFetch(input, init);
    }
  };
})();
`;

              // Prepend the patch code
              source = patchCode + '\n' + source;
              
              compilation.assets[fileName] = {
                source: () => source,
                size: () => source.length,
              };
            }
          });
        });
      });
    });
  }
}

module.exports = WasmWorkerPlugin;

