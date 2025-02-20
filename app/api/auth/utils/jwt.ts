import * as jose from 'jose';
import { keyRotationManager } from './keyRotationManager';

// Convert public key to JWKS format
export async function publicKeyToJWKS() {
  return await keyRotationManager.getJWKS();
}

// Create a JWT
export async function createJWT(payload: any) {
  const { privateKey, kid } = await keyRotationManager.getCurrentSigningKey();
  
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuedAt()
    .setExpirationTime('2h')
    .setAudience('crtv3')
    .sign(privateKey);
  
  return jwt;
}

// Verify a JWT
export async function verifyJWT(token: string) {
  return await keyRotationManager.verifyToken(token);
}
