'use client';
import { createThirdwebClient } from 'thirdweb';

// Replace this with your client ID string
// refer to https://portal.thirdweb.com/typescript/v5/client on how to get a client ID
const clientId = process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID;
const secretKey = process.env.THIRDWEB_SECRET_KEY;
// const clientId = process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID || process.env.TEMPLATE_CLIENT_ID
if (!clientId && !secretKey) {
  throw new Error('Either clientId or secretKey must be provided');
}

export const client = createThirdwebClient({
  clientId: clientId || '',
  secretKey: secretKey || undefined,
});
