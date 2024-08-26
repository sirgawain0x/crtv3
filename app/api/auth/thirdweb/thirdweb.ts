'use server';
import { inAppWallet } from 'thirdweb/wallets';
import { client } from '@app/lib/sdk/thirdweb/client';
import {
  VerifyLoginPayloadParams,
  createAuth,
  GenerateLoginPayloadParams,
} from 'thirdweb/auth';
import { cookies } from 'next/headers';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { createThirdwebClient } from 'thirdweb';

export interface UnlockSIWEButtonProps {
  redirectUri: string;
  clientId: string;
  paywallConfig?: any;
}

const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY || '';
const thirdwebClient = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY,
});

if (!privateKey) {
  throw new Error('Missing THIRDWEB_ADMIN_PRIVATE_KEY in .env file.');
}

const thirdwebAuth = createAuth({
  domain: 'localhost:3000',
  client: thirdwebClient,
  adminAccount: privateKeyToAccount({ client, privateKey }),
});

export async function generatePayload(params: GenerateLoginPayloadParams) {
  console.log('generatedPayload params:', params);
  return thirdwebAuth.generatePayload(params);
}

export async function login(
  payload: VerifyLoginPayloadParams,
  { clientId, redirectUri, paywallConfig }: UnlockSIWEButtonProps,
) {
  const verifiedPayload = await thirdwebAuth.verifyPayload(payload);
  if (verifiedPayload.valid) {
    const jwt = await thirdwebAuth.generateJWT({
      payload: verifiedPayload.payload,
    });
    const wallet = inAppWallet();

    // use the account to send transactions
    const account = await wallet.connect({
      client: thirdwebClient,
      strategy:
        `https://app.unlock-protocol.com/checkout?client_id=${clientId}&redirect_uri=${redirectUri}` +
        (paywallConfig ? `&paywallConfig=${paywallConfig}` : ''),
      // This is the payload that is sent to the auth endpoint
      payload: verifiedPayload.payload,
      encryptionKey: process.env.THIRDWEB_ENCRYPTION_KEY as string,
    });
    console.log('Account', account);
    cookies().set('jwt', jwt);
  }
}

export async function validatePayload(payload: VerifyLoginPayloadParams) {
  thirdwebAuth.verifyPayload(payload);
}

export async function isLoggedIn() {
  const jwt = cookies().get('jwt');
  if (!jwt?.value) {
    return false;
  }

  const authResult = await thirdwebAuth.verifyJWT({ jwt: jwt.value });
  if (!authResult.valid) {
    return false;
  }
  return true;
}

export async function logout() {
  cookies().delete('jwt');
}
