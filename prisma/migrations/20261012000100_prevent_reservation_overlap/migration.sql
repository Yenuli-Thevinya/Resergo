-- Database-level guarantee that two ACTIVE reservations for the same resource can never overlap.
-- This is the last line of defence behind the application's transaction + row lock:
-- even if two requests race each other, PostgreSQL itself rejects the second one.
--
-- Prisma cannot express exclusion constraints in schema.prisma, so they live in this SQL migration.
-- Adjacent bookings (10:00-11:00 and 11:00-12:00) are allowed because the range is half-open: [start, end).

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Reservation"
  ADD CONSTRAINT "reservation_time_order" CHECK ("endTime" > "startTime");

ALTER TABLE "Reservation"
  ADD CONSTRAINT "reservation_no_overlap"
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  )
  WHERE ("status" <> 'CANCELLED');
