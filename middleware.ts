import { NextRequest, NextResponse } from 'next/server';
//import { ROLES } from '@app/lib/utils/context';

// Middleware function to handle CORS, origin validation, and role-based access control
export function middleware(
  req: NextRequest,
): NextResponse | Promise<NextResponse> {
  // Allowed origins based on environment
  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? ['https://tv.creativeplatform.xyz']
      : ['https://localhost:3000'];

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
  res.headers.append('Access-Control-Allow-Origin', origin || '*'); // Set to origin or allow all
  res.headers.append(
    'Access-Control-Allow-Methods',
    'GET,DELETE,PATCH,POST,PUT',
  );
  res.headers.append(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
  );

  // TODO: Role-based access control logic
  // const roleRequirements: { [key: string]: string[] } = {
  //   '/discover/:path*': ['contributor', 'creator', 'supporter', 'brand', 'fan'],
  //   '/profile/:path*': ['contributor', 'creator', 'supporter', 'brand', 'fan'],
  // };

  // const path = req.nextUrl.pathname;

  // // Check if the path requires specific roles
  // if (roleRequirements[path]) {
  //   const userRoles = getUserRoles(req);

  //   // Redirect to unauthorized page if the user doesn't have the required roles
  //   if (!roleRequirements[path].some((role) => userRoles.includes(role))) {
  //     return NextResponse.redirect(new URL('/unauthorized', req.url));
  //   }
  // }

  // If no issues, proceed with the request
  return res;
}

// TODO: Mock function to simulate fetching user roles from a session or authentication system
// function getUserRoles(req: NextRequest): string[] {
//   // This is a placeholder. In a real-world scenario, you might retrieve this from cookies or a session store.
//   const roleData = req.cookies.get(ROLES?.polygon.creator.roleId);
//   return roleData ? JSON.parse(roleData) : [];
// }

// Middleware configuration to specify paths where the middleware should apply
export const config = {
  matcher: ['/api/:path*'], // Paths where the middleware should be active
};
