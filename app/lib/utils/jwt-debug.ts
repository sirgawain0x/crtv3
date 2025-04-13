/**
 * Utility functions for debugging JWT issues
 */
import { stringToHex, hexToString } from 'viem';

/**
 * Safely decodes a JWT and returns its parts for debugging
 */
export function debugJWT(jwt: string): {
  header: any;
  payload: any;
  signature: string;
  valid: boolean;
  error?: string;
} {
  try {
    // Split the JWT into its parts
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return {
        header: null,
        payload: null,
        signature: '',
        valid: false,
        error: 'Invalid JWT format: Expected 3 parts separated by dots',
      };
    }

    // Decode the header and payload using viem's utilities
    const headerStr = hexToString(stringToHex(atob(parts[0])));
    const payloadStr = hexToString(stringToHex(atob(parts[1])));

    // Parse the JSON
    const header = JSON.parse(headerStr);
    const payload = JSON.parse(payloadStr);

    return {
      header,
      payload,
      signature: parts[2],
      valid: true,
    };
  } catch (error) {
    return {
      header: null,
      payload: null,
      signature: '',
      valid: false,
      error:
        error instanceof Error ? error.message : 'Unknown error parsing JWT',
    };
  }
}

/**
 * Checks if an object contains any Uint8Array or ArrayBuffer values
 */
export function checkForBinaryData(obj: any): {
  hasBinaryData: boolean;
  paths: string[];
} {
  const paths: string[] = [];

  function traverse(current: any, path: string = '') {
    if (!current || typeof current !== 'object') return;

    Object.entries(current).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;

      if (value instanceof Uint8Array) {
        paths.push(`${currentPath} (Uint8Array)`);
      } else if (value instanceof ArrayBuffer) {
        paths.push(`${currentPath} (ArrayBuffer)`);
      } else if (
        value &&
        typeof value === 'object' &&
        'buffer' in value &&
        value.buffer instanceof ArrayBuffer
      ) {
        paths.push(`${currentPath} (TypedArray)`);
      } else if (value && typeof value === 'object') {
        traverse(value, currentPath);
      }
    });
  }

  traverse(obj);

  return {
    hasBinaryData: paths.length > 0,
    paths,
  };
}

/**
 * Adds a debug function to the window object for debugging JWT issues in the browser console
 */
export function setupJwtDebugger() {
  if (typeof window !== 'undefined') {
    (window as any).debugJWT = (jwt: string) => {
      const result = debugJWT(jwt);
      console.log('JWT Debug Result:', result);

      if (result.payload) {
        const binaryCheck = checkForBinaryData(result.payload);
        console.log('Binary Data Check:', binaryCheck);
      }

      return result;
    };

    console.log(
      'JWT debugger installed. Use window.debugJWT(jwtString) to debug JWT issues.',
    );
  }
}
