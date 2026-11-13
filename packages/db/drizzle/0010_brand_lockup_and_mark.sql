-- The v2 header (frame 357:23886) draws the full m.on lockup, the mark above
-- the wordmark, where the old one drew the mark alone; the footer, the
-- phone-width header (245:53005) and the calculator keep the mark on its own.
-- So the brand now has two images: brand.logo (the lockup) and brand.mark.
--
-- brand.mark starts as whatever brand.logo holds today, so everything that
-- moves over to it keeps showing exactly what it showed, an uploaded logo
-- included. brand.logo then moves to the lockup only while it still holds the
-- shipped mark: a logo an admin chose is left alone. A fresh database has no
-- rows yet, so the SELECT inserts nothing and the seed writes both.
INSERT INTO "site_settings" ("key", "value", "group", "kind", "label", "description", "sort_order")
SELECT 'brand.mark', "value", 'brand', 'image', 'Compact mark',
  'The mark on its own, for small spaces: the footer, the header on phones, the calculator, the sign-in pages and the dashboard. Upload one, or give a path under /images/ or an https:// address.',
  4
FROM "site_settings" WHERE "key" = 'brand.logo'
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
UPDATE "site_settings" SET "value" = '/images/brand/logo-lockup.png', "updated_at" = now()
WHERE "key" = 'brand.logo' AND "value" = '/images/brand/logo.png';
--> statement-breakpoint
UPDATE "site_settings" SET
  "description" = 'The full logo, the mark above the m.on wordmark: the header on wide screens and link previews. Upload one, or give a path under /images/ or an https:// address.'
WHERE "key" = 'brand.logo';
--> statement-breakpoint
-- "Jobs" in the new utility bar has no page on this site, so where it leads is
-- a setting, empty (and the link hidden) until there is somewhere to send it.
INSERT INTO "site_settings" ("key", "value", "group", "kind", "label", "description", "sort_order")
SELECT 'brand.jobsUrl', '', 'brand', 'text', 'Jobs page link',
  'Where “Jobs” in the top bar of the header leads: an https:// address, or a page on this site such as /jobs. Empty hides the link.',
  6
FROM "site_settings" WHERE "key" = 'brand.logo'
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
UPDATE "site_settings" SET "sort_order" = 5 WHERE "key" = 'brand.tagline' AND "sort_order" = 4;
--> statement-breakpoint
-- The v2 chrome replaces the "GET APP" pill with "Book now", so nothing reads
-- brand.appUrl any more. A link nobody ever entered goes; one an admin did
-- enter is kept, and says why it no longer shows.
DELETE FROM "site_settings" WHERE "key" = 'brand.appUrl' AND "value" = '';
--> statement-breakpoint
UPDATE "site_settings" SET
  "description" = 'Not shown at the moment: the header and footer now carry “Book now” instead of the GET APP button. Kept for when an app ships.'
WHERE "key" = 'brand.appUrl';
