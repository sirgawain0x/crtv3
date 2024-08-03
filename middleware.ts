import { NextRequest, NextResponse } from 'next/server';
import { ROLES } from '@app/lib/utils/context';

export function middleware(
  req: NextRequest,
): NextResponse | Promise<NextResponse> {
  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? ['https://tv.creativeplatform.xyz']
      : ['https://localhost:3000'];

  const origin = req.headers.get('origin');
  //console.log(origin);

  if (origin && !allowedOrigins.includes(origin)) {
    return new NextResponse(null, {
      status: 400,
      statusText: 'Bad Request',
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  return NextResponse.next();

  // // Define role requirements for different paths
  // const roleRequirements: { [key: string]: string[] } = {
  //   '/discover/:path*': ['contributor', 'creator', 'supporter', 'brand', 'fan'],
  //   '/profile/:path*': ['contributor', 'creator', 'supporter', 'brand', 'fan'],
  // };

  // const path = req.nextUrl.pathname;

  // // Check if the path has specific role requirements
  // if (!roleRequirements[path]) {
  //   return NextResponse.next();
  // }

  // // Simulated function to fetch user roles from a session or a similar source
  // const userRoles = getUserRoles(req);

  // // Check if any of the user's roles match the required roles for the current path
  // if (!roleRequirements[path].some((role) => userRoles.includes(role))) {
  //   return NextResponse.redirect(new URL('/unauthorized', req.url));
  // }

  // return NextResponse.next();
}

// Mock function to simulate fetching user roles based on the NextRequest
// This needs to be implemented based on how you handle user sessions or authentication
function getUserRoles(req: NextRequest): string[] {
  // This is a placeholder, assuming role data might be stored in cookies or another way in your application
  const roleData = req.cookies.get(ROLES?.polygon.creator.roleId);
  return roleData ? JSON.parse(ROLES?.polygon.creator.roleId) : [];
}

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
