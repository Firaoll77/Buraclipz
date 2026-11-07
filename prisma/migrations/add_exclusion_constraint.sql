-- PostgreSQL Exclusion Constraint for Addis Ababa Barbershop
-- Enforces zero overlapping appointments per barber at the database engine level.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add GiST exclusion constraint to prevent overlapping active appointments
ALTER TABLE "appointments"
ADD CONSTRAINT "no_overlapping_barber_appointments"
EXCLUDE USING gist (
  "barberId" WITH =,
  tstzrange("startTime", "endTime") WITH &&
)
WHERE ("status" = 'BOOKED');
