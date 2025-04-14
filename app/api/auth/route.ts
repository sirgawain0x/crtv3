import { NextResponse } from 'next/server';
import { type User } from '@account-kit/react';
import { getAuthCookie, setAuthCookie, deleteAuthCookie } from './server';

export async function POST(request: Request) {
  try {
    const { user } = await request.json();

    if (!user || !user.address) {
      return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
    }

    // Set cookie with secure options
    setAuthCookie(user.address);

    return NextResponse.json({ success: true });
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
  const address = getAuthCookie();
  if (!address) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, address });
}
