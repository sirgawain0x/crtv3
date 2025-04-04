import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from 'thirdweb/auth';
import { thirdwebAuth } from '@app/lib/sdk/thirdweb/auth';
import { cookies } from 'next/headers';
import { getAddress } from 'viem';
import { db } from '@app/lib/sdk/orbisDB/client';
import { OrbisKeyDidAuth } from '@useorbis/db-sdk/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payload, signature } = body;

    console.log('Login attempt for address:', payload.address);

    // Verify the signature
    const isValid = await verifySignature({
      message: JSON.stringify(payload),
      signature,
      address: payload.address,
    });

    console.log('Signature verification:', isValid ? 'valid' : 'invalid');

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Normalize addresses for comparison
    const signerAddress = getAddress(payload.address);
    console.log('Normalized signer address:', signerAddress);

    // Connect to Orbis using KeyDidAuth
    try {
      console.log('Connecting to Orbis...');
      const seed = await OrbisKeyDidAuth.generateSeed();
      const auth = await OrbisKeyDidAuth.fromSeed(seed);
      const orbisResult = await db.connectUser({ auth });

      if (!orbisResult) {
        console.error('Failed to connect to Orbis');
        return NextResponse.json(
          { error: 'Failed to connect to Orbis' },
          { status: 401 },
        );
      }

      console.log('Successfully connected to Orbis');
    } catch (orbisError) {
      console.error('Orbis connection error:', orbisError);
      return NextResponse.json(
        { error: 'Failed to connect to Orbis' },
        { status: 401 },
      );
    }

    // Generate JWT
    const jwt = await thirdwebAuth.generateJWT({
      payload: {
        address: signerAddress,
        ...payload,
      },
    });

    console.log('JWT generated:', jwt ? 'success' : 'failed');

    // Set the JWT in an HTTP-only cookie
    cookies().set('jwt', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    console.log('JWT cookie set');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 },
    );
  }
}
