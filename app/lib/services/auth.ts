import { OrbisEVMAuth } from '@useorbis/db-sdk/auth';
import { db } from '@app/lib/sdk/orbisDB/client';
import type { OrbisConnectResult } from '@useorbis/db-sdk';

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export class AuthService {
  static async connectWithOrbis(): Promise<OrbisConnectResult> {
    try {
      if (!window.ethereum) {
        throw new Error('No Web3 provider found');
      }

      const auth = new OrbisEVMAuth(window.ethereum);
      const result = await db.connectUser({ auth });

      if (!result) {
        throw new Error('Failed to connect with Orbis');
      }

      return result;
    } catch (error) {
      console.error('Orbis connection error:', error);
      throw error;
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
      const user = await db.getConnectedUser();
      return user || null;
    } catch (error) {
      console.error('Get Orbis user error:', error);
      return null;
    }
  }

  static async checkAuthStatus(): Promise<AuthResponse> {
    try {
      // Check JWT token
      const response = await fetch('/api/auth/check', {
        credentials: 'include',
      });

      // Check Orbis connection
      const orbisConnected = await this.isOrbisConnected();
      const orbisUser = orbisConnected ? await this.getOrbisUser() : null;

      return {
        success: response.ok && orbisConnected,
        data: {
          orbisUser,
          isAuthenticated: response.ok && orbisConnected,
        },
      };
    } catch (error) {
      console.error('Auth status check error:', error);
      return {
        success: false,
        message: 'Failed to check authentication status',
      };
    }
  }

  static async login() {
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

      // Generate login payload
      const domain = window.location.origin;
      const statement =
        'Welcome to Creative TV! Sign this message to authenticate.';
      const nonce = Date.now().toString();
      const now = new Date();

      const payload = {
        domain,
        address: account,
        statement,
        uri: window.location.origin,
        version: '1',
        chain_id: window.ethereum.chainId,
        nonce,
        issued_at: now.toISOString(),
        expiration_time: new Date(
          now.getTime() + 1000 * 60 * 60 * 24,
        ).toISOString(),
        resources: [`${window.location.origin}/*`],
      };

      // Get signature from wallet
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [JSON.stringify(payload), account],
      });

      // Send to backend for verification
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ payload, signature }),
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
