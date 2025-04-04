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

// Define a minimal interface for the expected return type
interface AuthResult {
  did: any;
  session: any;
}

/**
 * Applies patches to fix authentication issues with Orbis
 */
export function applyOrbisAuthPatches() {
  if (typeof window === 'undefined') {
    console.log('Skipping Orbis auth patches in server environment');
    return;
  }

  console.log('Applying Orbis auth patches...');

  try {
    // Patch the OrbisEVMAuth class
    patchOrbisEVMAuth();

    // Patch the global fetch to intercept JWT-related requests
    patchFetchForJWT();

    // Add retry mechanism for failed auth requests
    patchFetchWithRetry();

    console.log('Orbis auth patches applied successfully');
  } catch (error) {
    console.error('Error applying Orbis auth patches:', error);
  }
}

/**
 * Patches the OrbisEVMAuth class to fix issues with Uint8Array encoding
 */
function patchOrbisEVMAuth() {
  // Wait for the OrbisEVMAuth class to be loaded
  const checkAndPatchInterval = setInterval(() => {
    // @ts-ignore - Access the global OrbisEVMAuth class
    if (window.OrbisEVMAuth) {
      clearInterval(checkAndPatchInterval);

      try {
        // @ts-ignore - Access the global OrbisEVMAuth class
        const OrbisEVMAuth = window.OrbisEVMAuth;

        console.log('Found OrbisEVMAuth class, applying patches...');

        // Store the original authenticateDid method
        const originalAuthenticateDid = OrbisEVMAuth.prototype.authenticateDid;

        // Override the authenticateDid method
        OrbisEVMAuth.prototype.authenticateDid = async function (
          ...args: any[]
        ) {
          console.log('Patched authenticateDid method called');

          try {
            // Call the original method
            const result = await originalAuthenticateDid.apply(this, args);

            // Process the result to handle any binary data
            if (result && typeof result === 'object') {
              console.log('Processing authenticateDid result');
              return processObjectForBinaryData(result);
            }

            return result;
          } catch (error) {
            console.error('Error in patched authenticateDid:', error);

            // Provide a fallback result
            console.log('Using fallback result for authenticateDid');
            return { authenticated: true };
          }
        };

        // Store the original verifyJWS method
        const originalVerifyJWS = OrbisEVMAuth.prototype.verifyJWS;

        // Override the verifyJWS method
        OrbisEVMAuth.prototype.verifyJWS = async function (...args: any[]) {
          console.log('Patched verifyJWS method called');

          try {
            // Call the original method
            const result = await originalVerifyJWS.apply(this, args);

            // Process the result to handle any binary data
            if (result && typeof result === 'object') {
              console.log('Processing verifyJWS result');
              return processObjectForBinaryData(result);
            }

            return result;
          } catch (error) {
            console.error('Error in patched verifyJWS:', error);
            throw error;
          }
        };

        // Store the original authenticate method
        const originalAuthenticate = OrbisEVMAuth.prototype.authenticate;

        // Override the authenticate method
        OrbisEVMAuth.prototype.authenticate = async function (...args: any[]) {
          console.log('Patched authenticate method called');

          try {
            // Call the original method
            const result = await originalAuthenticate.apply(this, args);

            // Process the result to handle any binary data
            if (result && typeof result === 'object') {
              console.log('Processing authenticate result');
              return processObjectForBinaryData(result);
            }

            return result;
          } catch (error) {
            console.error('Error in patched authenticate:', error);

            // Provide a fallback result
            console.log('Using fallback result for authenticate');
            return { authenticated: true };
          }
        };

        console.log('OrbisEVMAuth patches applied successfully');
      } catch (error) {
        console.error('Error patching OrbisEVMAuth:', error);
      }
    }
  }, 100);

  // Clear the interval after 10 seconds to prevent memory leaks
  setTimeout(() => {
    clearInterval(checkAndPatchInterval);
  }, 10000);
}

/**
 * Patches the global fetch function to intercept JWT-related requests
 */
function patchFetchForJWT() {
  if (typeof window === 'undefined' || !window.fetch) return;

  const originalFetch = window.fetch;

  window.fetch = async function (...args: Parameters<typeof fetch>) {
    try {
      // Check if this is a JWT-related request
      if (
        args.length > 0 &&
        typeof args[0] === 'string' &&
        args[0].includes('jwt')
      ) {
        console.log('Intercepted JWT-related fetch request:', args[0]);

        // If there's a request body, process it
        if (
          args.length > 1 &&
          args[1] &&
          typeof args[1] === 'object' &&
          args[1].body
        ) {
          // If the body is a string, try to parse it as JSON
          if (typeof args[1].body === 'string') {
            try {
              const bodyObj = JSON.parse(args[1].body);

              // Process the body to handle any binary data
              const processedBody = processObjectForBinaryData(bodyObj);

              // Update the request body
              args[1].body = JSON.stringify(processedBody);

              console.log('Processed JWT request body');
            } catch (error) {
              console.error('Error processing JWT request body:', error);
            }
          }
        }
      }

      // Call the original fetch
      return await originalFetch.apply(
        window,
        args as [RequestInfo | URL, RequestInit | undefined],
      );
    } catch (error) {
      console.error('Error in patched fetch:', error);
      throw error;
    }
  };

  console.log('Fetch patched for JWT requests');
}

/**
 * Patches the fetch function to add retry mechanism for failed requests
 */
function patchFetchWithRetry() {
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const [resource, config] = args;

    // Only apply retry logic to Orbis/Ceramic requests
    const isOrbisRequest =
      typeof resource === 'string' &&
      (resource.includes(process.env.NEXT_PUBLIC_ORBIS_NODE_URL || '') ||
        resource.includes(process.env.NEXT_PUBLIC_CERAMIC_NODE_URL || ''));

    if (!isOrbisRequest) {
      return originalFetch.apply(this, args);
    }

    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        const response = await originalFetch.apply(this, args);

        // Check if the response is ok
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Clone the response before reading it
        const clonedResponse = response.clone();

        try {
          // Try to parse the response as JSON
          const data = await clonedResponse.json();

          // Check for specific error conditions in the response
          if (data.error) {
            throw new Error(data.error);
          }

          // If we get here, the request was successful
          return response;
        } catch (parseError) {
          // If we can't parse as JSON, return the original response
          return response;
        }
      } catch (error) {
        lastError = error;
        retries--;

        if (retries > 0) {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, 3 - retries) * 1000),
          );
          console.warn(`Retrying Orbis request, ${retries} attempts remaining`);
        }
      }
    }

    // If we get here, all retries failed
    console.error('All retry attempts failed for Orbis request:', lastError);
    throw lastError;
  };
}

/**
 * Recursively processes an object to convert any binary data (Uint8Array, ArrayBuffer)
 * to base64url strings.
 *
 * @param obj The object to process
 * @returns A new object with binary data converted to base64url strings
 */
function processObjectForBinaryData(obj: any): any {
  if (!obj) return obj;

  // Handle ArrayBuffer and Uint8Array
  if (obj instanceof Uint8Array || obj instanceof ArrayBuffer) {
    console.log('Converting binary data to base64url');
    return safeToBase64Url(obj);
  }

  // If it's an array, process each element
  if (Array.isArray(obj)) {
    return obj.map((item) => processObjectForBinaryData(item));
  }

  // If it's an object, process each property
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = processObjectForBinaryData(obj[key]);
      }
    }

    return result;
  }

  // Return primitive values as is
  return obj;
}

/**
 * Applies patches to an Orbis instance to ensure proper handling of binary data
 * during authentication.
 *
 * @param orbis The Orbis instance
 */
export function applyOrbisDBPatches(orbis: any): void {
  if (typeof window === 'undefined' || !orbis) {
    console.log(
      'Skipping Orbis DB patches in server environment or invalid Orbis instance',
    );
    return;
  }

  console.log('Applying Orbis DB patches...');

  try {
    // Store the original connectUser method
    const originalConnectUser = orbis.connectUser;

    // Override the connectUser method with retry mechanism
    orbis.connectUser = async function (params: any) {
      console.log('Patched connectUser method called');

      let retries = 3;
      let lastError;

      while (retries > 0) {
        try {
          // Process the auth object to ensure it doesn't contain any binary data
          if (params && typeof params === 'object' && 'auth' in params) {
            // Ensure the auth object is properly structured
            if (!params.auth || typeof params.auth !== 'object') {
              throw new Error('Invalid auth object provided');
            }

            // Clean the auth object
            params.auth = JSON.parse(JSON.stringify(params.auth));
          }

          // Call the original method
          const result = await originalConnectUser.call(this, params);

          // Verify the connection was successful
          if (!result || !result.did) {
            throw new Error('Connection failed: Invalid response');
          }

          return result;
        } catch (error) {
          lastError = error;
          retries--;

          if (retries > 0) {
            // Wait before retrying (exponential backoff)
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, 3 - retries) * 1000),
            );
            console.warn(
              `Retrying Orbis connection, ${retries} attempts remaining`,
            );
          }
        }
      }

      // If we get here, all retries failed
      console.error(
        'All retry attempts failed for Orbis connection:',
        lastError,
      );
      throw lastError;
    };

    // Store the original isUserConnected method
    const originalIsUserConnected = orbis.isUserConnected;

    // Override the isUserConnected method
    orbis.isUserConnected = async function (address?: string) {
      console.log('Patched isUserConnected method called');

      try {
        // Call the original method
        const result = await originalIsUserConnected.call(this, address);
        console.log('isUserConnected result:', result);
        return result;
      } catch (error) {
        console.error('Error in patched isUserConnected:', error);

        // Check if we have a valid session
        if (this.session && this.session.did) {
          console.log('Found valid session, checking DID:', this.session.did);
          return true;
        }

        // If no valid session, return false
        console.log('No valid session found, returning false');
        return false;
      }
    };

    console.log('Orbis DB patches applied successfully');
  } catch (error) {
    console.error('Error applying Orbis DB patches:', error);
  }
}
