import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from 'thirdweb/auth';
import { thirdwebAuth } from '@app/lib/auth/thirdweb';
import { cookies } from 'next/headers';
import { getAddress } from 'viem';
import { db } from '@app/lib/sdk/orbisDB/client';
import { OrbisKeyDidAuth } from '@useorbis/db-sdk/auth';
import {
  OrbisConnectResult,
  isValidOrbisResult,
  OrbisSDKConnectResult,
} from '@app/types/orbis';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting login process...');

    // Validate request body
    let body;
    try {
      body = await request.json();
      console.log('Request body parsed:', {
        hasPayload: !!body.payload,
        hasSignature: !!body.signature,
        payloadType: typeof body.payload,
      });
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      );
    }

    const { payload, signature } = body;

    // Validate required fields
    if (!payload || !signature) {
      console.error('Missing required fields:', {
        payload: !!payload,
        signature: !!signature,
      });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    console.log('Login attempt:', {
      payloadType: typeof payload,
      payloadKeys: Object.keys(payload),
      signatureType: typeof signature,
      signatureLength: signature?.length,
      payloadAddress: payload.address,
    });

    // Verify the signature with error handling
    let isValid = false;
    try {
      console.log('Verifying signature with payload:', {
        messageLength: JSON.stringify(payload).length,
        signatureLength: signature.length,
        address: payload.address,
      });

      isValid = await verifySignature({
        message: JSON.stringify(payload),
        signature,
        address: payload.address,
      });

      console.log('Signature verification result:', isValid);
    } catch (verifyError) {
      console.error('Signature verification error:', {
        error: verifyError,
        message:
          verifyError instanceof Error
            ? verifyError.message
            : String(verifyError),
      });
      return NextResponse.json(
        { error: 'Failed to verify signature' },
        { status: 401 },
      );
    }

    console.log('Signature verification:', {
      isValid,
      address: payload.address,
      messageType: typeof JSON.stringify(payload),
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature. Please try signing again.' },
        { status: 401 },
      );
    }

    // Normalize addresses for comparison
    const signerAddress = getAddress(payload.address);
    console.log('Normalized signer address:', signerAddress);

    // Connect to Orbis using KeyDidAuth with retries
    const connectToOrbis = async (retries = 2) => {
      for (let i = 0; i <= retries; i++) {
        try {
          console.log(`Connecting to Orbis (attempt ${i + 1})...`);

          // Generate a deterministic seed based on the signer's address
          const seedBase = `${signerAddress}-${Date.now()}`;
          const encoder = new TextEncoder();
          const seedData = encoder.encode(seedBase);
          const seedBuffer = await crypto.subtle.digest('SHA-256', seedData);
          const seed = Array.from(new Uint8Array(seedBuffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

          console.log('Seed generated:', !!seed);

          const auth = await OrbisKeyDidAuth.fromSeed(seed);
          console.log('Auth created:', !!auth);

          const rawResult = await db.connectUser({ auth });
          console.log('Raw Orbis connection result:', rawResult);

          // Type guard for SDK result
          const isValidSDKResult = (
            result: unknown,
          ): result is OrbisSDKConnectResult => {
            if (!result || typeof result !== 'object') return false;
            const r = result as any;
            return typeof r.did === 'string';
          };

          if (!isValidSDKResult(rawResult)) {
            console.error('Invalid response from Orbis');
            throw new Error('Invalid response from Orbis');
          }

          const orbisResult: OrbisConnectResult = {
            success: true as const,
            did: rawResult.did,
            details: {
              did: rawResult.did,
              profile: rawResult.details?.profile ?? null,
            },
          };

          if (!isValidOrbisResult(orbisResult)) {
            console.error('Invalid Orbis result structure:', orbisResult);
            throw new Error(
              'Invalid Orbis connection result: DID not found or invalid format',
            );
          }

          console.log('Orbis connection result:', {
            success: orbisResult.success,
            resultType: typeof orbisResult,
            did: orbisResult.did,
            didType: orbisResult.did.split(':')[1],
          });

          return orbisResult;
        } catch (error) {
          console.error(`Connection attempt ${i + 1} failed:`, {
            error,
            message: error instanceof Error ? error.message : String(error),
          });
          if (i === retries) throw error;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      throw new Error('Failed to connect after retries');
    };

    try {
      const orbisResult = await connectToOrbis();
      console.log('Successfully connected to Orbis:', {
        did: orbisResult.did,
        didType: orbisResult.did.split(':')[1],
      });

      // Add the DID to the JWT payload
      const jwtPayload = {
        address: signerAddress,
        did: orbisResult.did,
        ...payload,
      };

      console.log('Preparing JWT payload:', {
        address: jwtPayload.address,
        did: jwtPayload.did,
        payloadKeys: Object.keys(jwtPayload),
      });

      // Generate JWT with error handling
      let jwt;
      try {
        jwt = await thirdwebAuth.generateJWT({
          payload: jwtPayload,
        });
        console.log('JWT generated successfully:', !!jwt);
      } catch (jwtError) {
        console.error('JWT generation error:', {
          error: jwtError,
          message:
            jwtError instanceof Error ? jwtError.message : String(jwtError),
        });
        return NextResponse.json(
          { error: 'Failed to generate authentication token' },
          { status: 500 },
        );
      }

      if (!jwt) {
        console.error('JWT generation failed - no token returned');
        return NextResponse.json(
          { error: 'Failed to generate authentication token' },
          { status: 500 },
        );
      }

      // Set the JWT in an HTTP-only cookie
      try {
        cookies().set('jwt', jwt, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24 * 90, // 90 days to match Orbis session
        });
        console.log('JWT cookie set successfully');
      } catch (cookieError) {
        console.error('Failed to set JWT cookie:', {
          error: cookieError,
          message:
            cookieError instanceof Error
              ? cookieError.message
              : String(cookieError),
        });
        return NextResponse.json(
          { error: 'Failed to complete authentication' },
          { status: 500 },
        );
      }

      console.log('Login process completed successfully');

      return NextResponse.json({
        success: true,
        did: orbisResult.did,
      });
    } catch (orbisError) {
      console.error('Orbis connection error:', {
        error: orbisError,
        message:
          orbisError instanceof Error ? orbisError.message : String(orbisError),
        stack: orbisError instanceof Error ? orbisError.stack : undefined,
      });
      return NextResponse.json(
        { error: 'Failed to connect to Orbis. Please try again.' },
        { status: 401 },
      );
    }
  } catch (error) {
    console.error('Login error:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Authentication failed. Please try again.' },
      { status: 401 },
    );
  }
}
