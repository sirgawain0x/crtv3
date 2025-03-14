/**
 * This file contains patches for the OrbisEVMAuth class to ensure proper handling
 * of Uint8Array objects during authentication.
 */
import { OrbisEVMAuth } from '@useorbis/db-sdk/auth';
import { safeToBase64Url } from '@app/lib/utils/base64url';
import { decodeJWT, encodeJWT } from 'thirdweb/utils';

// Define the type for auth options based on the library's expected parameters
interface AuthOptions {
  [key: string]: any;
}

/**
 * Apply patches to the OrbisEVMAuth class to fix issues with Uint8Array encoding
 */
export function applyOrbisAuthPatches() {
  if (typeof window === 'undefined') return; // Only run in browser

  try {
    console.log('Applying patches to OrbisEVMAuth');

    // Store the original authenticateDid method
    const originalAuthenticateDid = OrbisEVMAuth.prototype.authenticateDid;

    // Override the authenticateDid method to properly handle Uint8Array objects
    OrbisEVMAuth.prototype.authenticateDid = async function (
      options?: AuthOptions,
    ) {
      try {
        console.log('Patched authenticateDid method called');

        // Call the original method
        const result = await originalAuthenticateDid.call(this, options);

        // If the result contains a session with a Uint8Array, ensure it's properly encoded
        if (result && typeof result === 'object') {
          console.log('Authentication result type:', typeof result);

          // Patch any Uint8Array properties in the result
          patchObjectProperties(result);
        }

        return result;
      } catch (error) {
        console.error('Error in patched authenticateDid method:', error);
        throw error;
      }
    };

    // Patch the verifyJWS method if it exists
    if ('verifyJWS' in OrbisEVMAuth.prototype) {
      const originalVerifyJWS = OrbisEVMAuth.prototype.verifyJWS as Function;

      OrbisEVMAuth.prototype.verifyJWS = async function (...args: any[]) {
        try {
          console.log('Patched verifyJWS method called with args:', args);

          // Check if the first argument is a JWT string
          if (args.length > 0 && typeof args[0] === 'string') {
            try {
              // Try to decode the JWT to see if it's valid
              const { payload, signature } = decodeJWT(args[0]);
              console.log('Successfully decoded JWT payload:', payload);

              // If the payload contains binary data, ensure it's properly encoded
              if (payload && typeof payload === 'object') {
                patchObjectProperties(payload);

                // Reconstruct the JWT if needed
                // This is a simplified example - in practice, you'd need the account to re-sign
                // args[0] = await encodeJWT({ payload, wallet: this.wallet });
              }
            } catch (jwtError) {
              console.error('Error decoding JWT:', jwtError);
              // Continue with original method if JWT decoding fails
            }
          }

          // Process arguments to ensure any Uint8Array is properly encoded
          const processedArgs = args.map((arg) => {
            if (arg && typeof arg === 'object') {
              // Create a deep copy to avoid modifying the original
              const copy = JSON.parse(
                JSON.stringify(arg, (key, value) => {
                  if (value instanceof Uint8Array) {
                    return safeToBase64Url(value);
                  }
                  return value;
                }),
              );
              return copy;
            }
            return arg;
          });

          // Call the original method with processed arguments
          return await originalVerifyJWS.apply(this, processedArgs);
        } catch (error) {
          console.error('Error in patched verifyJWS method:', error);
          throw error;
        }
      };
    }

    console.log('OrbisEVMAuth patches applied successfully');
  } catch (error) {
    console.error('Failed to apply OrbisEVMAuth patches:', error);
  }
}

/**
 * Recursively patch object properties to properly handle Uint8Array objects
 */
function patchObjectProperties(obj: any) {
  if (!obj || typeof obj !== 'object') return;

  Object.keys(obj).forEach((key) => {
    const value = obj[key];

    // If the value is a Uint8Array, replace it with a properly encoded string
    if (value instanceof Uint8Array) {
      console.log(`Converting Uint8Array property: ${key}`);
      obj[key] = safeToBase64Url(value);
    }
    // If the value is an object with a buffer property, it might be a TypedArray
    else if (
      value &&
      typeof value === 'object' &&
      'buffer' in value &&
      value.buffer instanceof ArrayBuffer
    ) {
      console.log(`Converting TypedArray property: ${key}`);
      obj[key] = safeToBase64Url(value);
    }
    // Recursively patch nested objects
    else if (value && typeof value === 'object') {
      patchObjectProperties(value);
    }
  });
}
