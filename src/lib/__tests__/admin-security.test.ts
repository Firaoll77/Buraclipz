import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  checkRateLimit,
  recordFailedAttempt,
  recordSuccessfulLogin,
  resetRateLimits,
} from "../admin-rate-limit";
import { middleware } from "@/middleware";
import { createSessionToken, ADMIN_SESSION_COOKIE } from "../admin-auth";

describe("Admin Security: Rate Limiting & Brute-Force Lockout", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("should allow first login attempt with 5 remaining attempts", () => {
    const status = checkRateLimit("192.168.1.100");
    expect(status.allowed).toBe(true);
    expect(status.remainingAttempts).toBe(5);
  });

  it("should decrement remaining attempts on each failure", () => {
    const fail1 = recordFailedAttempt("192.168.1.100");
    expect(fail1.locked).toBe(false);
    expect(fail1.remainingAttempts).toBe(4);

    const fail2 = recordFailedAttempt("192.168.1.100");
    expect(fail2.locked).toBe(false);
    expect(fail2.remainingAttempts).toBe(3);
  });

  it("should lock out client IP after 5 consecutive failures", () => {
    const testIp = "10.0.0.5";
    for (let i = 0; i < 4; i++) {
      recordFailedAttempt(testIp);
    }

    const fifthFail = recordFailedAttempt(testIp);
    expect(fifthFail.locked).toBe(true);
    expect(fifthFail.remainingAttempts).toBe(0);
    expect(fifthFail.retryAfterSeconds).toBeGreaterThan(0);

    // Subsequent check should reject request
    const check = checkRateLimit(testIp);
    expect(check.allowed).toBe(false);
    expect(check.remainingAttempts).toBe(0);
    expect(check.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("should reset failed attempts after a successful login", () => {
    const testIp = "10.0.0.6";
    recordFailedAttempt(testIp);
    recordFailedAttempt(testIp);

    const checkBefore = checkRateLimit(testIp);
    expect(checkBefore.remainingAttempts).toBe(3);

    recordSuccessfulLogin(testIp);

    const checkAfter = checkRateLimit(testIp);
    expect(checkAfter.allowed).toBe(true);
    expect(checkAfter.remainingAttempts).toBe(5);
  });

  it("should isolate attempts by IP address", () => {
    const attackerIp = "185.220.101.5";
    const honestAdminIp = "197.156.100.2";

    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(attackerIp);
    }

    expect(checkRateLimit(attackerIp).allowed).toBe(false);
    expect(checkRateLimit(honestAdminIp).allowed).toBe(true);
    expect(checkRateLimit(honestAdminIp).remainingAttempts).toBe(5);
  });
});

describe("Admin Route Protection & Authentication", () => {
  it("should redirect unauthenticated /admin requests to /admin/login", () => {
    const req = new NextRequest("http://localhost:3000/admin");
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/admin/login?from=%2Fadmin");
  });

  it("should allow viewing /admin/login when not authenticated", () => {
    const req = new NextRequest("http://localhost:3000/admin/login");
    const res = middleware(req);

    // Should allow request to proceed (status 200) so user faces login page
    expect(res.status).toBe(200);
  });

  it("should redirect authenticated user on /admin/login to /admin dashboard", () => {
    const validToken = createSessionToken();
    const req = new NextRequest("http://localhost:3000/admin/login", {
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE}=${validToken}`,
      },
    });
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/admin");
  });

  it("should allow authenticated session to access /admin routes directly", () => {
    const validToken = createSessionToken();
    const req = new NextRequest("http://localhost:3000/admin/schedule", {
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE}=${validToken}`,
      },
    });
    const res = middleware(req);

    expect(res.status).toBe(200);
  });

  it("should redirect unauthenticated sub-routes like /admin/bookings to /admin/login with from param", () => {
    const req = new NextRequest("http://localhost:3000/admin/bookings");
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/admin/login?from=%2Fadmin%2Fbookings");
  });
});
