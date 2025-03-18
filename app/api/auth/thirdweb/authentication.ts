'use server';
import { VerifyLoginPayloadParams, createAuth } from 'thirdweb/auth';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { client } from '@app/lib/sdk/thirdweb/client';
import { cookies } from 'next/headers';

const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY || '';

if (!privateKey) {
  throw new Error('Missing THIRDWEB_ADMIN_PRIVATE_KEY in .env file.');
}

const thirdwebAuth = createAuth({
  domain: process.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN || '',
  adminAccount: privateKeyToAccount({ client, privateKey }),
  client,
});

export async function generatePayload(
  params: Parameters<typeof thirdwebAuth.generatePayload>[0],
) {
  return thirdwebAuth.generatePayload(params);
}

export async function login(payload: VerifyLoginPayloadParams) {
  const verifiedPayload = await thirdwebAuth.verifyPayload(payload);
  if (verifiedPayload.valid) {
    const jwt = await thirdwebAuth.generateJWT({
      payload: verifiedPayload.payload,
    });
    cookies().set('jwt', jwt);
    return { success: true };
  }
  return { success: false };
}

export async function authedOnly() {
  const jwt = cookies().get('jwt');
  if (!jwt?.value) {
    throw new Error('Not authenticated');
  }

  const authResult = await thirdwebAuth.verifyJWT({ jwt: jwt.value });
  if (!authResult.valid) {
    throw new Error('Invalid JWT');
  }
  return authResult.parsedJWT;
}

export async function logout() {
  cookies().delete('jwt');
}

export async function getJwtContext() {
  const jwt = cookies().get('jwt');
  if (!jwt?.value) {
    throw new Error('Not authenticated');
  }

  const authResult = await thirdwebAuth.verifyJWT({ jwt: jwt.value });
  if (!authResult.valid) {
    throw new Error('Invalid JWT');
  }

  return {
    address: authResult.parsedJWT.sub,
    ...authResult.parsedJWT,
  };
}

export async function isLoggedIn() {
  try {
    const jwt = cookies().get('jwt');
    if (!jwt?.value) return false;

    const authResult = await thirdwebAuth.verifyJWT({ jwt: jwt.value });
    return authResult.valid;
  } catch (error) {
    return false;
  }
}
