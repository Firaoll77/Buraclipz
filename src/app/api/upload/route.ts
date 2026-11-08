import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    if (!file.type || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed (JPEG, PNG, WEBP)" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || "image/jpeg";
    const base64DataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    // 1. In Local Development or persistent storage, attempt to write to disk
    try {
      const uploadDir = join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });

      const timestamp = Date.now();
      const safeName = (file.name || "receipt.jpg").replace(/[^a-zA-Z0-9.-]/g, "_");
      const filename = `${timestamp}-${safeName}`;
      const filepath = join(uploadDir, filename);

      await writeFile(filepath, buffer);
      return NextResponse.json({ url: `/uploads/${filename}` });
    } catch {
      // 2. Serverless / Read-Only Filesystem Fallback (Vercel):
      // Return Base64 Data URL so images render anywhere without read-only filesystem errors
      return NextResponse.json({ url: base64DataUrl });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
