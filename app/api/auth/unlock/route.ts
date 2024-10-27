'use server';
import { NextRequest, NextResponse } from 'next/server';
import { verifySignature, VerifySignatureParams } from 'thirdweb/auth';
import {
  decodeJWT,
  encodeJWT,
  RefreshJWTParams,
  refreshJWT,
  JWTPayload,
  getAddress,
} from 'thirdweb/utils';

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
  const searchParams = request.nextUrl.searchParams; // Extract the search parameters from the request URL

  // Check for error or code in the query parameters
  const error = searchParams.get('error'); // Get the error parameter if it exists
  const code = searchParams.get('code'); // Get the code parameter if it exists
  const address = searchParams.get('address'); // Assuming address is passed as a query parameter

  if (error) {
    // If there is an error in the query string, log it and return a 400 status response
    console.log('Error:', error);
    return new NextResponse('User refused to sign the message', {
      status: 400, // Bad Request response
    });
  } else if (code) {
    try {
      // Decode the base64-encoded `code` parameter, which contains the signed message and signature
      const decoded = JSON.parse(atob(code));
      console.log(decoded); // Log the decoded object for debugging

      // Extract the Ethereum address from the decoded message
      const addressIndex = String(decoded.d).indexOf('0x'); // Find the index of the address in the message
      const rawAddress = String(decoded.d).substring(
        addressIndex,
        42 + addressIndex, // Extract the address by slicing the message
      );
      const addy = getAddress(rawAddress); // Normalize the address
      console.log({ addy }); // Log the extracted address

      // Prepare the signature verification parameters
      const verifyParams: VerifySignatureParams = {
        message: decoded.d, // The signed message
        signature: decoded.s, // The signature
        address: addy, // The user's Ethereum address
      };

      // Verify the signature and recover the signer's address
      const verifiedAddress = await verifySignature(verifyParams);
      console.log('Recovered address:', verifiedAddress); // Log the recovered address

      // Redirect the user back to the original origin URL
      const response = NextResponse.redirect(new URL(request.nextUrl.origin));

      // Set a session cookie with the signed message and address
      response.cookies.set(
        'session',
        JSON.stringify({
          message: decoded.d,
          address: addy,
        }),
      );
    } catch (error) {
      // If there's an error during signature verification, log it and return a 500 status response
      console.log('Failed to verify signature:', error);
      return new NextResponse('Failed to process the signature', {
        status: 500, // Internal Server Error response
      });
    }
  } else {
    // If no valid query parameters are provided, return a 400 status response
    return new NextResponse('No valid query parameters provided', {
      status: 400, // Bad Request response
    });
  }
}
