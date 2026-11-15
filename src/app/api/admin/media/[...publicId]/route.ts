import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  isCloudinaryConfigured,
  getAuthenticatedImageUrl,
  SCREENSHOT_FOLDER,
} from "@/lib/cloudinary";

/**
 * GET /api/admin/media/<publicId>
 *
 * Streams a private Cloudinary payment screenshot to authenticated admins.
 * <img> and <a> tags send the admin session cookie automatically on
 * same-origin requests, so no client-side changes are needed beyond
 * pointing src/href at this endpoint.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string[] }> }
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const segments = (await params).publicId;
  const publicId = segments.join("/");

  // Only allow assets inside the dedicated screenshot folder
  if (
    !publicId.startsWith(`${SCREENSHOT_FOLDER}/`) ||
    publicId.includes("..") ||
    !/^[\w\-./]+$/.test(publicId)
  ) {
    return NextResponse.json({ error: "Invalid asset" }, { status: 400 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Media storage is not configured" },
      { status: 503 }
    );
  }

  try {
    const signedUrl = getAuthenticatedImageUrl(publicId);
    const upstream = await fetch(signedUrl);

    if (!upstream.ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("Failed to fetch screenshot from Cloudinary:", err);
    return NextResponse.json(
      { error: "Failed to load image" },
      { status: 502 }
    );
  }
}
