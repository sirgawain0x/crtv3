/**
 * Utility functions for base64url encoding and decoding
 * Based on the implementation from supabase-community/base64url-js
 */

// Production error reporting
function reportBase64Error(error: Error, context: Record<string, any> = {}) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Production Base64 Error]', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Converts a Uint8Array to a base64url string
 */
export function uint8ArrayToBase64Url(array: Uint8Array): string {
  try {
    if (!(array instanceof Uint8Array)) {
      const error = new TypeError('Input must be a Uint8Array');
      reportBase64Error(error, {
        actualType: typeof array,
        constructor: (array as any)?.constructor?.name,
      });
      throw error;
    }
    return Buffer.from(array).toString('base64url');
  } catch (error) {
    reportBase64Error(error as Error, {
      arrayLength: array?.length,
      arrayType: typeof array,
    });
    throw error;
  }
}

/**
 * Converts a base64url string to a Uint8Array
 */
export function base64UrlToUint8Array(str: string): Uint8Array {
  try {
    if (typeof str !== 'string') {
      const error = new TypeError('Input must be a string');
      reportBase64Error(error, { actualType: typeof str });
      throw error;
    }
    return Buffer.from(str, 'base64url');
  } catch (error) {
    reportBase64Error(error as Error, {
      strLength: str?.length,
      strType: typeof str,
    });
    throw error;
  }
}

/**
 * Converts a string to a base64url string
 */
export function stringToBase64Url(str: string): string {
  try {
    if (typeof str !== 'string') {
      const error = new TypeError('Input must be a string');
      reportBase64Error(error, { actualType: typeof str });
      throw error;
    }
    return Buffer.from(str).toString('base64url');
  } catch (error) {
    reportBase64Error(error as Error, {
      strLength: str?.length,
      strType: typeof str,
    });
    throw error;
  }
}

/**
 * Converts a base64url string to a string
 */
export function base64UrlToString(str: string): string {
  try {
    if (typeof str !== 'string') {
      const error = new TypeError('Input must be a string');
      reportBase64Error(error, { actualType: typeof str });
      throw error;
    }
    return Buffer.from(str, 'base64url').toString();
  } catch (error) {
    reportBase64Error(error as Error, {
      strLength: str?.length,
      strType: typeof str,
    });
    throw error;
  }
}

/**
 * Safely encodes any value to base64url
 * Handles various types including Uint8Array, ArrayBuffer, and objects
 */
export function safeToBase64Url(value: any): string {
  if (process.env.NODE_ENV === 'production') {
    console.log('[Production Debug] safeToBase64Url Input:', {
      type: typeof value,
      isNull: value === null,
      isUndefined: value === undefined,
      constructor: value?.constructor?.name,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    if (value === null || value === undefined) {
      return '';
    }

    // Handle string directly - if it's already a base64url string, return it
    if (typeof value === 'string') {
      return value;
    }

    // Handle Uint8Array
    if (value instanceof Uint8Array) {
      return uint8ArrayToBase64Url(value);
    }

    // Handle ArrayBuffer
    if (value instanceof ArrayBuffer) {
      return uint8ArrayToBase64Url(new Uint8Array(value));
    }

    // Handle TypedArray (Int8Array, Uint16Array, etc.)
    if (ArrayBuffer.isView(value) && 'buffer' in value) {
      return uint8ArrayToBase64Url(new Uint8Array(value.buffer));
    }

    // Handle object with special properties
    if (typeof value === 'object') {
      if (process.env.NODE_ENV === 'production') {
        console.log('[Production Debug] Object handling:', {
          hasBytes: '_bytes' in value,
          hasData: 'data' in value,
          isArray: Array.isArray(value),
          keys: Object.keys(value),
          timestamp: new Date().toISOString(),
        });
      }

      try {
        // Check for _bytes property (common in some crypto libraries)
        if ('_bytes' in value && Array.isArray(value._bytes)) {
          return uint8ArrayToBase64Url(new Uint8Array(value._bytes));
        }

        // Check for data property
        if ('data' in value && value.data) {
          if (value.data instanceof Uint8Array) {
            return uint8ArrayToBase64Url(value.data);
          }
          if (Array.isArray(value.data)) {
            return uint8ArrayToBase64Url(new Uint8Array(value.data));
          }
        }

        // Check for array-like objects
        if (
          Array.isArray(value) ||
          ('length' in value && typeof value.length === 'number')
        ) {
          try {
            return uint8ArrayToBase64Url(new Uint8Array(value));
          } catch (e) {
            reportBase64Error(e as Error, {
              context: 'array-like conversion',
              value: Array.isArray(value) ? value : Object.keys(value),
            });
          }
        }

        // For other objects, stringify and encode
        const jsonStr = JSON.stringify(value);
        if (process.env.NODE_ENV === 'production') {
          console.log('[Production Debug] Stringified object:', {
            length: jsonStr.length,
            timestamp: new Date().toISOString(),
          });
        }
        return stringToBase64Url(jsonStr);
      } catch (error) {
        reportBase64Error(error as Error, {
          context: 'object handling',
          valueType: typeof value,
          valueKeys: Object.keys(value),
        });
        // If any of the above conversions fail, stringify the object directly
        return stringToBase64Url(JSON.stringify(value));
      }
    }

    // For other types, convert to string
    return stringToBase64Url(String(value));
  } catch (error) {
    reportBase64Error(error as Error, {
      context: 'safeToBase64Url',
      valueType: typeof value,
      value: value?.toString?.() || String(value),
    });
    throw error;
  }
}

/**
 * Monkey patch the global Uint8Array prototype to add toBase64Url method
 * This is useful for debugging and can be removed in production
 */
if (
  typeof Uint8Array !== 'undefined' &&
  !Uint8Array.prototype.hasOwnProperty('toBase64Url')
) {
  Object.defineProperty(Uint8Array.prototype, 'toBase64Url', {
    value: function () {
      return uint8ArrayToBase64Url(this);
    },
    enumerable: false,
    configurable: true,
    writable: true,
  });
}
