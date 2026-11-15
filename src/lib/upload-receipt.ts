/**
 * Signed upload receipts for payment screenshots.
 *
 * /api/upload issues a receipt after a successful Cloudinary upload.
 * /api/bookings requires a valid receipt before persisting paymentPublicId,
 * proving the asset was uploaded through our endpoint, belongs to the
 * screenshot folder, and hasn't expired.
 */

import crypto from "crypto";
import { SCREENSHOT_FOLDER } from "./cloudinary";

const RECEIPT_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getSecret(): string {
  return (
    process.env.SCREENSHOT_UPLOAD_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    ""
  );
}

export function isUploadReceiptSecretConfigured(): boolean {
  return getSecret().length > 0;
}

export function createUploadReceipt(publicId: string): string {
  const secret = getSecret();
  if (!secret) {
    throw new Error("Upload receipt secret is not configured");
  }
  const payload = Buffer.from(
    JSON.stringify({ p: publicId, e: Date.now() + RECEIPT_TTL_MS })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyUploadReceipt(
  receipt: string,
  publicId: string
): boolean {
  try {
    const secret = getSecret();
    if (!secret) return false;

    const dot = receipt.lastIndexOf(".");
    if (dot <= 0) return false;
    const payload = receipt.slice(0, dot);
    const signature = receipt.slice(dot + 1);

    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof parsed?.p !== "string" || typeof parsed?.e !== "number") {
      return false;
    }
    if (parsed.p !== publicId) return false;
    if (parsed.e < Date.now()) return false;

    // Enforce folder ownership — only our screenshot assets are valid
    return parsed.p.startsWith(`${SCREENSHOT_FOLDER}/`);
  } catch {
    return false;
  }
}
