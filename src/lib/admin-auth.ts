import { NextRequest, NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "arada_admin_session";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "dev-session-secret-change-in-production";

/**
 * Generates a simple signed session token
 */
export function createSessionToken(): string {
  const payload = JSON.stringify({ ts: Date.now(), role: "admin" });
  const encoded = Buffer.from(payload).toString("base64url");
  const signature = Buffer.from(`${encoded}.${SESSION_SECRET}`).toString("base64url").slice(0, 16);
  return `${encoded}.${signature}`;
}

/**
 * Validates a session token
 */
export function validateSessionToken(token: string): boolean {
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return false;
    const expectedSig = Buffer.from(`${encoded}.${SESSION_SECRET}`).toString("base64url").slice(0, 16);
    if (sig !== expectedSig) return false;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    // Session expires after 12 hours
    const maxAge = 12 * 60 * 60 * 1000;
    if (Date.now() - payload.ts > maxAge) return false;

    return payload.role === "admin";
  } catch {
    return false;
  }
}

/**
 * Middleware helper to verify admin session from request
 */
export function isAdminAuthenticated(request: NextRequest): boolean {
  const cookie = request.cookies.get(ADMIN_SESSION_COOKIE);
  if (!cookie?.value) return false;
  return validateSessionToken(cookie.value);
}

