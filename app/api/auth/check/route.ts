import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@app/lib/sdk/orbisDB/client';
import type { OrbisConnectResult } from '@app/types/orbis';
import { createHash } from 'crypto';
import { getJwtContext } from '@app/api/auth/authentication';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

// Configure caching
export const revalidate = 0;

interface AuthResponse {
  success: boolean;
  address: string;
  orbisConnected: boolean;
  error?: string;
  details?: string;
}

/**
 * Generates an ETag for the auth response
 * @param response The auth response object
 * @returns ETag string
 */
function generateETag(response: AuthResponse): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(response));
  return `"${hash.digest('hex')}"`;
}

export async function GET(): Promise<NextResponse<AuthResponse>> {
  try {
    const token = await getJwtContext();
    if (!token) {
      return NextResponse.json({
        success: false,
        address: '',
        orbisConnected: false,
        error: 'Not authenticated',
        details: 'Please log in to continue',
      });
    }

    return NextResponse.json({
      success: true,
      address: token,
      orbisConnected: true,
    });
  } catch (error) {
    console.error('Error checking authentication:', error);
    return NextResponse.json({
      success: false,
      address: '',
      orbisConnected: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
