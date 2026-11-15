/**
 * Server-side Cloudinary integration for private payment screenshots.
 *
 * Screenshots are stored as `authenticated`-type assets inside a dedicated
 * folder and are only retrievable through signed URLs generated here on the
 * server. The API secret never leaves the server.
 */

import { createHash, randomUUID } from "crypto";
import { v2 as cloudinary } from "cloudinary";

export const SCREENSHOT_FOLDER = "barber/payment-screenshots";

const MAX_PUBLIC_ID_LENGTH = 128;
const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

let configured = false;

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function ensureConfigured() {
  if (configured) return;
  const missing = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Cloudinary is not configured: missing env var(s): ${missing.join(", ")}`
    );
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

function assertValidPublicId(id: string): void {
  if (
    typeof id !== "string" ||
    id.length === 0 ||
    id.length > MAX_PUBLIC_ID_LENGTH ||
    !PUBLIC_ID_PATTERN.test(id)
  ) {
    throw new Error(`Invalid Cloudinary public_id: ${JSON.stringify(id)}`);
  }
}

function sha256Hex(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export interface UploadedScreenshot {
  publicId: string;
  /** True when an existing verified asset was reused instead of uploaded. */
  reused?: boolean;
}

export interface MigrationMetadata {
  /** Appointment ID the asset is being migrated for. */
  appointmentId: string;
}

export interface CloudinaryAssetDetails {
  public_id: string;
  resource_type?: string;
  type?: string;
  context?: { custom?: Record<string, unknown> };
}

/**
 * Pure check: does this Cloudinary asset detail record describe a verified
 * migrated screenshot? Returns null when valid, otherwise a reason string.
 * Exported for unit testing.
 */
export function checkMigratedAsset(
  details: CloudinaryAssetDetails,
  expectedSha256: string,
  appointmentId: string
): string | null {
  if (details.resource_type !== "image") {
    return `not an image (resource_type=${details.resource_type})`;
  }
  if (details.type !== "authenticated") {
    return `not authenticated-type (type=${details.type})`;
  }

  const custom = details.context?.custom ?? {};
  const storedAppointmentId = String(custom.migration_appointment_id ?? "");
  const storedSha = String(custom.migration_sha256 ?? "");

  if (storedAppointmentId !== appointmentId) {
    return `migration appointment_id mismatch (stored=${storedAppointmentId || "none"})`;
  }
  if (storedSha !== expectedSha256) {
    return "migration sha256 mismatch";
  }
  return null;
}

/**
 * Verifies that an already-existing Cloudinary asset is safe to reuse:
 * it must be an image, delivered as `authenticated` type, and carry
 * migration metadata (appointment ID + source SHA-256) matching exactly.
 * Throws if any check fails — a public_id match alone is never enough.
 */
/**
 * Fetches Cloudinary asset details for a private (authenticated) asset.
 * Throws if the asset does not exist or credentials are invalid.
 */
export async function getAssetDetails(
  publicId: string
): Promise<CloudinaryAssetDetails> {
  ensureConfigured();
  return (await cloudinary.api.resource(publicId, {
    resource_type: "image",
    type: "authenticated",
  })) as CloudinaryAssetDetails;
}

async function verifyExistingAsset(
  publicId: string,
  expectedSha256: string,
  appointmentId: string
): Promise<void> {
  const details = await getAssetDetails(publicId);

  const problem = checkMigratedAsset(details, expectedSha256, appointmentId);
  if (problem) {
    throw new Error(
      `Existing asset ${publicId} failed verification: ${problem} — refusing to reuse`
    );
  }
}

/**
 * Uploads image bytes to Cloudinary as a private (authenticated-type) asset.
 *
 * - `publicId` omitted: random UUID is generated (normal customer uploads).
 * - `publicId` supplied (migrations): deterministic ID. If the asset already
 *   exists, it is only reused after `verifyExistingAsset` confirms the
 *   authenticated delivery type and matching migration metadata.
 * - `meta.appointmentId`: stores `migration_appointment_id` +
 *   `migration_sha256` as Cloudinary context metadata for later
 *   verification on deterministic-ID retries.
 *
 * Never overwrites existing assets (`overwrite: false`).
 */
export async function uploadPaymentScreenshot(
  image: Buffer,
  publicId?: string,
  meta?: MigrationMetadata
): Promise<UploadedScreenshot> {
  ensureConfigured();

  const id = publicId ?? randomUUID();
  assertValidPublicId(id);

  const sourceSha256 = sha256Hex(image);
  const context = meta?.appointmentId
    ? `migration_appointment_id=${meta.appointmentId}|migration_sha256=${sourceSha256}`
    : undefined;

  try {
    const result = await new Promise<{ public_id: string }>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: SCREENSHOT_FOLDER,
            public_id: id,
            resource_type: "image",
            type: "authenticated",
            overwrite: false,
            unique_filename: false,
            ...(context ? { context } : {}),
          },
          (error, res) => {
            if (error) reject(error);
            else if (!res) reject(new Error("Empty Cloudinary response"));
            else resolve(res);
          }
        );
        uploadStream.end(image);
      }
    );

    return { publicId: result.public_id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const alreadyExists = /already exists|already been uploaded/i.test(message);

    // Deterministic-ID retry path: only reuse after full verification.
    if (alreadyExists && publicId && meta?.appointmentId) {
      await verifyExistingAsset(id, sourceSha256, meta.appointmentId);
      return { publicId: `${SCREENSHOT_FOLDER}/${id}`, reused: true };
    }

    throw err;
  }
}

/**
 * Generates a signed delivery URL for a private (authenticated) asset.
 *
 * NOTE: `sign_url: true` produces a URL whose signature covers the exact
 * public_id — it does NOT expire on its own. Treat the returned URL as a
 * bearer credential: it must only be used server-side and proxied to
 * authorized clients (see /api/admin/media/[...publicId]).
 */
export function getAuthenticatedImageUrl(publicId: string): string {
  ensureConfigured();
  return cloudinary.url(publicId, {
    secure: true,
    sign_url: true,
    type: "authenticated",
    resource_type: "image",
  });
}
