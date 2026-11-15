/**
 * Migrates historical payment screenshots into private Cloudinary storage.
 *
 * Usage:
 *   npx tsx scripts/migrate-payment-screenshots.ts             # dry run — report only
 *   npx tsx scripts/migrate-payment-screenshots.ts --apply     # phase 1: upload + set paymentPublicId (keeps paymentScreenshot)
 *   npx tsx scripts/migrate-payment-screenshots.ts --finalize  # phase 2: clear paymentScreenshot on verified migrated rows only
 *
 * Requires CLOUDINARY_* env vars and DATABASE_URL.
 * Run --apply, verify screenshots render in /admin/bookings, then run --finalize.
 *
 * Exported helpers are unit-tested in migrate-payment-screenshots.test.ts.
 */

import { readFile } from "fs/promises";
import { resolve, sep } from "path";
import { lookup } from "dns/promises";
import { pathToFileURL } from "url";
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import {
  isCloudinaryConfigured,
  uploadPaymentScreenshot,
  getAssetDetails,
  checkMigratedAsset,
  SCREENSHOT_FOLDER,
  type CloudinaryAssetDetails,
} from "../src/lib/cloudinary";

// Load .env for local runs (Node >= 20.6)
try {
  process.loadEnvFile?.(".env");
} catch {
  // env may already be provided by the environment
}

let prismaClient: PrismaClient | null = null;
function getPrisma(): PrismaClient {
  return (prismaClient ??= new PrismaClient());
}

const APPLY = process.argv.includes("--apply");
const FINALIZE = process.argv.includes("--finalize");

const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;
const PUBLIC_UPLOADS_DIR = resolve(process.cwd(), "public", "uploads");

// ---------------------------------------------------------------------------
// Image type detection (magic bytes — never trust Content-Type or extension)
// ---------------------------------------------------------------------------

export type DetectedImageKind = "jpeg" | "png" | "webp";

export function detectImageKind(buf: Buffer): DetectedImageKind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "png";
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

// ---------------------------------------------------------------------------
// SSRF protection
// ---------------------------------------------------------------------------

export function isPublicIp(ip: string): boolean {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const o = v4.slice(1).map(Number);
    if (o.some((n) => n > 255)) return false;
    const [a, b, c] = o;
    // loopback, private, link-local, CGNAT, benchmarking, doc ranges, multicast, reserved
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    ) {
      return false;
    }
    return true;
  }

  const v6 = ip.toLowerCase();
  // IPv4-mapped IPv6 (::ffff:a.b.c.d)
  const mapped = v6.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPublicIp(mapped[1]);
  if (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe8") ||
    v6.startsWith("fe9") ||
    v6.startsWith("fea") ||
    v6.startsWith("feb")
  ) {
    return false;
  }
  return true;
}

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".home",
  ".corp",
  ".intranet",
  ".test",
  ".example",
  ".invalid",
];

/**
 * Validates a remote URL is safe to download from:
 * HTTPS only, public hostname, DNS resolves exclusively to public IPs.
 * Returns the parsed URL or throws with a reason.
 */
export async function assertSafeRemoteUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("malformed URL");
  }
  if (url.protocol !== "https:") {
    throw new Error(`non-HTTPS scheme: ${url.protocol}`);
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // IP literals (v4 dotted-quad or anything containing ':') are validated
  // directly — no DNS involved, immune to DNS rebinding.
  if (/^[\d.]+$/.test(host) || host.includes(":")) {
    if (!isPublicIp(host)) throw new Error(`blocked IP address: ${host}`);
    return url;
  }

  if (
    host === "localhost" ||
    !host.includes(".") ||
    BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))
  ) {
    throw new Error(`blocked hostname: ${host}`);
  }

  // Resolve DNS and require EVERY resolved address to be public
  let addresses: { address: string }[];
  try {
    addresses = await Promise.race([
      lookup(host, { all: true, verbatim: true }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DNS lookup timed out")), FETCH_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    throw new Error(
      `DNS resolution failed for ${host}: ${err instanceof Error ? err.message : err}`
    );
  }
  if (addresses.length === 0) throw new Error(`no DNS records for ${host}`);
  for (const { address } of addresses) {
    if (!isPublicIp(address)) {
      throw new Error(`hostname ${host} resolves to blocked IP ${address}`);
    }
  }
  return url;
}

/**
 * Downloads an image from a remote URL with SSRF guards:
 * HTTPS-only, per-hop URL revalidation, redirect re-validation (max 3),
 * timeout, 10MB cap, magic-byte image verification.
 */
async function fetchRemoteImage(rawUrl: string): Promise<Buffer> {
  let current = await assertSafeRemoteUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(current.toString(), {
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      throw new Error(
        `download failed: ${err instanceof Error ? err.message : err}`
      );
    }
    clearTimeout(timer);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error(`redirect ${res.status} without Location`);
      // Re-validate the redirect target fully (scheme + DNS + IPs)
      current = await assertSafeRemoteUrl(new URL(location, current).toString());
      continue;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const declared = Number(res.headers.get("content-length") || 0);
    if (declared > MAX_DOWNLOAD_BYTES) {
      throw new Error("file exceeds 10MB limit");
    }

    // Read the body with a hard cap — never buffer an unbounded response
    const reader = res.body?.getReader();
    if (!reader) throw new Error("empty response body");
    const chunks: Buffer[] = [];
    let total = 0;
    for (;;) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      total += chunk.byteLength;
      if (total > MAX_DOWNLOAD_BYTES) {
        await reader.cancel();
        throw new Error("file exceeds 10MB limit");
      }
      chunks.push(Buffer.from(chunk));
    }
    const buf = Buffer.concat(chunks);
    if (buf.length === 0) throw new Error("empty response body");
    if (!detectImageKind(buf)) {
      throw new Error("content is not a JPEG/PNG/WebP image");
    }
    return buf;
  }

  throw new Error(`too many redirects (max ${MAX_REDIRECTS})`);
}

// ---------------------------------------------------------------------------
// Source resolution
// ---------------------------------------------------------------------------

export type ScreenshotKind =
  | "data-url"
  | "remote-url"
  | "local-upload"
  | "unsupported";

export interface ClassifiedSource {
  kind: ScreenshotKind;
  skipReason?: string;
}

/** Classifies a stored paymentScreenshot value without downloading it. */
export function classifySource(value: string): ClassifiedSource {
  if (value.startsWith("data:image/")) {
    return value.includes(",")
      ? { kind: "data-url" }
      : { kind: "unsupported", skipReason: "malformed data URL" };
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      if (u.protocol !== "https:") {
        return { kind: "unsupported", skipReason: "non-HTTPS remote URL" };
      }
      return { kind: "remote-url" };
    } catch {
      return { kind: "unsupported", skipReason: "malformed remote URL" };
    }
  }

  if (value.startsWith("/uploads/")) {
    // Strict single-segment filename inside public/uploads — no traversal
    const name = value.slice("/uploads/".length);
    if (!/^[A-Za-z0-9._-]+$/.test(name) || name.includes("..")) {
      return { kind: "unsupported", skipReason: "unsafe /uploads/ path" };
    }
    return { kind: "local-upload" };
  }

  return { kind: "unsupported", skipReason: "unrecognized screenshot format" };
}

/** Resolves a local /uploads/ reference safely inside public/uploads. */
async function readLocalUpload(value: string): Promise<Buffer> {
  const name = value.slice("/uploads/".length);
  const filePath = resolve(PUBLIC_UPLOADS_DIR, name);
  if (!filePath.startsWith(PUBLIC_UPLOADS_DIR + sep)) {
    throw new Error("path escapes uploads directory");
  }
  const buf = await readFile(filePath);
  if (buf.length === 0 || buf.length > MAX_DOWNLOAD_BYTES) {
    throw new Error("invalid file size");
  }
  if (!detectImageKind(buf)) {
    throw new Error("content is not a JPEG/PNG/WebP image");
  }
  return buf;
}

interface Candidate {
  id: string;
  bookingReference: string;
  kind: ScreenshotKind;
  buffer?: Buffer;
  skipReason?: string;
}

export async function resolveBuffer(
  value: string,
  classified: ClassifiedSource
): Promise<{ buffer?: Buffer; skipReason?: string }> {
  try {
    if (classified.kind === "data-url") {
      const comma = value.indexOf(",");
      const buf = Buffer.from(value.slice(comma + 1), "base64");
      if (buf.length === 0 || buf.length > MAX_DOWNLOAD_BYTES) {
        return { skipReason: "data URL empty or exceeds 10MB" };
      }
      if (!detectImageKind(buf)) {
        return { skipReason: "data URL content is not JPEG/PNG/WebP" };
      }
      return { buffer: buf };
    }

    if (classified.kind === "remote-url") {
      return { buffer: await fetchRemoteImage(value) };
    }

    if (classified.kind === "local-upload") {
      return { buffer: await readLocalUpload(value) };
    }
  } catch (err) {
    return {
      skipReason: err instanceof Error ? err.message : String(err),
    };
  }

  return {};
}

// ---------------------------------------------------------------------------
// Migration identity
// ---------------------------------------------------------------------------

export function expectedPublicIdFor(appointmentId: string): string {
  return `${SCREENSHOT_FOLDER}/migration-${appointmentId.replace(/[^\w-]/g, "")}`;
}

/**
 * A record may only be finalized when its paymentPublicId is a populated,
 * non-blank string AND exactly matches the deterministic migrated ID for
 * that appointment — i.e. it is a confirmed migrated Cloudinary reference.
 */
export function isFinalizableRecord(rec: {
  id: string;
  paymentPublicId: string | null;
}): boolean {
  const pid = rec.paymentPublicId ?? "";
  // Blank/whitespace-only values can never match; require an EXACT match
  // to the deterministic migrated ID (no trimming — stored value must be exact).
  return pid.trim().length > 0 && pid === expectedPublicIdFor(rec.id);
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

interface RecordResult {
  id: string;
  bookingReference: string;
  action:
    | "uploaded"
    | "reused"
    | "already-migrated"
    | "planned"
    | "skipped"
    | "failed"
    | "finalized"
    | "finalize-skipped";
  reason?: string;
  screenshotIntact: boolean;
  asset?: "none" | "created" | "reused" | "unknown";
}

function reportRecord(r: RecordResult) {
  const asset = r.asset ? ` | asset: ${r.asset}` : "";
  const intact = r.screenshotIntact ? "screenshot preserved" : "SCREENSHOT CLEARED";
  console.log(`  ${r.action === "failed" || r.action === "skipped" || r.action === "finalize-skipped" ? "✗" : "✓"} ${r.bookingReference} [${r.id}] — ${r.action}${r.reason ? `: ${r.reason}` : ""} | ${intact}${asset}`);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function runFinalize(results: RecordResult[]) {
  if (!isCloudinaryConfigured()) {
    console.error(
      "Finalize aborted: Cloudinary is not configured — cannot verify assets. No data was changed."
    );
    return;
  }

  const candidates = await getPrisma().appointment.findMany({
    where: {
      paymentPublicId: { not: null },
      paymentScreenshot: { not: null },
    },
    select: {
      id: true,
      bookingReference: true,
      paymentPublicId: true,
      paymentScreenshot: true,
    },
  });

  console.log(`Finalize: ${candidates.length} record(s) have both paymentPublicId and paymentScreenshot.`);

  for (const rec of candidates) {
    const skip = (reason: string) =>
      results.push({
        id: rec.id,
        bookingReference: rec.bookingReference,
        action: "finalize-skipped",
        reason,
        screenshotIntact: true,
        asset: "none",
      });

    // 1. paymentPublicId must be non-blank and exactly the deterministic
    //    migrated ID for this appointment.
    if (!isFinalizableRecord({ id: rec.id, paymentPublicId: rec.paymentPublicId })) {
      skip("paymentPublicId is blank or not the expected migrated reference");
      continue;
    }
    const pid = rec.paymentPublicId!;

    // 2. Resolve the preserved source image and recompute its SHA-256 so the
    //    stored migration hash can be verified against the real bytes.
    const value = rec.paymentScreenshot as string;
    const classified = classifySource(value);
    const resolved =
      classified.kind === "unsupported"
        ? { skipReason: classified.skipReason || "unsupported format" }
        : await resolveBuffer(value, classified);
    if (!resolved.buffer) {
      skip(
        `cannot re-verify source image for hash check: ${resolved.skipReason || "unresolvable"}`
      );
      continue;
    }
    const sourceSha256 = createHash("sha256").update(resolved.buffer).digest("hex");

    // 3. Fetch the live Cloudinary asset — any API failure means we cannot
    //    verify, so we conservatively preserve the original value.
    let details: CloudinaryAssetDetails;
    try {
      details = await getAssetDetails(pid);
    } catch (err) {
      skip(
        `Cloudinary verification failed: ${err instanceof Error ? err.message : err}`
      );
      continue;
    }

    // 4. Full asset check: image resource_type, authenticated delivery type,
    //    matching appointment_id, and SHA-256 equal to the recomputed hash.
    const problem = checkMigratedAsset(details, sourceSha256, rec.id);
    if (problem) {
      skip(`asset verification failed: ${problem}`);
      continue;
    }

    // 5. Conditional clear — re-asserts every DB-level requirement atomically.
    const updated = await getPrisma().appointment.updateMany({
      where: {
        id: rec.id,
        paymentPublicId: pid,
        paymentScreenshot: { not: null },
      },
      data: { paymentScreenshot: null },
    });

    if (updated.count === 1) {
      results.push({
        id: rec.id,
        bookingReference: rec.bookingReference,
        action: "finalized",
        screenshotIntact: false,
      });
    } else {
      skip("conditional update matched 0 rows (state changed concurrently)");
    }
  }
}

async function runApply(results: RecordResult[]) {
  const candidates = await getPrisma().appointment.findMany({
    where: {
      paymentScreenshot: { not: null },
      paymentPublicId: null,
    },
    select: {
      id: true,
      bookingReference: true,
      paymentScreenshot: true,
    },
  });

  console.log(`Apply: ${candidates.length} record(s) with legacy paymentScreenshot and no paymentPublicId.`);

  for (const a of candidates) {
    const value = a.paymentScreenshot as string;
    const classified = classifySource(value);

    if (classified.kind === "unsupported") {
      results.push({
        id: a.id,
        bookingReference: a.bookingReference,
        action: "skipped",
        reason: classified.skipReason || "unsupported format",
        screenshotIntact: true,
        asset: "none",
      });
      continue;
    }

    const resolved = await resolveBuffer(value, classified);
    if (!resolved.buffer) {
      results.push({
        id: a.id,
        bookingReference: a.bookingReference,
        action: "skipped",
        reason: resolved.skipReason || "could not resolve image data",
        screenshotIntact: true,
        asset: "none",
      });
      continue;
    }

    try {
      const deterministicId = `migration-${a.id.replace(/[^\w-]/g, "")}`;
      const { publicId, reused } = await uploadPaymentScreenshot(
        resolved.buffer,
        deterministicId,
        { appointmentId: a.id }
      );

      // Phase 1: store the reference but KEEP paymentScreenshot until verified.
      await getPrisma().appointment.update({
        where: { id: a.id },
        data: { paymentPublicId: publicId },
      });

      results.push({
        id: a.id,
        bookingReference: a.bookingReference,
        action: reused ? "reused" : "uploaded",
        screenshotIntact: true,
        asset: reused ? "reused" : "created",
      });
    } catch (err) {
      results.push({
        id: a.id,
        bookingReference: a.bookingReference,
        action: "failed",
        reason: err instanceof Error ? err.message : String(err),
        // Screenshot is always preserved on failure; a Cloudinary asset may
        // exist if the failure happened after upload (orphaned, private).
        screenshotIntact: true,
        asset: "unknown",
      });
    }
  }
}

async function main() {
  const results: RecordResult[] = [];

  if (FINALIZE) {
    await runFinalize(results);
  } else {
    const alreadyMigrated = await getPrisma().appointment.count({
      where: { paymentPublicId: { not: null } },
    });
    results.push({
      id: "-",
      bookingReference: "-",
      action: "already-migrated",
      reason: `${alreadyMigrated} record(s) already have paymentPublicId`,
      screenshotIntact: true,
      asset: "none",
    });

    if (!APPLY) {
      // Dry run: classify sources only — no downloads, no uploads.
      const candidates = await getPrisma().appointment.findMany({
        where: {
          paymentScreenshot: { not: null },
          paymentPublicId: null,
        },
        select: { id: true, bookingReference: true, paymentScreenshot: true },
      });
      console.log(`Dry run: ${candidates.length} record(s) with legacy paymentScreenshot and no paymentPublicId.`);
      for (const a of candidates) {
        const classified = classifySource(a.paymentScreenshot as string);
        if (classified.kind === "unsupported") {
          results.push({
            id: a.id,
            bookingReference: a.bookingReference,
            action: "skipped",
            reason: classified.skipReason || "unsupported format",
            screenshotIntact: true,
            asset: "none",
          });
          console.log(`  - ${a.bookingReference} [${a.id}] — skipped: ${classified.skipReason || "unsupported format"}`);
        } else {
          results.push({
            id: a.id,
            bookingReference: a.bookingReference,
            action: "planned",
            reason: `would migrate (${classified.kind})`,
            screenshotIntact: true,
            asset: "none",
          });
          console.log(`  ○ ${a.bookingReference} [${a.id}] — would migrate (${classified.kind})`);
        }
      }
      console.log("\nDry run only. Re-run with --apply to upload to Cloudinary.");
    } else {
      if (!isCloudinaryConfigured()) {
        console.error("Cloudinary is not configured — set CLOUDINARY_* env vars first.");
        process.exit(1);
      }
      await runApply(results);
      console.log("\nNext: verify screenshots in /admin/bookings, then run with --finalize to clear legacy values.");
    }
  }

  // Itemized report for skipped/failed + summary counts
  console.log("\n===== ITEMIZED REPORT =====");
  for (const r of results) {
    if (["skipped", "failed", "finalize-skipped"].includes(r.action)) {
      reportRecord(r);
    }
  }

  const count = (a: RecordResult["action"]) =>
    results.filter((r) => r.action === a).length;
  console.log("\n===== SUMMARY =====");
  console.log(`  total examined : ${results.filter((r) => r.id !== "-").length}`);
  console.log(`  uploaded        : ${count("uploaded")}`);
  console.log(`  reused          : ${count("reused")}`);
  console.log(`  already migrated: ${count("already-migrated")}`);
  console.log(`  planned         : ${count("planned")}`);
  console.log(`  skipped         : ${count("skipped")}`);
  console.log(`  failed          : ${count("failed")}`);
  console.log(`  finalized       : ${count("finalized")}`);
  console.log(`  finalize-skipped: ${count("finalize-skipped")}`);
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => getPrisma().$disconnect());
}
