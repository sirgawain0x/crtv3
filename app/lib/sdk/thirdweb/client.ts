'use client'
import { createThirdwebClient } from 'thirdweb';

// Replace this with your client ID string
// refer to https://portal.thirdweb.com/typescript/v5/client on how to get a client ID
// const clientId = process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID;
const clientId = '194d9824f096c7c5906fea351553e216';
if (!clientId) {
	throw new Error('No client ID provided');
}

export const client = createThirdwebClient({
	clientId: clientId,
});
