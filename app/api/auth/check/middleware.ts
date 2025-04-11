import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { RateLimiter } from 'limiter';

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/upload',
  '/settings',
  '/api/protected',
];

// Define public routes that don't require authentication
const publicRoutes = ['/', '/login', '/register', '/api/auth'];

// Create a new ratelimiter that allows 10 requests per 10 seconds
const limiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 10000, // 10 seconds in milliseconds
  fireImmediately: true,
});

// Middleware function to handle CORS and wallet-based authentication
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CORS handling for API routes
  if (pathname.startsWith('/api')) {
    const origin = req.headers.get('origin');
    const allowedOrigins =
      process.env.NODE_ENV === 'production'
        ? ['https://tv.creativeplatform.xyz']
        : ['http://localhost:3000'];

    if (origin && !allowedOrigins.includes(origin)) {
      return new NextResponse(null, {
        status: 400,
        statusText: 'Bad Request',
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    // Create the base response
    const res = NextResponse.next();

    // Add CORS headers
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Access-Control-Allow-Origin', origin || '*');
    res.headers.set(
      'Access-Control-Allow-Methods',
      'GET,DELETE,PATCH,POST,PUT',
    );
    res.headers.set(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
    );

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { headers: res.headers });
    }
  }

  // Check if the route requires authentication
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Get the token from the cookie
  const token = req.cookies.get('jwt')?.value;

  // If no token and trying to access protected route, redirect to login
  if (!token && isProtectedRoute) {
    const url = new URL('/login', req.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // For API routes that require authentication
  if (pathname.startsWith('/api/protected')) {
    if (!token) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Validate wallet address if present
    const walletAddress = req.headers.get('x-wallet-address');
    if (walletAddress) {
      try {
        const formattedAddress = getAddress(walletAddress);
        const res = NextResponse.next();
        res.headers.set('x-validated-address', formattedAddress);
        return res;
      } catch {
        return new NextResponse(
          JSON.stringify({ error: 'Invalid wallet address' }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );
      }
    }
  }

  // Add security headers
  const response = NextResponse.next();
  const headers = response.headers;
  headers.set('X-DNS-Prefetch-Control', 'on');
  headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  );
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Only apply rate limiting to auth endpoints
  if (pathname.startsWith('/api/auth')) {
    const ip = req.ip ?? '127.0.0.1';
    const remaining = await limiter.removeTokens(1);

    headers.set('X-RateLimit-Limit', '10');
    headers.set('X-RateLimit-Remaining', remaining.toString());
    headers.set('X-RateLimit-Reset', (Date.now() + 10000).toString());

    if (remaining < 0) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers },
      );
    }
  }

  return response;
}

// Middleware configuration to specify paths where the middleware should apply
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
