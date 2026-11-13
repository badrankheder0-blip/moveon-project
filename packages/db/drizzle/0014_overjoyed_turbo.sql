-- What makes a catalogue item the same item.
--
-- `pnpm seed` inserts the catalogue with "on conflict do nothing", but there
-- was nothing for it to conflict on: the only unique column was the generated
-- id. Every run therefore added a second copy of all 29 items, and the booking
-- planner listed each of them twice.
--
-- A database that was seeded more than once already holds those duplicates, so
-- the index cannot simply be created. Drop the copies first, keeping the oldest
-- row of each name: historical quotes and orders store the item id they were
-- priced with, and the oldest row is the one they can have referenced.
DELETE FROM "catalog_items" a
      USING "catalog_items" b
      WHERE a."kind" = b."kind"
        AND a."category" = b."category"
        AND a."name" = b."name"
        AND (a."created_at", a."id") > (b."created_at", b."id");
--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_items_kind_category_name_key" ON "catalog_items" USING btree ("kind","category","name");
