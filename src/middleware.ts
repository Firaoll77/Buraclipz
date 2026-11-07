import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, validateSessionToken } from "@/lib/admin-auth";

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const ADMIN_ACCESS_KEY = process.env.ADMIN_ACCESS_KEY || "buraclipz-staff-77";
const GATE_COOKIE = "buraclipz_gate_pass";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Handle CORS Preflight for /api routes
  if (pathname.startsWith("/api")) {
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 });
      response.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Pragma, Cache-Control");
      response.headers.set("Access-Control-Allow-Credentials", "true");
      return response;
    }
  }

  // 2. Disguise & Guard /admin routes
  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE);
    const isAuthenticated = sessionCookie?.value
      ? validateSessionToken(sessionCookie.value)
      : false;

    // A. Already authenticated:
    if (isAuthenticated) {
      if (pathname === "/admin/login") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.next();
    }

    // B. Secret Key Entrance via Query (?key=...)
    const keyParam = request.nextUrl.searchParams.get("key");
    if (keyParam && keyParam === ADMIN_ACCESS_KEY) {
      const redirectUrl = new URL("/admin/login", request.url);
      const res = NextResponse.redirect(redirectUrl);
      res.cookies.set(GATE_COOKIE, ADMIN_ACCESS_KEY, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 60, // 30 minutes window to sign in
        path: "/",
      });
      return res;
    }

    // C. Active Gate Pass (opened via Secret Key)
    const gatePass = request.cookies.get(GATE_COOKIE);
    const hasGatePass = gatePass?.value === ADMIN_ACCESS_KEY;

    if (hasGatePass) {
      if (pathname === "/admin/login") {
        return NextResponse.next();
      }
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // D. Disguised 404: Anyone without session/key sees standard Not Found page
    return NextResponse.rewrite(new URL("/not-found", request.url), { status: 404 });
  }

  // 3. Attach standard CORS headers to API responses
  const response = NextResponse.next();
  if (pathname.startsWith("/api")) {
    response.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Pragma, Cache-Control");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};


