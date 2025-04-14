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
            const connectionResult = await db.connectUser({
              serializedSession: storedSession,
            });
            if (
              connectionResult &&
              'status' in connectionResult &&
              connectionResult.status === 200
            ) {
              console.log(
                'Successfully restored Orbis session for DID:',
                session.did,
              );
            } else {
              throw new Error(
                'Failed to restore session: Invalid connection result',
              );
            }
          } else {
            throw new Error('Invalid session structure');
          }
        } catch (error) {
          console.warn('Invalid or expired Orbis session, clearing:', error);
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

      // Check if already connected with same wallet
      const isConnected = await db.isUserConnected();
      if (isConnected) {
        try {
          const accounts = await provider.request({ method: 'eth_accounts' });
          const currentWalletAddress = accounts?.[0]?.toLowerCase() || '';

          // Get current session data
          const sessionDataStr = localStorage.getItem('orbis_session_data');
          if (sessionDataStr) {
            const sessionData = JSON.parse(sessionDataStr);
            // If connected with same wallet, return current session
            if (
              sessionData?.wallet === currentWalletAddress &&
              currentWalletAddress
            ) {
              const user = await db.getConnectedUser();
              if (user) {
                console.log('Already connected with the same wallet');
                return user;
              }
            }
          }
        } catch (e) {
          console.warn('Failed to check existing session:', e);
          // Continue with fresh connection
        }
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

      if (!result || typeof result !== 'object') {
        throw new OrbisError(
          'Failed to connect user: Invalid response',
          OrbisErrorType.AUTH_ERROR,
        );
      }

      // Store additional session info if needed
      if (saveSession) {
        try {
          const accounts = await provider.request({ method: 'eth_accounts' });
          const walletAddress = accounts?.[0]?.toLowerCase() || 'unknown';

          const sessionData = {
            did:
              (result as any).did || (result as any).status === 200
                ? 'connected'
                : 'error',
            timestamp: Date.now(),
            wallet: walletAddress,
          };
          localStorage.setItem(
            'orbis_session_data',
            JSON.stringify(sessionData),
          );

          console.log(
            'Successfully connected user with wallet:',
            walletAddress,
          );
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
 * Attempts to reconnect a user if they have a valid session
 * @returns Connection result or false if reconnection failed
 */
export async function reconnectUser(): Promise<OrbisConnectResult | false> {
  await ensureInitialized();

  return executeOrbisOperation(async () => {
    try {
      // Check if already connected
      const isConnected = await db.isUserConnected();
      if (isConnected) {
        const user = await db.getConnectedUser();
        if (user) return user;
      }

      // Try to reconnect from stored session
      const storedSession = localStorage.getItem('orbis_session');
      if (storedSession) {
        try {
          const session = JSON.parse(storedSession);
          if (
            session &&
            ((session as any).did || (session as any).status === 200)
          ) {
            const connectionResult = await db.connectUser({
              serializedSession: storedSession,
            });
            if (connectionResult) {
              console.log('Successfully reconnected user from stored session');
              return connectionResult;
            }
          }
        } catch (e) {
          console.warn('Failed to reconnect from stored session:', e);
          localStorage.removeItem('orbis_session');
          localStorage.removeItem('orbis_session_data');
        }
      }

      return false;
    } catch (error) {
      console.error('Orbis reconnection error:', error);
      return false;
    }
  }, 'reconnectUser');
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

/**
 * Verifies authentication by checking both JWT and Orbis connection status
 * For use in API routes and server components to validate auth state
 * @param jwtValid - Whether the JWT is valid (from external JWT verification)
 * @returns Object containing auth status and details
 */
export async function verifyAuthentication(jwtValid: boolean): Promise<{
  authenticated: boolean;
  orbisConnected: boolean;
  details: string;
}> {
  await ensureInitialized();

  return executeOrbisOperation(async () => {
    // First check if JWT is valid
    if (!jwtValid) {
      return {
        authenticated: false,
        orbisConnected: false,
        details: 'Invalid or missing JWT',
      };
    }

    // Then check Orbis connection
    try {
      const orbisConnected = await db.isUserConnected();
      const user = await db.getConnectedUser();

      if (!orbisConnected || !user) {
        return {
          authenticated: false,
          orbisConnected: false,
          details: 'Orbis session expired or invalid',
        };
      }

      return {
        authenticated: true,
        orbisConnected: true,
        details: 'Authentication verified',
      };
    } catch (error) {
      console.error('Orbis authentication verification error:', error);
      return {
        authenticated: false,
        orbisConnected: false,
        details: error instanceof Error ? error.message : 'Unknown Orbis error',
      };
    }
  }, 'verifyAuthentication');
}

export type { OrbisConnectResult };
