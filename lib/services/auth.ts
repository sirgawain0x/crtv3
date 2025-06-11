import { OrbisDB } from '@useorbis/db-sdk';
import { OrbisEVMAuth } from '@useorbis/db-sdk/auth';

interface AuthResult {
  success: boolean;
  message?: string;
}

let orbis: OrbisDB | null = null;

export type AuthService = {
  isOrbisConnected(): Promise<boolean>;
  disconnectFromOrbis(): Promise<void>;
  connectWithOrbis(): Promise<boolean>;
  login(): Promise<AuthResult>;
  logout(): Promise<AuthResult>;
};

export const AuthService: AuthService = {
  isOrbisConnected: async (): Promise<boolean> => {
    return !!orbis?.session;
  },

  disconnectFromOrbis: async (): Promise<void> => {
    if (orbis) {
      orbis = null;
    }
  },

  connectWithOrbis: async (): Promise<boolean> => {
    try {
      if (!window.ethereum) throw new Error('No provider found');

      const auth = new OrbisEVMAuth(window.ethereum);
      const { did, session } = await auth.authenticateDid();

      if (!did || !session) {
        throw new Error('Authentication failed');
      }

      // @ts-expect-error - OrbisDB types are not properly defined
      orbis = new OrbisDB();
      await orbis.connectUser({ auth });

      return true;
    } catch (error) {
      throw error;
    }
  },

  login: async (): Promise<AuthResult> => {
    if (!orbis?.session) {
      return { success: false, message: 'Not connected to Orbis' };
    }
    return { success: true };
  },

  logout: async (): Promise<AuthResult> => {
    await AuthService.disconnectFromOrbis();
    return { success: true };
  },
};
