-- Add Cloudinary public_id reference for private payment screenshots.
-- paymentScreenshot is kept for historical records (legacy URLs / base64 data URLs).

ALTER TABLE "appointments"
ADD COLUMN IF NOT EXISTS "paymentPublicId" TEXT;
