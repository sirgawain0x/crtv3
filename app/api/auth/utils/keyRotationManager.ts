import * as jose from 'jose';
import crypto from 'crypto';
import { createClient } from 'redis';

interface KeyPair {
  privateKeyPem: string;
  publicKeyPem: string;
  kid: string;
  createdAt: number;
}

interface StoredKeyPair extends KeyPair {
  isActive: boolean;
}

class KeyRotationManager {
  private static instance: KeyRotationManager;
  private readonly KEY_LIFETIME = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  private readonly ROTATION_BUFFER = 7 * 24 * 60 * 60 * 1000; // 7 days buffer for rotation
  private readonly KEY_PREFIX = 'jwt_key:';
  private readonly ACTIVE_KEYS_SET = 'jwt_active_keys';
  private redis: ReturnType<typeof createClient> | null = null;

  private constructor() {}

  public static getInstance(): KeyRotationManager {
    if (!KeyRotationManager.instance) {
      KeyRotationManager.instance = new KeyRotationManager();
    }
    return KeyRotationManager.instance;
  }

  private async getRedisClient() {
    if (!this.redis) {
      this.redis = createClient({ url: process.env.TV_REDIS_URL });
      await this.redis.connect();
    }
    return this.redis;
  }

  private async loadKeyPair(kid: string): Promise<KeyPair | null> {
    const redis = await this.getRedisClient();
    const key = await redis.get(`${this.KEY_PREFIX}${kid}`);
    if (!key) return null;
    const storedKey = JSON.parse(key) as StoredKeyPair;
    if (!storedKey.isActive) return null;
    return storedKey;
  }

  private async loadActiveKeys(): Promise<KeyPair[]> {
    const redis = await this.getRedisClient();
    const activeKids = await redis.sMembers(this.ACTIVE_KEYS_SET);
    const keys = await Promise.all(
      activeKids.map((kid) => this.loadKeyPair(kid)),
    );
    return keys.filter((k): k is KeyPair => k !== null);
  }

  private async storeKeyPair(keyPair: KeyPair) {
    const redis = await this.getRedisClient();
    const storedKey: StoredKeyPair = {
      ...keyPair,
      isActive: true,
    };
    await redis.set(`${this.KEY_PREFIX}${keyPair.kid}`, JSON.stringify(storedKey));
    await redis.sAdd(this.ACTIVE_KEYS_SET, keyPair.kid);
  }

  private async deactivateKey(kid: string) {
    const redis = await this.getRedisClient();
    await redis.sRem(this.ACTIVE_KEYS_SET, kid);
    const keyJson = await redis.get(`${this.KEY_PREFIX}${kid}`);
    if (keyJson) {
      const key = JSON.parse(keyJson) as StoredKeyPair;
      key.isActive = false;
      await redis.set(`${this.KEY_PREFIX}${kid}`, JSON.stringify(key));
    }
  }

  public async initialize() {
    const activeKeys = await this.loadActiveKeys();
    if (activeKeys.length === 0) {
      await this.addNewKey();
    }
  }

  private async addNewKey(): Promise<KeyPair> {
    const keyPair = await jose.generateKeyPair('RS256');
    const privateKeyPem = await jose.exportPKCS8(keyPair.privateKey);
    const publicKeyPem = await jose.exportSPKI(keyPair.publicKey);
    const jwk = await jose.exportJWK(keyPair.publicKey);
    const kid = crypto
      .createHash('sha256')
      .update(JSON.stringify(jwk))
      .digest('hex');

    const newKeyPair: KeyPair = {
      privateKeyPem,
      publicKeyPem,
      kid,
      createdAt: Date.now(),
    };

    await this.storeKeyPair(newKeyPair);
    return newKeyPair;
  }

  public async getCurrentSigningKey(): Promise<{
    privateKey: jose.KeyLike;
    kid: string;
  }> {
    const activeKeys = await this.loadActiveKeys();
    let currentKey = activeKeys[activeKeys.length - 1];
    const now = Date.now();

    // If the current key is approaching expiration, generate a new one
    if (
      !currentKey ||
      now - currentKey.createdAt > this.KEY_LIFETIME - this.ROTATION_BUFFER
    ) {
      currentKey = await this.addNewKey();
    }

    const privateKey = await jose.importPKCS8(
      currentKey.privateKeyPem,
      'RS256',
    );
    return { privateKey, kid: currentKey.kid };
  }

  public async getJWKS() {
    const activeKeys = await this.loadActiveKeys();
    const now = Date.now();

    // Remove expired keys (keep one old key for verification buffer)
    for (const key of activeKeys.slice(0, -2)) {
      if (now - key.createdAt > this.KEY_LIFETIME) {
        await this.deactivateKey(key.kid);
      }
    }

    // Convert all valid keys to JWKS format
    const jwks = await Promise.all(
      activeKeys.map(async (key) => {
        const publicKey = await jose.importSPKI(key.publicKeyPem, 'RS256');
        const jwk = await jose.exportJWK(publicKey);
        return {
          ...jwk,
          kid: key.kid,
          use: 'sig',
          alg: 'RS256',
        };
      }),
    );

    return { keys: jwks };
  }

  public async verifyToken(token: string): Promise<jose.JWTVerifyResult> {
    const decoded = jose.decodeProtectedHeader(token);
    const kid = decoded.kid;
    if (!kid) throw new Error('No key identifier in token');

    const keyPair = await this.loadKeyPair(kid);
    if (!keyPair) {
      throw new Error('Invalid key identifier');
    }

    const publicKey = await jose.importSPKI(keyPair.publicKeyPem, 'RS256');
    return await jose.jwtVerify(token, publicKey, {
      algorithms: ['RS256'],
    });
  }

  public async cleanup() {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}

export const keyRotationManager = KeyRotationManager.getInstance();
