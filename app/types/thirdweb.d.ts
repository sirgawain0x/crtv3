declare module 'thirdweb' {
  import { PrivateKeyAccount } from 'viem';

  interface ThirdwebSDKOptions {
    clientId?: string;
    secretKey?: string;
  }

  interface JWTPayload {
    address: string;
    [key: string]: unknown;
  }

  interface AuthSDK {
    generateAuthToken(payload: JWTPayload): Promise<string>;
    verify(jwt: string): Promise<JWTPayload>;
  }

  export class ThirdwebSDK {
    static fromPrivateKey(
      privateKey: string | PrivateKeyAccount,
      chain: string,
      options?: ThirdwebSDKOptions,
    ): ThirdwebSDK;

    auth: AuthSDK;
  }

  interface VerifySignatureParams {
    message: string;
    signature: string;
    address: string;
  }

  export function verifySignature(
    params: VerifySignatureParams,
  ): Promise<boolean>;
}
