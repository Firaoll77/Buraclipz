import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";

const ADMIN_ACCESS_KEY = process.env.ADMIN_ACCESS_KEY || "buraclipz-staff-77";
const GATE_COOKIE = "buraclipz_gate_pass";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  // Maintain gate pass for the admin who just signed out so /admin/login is accessible
  response.cookies.set(GATE_COOKIE, ADMIN_ACCESS_KEY, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours window to view login page
    path: "/",
  });
  return response;
}

