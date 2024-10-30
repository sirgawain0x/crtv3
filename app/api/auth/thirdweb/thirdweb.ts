'use server';
import {
  VerifyLoginPayloadParams,
  GenerateLoginPayloadParams,
  createAuth,
} from 'thirdweb/auth';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { client } from '@app/lib/sdk/thirdweb/client';
import { cookies } from 'next/headers';
import { hasAccess } from './gateCondition';

const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY || '';

if (!privateKey) {
  throw new Error('Missing THIRDWEB_ADMIN_PRIVATE_KEY in .env file.');
}

const thirdwebAuth = createAuth({
  domain: process.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN || 'http://localhost:3000',
  client,
  adminAccount: privateKeyToAccount({ client, privateKey }),
});

export const generatePayload = async (params: GenerateLoginPayloadParams) =>
  thirdwebAuth.generatePayload(params);

export async function login(payload: VerifyLoginPayloadParams) {
  const verifiedPayload = await thirdwebAuth.verifyPayload(payload);
  console.log({ payload });

  const hasCreatorPass = await hasAccess(payload.address);
  console.log({hasCreatorPass});

  if (verifiedPayload.valid) {
    const jwt = await thirdwebAuth.generateJWT({
      payload: verifiedPayload.payload,
    });
    cookies().set('jwt', jwt);
  }
}

export async function isLoggedIn() {
  const jwt = cookies().get('jwt');
  if (!jwt?.value) {
    return false;
  }

  const authResult = await thirdwebAuth.verifyJWT({ jwt: jwt.value });
  console.log({ authResult });
  
  if (!authResult.valid) {
    return false;
  }
  return true;
}

export async function logout() {
  cookies().delete('jwt');
}