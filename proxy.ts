import { NextRequest, NextResponse } from "next/server";
import { isCostProtectedRoute } from "@/lib/middleware/cost-protected-routes";

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

  // Living-room TV routes: strip primary site chrome (Bank/DAO/trading nav)
  if (pathname.startsWith("/tv")) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-crtv-tv-route", "1");
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

    const paidApi = isCostProtectedRoute(pathname, req.method);
    if (origin && !allowedOrigins.includes(origin) && !paidApi) {
      return new NextResponse(null, {
        status: 400,
        statusText: "Bad Request",
        headers: { "Content-Type": "text/plain" },
      });
    }

    const res = NextResponse.next();
    if (!paidApi) res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Origin", paidApi ? "*" : origin || "*");
    res.headers.set(
      "Access-Control-Allow-Methods",
      "GET,DELETE,PATCH,POST,PUT,OPTIONS"
    );
    res.headers.set(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, PAYMENT-SIGNATURE, X-Wallet-Address, X-Wallet-Timestamp, X-Wallet-Signature"
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
  matcher: ["/api/:path*", "/embed/:path*", "/tv", "/tv/:path*"],
};
