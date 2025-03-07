'use server';

import { cookies } from 'next/headers';
import { VerifyLoginPayloadParams } from 'thirdweb/auth';
import { thirdwebAuth } from '@app/lib/sdk/thirdweb/auth';
import { decodeJWT } from 'thirdweb/utils';

export type JwtContext = {
  address: string;
};
export async function generatePayload(
  ...args: Parameters<typeof thirdwebAuth.generatePayload>
) {
  return thirdwebAuth.generatePayload(...args);
}

export async function login(payload: VerifyLoginPayloadParams) {
  const verifiedPayload = await thirdwebAuth.verifyPayload(payload);

  if (verifiedPayload.valid) {
    const jwt = await thirdwebAuth.generateJWT({
      payload: verifiedPayload.payload,
      context: {
        address: verifiedPayload.payload.address,
      },
    });
    cookies().set('jwt', jwt);
  }
}

export async function getJwtContext(): Promise<JwtContext> {
  const jwt = cookies().get('jwt');

  if (!jwt?.value) {
    throw new Error(`Failed to fetch JWT context, jwt is not defined`);
  }

  const { payload, signature } = decodeJWT(jwt.value);

  if (!payload?.ctx) {
    throw new Error(`Failed to fetch JWT context, payload.ctx is not defined`);
  }

  return payload?.ctx as JwtContext;
}

export async function authedOnly() {
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
