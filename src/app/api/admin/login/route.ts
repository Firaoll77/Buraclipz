import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  ADMIN_SESSION_COOKIE,
  createSessionToken,
} from "@/lib/admin-auth";
import {
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  recordSuccessfulLogin,
} from "@/lib/admin-rate-limit";

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request.headers);

    // 1. Rate-Limit Check
    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      const minutes = Math.ceil((rateCheck.retryAfterSeconds || 60) / 60);
      return NextResponse.json(
        {
          error: `Too many failed attempts. Login temporarily locked for ${minutes} minute(s).`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { password } = body as { password?: string };

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const adminPassword = process.env.ADMIN_PASSWORD || "1234";

    // Constant-time comparison to prevent timing attacks
    let match = false;
    try {
      const a = Buffer.from(password.padEnd(64));
      const b = Buffer.from(adminPassword.padEnd(64));
      if (a.length === b.length) {
        match = timingSafeEqual(a, b) && password === adminPassword;
      }
    } catch {
      match = false;
    }

    if (!match) {
      const failStatus = recordFailedAttempt(clientIp);
      if (failStatus.locked) {
        return NextResponse.json(
          {
            error: "Too many failed attempts. Portal locked for 15 minutes to prevent unauthorized access.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: `Invalid password. ${failStatus.remainingAttempts} attempt(s) remaining before temporary lockout.`,
        },
        { status: 401 }
      );
    }

    // 2. Successful Login: Clear any failed attempt records
    recordSuccessfulLogin(clientIp);

    const token = createSessionToken();

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 12 * 60 * 60, // 12 hours
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

