import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, validateSessionToken } from "@/lib/admin-auth";

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

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

  // 2. Guard /admin routes (except login and admin auth APIs)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const cookie = request.cookies.get(ADMIN_SESSION_COOKIE);
    const isValid = cookie?.value ? validateSessionToken(cookie.value) : false;

    if (!isValid) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
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


