import { cookies } from 'next/headers';

const COOKIE_NAME = 'auth.session';

export async function getJwtContext() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME);
  if (!token) return null;
  return token.value;
}

export function getAuthCookie(): string | undefined {
  const cookie = cookies().get(COOKIE_NAME);
  return cookie?.value;
}

export function setAuthCookie(address: string) {
  cookies().set(COOKIE_NAME, address, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export function deleteAuthCookie() {
  cookies().delete({
    name: COOKIE_NAME,
    path: '/',
  });
}
