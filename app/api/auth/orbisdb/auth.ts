import { OrbisKeyDidAuth } from '@useorbis/db-sdk/auth';
import { db } from '@app/lib/sdk/orbisDB/client';
import type { OrbisConnectResult } from '@useorbis/db-sdk';

export class OrbisAuth {
  private static readonly SEED_KEY = 'orbis_seed';

  static async connect(saveSession = true): Promise<OrbisConnectResult> {
    try {
      // First check if user is already connected
      const currentUser = await db.getConnectedUser();
      if (currentUser) return currentUser;

      // Get existing seed or generate new one
      let seed = localStorage.getItem(this.SEED_KEY);
      if (!seed) {
        const newSeed = await OrbisKeyDidAuth.generateSeed();
        seed =
          typeof newSeed === 'string'
            ? newSeed
            : Buffer.from(newSeed).toString('hex');
        localStorage.setItem(this.SEED_KEY, seed);
      }

      // Create auth instance from seed
      const auth = await OrbisKeyDidAuth.fromSeed(seed);

      // Connect user
      const result = await db.connectUser({
        auth,
        saveSession,
      });

      if (!result) throw new Error('Failed to connect user');

      return result;
    } catch (error) {
      console.error('Auth error:', error);
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    localStorage.removeItem(this.SEED_KEY);
    // Additional cleanup if needed
  }

  static async isConnected(): Promise<boolean> {
    return db.isUserConnected();
  }

  static async getCurrentUser(): Promise<OrbisConnectResult | false> {
    return db.getConnectedUser();
  }

  static get session() {
    return db.session;
  }
}
