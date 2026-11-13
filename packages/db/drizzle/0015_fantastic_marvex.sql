-- A third kind of catalogue row, and a stable code for it.
--
-- `ALTER TYPE … ADD VALUE` is deliberately not used: Postgres refuses to use a
-- value added that way until the transaction that added it has committed, and
-- the migrator runs every pending file in one transaction — so the row that
-- needs 'special' could never be written in the same deploy. Recreating the
-- type sidesteps that, because a value of a type *created* in this transaction
-- is fine. Only catalog_items.kind uses it, and it has no default.
ALTER TABLE "catalog_items" ALTER COLUMN "kind" TYPE text;--> statement-breakpoint
DROP TYPE "public"."catalog_kind";--> statement-breakpoint
CREATE TYPE "public"."catalog_kind" AS ENUM('furniture', 'cleaning', 'special');--> statement-breakpoint
ALTER TABLE "catalog_items" ALTER COLUMN "kind" TYPE "public"."catalog_kind" USING "kind"::"public"."catalog_kind";--> statement-breakpoint
ALTER TABLE "catalog_items" ADD COLUMN "code" text;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_items_code_key" ON "catalog_items" USING btree ("code") WHERE "catalog_items"."code" is not null;
