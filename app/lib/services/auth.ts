import { OrbisEVMAuth } from '@useorbis/db-sdk/auth';
import { db } from '@app/lib/sdk/orbisDB/client';
import {
  OrbisConnectResult,
  isValidOrbisResult,
  normalizeOrbisResult,
} from '@app/types/orbis';

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export class AuthService {
  private static authCheckCache: {
    timestamp: number;
    result: AuthResponse;
  } | null = null;

  private static authCheckPromise: Promise<AuthResponse> | null = null;

  static async connectWithOrbis(): Promise<OrbisConnectResult> {
    try {
      // First check if wallet is connected
      if (!window.ethereum?.selectedAddress) {
        throw new Error(
          'No wallet connected. Please connect your wallet first.',
        );
      }

      // Create auth instance
      const auth = new OrbisEVMAuth(window.ethereum);

      // Connect with proper error handling and retries
      const connectWithRetry = async (
        retries = 2,
      ): Promise<OrbisConnectResult> => {
        for (let i = 0; i <= retries; i++) {
          try {
            console.log(`Attempting Orbis connection (attempt ${i + 1})...`);

            // First check if we're already connected
            const existingUser = await db.getConnectedUser();
            if (existingUser) {
              console.log('Found existing Orbis connection');
              return normalizeOrbisResult(existingUser);
            }

            const rawResult = await db.connectUser({ auth });
            console.log('Raw Orbis connection result:', rawResult);

            if (!rawResult) {
              throw new Error('Null response from Orbis connection');
            }

            // Wait for DID to be available (max 5 seconds)
            const waitForDID = async (maxAttempts = 5) => {
              let lastResult = rawResult;

              for (let j = 0; j < maxAttempts; j++) {
                const rawDID =
                  (lastResult as any).did ||
                  (lastResult as any).user?.did ||
                  (lastResult as any).auth?.did;

                if (rawDID) {
                  return lastResult;
                }

                // Wait with exponential backoff
                await new Promise((resolve) =>
                  setTimeout(resolve, Math.min(1000 * Math.pow(1.5, j), 5000)),
                );

                // Check both getConnectedUser and the original result
                const [updatedUser, verifyConnection] = await Promise.all([
                  db.getConnectedUser(),
                  db.isUserConnected(),
                ]);

                if (!verifyConnection) {
                  throw new Error('Lost connection while waiting for DID');
                }

                if (updatedUser) {
                  lastResult = updatedUser;
                }
              }
              throw new Error('DID not available after waiting');
            };

            const finalResult = await waitForDID();
            const result = normalizeOrbisResult(finalResult);

            if (!isValidOrbisResult(result)) {
              console.error('Invalid Orbis result structure:', result);
              throw new Error(
                'Invalid Orbis connection result: Response format does not match expected structure',
              );
            }

            return result;
          } catch (error) {
            console.error(`Connection attempt ${i + 1} failed:`, {
              error,
              message: error instanceof Error ? error.message : String(error),
            });

            if (i === retries) throw error;

            // Exponential backoff for retries
            await new Promise((resolve) =>
              setTimeout(resolve, Math.min(1000 * Math.pow(2, i), 5000)),
            );
          }
        }
        throw new Error('Failed to connect after retries');
      };

      const result = await connectWithRetry();

      // Log successful connection with DID details
      console.log('Successfully connected to Orbis:', {
        status: result.status,
        result: result.result,
        did: result.did,
        user: result.user,
      });

      return result;
    } catch (error) {
      console.error('Orbis connection error:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw new Error(
        error instanceof Error
          ? `Orbis connection failed: ${error.message}`
          : 'Failed to connect with Orbis. Please try again.',
      );
    }
  }

  static async disconnectFromOrbis(): Promise<void> {
    try {
      await db.disconnectUser();
    } catch (error) {
      console.error('Orbis disconnect error:', error);
      throw error;
    }
  }

  static async isOrbisConnected(): Promise<boolean> {
    try {
      const connected = await db.isUserConnected();
      return !!connected;
    } catch (error) {
      console.error('Orbis connection check error:', error);
      return false;
    }
  }

  static async getOrbisUser(): Promise<OrbisConnectResult | null> {
    try {
      const rawUser = await db.getConnectedUser();

      if (!rawUser) return null;

      // Convert the SDK response to our normalized format
      return normalizeOrbisResult(rawUser);
    } catch (error) {
      console.error('Get Orbis user error:', error);
      return null;
    }
  }

  static async checkAuthStatus(): Promise<AuthResponse> {
    try {
      // Return cached result if less than 5 seconds old
      if (
        this.authCheckCache &&
        Date.now() - this.authCheckCache.timestamp < 5000
      ) {
        return this.authCheckCache.result;
      }

      // If there's an ongoing check, return its promise
      if (this.authCheckPromise) {
        return this.authCheckPromise;
      }

      // Create new promise for this check
      this.authCheckPromise = (async () => {
        try {
          // Check JWT token
          const response = await fetch('/api/auth/check', {
            credentials: 'include',
          });

          // Check Orbis connection with timeout
          const orbisCheckPromise = Promise.race([
            this.isOrbisConnected(),
            new Promise<boolean>((_, reject) =>
              setTimeout(() => reject(new Error('Orbis check timeout')), 5000),
            ),
          ]);

          const [orbisConnected] = await Promise.all([orbisCheckPromise]);
          const orbisUser = orbisConnected ? await this.getOrbisUser() : null;

          const result = {
            success: response.ok && orbisConnected,
            data: {
              orbisUser,
              isAuthenticated: response.ok && orbisConnected,
            },
          };

          // Cache the result
          this.authCheckCache = {
            timestamp: Date.now(),
            result,
          };

          return result;
        } finally {
          // Clear the promise reference
          this.authCheckPromise = null;
        }
      })();

      return this.authCheckPromise;
    } catch (error) {
      console.error('Auth status check error:', error);
      return {
        success: false,
        message: 'Failed to check authentication status',
      };
    }
  }

  static async login(): Promise<AuthResponse> {
    try {
      // First ensure we have a connected wallet
      const account = window.ethereum?.selectedAddress;
      if (!account) {
        throw new Error('No wallet connected');
      }

      // Connect with Orbis first
      const orbisResult = await this.connectWithOrbis();
      if (!orbisResult) {
        throw new Error('Failed to connect with Orbis');
      }

      // Generate login payload with proper SIWE formatting
      const domain = window.location.host;
      const origin = window.location.origin;
      const chainId = parseInt(window.ethereum.chainId, 16);
      const nonce = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const now = new Date();
      const expiration = new Date(now.getTime() + 1000 * 60 * 60 * 24);

      const payload = {
        domain,
        address: account.toLowerCase(),
        statement: 'Welcome to Creative TV! Sign this message to authenticate.',
        uri: origin,
        version: '1',
        chainId,
        nonce,
        issuedAt: now.toISOString(),
        expirationTime: expiration.toISOString(),
        resources: [`${origin}/*`],
      };

      // Get signature from wallet with proper error handling
      let signature;
      try {
        signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [JSON.stringify(payload), account.toLowerCase()],
        });

        if (!signature || typeof signature !== 'string') {
          throw new Error('Invalid signature format received from wallet');
        }

        console.log('Signature received:', {
          type: typeof signature,
          length: signature.length,
          prefix: signature.substring(0, 10),
        });
      } catch (signError) {
        console.error('Signature error:', signError);
        throw new Error(
          signError instanceof Error
            ? `Failed to sign message: ${signError.message}`
            : 'Failed to sign authentication message',
        );
      }

      // Send to backend for verification
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          payload,
          signature: signature.trim(), // Ensure clean signature
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to login',
      };
    }
  }

  static async logout(): Promise<AuthResponse> {
    try {
      await this.disconnectFromOrbis();

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'Failed to logout',
      };
    }
  }
}
