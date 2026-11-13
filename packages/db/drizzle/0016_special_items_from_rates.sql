-- Special items become catalogue rows.
--
-- A piano or a safe used to be six hardcoded rate keys ("sp_piano", …), so the
-- office could change what one costs but never add a seventh or rename one.
-- They are catalogue items now, with a `code` the pricing engine quotes by, and
-- the dashboard manages them like any other item.
--
-- Separate from 0015 on purpose: Postgres refuses to use an enum value in the
-- same transaction that added it, and 'special' arrives there.
--
-- Each row carries its old price over, so a quote costs exactly what it did
-- before this ran. The German names match the labels the planner already
-- showed; the old rate rows are dropped afterwards, because two places to
-- change one price is how they drift apart.
INSERT INTO "catalog_items" ("kind", "category", "code", "name", "price", "disposal_price", "assembly_price", "disassembly_price", "volume_m3", "is_active", "sort_order")
SELECT
  'special',
  'Besondere Gegenstände',
  s."code",
  s."name",
  COALESCE((SELECT p."value" FROM "price_settings" p WHERE p."key" = 'sp_' || s."code"), s."fallback"::numeric),
  0, 0, 0, 0,
  true,
  s."ord"
FROM (VALUES
  ('piano',    'Klavier / Flügel',                       '150.00', 0),
  ('safe',     'Tresor',                                 '120.00', 1),
  ('aquarium', 'Aquarium / Terrarium',                   '90.00',  2),
  ('gym',      'Fitnessgerät',                           '60.00',  3),
  ('heavy',    'Sehr schwerer Gegenstand (über 100 kg)', '80.00',  4),
  ('artwork',  'Kunstwerk / Spiegel',                    '25.00',  5)
) AS s("code", "name", "fallback", "ord")
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DELETE FROM "price_settings" WHERE "key" IN ('sp_piano', 'sp_safe', 'sp_aquarium', 'sp_gym', 'sp_heavy', 'sp_artwork');
--> statement-breakpoint
-- Drafts still pointing at the retired keys would publish into nothing.
DELETE FROM "config_drafts" WHERE "domain" = 'pricing' AND "ref" LIKE 'sp\_%';
