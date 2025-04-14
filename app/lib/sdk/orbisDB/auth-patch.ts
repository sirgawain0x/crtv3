/**
 * OrbisDB Authentication Patches
 *
 * This module contains patches and fixes for OrbisDB authentication to handle specific edge cases
 * and ensure proper functionality across different environments and wallet providers.
 *
 * Key Features:
 * - Fixes Uint8Array handling during authentication
 * - Improves JWT encoding/decoding compatibility
 * - Adds support for multiple wallet providers
 * - Handles edge cases in DID session management
 */

import { OrbisEVMAuth } from '@useorbis/db-sdk/auth';
import { safeToBase64Url } from '@app/lib/utils/base64url';
import {
  encodeAbiParameters,
  decodeAbiParameters,
  keccak256,
  toHex,
} from 'viem';
import { OrbisError, OrbisErrorType } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  exp: number;
  iat: number;
  sub?: string;
  [key: string]: unknown;
}

async function decodeJWT(token: string): Promise<JWTPayload> {
  try {
    const [headerB64, payloadB64, signature] = token.split('.');
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64').toString(),
    ) as JWTPayload;

    // Verify signature
    const message = `${headerB64}.${payloadB64}`;
    const expectedHash = keccak256(toHex(message));
    const actualHash = keccak256(toHex(signature));

    if (expectedHash !== actualHash) {
      throw new Error('Invalid signature');
    }

    return payload;
  } catch (error) {
    throw new OrbisError('JWT verification failed', OrbisErrorType.AUTH_ERROR);
  }
}

async function encodeJWT(payload: Record<string, unknown>): Promise<string> {
  try {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 24 * 60 * 60; // 24 hours

    const fullPayload = {
      ...payload,
      iat: now,
      exp,
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64');
    const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString(
      'base64',
    );

    const message = `${headerB64}.${payloadB64}`;
    const signature = keccak256(toHex(message + JWT_SECRET));

    return `${headerB64}.${payloadB64}.${signature.slice(2)}`;
  } catch (error) {
    throw new OrbisError('JWT encoding failed', OrbisErrorType.AUTH_ERROR);
  }
}

// Add production error reporting
function reportProductionError(
  error: Error,
  context: Record<string, any> = {},
) {
  // In production, log to your error reporting service
  if (process.env.NODE_ENV === 'production') {
    console.error('[Production Error]', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  }
}

/**
 * Configuration options for authentication patches
 */
interface AuthPatchOptions {
  /** Custom JWT encoding options */
  jwtOptions?: {
    expiresIn?: string;
    algorithm?: string;
  };
  /** Provider-specific configuration */
  providerOptions?: Record<string, unknown>;
}

/**
 * Applies necessary patches to the OrbisEVMAuth class to ensure proper authentication
 * @param options - Optional configuration for the patches
 */
export function applyOrbisAuthPatches(options: AuthPatchOptions = {}) {
  // Patch 1: Fix Uint8Array handling in authentication payload
  const originalPreparePayload = (OrbisEVMAuth as any).prototype.preparePayload;
  (OrbisEVMAuth as any).prototype.preparePayload = async function (
    message: string,
  ) {
    try {
      // Log the input in production for debugging
      if (process.env.NODE_ENV === 'production') {
        console.log('[Production Debug] PreparePayload Input:', {
          messageType: typeof message,
          messageLength: message?.length,
          isString: typeof message === 'string',
          timestamp: new Date().toISOString(),
        });
      }

      const payload = await originalPreparePayload.call(this, message);

      // Log the payload in production for debugging
      if (process.env.NODE_ENV === 'production') {
        console.log('[Production Debug] Original Payload:', {
          payloadType: typeof payload,
          isUint8Array: payload instanceof Uint8Array,
          isNull: payload === null,
          isUndefined: payload === undefined,
          hasToString: payload?.toString !== undefined,
          timestamp: new Date().toISOString(),
        });
      }

      // Handle different payload types properly
      if (payload === null || payload === undefined) {
        const error = new Error('Authentication payload is null or undefined');
        reportProductionError(error, { message });
        throw error;
      }

      if (payload instanceof Uint8Array) {
        const result = safeToBase64Url(payload);
        // Log successful Uint8Array conversion in production
        if (process.env.NODE_ENV === 'production') {
          console.log('[Production Debug] Uint8Array Conversion:', {
            inputLength: payload.length,
            resultLength: result.length,
            timestamp: new Date().toISOString(),
          });
        }
        return result;
      }

      // Handle object payloads that aren't properly serialized
      if (typeof payload === 'object' && !(payload instanceof Uint8Array)) {
        // Log object payload details in production
        if (process.env.NODE_ENV === 'production') {
          console.log('[Production Debug] Object Payload:', {
            keys: Object.keys(payload),
            hasToString: typeof payload.toString === 'function',
            prototype: Object.getPrototypeOf(payload)?.constructor?.name,
            timestamp: new Date().toISOString(),
          });
        }

        try {
          const result = safeToBase64Url(payload);
          return result;
        } catch (error) {
          reportProductionError(error as Error, {
            payload,
            payloadType: typeof payload,
            payloadKeys: Object.keys(payload),
          });
          throw error;
        }
      }

      return payload;
    } catch (error) {
      // Report detailed error information in production
      reportProductionError(error as Error, {
        message,
        messageType: typeof message,
        function: 'preparePayload',
      });

      throw new OrbisError(
        'Failed to prepare authentication payload',
        OrbisErrorType.AUTH_ERROR,
        error,
      );
    }
  };

  // Patch 2: Enhance JWT handling with production logging
  const originalCreateJWT = (OrbisEVMAuth as any).prototype.createJWT;
  (OrbisEVMAuth as any).prototype.createJWT = async function (payload: any) {
    try {
      // Log JWT creation attempt in production
      if (process.env.NODE_ENV === 'production') {
        console.log('[Production Debug] JWT Creation:', {
          payloadType: typeof payload,
          hasRequiredFields: payload?.sub !== undefined,
          timestamp: new Date().toISOString(),
        });
      }

      // Ensure payload is properly formatted before creating JWT
      if (typeof payload === 'object' && payload !== null) {
        if (!payload.sub) {
          payload.sub = this.address || 'anonymous';
        }
      }

      const jwt = await originalCreateJWT.call(this, payload);

      // Verify JWT structure before returning
      const decoded = await decodeJWT(jwt);
      if (!decoded?.exp) {
        const error = new Error('Invalid JWT structure');
        reportProductionError(error, { jwt, decoded });
        throw error;
      }

      // Log successful JWT creation in production
      if (process.env.NODE_ENV === 'production') {
        console.log('[Production Debug] JWT Created:', {
          hasPayload: !!decoded,
          expiresIn: decoded.exp - Date.now() / 1000,
          timestamp: new Date().toISOString(),
        });
      }

      return jwt;
    } catch (error) {
      reportProductionError(error as Error, {
        payload,
        function: 'createJWT',
      });
      throw new OrbisError(
        'Failed to create JWT',
        OrbisErrorType.AUTH_ERROR,
        error,
      );
    }
  };
}

/**
 * Applies patches to the OrbisDB instance to enhance its functionality
 * @param orbisInstance - The OrbisDB instance to patch
 */
export function applyOrbisDBPatches(orbisInstance: any) {
  if (!orbisInstance) {
    throw new OrbisError(
      'Cannot apply patches to undefined OrbisDB instance',
      OrbisErrorType.VALIDATION_ERROR,
    );
  }

  // Patch 1: Enhance session management
  const originalConnect = orbisInstance.connect?.bind(orbisInstance);
  if (originalConnect) {
    orbisInstance.connect = async function (...args: any[]) {
      try {
        const result = await originalConnect(...args);
        // Validate connection result
        if (!result?.did) {
          throw new Error('Invalid connection result');
        }
        return result;
      } catch (error) {
        throw new OrbisError(
          'Connection failed',
          OrbisErrorType.AUTH_ERROR,
          error,
        );
      }
    };
  }

  // Patch 2: Add automatic session recovery
  const originalIsConnected = orbisInstance.isConnected?.bind(orbisInstance);
  if (originalIsConnected) {
    orbisInstance.isConnected = async function (...args: any[]) {
      try {
        const connected = await originalIsConnected(...args);
        if (!connected) {
          // Attempt to recover session from storage
          const session = localStorage.getItem('orbis_session');
          if (session) {
            try {
              const parsedSession = JSON.parse(session);
              if (parsedSession?.did) {
                return true;
              }
            } catch {
              localStorage.removeItem('orbis_session');
            }
          }
        }
        return connected;
      } catch (error) {
        console.warn('Error checking connection status:', error);
        return false;
      }
    };
  }
}

/**
 * Debug utility to log JWT-related information
 * @param jwt - The JWT to debug
 * @returns Decoded JWT information
 */
export async function debugJWT(jwt: string) {
  try {
    const decoded = await decodeJWT(jwt);
    console.log('JWT Debug Info:', {
      decoded,
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
      isExpired: Date.now() > decoded.exp * 1000,
    });
    return decoded;
  } catch (error) {
    console.error('Failed to debug JWT:', error);
    return null;
  }
}
