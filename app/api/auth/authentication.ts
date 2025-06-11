'use client';

import { createWalletClient, custom } from 'viem';
import { base } from 'viem/chains';
import { SiweMessage } from 'siwe';

const domain = process.env.NEXT_PUBLIC_AUTH_DOMAIN || 'localhost';

export async function logout() {
  const response = await fetch('/api/auth', {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to logout');
  }

  return response.json();
}

export async function verifySignature({
  message,
  signature,
}: {
  message: string;
  signature: string;
}) {
  try {
    const siweMessage = new SiweMessage(message);
    const fields = await siweMessage.verify({ signature });
    return fields;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return null;
  }
}

export async function generateSignatureMessage({
  address,
  chainId,
}: {
  address: string;
  chainId: number;
}) {
  const message = new SiweMessage({
    domain,
    address,
    statement: 'Sign in to Creative TV.',
    uri: window.location.origin,
    version: '1',
    chainId,
    nonce: Math.random().toString(36).slice(2),
  });
  return message.prepareMessage();
}

export async function signIn({
  message,
  signature,
}: {
  message: string;
  signature: string;
}) {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, signature }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sign in');
  }

  return response.json();
}

export async function checkAuth() {
  const response = await fetch('/api/auth', {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    return false;
  }

  return true;
}
