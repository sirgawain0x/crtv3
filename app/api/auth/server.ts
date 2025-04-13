import { cookies } from 'next/headers';

const COOKIE_NAME = 'auth.session';

export async function getJwtContext() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME);
  if (!token) return null;
  return token.value;
}

export function getAuthCookie() {
  return cookies().get(COOKIE_NAME);
}

export function setAuthCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function deleteAuthCookie() {
  cookies().delete(COOKIE_NAME);
}
