import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";

function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  // Clear any legacy gate cookie
  response.cookies.set("buraclipz_gate_pass", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function POST() {
  const response = NextResponse.json({ ok: true, redirect: "/admin/login" });
  clearAuthCookies(response);
  return response;
}

export async function GET(request: NextRequest) {
  const loginUrl = new URL("/admin/login", request.url);
  const response = NextResponse.redirect(loginUrl);
  clearAuthCookies(response);
  return response;
}

