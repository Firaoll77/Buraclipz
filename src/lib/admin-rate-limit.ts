// Rate-limiting and Brute-Force Lockout for Admin Login

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes lockout
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // Window to count failures

// In-memory store (cleans up stale entries periodically)
const ipAttempts = new Map<string, AttemptRecord>();

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const vercelIp = headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();
  return "127.0.0.1";
}

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const record = ipAttempts.get(ip);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Check if currently locked out
  if (record.lockedUntil) {
    if (now < record.lockedUntil) {
      const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfterSeconds,
      };
    } else {
      // Lockout expired, reset
      ipAttempts.delete(ip);
      return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
    }
  }

  // Check if attempt window has expired
  if (now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
    ipAttempts.delete(ip);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - record.count);
  return { allowed: remaining > 0, remainingAttempts: remaining };
}

export function recordFailedAttempt(ip: string): {
  locked: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  let record = ipAttempts.get(ip);

  if (!record || now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
    record = { count: 1, firstAttempt: now, lockedUntil: null };
  } else {
    record.count += 1;
  }

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_WINDOW_MS;
    ipAttempts.set(ip, record);
    return {
      locked: true,
      remainingAttempts: 0,
      retryAfterSeconds: Math.ceil(LOCKOUT_WINDOW_MS / 1000),
    };
  }

  ipAttempts.set(ip, record);
  return {
    locked: false,
    remainingAttempts: MAX_ATTEMPTS - record.count,
  };
}

export function recordSuccessfulLogin(ip: string): void {
  ipAttempts.delete(ip);
}

// Reset all records (useful for test isolation)
export function resetRateLimits(): void {
  ipAttempts.clear();
}

