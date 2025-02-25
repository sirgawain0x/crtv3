import { NextResponse } from 'next/server';

// Prevent static generation of this route
export const dynamic = 'force-dynamic';

export async function GET() {
  // Return empty JWKS since we're not using key rotation
  return NextResponse.json({ keys: [] });
}
