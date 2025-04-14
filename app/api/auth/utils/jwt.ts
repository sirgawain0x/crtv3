// app/api/auth/utils/jwt.ts
import * as jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

const secretKey = process.env.JWT_SECRET;

if (!secretKey) {
  throw new Error(
    'JWT_SECRET is not defined. Please check your environment variables.',
  );
}

const signJwt = async (
  payload: object,
  options?: jwt.SignOptions,
): Promise<string> => {
  try {
    const token = await jwt.sign(payload, secretKey, {
      ...options,
      expiresIn: '1h',
    });
    return token;
  } catch (error) {
    throw new Error('Error signing JWT');
  }
};

const verifyJwt = async (token: string): Promise<jwt.JwtPayload | null> => {
  try {
    const decoded = await jwt.verify(token, secretKey);
    return decoded as jwt.JwtPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
};

export default signJwt;
