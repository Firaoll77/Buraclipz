import { NextRequest, NextResponse } from "next/server";
import {
  isCloudinaryConfigured,
  uploadPaymentScreenshot,
  SCREENSHOT_FOLDER,
} from "@/lib/cloudinary";
import {
  createUploadReceipt,
  isUploadReceiptSecretConfigured,
} from "@/lib/upload-receipt";
import { getClientIp } from "@/lib/admin-rate-limit";

// Simple per-IP upload rate limit: 30 uploads per hour.
// In-memory, best-effort — sufficient abuse protection for this use case.
const UPLOAD_LIMIT = 30;
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;
const uploadHits = new Map<string, number[]>();

function checkUploadRateLimit(ip: string): boolean {
  const now = Date.now();
  const hits = (uploadHits.get(ip) || []).filter((t) => now - t < UPLOAD_WINDOW_MS);
  if (hits.length >= UPLOAD_LIMIT) {
    uploadHits.set(ip, hits);
    return false;
  }
  hits.push(now);
  uploadHits.set(ip, hits);
  return true;
}

type DetectedImageType = "jpeg" | "png" | "webp";

// Magic-byte sniffing — never trust the client-provided MIME type
function detectImageType(buf: Buffer): DetectedImageType | null {
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

export async function POST(request: NextRequest) {
  try {
    if (!isCloudinaryConfigured() || !isUploadReceiptSecretConfigured()) {
      console.error("Screenshot upload is not configured (Cloudinary/receipt secret missing)");
      return NextResponse.json(
        { error: "Upload service is not configured" },
        { status: 503 }
      );
    }

    const clientIp = getClientIp(request.headers);
    if (!checkUploadRateLimit(clientIp)) {
      return NextResponse.json(
        { error: "Too many uploads. Please try again later." },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate actual content — JPEG, PNG, or WebP only
    const detected = detectImageType(buffer);
    if (!detected) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, or WebP images are allowed" },
        { status: 400 }
      );
    }

    // Upload to Cloudinary as a private (authenticated) asset.
    // Filename from the browser is never used or trusted.
    const { publicId } = await uploadPaymentScreenshot(buffer);
    const receipt = createUploadReceipt(publicId);

    return NextResponse.json({
      publicId,
      folder: SCREENSHOT_FOLDER,
      receipt,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
