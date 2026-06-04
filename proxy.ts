import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Embed routes: inject header for root layout chrome suppression
  if (pathname.startsWith("/embed")) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-crtv-embed-route", "1");
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // CORS for API routes
  if (pathname.startsWith("/api")) {
    const origin = req.headers.get("origin");
    const allowedOrigins =
      process.env.NODE_ENV === "production"
        ? ["https://tv.creativeplatform.xyz"]
        : ["http://localhost:3000"];

    if (origin && !allowedOrigins.includes(origin)) {
      return new NextResponse(null, {
        status: 400,
        statusText: "Bad Request",
        headers: { "Content-Type": "text/plain" },
      });
    }

    const res = NextResponse.next();
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Origin", origin || "*");
    res.headers.set(
      "Access-Control-Allow-Methods",
      "GET,DELETE,PATCH,POST,PUT"
    );
    res.headers.set(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
    );

    // Handle preflight
    if (req.method === "OPTIONS") {
      return new NextResponse(null, { headers: res.headers });
    }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/embed/:path*"],
};
