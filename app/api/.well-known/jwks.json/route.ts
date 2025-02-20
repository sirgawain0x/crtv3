import { NextResponse } from 'next/server';
import { publicKeyToJWKS } from '../../auth/utils/jwt';
import { keyRotationManager } from '../../auth/utils/keyRotationManager';

// Prevent static generation of this route
export const dynamic = 'force-dynamic';

let initialized = false;

export async function GET() {
  if (!initialized) {
    try {
      await keyRotationManager.initialize();
      initialized = true;
    } catch (error) {
      console.error('Failed to initialize key rotation manager:', error);
      return NextResponse.json({ keys: [] });
    }
  }

  try {
    const jwks = await publicKeyToJWKS();
    return NextResponse.json(jwks);
  } catch (error) {
    console.error('Failed to generate JWKS:', error);
    return NextResponse.json({ keys: [] });
  }
}
