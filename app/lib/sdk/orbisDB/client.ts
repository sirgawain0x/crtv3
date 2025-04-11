import { OrbisDB } from '@useorbis/db-sdk';
import { OrbisEVMAuth } from '@useorbis/db-sdk/auth';
import { catchError } from '@useorbis/db-sdk/util';
import type { OrbisConnectResult } from '@useorbis/db-sdk';
import { executeOrbisOperation } from './error-handler';
import { OrbisError, OrbisErrorType } from './types';
import {
  applyOrbisAuthPatches,
  applyOrbisDBPatches,
  debugJWT,
} from './auth-patch';

// Apply auth patches with specific configuration
applyOrbisAuthPatches({
  jwtOptions: {
    expiresIn: '1d',
  },
});

// Validate required environment variables
const requiredEnvVars = {
  NEXT_PUBLIC_CERAMIC_NODE_URL: process.env.NEXT_PUBLIC_CERAMIC_NODE_URL ?? '',
  NEXT_PUBLIC_ORBIS_NODE_URL: process.env.NEXT_PUBLIC_ORBIS_NODE_URL ?? '',
  NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID:
    process.env.NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID ?? '',
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  throw new OrbisError(
    `Missing required environment variables: ${missingVars.join(', ')}`,
    OrbisErrorType.VALIDATION_ERROR,
  );
}

// Initialize OrbisDB instance
export const db = new OrbisDB({
  ceramic: {
    gateway: requiredEnvVars.NEXT_PUBLIC_CERAMIC_NODE_URL,
  },
  nodes: [
    {
      gateway: requiredEnvVars.NEXT_PUBLIC_ORBIS_NODE_URL,
      env: requiredEnvVars.NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID,
    },
  ],
});

// Apply patches to the OrbisDB instance after initialization
applyOrbisDBPatches(db);

// Add connection status check
let isInitialized = false;

/**
 * Ensures the Orbis client is initialized
 */
async function ensureInitialized() {
  if (!isInitialized) {
    try {
      // Check if we have a stored session
      const storedSession = localStorage.getItem('orbis_session');
      if (storedSession) {
        try {
          const session = JSON.parse(storedSession);
          if (session && session.did) {
            await db.connectUser({ serializedSession: storedSession });
            console.log(
              'Successfully restored Orbis session for DID:',
              session.did,
            );
          }
        } catch (error) {
          console.warn('Invalid session data, clearing:', error);
          localStorage.removeItem('orbis_session');
          localStorage.removeItem('orbis_session_data');
        }
      }
      isInitialized = true;
    } catch (error) {
      console.warn('Failed to restore Orbis session:', error);
      // Clear potentially corrupted session
      localStorage.removeItem('orbis_session');
      localStorage.removeItem('orbis_session_data');
      // Continue with initialization, don't throw error
      isInitialized = true;
    }
  }
}

/**
 * Connects a user to OrbisDB using EVM authentication
 */
export async function connectUser(
  provider: any,
  saveSession = true,
): Promise<OrbisConnectResult> {
  // Always ensure initialized first
  await ensureInitialized();

  return executeOrbisOperation(async () => {
    try {
      // Validate provider
      if (!provider || typeof provider.request !== 'function') {
        throw new OrbisError(
          'Invalid provider: must have request method',
          OrbisErrorType.AUTH_ERROR,
        );
      }

      // Clear any existing session before connecting
      try {
        localStorage.removeItem('orbis_session');
        localStorage.removeItem('orbis_session_data');
        await db.disconnectUser();
      } catch (e) {
        // Ignore errors during disconnection
        console.log(
          'Clean disconnect failed, continuing with fresh connection',
        );
      }

      // Create and patch the auth instance with proper provider typing
      const auth = new OrbisEVMAuth({
        request: provider.request.bind(provider),
      });

      // Connect user with proper error handling
      const result = await db.connectUser({ auth, saveSession });

      if (!result || typeof result !== 'object' || !('did' in result)) {
        throw new OrbisError(
          'Failed to connect user: Invalid response',
          OrbisErrorType.AUTH_ERROR,
        );
      }

      // Store additional session info if needed
      if (saveSession && result.did) {
        try {
          const accounts = await provider.request({ method: 'eth_accounts' });
          const walletAddress = accounts?.[0]?.toLowerCase() || 'unknown';

          const sessionData = {
            did: result.did,
            timestamp: Date.now(),
            wallet: walletAddress,
          };
          localStorage.setItem(
            'orbis_session_data',
            JSON.stringify(sessionData),
          );

          console.log('Successfully connected user with DID:', result.did);
        } catch (e) {
          console.warn('Failed to save additional session data:', e);
        }
      }

      return result;
    } catch (error) {
      console.error('Orbis connection error:', error);
      // Clear any partial session data on error
      localStorage.removeItem('orbis_session');
      localStorage.removeItem('orbis_session_data');

      throw new OrbisError(
        'Failed to connect to OrbisDB',
        OrbisErrorType.AUTH_ERROR,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }, 'connectUser');
}

/**
 * Checks if a user is connected to OrbisDB
 * @param address - Optional address to check
 * @returns Whether the user is connected
 */
export async function isUserConnected(address?: string): Promise<boolean> {
  await ensureInitialized();

  return executeOrbisOperation(async () => {
    try {
      return await db.isUserConnected(address);
    } catch (error) {
      console.error('Failed to check user connection:', error);
      return false;
    }
  }, 'isUserConnected');
}

/**
 * Gets the currently connected user
 * @returns The connected user's information or false if not connected
 */
export async function getConnectedUser(): Promise<OrbisConnectResult | false> {
  await ensureInitialized();

  return executeOrbisOperation(async () => {
    try {
      return await db.getConnectedUser();
    } catch (error) {
      console.error('Failed to get connected user:', error);
      return false;
    }
  }, 'getConnectedUser');
}

/**
 * Disconnects the current user
 */
export async function disconnectUser(): Promise<void> {
  return executeOrbisOperation(async () => {
    try {
      localStorage.removeItem('orbis_session');
      localStorage.removeItem('orbis_session_data');
      await db.disconnectUser();
      isInitialized = false;
    } catch (error) {
      console.error('Failed to disconnect user:', error);
      // Still clear local storage even if disconnect fails
      localStorage.removeItem('orbis_session');
      localStorage.removeItem('orbis_session_data');
      throw error;
    }
  }, 'disconnectUser');
}

export type { OrbisConnectResult };
