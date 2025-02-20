import * as jose from 'jose';

let privateKey: jose.KeyLike | null = null;
let publicKey: jose.KeyLike | null = null;

export async function getPrivateKey(): Promise<jose.KeyLike> {
  if (!privateKey) {
    const privateKeyPem = process.env.JWT_PRIVATE_KEY;
    if (!privateKeyPem) {
      throw new Error('JWT_PRIVATE_KEY not found in environment variables');
    }
    privateKey = await jose.importPKCS8(privateKeyPem, 'RS256');
  }
  return privateKey;
}

export async function getPublicKey(): Promise<jose.KeyLike> {
  if (!publicKey) {
    const publicKeyPem = process.env.JWT_PUBLIC_KEY;
    if (!publicKeyPem) {
      throw new Error('JWT_PUBLIC_KEY not found in environment variables');
    }
    publicKey = await jose.importSPKI(publicKeyPem, 'RS256');
  }
  return publicKey;
}
