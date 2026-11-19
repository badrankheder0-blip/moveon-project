ALTER TABLE "users" ADD COLUMN "customer_type" "customer_type" DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tax_number" text;