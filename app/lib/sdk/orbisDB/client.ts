import { OrbisDB } from '@useorbis/db-sdk';
import { OrbisEVMAuth } from '@useorbis/db-sdk/auth';
import { catchError } from '@useorbis/db-sdk/util';
import type { OrbisConnectResult } from '@useorbis/db-sdk';
import { executeOrbisOperation } from './error-handler';
import { OrbisError, OrbisErrorType } from './types';
import { applyOrbisAuthPatches, applyOrbisDBPatches } from './auth-patch';

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

// Apply patches to the OrbisDB instance
applyOrbisDBPatches(db);
// Apply auth patches globally
applyOrbisAuthPatches();

/**
 * Connects a user to OrbisDB using EVM authentication
 * @param provider - The EVM provider (e.g., window.ethereum)
 * @param saveSession - Whether to save the session in localStorage
 * @returns The connection result
 */
export async function connectUser(
  provider: any,
  saveSession = true,
): Promise<OrbisConnectResult> {
  return executeOrbisOperation(async () => {
    try {
      // Create and patch the auth instance
      const auth = new OrbisEVMAuth(provider);

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
          // Extract address from provider if available, or use a placeholder
          const walletAddress =
            typeof provider.getAddress === 'function'
              ? await provider.getAddress()
              : provider.address || 'unknown';

          const sessionData = {
            did: result.did,
            timestamp: Date.now(),
            wallet: walletAddress,
          };
          localStorage.setItem(
            'orbis_session_data',
            JSON.stringify(sessionData),
          );
        } catch (e) {
          console.warn('Failed to save additional session data:', e);
        }
      }

      return result;
    } catch (error) {
      console.error('Orbis connection error:', error);
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
  return executeOrbisOperation(async () => {
    return db.isUserConnected(address);
  }, 'isUserConnected');
}

/**
 * Gets the currently connected user
 * @returns The connected user's information or false if not connected
 */
export async function getConnectedUser(): Promise<OrbisConnectResult | false> {
  return executeOrbisOperation(async () => {
    return db.getConnectedUser();
  }, 'getConnectedUser');
}

/**
 * Disconnects the current user
 */
export async function disconnectUser(): Promise<void> {
  return executeOrbisOperation(async () => {
    localStorage.removeItem('orbis_session');
    localStorage.removeItem('orbis_session_data');
    return db.disconnectUser();
  }, 'disconnectUser');
}

export type { OrbisConnectResult };
