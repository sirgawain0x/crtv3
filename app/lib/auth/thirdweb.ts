import { ThirdwebSDK } from 'thirdweb';
import { PrivateKeyAccount } from 'viem';

interface JWTPayload {
  address: string;
  did?: string;
  [key: string]: unknown;
}

interface GenerateJWTOptions {
  payload: JWTPayload;
}

class ThirdwebAuthWrapper {
  private sdk: ThirdwebSDK;

  constructor(privateKey: string | PrivateKeyAccount) {
    this.sdk = ThirdwebSDK.fromPrivateKey(privateKey, 'mainnet', {
      clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
      secretKey: process.env.THIRDWEB_SECRET_KEY,
    });
  }

  async generateJWT(options: GenerateJWTOptions): Promise<string> {
    return this.sdk.auth.generateAuthToken(options.payload);
  }

  async verifyJWT(jwt: string): Promise<JWTPayload> {
    return this.sdk.auth.verify(jwt);
  }
}

// Initialize with environment variable
const privateKey = process.env.THIRDWEB_AUTH_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('THIRDWEB_AUTH_PRIVATE_KEY is not defined');
}

export const thirdwebAuth = new ThirdwebAuthWrapper(privateKey);
