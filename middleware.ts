import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';

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

  return NextResponse.next();
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
