import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { thirdwebAuth } from '@app/lib/sdk/thirdweb/auth';
import { db } from '@app/lib/sdk/orbisDB/client';

export async function GET() {
  try {
    // Get the JWT from cookies
    const jwt = cookies().get('jwt')?.value;
    console.log('JWT from cookies:', jwt ? 'present' : 'missing');

    if (!jwt) {
      console.log('No JWT found in cookies');
      return NextResponse.json(
        { error: 'Unauthorized - No JWT' },
        { status: 401 },
      );
    }

    // Verify the JWT
    let authResult;
    try {
      // Log the JWT for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('JWT to verify:', jwt);
      }

      authResult = await thirdwebAuth.verifyJWT({ jwt });
      console.log('JWT verification result:', authResult);

      if (!authResult.valid) {
        console.error('JWT verification failed:', authResult.error);
        return NextResponse.json(
          { error: `Unauthorized - Invalid JWT: ${authResult.error}` },
          { status: 401 },
        );
      }
    } catch (error) {
      const jwtError = error as Error;
      console.error('JWT verification error:', jwtError);
      return NextResponse.json(
        { error: `Unauthorized - JWT Error: ${jwtError.message}` },
        { status: 401 },
      );
    }

    // Check Orbis connection
    try {
      console.log('Checking Orbis connection...');
      const isConnected = await db.isUserConnected();
      console.log(
        'Orbis connection status:',
        isConnected ? 'connected' : 'not connected',
      );

      if (!isConnected) {
        console.log('Orbis not connected, attempting to reconnect...');
        const currentUser = await db.getConnectedUser();

        if (!currentUser) {
          console.log('No Orbis user found');
          return NextResponse.json(
            { error: 'Unauthorized - Orbis not connected' },
            { status: 401 },
          );
        }
      }
    } catch (orbisError) {
      console.error('Orbis connection check error:', orbisError);
      return NextResponse.json(
        { error: 'Unauthorized - Orbis connection error' },
        { status: 401 },
      );
    }

    // If we get here, both JWT and Orbis connection are valid
    console.log(
      'Authentication successful for address:',
      authResult.parsedJWT.sub,
    );

    return NextResponse.json({
      user: {
        address: authResult.parsedJWT.sub,
        ...authResult.parsedJWT,
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Authentication check failed' },
      { status: 401 },
    );
  }
}
