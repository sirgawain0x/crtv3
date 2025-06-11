'use server';
import { NextRequest, NextResponse } from 'next/server';
import { getAddress, verifyMessage } from 'viem';

/**
 * Required query parameters:
 *  - redirect_uri: the URL to which the user is redirected after wallet connection and message signing for authentication
 *  - client_id: A unique identifier for your application. It must match the "host" part of the redirect_uri.
 *
 * Optional query parameters:
 *  - paywallConfig: A JSON object to customize the checkout experience, including messageToSign and icon customization.
 */

// Making a call to the Unlock App Checkout endpoint
// const unlock_siwe = new URL('https://app.unlock-protocol.com/checkout'); // Initialize a URL object for Unlock Protocol's checkout endpoint

// You can set a specific redirect URL or grab the current location in your app
// const redirect_uri = new URL('https://creativeplatform.xyz/'); // Set the redirect URL

// Client Id - ensure this is correctly assigned as expected by Unlock Protocol
// const client_id: string = 'creativeplatform.xyz'; // Set the client ID

// Add the parameters
// unlock_siwe.searchParams.append('client_id', client_id); // Append the client ID to the Unlock SIWE URL
// unlock_siwe.searchParams.append('redirect_uri', redirect_uri.toString()); // Append the redirect URI as a string

// Generate your SIWE (Sign-In with Ethereum) link
// console.log(unlock_siwe.toString()); // Log the full URL with query parameters for testing purposes

/**
 * Redirects:
 *
 * If the user refuses to connect and/or sign the message, they are redirected back with `?error=access-denied` in the query string.
 *
 * If the user connects and signs, they are redirected with a `code` query parameter. This parameter is base64 encoded and contains
 * the signed message and signature, which can be used to verify the user's identity and recover their address.
 *
 * Ethereum libraries can compute the signer's address from the signature and the signed message.
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get('error');
  const code = searchParams.get('code');

  if (error) {
    console.log('Error:', error);
    return new NextResponse('User refused to sign the message', {
      status: 400,
    });
  } else if (code) {
    try {
      const decoded = JSON.parse(atob(code));
      console.log(decoded);

      const addressIndex = String(decoded.d).indexOf('0x');
      const rawAddress = String(decoded.d).substring(
        addressIndex,
        42 + addressIndex,
      );
      const address = getAddress(rawAddress);
      console.log({ address });

      // Verify the signature using viem
      const isValid = await verifyMessage({
        message: decoded.d,
        signature: decoded.s,
        address: address,
      });

      if (!isValid) {
        throw new Error('Invalid signature');
      }

      const response = NextResponse.redirect(new URL(request.nextUrl.origin));
      response.cookies.set(
        'session',
        JSON.stringify({
          message: decoded.d,
          address: address,
        }),
      );

      return response;
    } catch (error) {
      console.error('Failed to verify signature:', error);
      return new NextResponse('Failed to process the signature', {
        status: 500,
      });
    }
  } else {
    return new NextResponse('No valid query parameters provided', {
      status: 400,
    });
  }
}
