import { createAuth } from 'thirdweb/auth';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { client } from './client';

const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY || '';
const domain = process.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN;

if (!privateKey) {
  throw new Error('Missing THIRDWEB_ADMIN_PRIVATE_KEY in .env file.');
}

if (!domain) {
  throw new Error('Missing NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN in .env file.');
}

// Create admin account from private key
const adminAccount = privateKeyToAccount({
  client,
  privateKey,
});

export const thirdwebAuth = createAuth({
  domain,
  adminAccount,
});
