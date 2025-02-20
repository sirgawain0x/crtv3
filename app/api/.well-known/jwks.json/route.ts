import { NextResponse } from 'next/server';
import { publicKeyToJWKS } from '../../auth/utils/jwt';
import { keyRotationManager } from '../../auth/utils/keyRotationManager';

let initialized = false;

export async function GET() {
  if (!initialized) {
    await keyRotationManager.initialize();
    initialized = true;
  }

  const jwks = await publicKeyToJWKS();
  return NextResponse.json(jwks);
}
