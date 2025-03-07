import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';

// Middleware function to handle CORS and wallet-based authentication
export function middleware(
  req: NextRequest,
): NextResponse | Promise<NextResponse> {
  // Allowed origins based on environment
  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? ['https://tv.creativeplatform.xyz']
      : ['http://localhost:3000'];

  const origin = req.headers.get('origin');

  // CORS handling: Check if the origin is allowed
  if (origin && !allowedOrigins.includes(origin)) {
    return new NextResponse(null, {
      status: 400,
      statusText: 'Bad Request',
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  // Create the initial response and add CORS headers
  const res = NextResponse.next();
  res.headers.append('Access-Control-Allow-Credentials', 'true');
  res.headers.append('Access-Control-Allow-Origin', origin || '*');
  res.headers.append(
    'Access-Control-Allow-Methods',
    'GET,DELETE,PATCH,POST,PUT',
  );
  res.headers.append(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
  );

  // Check if this is an upload request
  if (req.nextUrl.pathname.startsWith('/api/upload')) {
    const walletAddress = req.headers.get('x-wallet-address');

    if (!walletAddress) {
      return new NextResponse(null, {
        status: 401,
        statusText: 'Unauthorized - Wallet address required',
      });
    }

    try {
      // Validate the wallet address format
      const formattedAddress = getAddress(walletAddress);

      // You can add additional checks here, such as:
      // - Check if the wallet holds specific NFTs
      // - Check if the wallet has enough tokens
      // - Check if the wallet is whitelisted

      // For now, we'll just validate the address format

      // Add the validated wallet address to the request headers
      res.headers.set('x-validated-address', formattedAddress);
      return res;
    } catch (error) {
      return new NextResponse(null, {
        status: 401,
        statusText: 'Unauthorized - Invalid wallet address',
      });
    }
  }

  return res;
}

// Middleware configuration to specify paths where the middleware should apply
export const config = {
  matcher: ['/api/:path*'],
};
