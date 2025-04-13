import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from '@app/api/auth/authentication';
import { SignJWT } from 'jose';
import { nanoid } from 'nanoid';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key',
);

export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await request.json();

    const fields = await verifySignature({ message, signature });
    if (!fields) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const token = await new SignJWT({ address: fields.address })
      .setProtectedHeader({ alg: 'HS256' })
      .setJti(nanoid())
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error in login route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
