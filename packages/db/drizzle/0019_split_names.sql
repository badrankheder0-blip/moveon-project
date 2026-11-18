ALTER TABLE "orders" ADD COLUMN "contact_first_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "contact_last_name" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "sales_quotes" ADD COLUMN "customer_first_name" text;--> statement-breakpoint
ALTER TABLE "sales_quotes" ADD COLUMN "customer_last_name" text;--> statement-breakpoint
-- Existing names split once at the first space ("Ali Hassan Test" → "Ali" / "Hassan Test").
UPDATE "users" SET "first_name" = split_part(btrim("full_name"), ' ', 1), "last_name" = btrim(substr(btrim("full_name"), length(split_part(btrim("full_name"), ' ', 1)) + 1)) WHERE "first_name" IS NULL AND "last_name" IS NULL;--> statement-breakpoint
UPDATE "orders" SET "contact_first_name" = split_part(btrim("contact_name"), ' ', 1), "contact_last_name" = btrim(substr(btrim("contact_name"), length(split_part(btrim("contact_name"), ' ', 1)) + 1)) WHERE "contact_first_name" IS NULL AND "contact_last_name" IS NULL;--> statement-breakpoint
UPDATE "sales_quotes" SET "customer_first_name" = split_part(btrim("customer_name"), ' ', 1), "customer_last_name" = btrim(substr(btrim("customer_name"), length(split_part(btrim("customer_name"), ' ', 1)) + 1)) WHERE "customer_first_name" IS NULL AND "customer_last_name" IS NULL AND btrim("customer_name") <> '';--> statement-breakpoint
UPDATE "leads" SET "first_name" = split_part(btrim("name"), ' ', 1), "last_name" = btrim(substr(btrim("name"), length(split_part(btrim("name"), ' ', 1)) + 1)) WHERE "first_name" IS NULL AND "last_name" IS NULL AND kind IN ('contact', 'job') AND "name" <> '—';
