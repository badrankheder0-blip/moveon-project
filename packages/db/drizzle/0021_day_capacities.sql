CREATE TABLE "day_capacities" (
	"day" date PRIMARY KEY NOT NULL,
	"max_capacity" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "day_capacities_not_negative" CHECK ("day_capacities"."max_capacity" >= 0)
);