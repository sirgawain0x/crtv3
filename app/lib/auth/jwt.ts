import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

export interface JWTPayload {
  address: string;
  exp?: number;
}

export async function generateJWT(payload: JWTPayload): Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign(
      payload,
      JWT_SECRET!,
      {
        expiresIn: '24h',
      },
      (err, token) => {
        if (err) reject(err);
        else if (token) resolve(token);
        else reject(new Error('Failed to generate token'));
      },
    );
  });
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET!, (err, decoded) => {
      if (err) reject(err);
      else if (decoded && typeof decoded === 'object')
        resolve(decoded as JWTPayload);
      else reject(new Error('Invalid token payload'));
    });
  });
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
