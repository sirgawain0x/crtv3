import * as jose from 'jose';
import crypto from 'crypto';

interface KeyPair {
  privateKey: jose.KeyLike;
  publicKey: jose.KeyLike;
  kid: string;
  createdAt: number;
}

class KeyRotationManager {
  private static instance: KeyRotationManager;
  private keys: KeyPair[] = [];
  private readonly KEY_LIFETIME = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  private readonly ROTATION_BUFFER = 7 * 24 * 60 * 60 * 1000; // 7 days buffer for rotation

  private constructor() {}

  public static getInstance(): KeyRotationManager {
    if (!KeyRotationManager.instance) {
      KeyRotationManager.instance = new KeyRotationManager();
    }
    return KeyRotationManager.instance;
  }

  public async initialize() {
    // Load initial key if no keys exist
    if (this.keys.length === 0) {
      await this.addNewKey();
    }
  }

  private async addNewKey(): Promise<KeyPair> {
    const keyPair = await jose.generateKeyPair('RS256');
    const jwk = await jose.exportJWK(keyPair.publicKey);
    const kid = crypto.createHash('sha256').update(JSON.stringify(jwk)).digest('hex');

    const newKeyPair: KeyPair = {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      kid,
      createdAt: Date.now(),
    };

    this.keys.push(newKeyPair);
    return newKeyPair;
  }

  public async getCurrentSigningKey(): Promise<KeyPair> {
    const now = Date.now();
    let currentKey = this.keys[this.keys.length - 1];

    // If the current key is approaching expiration, generate a new one
    if (now - currentKey.createdAt > this.KEY_LIFETIME - this.ROTATION_BUFFER) {
      currentKey = await this.addNewKey();
    }

    return currentKey;
  }

  public async getJWKS() {
    // Remove expired keys (keep one old key for verification buffer)
    const now = Date.now();
    this.keys = this.keys.filter((key, index) => {
      const isLatestKey = index === this.keys.length - 1;
      const isPreviousKey = index === this.keys.length - 2;
      return isLatestKey || isPreviousKey || (now - key.createdAt <= this.KEY_LIFETIME);
    });

    // Convert all valid keys to JWKS format
    const jwks = await Promise.all(
      this.keys.map(async (key) => {
        const jwk = await jose.exportJWK(key.publicKey);
        return {
          ...jwk,
          kid: key.kid,
          use: 'sig',
          alg: 'RS256',
        };
      })
    );

    return { keys: jwks };
  }

  public async verifyToken(token: string): Promise<jose.JWTVerifyResult> {
    const decoded = jose.decodeProtectedHeader(token);
    const kid = decoded.kid;

    // Find the key with matching kid
    const keyPair = this.keys.find(k => k.kid === kid);
    if (!keyPair) {
      throw new Error('Invalid key identifier');
    }

    return await jose.jwtVerify(token, keyPair.publicKey, {
      algorithms: ['RS256'],
    });
  }
}

export const keyRotationManager = KeyRotationManager.getInstance();
