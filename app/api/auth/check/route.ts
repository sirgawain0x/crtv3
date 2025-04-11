import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { thirdwebAuth } from '@app/lib/sdk/thirdweb/auth';
import { db } from '@app/lib/sdk/orbisDB/client';
import { z } from 'zod';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

// Configure caching
export const revalidate = 0;

// Define response types
const AuthResponseSchema = z.object({
  user: z.object({
    address: z.string(),
    exp: z.number(),
    iat: z.number(),
    sub: z.string(),
  }),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

type AuthResponse = z.infer<typeof AuthResponseSchema>;
type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Custom error class for auth errors
class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public details?: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function GET(): Promise<
  NextResponse<AuthResponse | ErrorResponse>
> {
  console.log('Starting auth check...');

  try {
    // Get and verify JWT
    console.log('Verifying JWT...');
    const jwt = await verifyJWT();
    console.log('JWT verified successfully:', {
      sub: jwt.parsedJWT.sub,
      exp: jwt.parsedJWT.exp,
    });

    // Verify Orbis connection
    console.log('Verifying Orbis connection...');
    await verifyOrbisConnection();
    console.log('Orbis connection verified successfully');

    // Create response with caching headers
    const response = NextResponse.json({
      user: {
        address: jwt.parsedJWT.sub,
        ...jwt.parsedJWT,
      },
    });

    // Add caching headers
    response.headers.set('Cache-Control', 'private, max-age=300');
    response.headers.set('ETag', generateETag(jwt.parsedJWT));

    console.log('Auth check completed successfully');
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      console.log('Auth check failed with AuthError:', {
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
      });

      const response = NextResponse.json(
        {
          error: error.message,
          details: error.details,
        },
        { status: error.statusCode },
      );
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    console.error('Unhandled auth check error:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}

// Helper functions for better separation of concerns
async function verifyJWT() {
  console.log('Getting JWT from cookies...');
  const jwt = cookies().get('jwt')?.value;

  if (!jwt) {
    console.log('No JWT found in cookies');
    throw new AuthError('No JWT found', 401, 'Please log in to continue');
  }

  try {
    console.log('Verifying JWT token...');
    // Add a small delay before verification to ensure proper initialization
    await new Promise((resolve) => setTimeout(resolve, 500));

    const authResult = await thirdwebAuth.verifyJWT({ jwt });
    console.log('JWT verification result:', {
      valid: authResult.valid,
      hasError: !authResult.valid,
      hasPayload: authResult.valid ? !!authResult.parsedJWT : false,
    });

    if (!authResult.valid) {
      console.error('Invalid JWT:', {
        error: authResult.error,
      });
      throw new AuthError(
        'Invalid JWT',
        401,
        authResult.error || 'Session has expired or is invalid',
      );
    }

    return authResult;
  } catch (error) {
    console.error('JWT verification error:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new AuthError(
      'JWT verification failed',
      401,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

async function verifyOrbisConnection() {
  try {
    console.log('Checking Orbis connection status...');
    const isConnected = await db.isUserConnected();
    console.log('Orbis connection status:', isConnected);

    if (!isConnected) {
      console.log('Orbis not connected, checking for user...');
      const currentUser = await db.getConnectedUser();
      console.log('Current Orbis user:', currentUser);

      if (
        !currentUser ||
        (typeof currentUser === 'object' && !('did' in currentUser))
      ) {
        console.error('No valid Orbis user found');
        throw new AuthError(
          'Orbis not connected',
          401,
          'Please connect your wallet to continue',
        );
      }
    }
  } catch (error) {
    console.error('Orbis connection verification error:', {
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    throw new AuthError(
      'Orbis connection error',
      401,
      error instanceof Error
        ? error.message
        : 'Failed to verify Orbis connection',
    );
  }
}

// Helper function to generate ETag
function generateETag(payload: any): string {
  return `W/"${Buffer.from(JSON.stringify(payload)).toString('base64')}"`;
}
