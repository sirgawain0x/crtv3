import * as jose from 'jose';
import { keyRotationManager } from './keyRotationManager';

// Convert public key to JWKS format
export async function publicKeyToJWKS() {
  return await keyRotationManager.getJWKS();
}

// Create a JWT
export async function createJWT(payload: any) {
  const { privateKey, kid } = await keyRotationManager.getCurrentSigningKey();
  
  // Ensure all nested objects are stringified
  const flattenedPayload = Object.entries(payload).reduce((acc, [key, value]) => ({
    ...acc,
    [key]: typeof value === 'object' ? JSON.stringify(value) : value
  }), {});
  
  const jwt = await new jose.SignJWT(flattenedPayload)
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuedAt()
    .setExpirationTime('2h')
    .setIssuer('crtv3')
    .setAudience('crtv3')
    .sign(privateKey);
  
  return jwt;
}

// Verify a JWT
export async function verifyJWT(token: string) {
  return await keyRotationManager.verifyToken(token);
}
