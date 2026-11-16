CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'mini_job');--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"job_title" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"address" text,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"message" text,
	"locale" text DEFAULT 'de' NOT NULL,
	"files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tasks" text DEFAULT '' NOT NULL,
	"requirements" text DEFAULT '' NOT NULL,
	"offer" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"employment_type" "employment_type" DEFAULT 'full_time' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_applications_job_idx" ON "job_applications" USING btree ("job_id","created_at");--> statement-breakpoint
CREATE INDEX "jobs_sort_idx" ON "jobs" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_slug_idx" ON "jobs" USING btree ("slug");--> statement-breakpoint
-- The open roles were numbered CMS slots on page-jobs (title, text, type,
-- place). Carry the German copy over as postings, in the same order, so the
-- Jobs page shows what it showed before.
INSERT INTO "jobs" ("slug", "title", "summary", "description", "location", "employment_type", "sort_order")
SELECT
  trim(both '-' from regexp_replace(
    lower(translate(t.value, 'äöüÄÖÜß', 'aouAOUs')),
    '[^a-z0-9]+', '-', 'g'
  )),
  t.value,
  coalesce(x.value, ''),
  CASE WHEN coalesce(x.value, '') = '' THEN '' ELSE '<p>' || replace(replace(replace(x.value, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>' END,
  coalesce(p.value, ''),
  (CASE
    WHEN lower(coalesce(ty.value, '')) LIKE '%teilzeit%' THEN 'part_time'
    WHEN lower(coalesce(ty.value, '')) LIKE '%mini%' THEN 'mini_job'
    ELSE 'full_time'
  END)::employment_type,
  r.n
FROM generate_series(1, 30) AS r(n)
JOIN "content_blocks" t ON t.section = 'page-jobs' AND t.locale = 'de' AND t.slot = 'roles.' || r.n || '.title' AND trim(t.value) <> ''
LEFT JOIN "content_blocks" x ON x.section = 'page-jobs' AND x.locale = 'de' AND x.slot = 'roles.' || r.n || '.text'
LEFT JOIN "content_blocks" p ON p.section = 'page-jobs' AND p.locale = 'de' AND p.slot = 'roles.' || r.n || '.place'
LEFT JOIN "content_blocks" ty ON ty.section = 'page-jobs' AND ty.locale = 'de' AND ty.slot = 'roles.' || r.n || '.type';
