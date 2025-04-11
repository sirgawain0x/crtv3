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
  try {
    // Get and verify JWT
    const jwt = await verifyJWT();

    // Verify Orbis connection
    await verifyOrbisConnection();

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

    return response;
  } catch (error) {
    if (error instanceof AuthError) {
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

    console.error('Unhandled auth check error:', error);
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
  const jwt = cookies().get('jwt')?.value;

  if (!jwt) {
    throw new AuthError('No JWT found', 401, 'Please log in to continue');
  }

  try {
    // Add a small delay before verification to ensure proper initialization
    await new Promise((resolve) => setTimeout(resolve, 500));

    const authResult = await thirdwebAuth.verifyJWT({ jwt });

    if (!authResult.valid) {
      throw new AuthError(
        'Invalid JWT',
        401,
        authResult.error || 'Session has expired or is invalid',
      );
    }

    return authResult;
  } catch (error) {
    console.error('JWT verification error:', error);
    throw new AuthError(
      'JWT verification failed',
      401,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

async function verifyOrbisConnection() {
  try {
    const isConnected = await db.isUserConnected();

    if (!isConnected) {
      const currentUser = await db.getConnectedUser();

      if (
        !currentUser ||
        (typeof currentUser === 'object' && !('did' in currentUser))
      ) {
        throw new AuthError(
          'Orbis not connected',
          401,
          'Please connect your wallet to continue',
        );
      }
    }
  } catch (error) {
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
function generateETag(data: any): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}
