/**
 * Utility functions for base64url encoding and decoding
 * Based on the implementation from supabase-community/base64url-js
 */

/**
 * Converts a Uint8Array to a base64url string
 */
export function uint8ArrayToBase64Url(array: Uint8Array): string {
  return Buffer.from(array).toString('base64url');
}

/**
 * Converts a base64url string to a Uint8Array
 */
export function base64UrlToUint8Array(str: string): Uint8Array {
  return Buffer.from(str, 'base64url');
}

/**
 * Converts a string to a base64url string
 */
export function stringToBase64Url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

/**
 * Converts a base64url string to a string
 */
export function base64UrlToString(str: string): string {
  return Buffer.from(str, 'base64url').toString();
}

/**
 * Safely encodes any value to base64url
 * Handles various types including Uint8Array, ArrayBuffer, and objects
 */
export function safeToBase64Url(value: any): string {
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
          // If conversion fails, continue to default handling
        }
      }

      // For other objects, stringify and encode
      return stringToBase64Url(JSON.stringify(value));
    } catch (error) {
      // If any of the above conversions fail, stringify the object directly
      // This ensures we don't return [object Object] as a string
      return stringToBase64Url(JSON.stringify(value));
    }
  }

  // For other types, convert to string
  return stringToBase64Url(String(value));
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
