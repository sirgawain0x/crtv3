import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { thirdwebAuth } from '@app/lib/sdk/thirdweb/auth';

export async function GET() {
  const jwt = cookies().get('jwt');

  if (!jwt?.value) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const authResult = await thirdwebAuth.verifyJWT({ jwt: jwt.value });

  if (!authResult.valid) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  return new NextResponse('OK', { status: 200 });
}
