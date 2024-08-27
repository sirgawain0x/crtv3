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
  redirectUri: string; // The URL to which the user will be redirected after authentication.
  clientId: string; // The client ID to identify your application.
  paywallConfig?: any; // Optional configuration for the paywall, if using Unlock Protocol.
}

// Retrieve the admin private key from environment variables.
const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY || '';
// Create a thirdweb client instance using the secret key from environment variables.
const thirdwebClient = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY,
});

// Ensure the private key is present; otherwise, throw an error.
if (!privateKey) {
  throw new Error('Missing THIRDWEB_ADMIN_PRIVATE_KEY in .env file.');
}

// Create an authentication instance with the specified domain, client, and admin account.
const thirdwebAuth = createAuth({
  domain: 'localhost:3000', // The domain used for authentication, typically the server's domain.
  client: thirdwebClient, // The client instance created above.
  adminAccount: privateKeyToAccount({ client, privateKey }), // Convert the private key to an account.
});

// Function to generate a login payload for Sign-In with Ethereum (SIWE) authentication.
export async function generatePayload(params: GenerateLoginPayloadParams) {
  console.log('generatedPayload params:', params);
  return thirdwebAuth.generatePayload(params); // Generate the payload using the thirdwebAuth instance.
}

// Function to handle the login process using the SIWE payload.
export async function login(
  payload: VerifyLoginPayloadParams, // The payload containing the signed message and other login details.
  { clientId, redirectUri, paywallConfig }: UnlockSIWEButtonProps, // Destructure the Unlock SIWE button properties.
) {
  // Verify the SIWE payload.
  const verifiedPayload = await thirdwebAuth.verifyPayload(payload);
  if (verifiedPayload.valid) {
    // Generate a JWT (JSON Web Token) if the payload is valid.
    const jwt = await thirdwebAuth.generateJWT({
      payload: verifiedPayload.payload,
    });

    // Initialize an in-app wallet connection.
    const wallet = inAppWallet();

    // Connect to the wallet using a strategy URL that includes the client ID, redirect URI, and optional paywall configuration.
    const account = await wallet.connect({
      client: thirdwebClient, // The thirdweb client instance.
      strategy:
        `https://app.unlock-protocol.com/checkout?client_id=${clientId}&redirect_uri=${redirectUri}` +
        (paywallConfig ? `&paywallConfig=${paywallConfig}` : ''), // Construct the strategy URL with query parameters.
      // The payload to be sent to the auth endpoint.
      payload: verifiedPayload.payload,
      // Use the encryption key from environment variables.
      encryptionKey: process.env.THIRDWEB_ENCRYPTION_KEY as string,
    });
    console.log('Account', account); // Log the connected account for debugging.
    // Set a cookie with the generated JWT to maintain the user's session.
    cookies().set('jwt', jwt);
  }
}

// Function to validate the payload by verifying it.
export async function validatePayload(payload: VerifyLoginPayloadParams) {
  thirdwebAuth.verifyPayload(payload); // Verify the payload using the thirdwebAuth instance.
}

// Function to check if the user is logged in.
export async function isLoggedIn() {
  // Retrieve the JWT from cookies.
  const jwt = cookies().get('jwt');
  if (!jwt?.value) {
    return false; // If no JWT is found, return false (user is not logged in).
  }

  // Verify the JWT using thirdwebAuth.
  const authResult = await thirdwebAuth.verifyJWT({ jwt: jwt.value });
  if (!authResult.valid) {
    return false; // If the JWT is not valid, return false (user is not logged in).
  }
  return true; // If the JWT is valid, return true (user is logged in).
}

// Function to log the user out by deleting the JWT cookie.
export async function logout() {
  cookies().delete('jwt'); // Delete the JWT cookie to log the user out.
}
