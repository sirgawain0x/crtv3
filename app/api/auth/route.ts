import { NextResponse } from 'next/server';
import { SiweMessage } from 'siwe';
import { setAuthCookie, deleteAuthCookie, getAuthCookie } from './server';

const domain = process.env.NEXT_PUBLIC_AUTH_DOMAIN || 'localhost';

export async function POST(request: Request) {
  const { message, signature } = await request.json();

  try {
    const siweMessage = new SiweMessage(message);
    const fields = await siweMessage.verify({ signature });

    if (!fields.success) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Here you would typically create a session/token
    const token = 'your-jwt-token'; // Replace with actual JWT generation

    // Set cookie with secure options
    setAuthCookie(token);

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error during authentication:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  deleteAuthCookie();
  return NextResponse.json({ success: true });
}

export async function GET() {
  const token = getAuthCookie();
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}
