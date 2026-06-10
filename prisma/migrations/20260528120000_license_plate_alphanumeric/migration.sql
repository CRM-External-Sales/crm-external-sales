-- Convert transfer.license_plate and reservation.transfer_id from BIGINT to VARCHAR(32)

ALTER TABLE "public"."reservation" DROP CONSTRAINT IF EXISTS "Reservation_transfer_id_fkey";

ALTER TABLE "public"."reservation"
  ALTER COLUMN "transfer_id" SET DATA TYPE VARCHAR(32)
  USING CASE
    WHEN "transfer_id" IS NULL THEN NULL
    ELSE "transfer_id"::text
  END;

ALTER TABLE "public"."transfer"
  ALTER COLUMN "license_plate" SET DATA TYPE VARCHAR(32)
  USING "license_plate"::text;

ALTER TABLE "public"."reservation"
  ADD CONSTRAINT "Reservation_transfer_id_fkey"
  FOREIGN KEY ("transfer_id")
  REFERENCES "public"."transfer"("license_plate")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
