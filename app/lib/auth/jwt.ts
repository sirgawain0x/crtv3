import { thirdwebAuth } from './thirdweb';

interface JWTPayload {
  address: string;
  did?: string;
  [key: string]: unknown;
}

export async function generateJWT(payload: JWTPayload): Promise<string> {
  try {
    return await thirdwebAuth.generateJWT({ payload });
  } catch (error) {
    console.error('JWT generation error:', error);
    throw new Error('Failed to generate JWT');
  }
}

export async function verifyJWT(jwt: string): Promise<JWTPayload> {
  try {
    return await thirdwebAuth.verifyJWT(jwt);
  } catch (error) {
    console.error('JWT verification error:', error);
    throw new Error('Failed to verify JWT');
  }
}

export function parseJWT(jwt: string): JWTPayload {
  try {
    const [, payloadBase64] = jwt.split('.');
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
    return payload;
  } catch (error) {
    console.error('JWT parsing error:', error);
    throw new Error('Failed to parse JWT');
  }
}
