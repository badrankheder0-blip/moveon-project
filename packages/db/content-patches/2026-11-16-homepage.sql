-- Startseite:
--  * "Verschiedene Leben. Dieselbe Sorgfalt.": the "Seniorenumzüge" tab and
--    its content go; "Privatumzug planen" / "Firmenumzug planen" open the
--    booking planner in the private / business flow with moving chosen.
--  * "Praktische Ratgeber für Ihren Umzug." is switched off (layout.hidden,
--    the homepage editor's own switch, so the office can turn it back on).
--  * Footer: the "Ratgeber" link goes; the links after it move up.
-- (The Entrümpelung timeline tab reads the Entrümpelung page's rows, fixed in
-- 2026-11-16-disposal-page.sql; "7 Tage" in 2026-11-16-stats-no-seven-days.)
--
-- Undo: restore home audiences.3.*, the audiences btnHrefs, chrome
-- footer.links.* from git history, and delete home layout.hidden.
BEGIN;

DELETE FROM content_blocks WHERE section = 'home' AND slot LIKE 'audiences.3.%';

UPDATE content_blocks SET updated_at = now(), value = CASE slot
    WHEN 'audiences.1.btnHref' THEN '/rechner?type=private&services=moving'
    WHEN 'audiences.2.btnHref' THEN '/rechner?type=business&services=moving'
  END
WHERE section = 'home' AND slot IN ('audiences.1.btnHref', 'audiences.2.btnHref');

INSERT INTO content_blocks (section, slot, locale, value, kind, label, sort_order)
SELECT 'home', 'layout.hidden', l.locale, 'guides', 'text', 'Layout — sections switched off (comma list)', 0
FROM (VALUES ('de'), ('en'), ('ar'), ('tr')) AS l(locale)
ON CONFLICT (section, slot, locale) DO UPDATE SET value =
  CASE WHEN content_blocks.value = '' THEN 'guides'
       WHEN content_blocks.value ~ '(^|,)\s*guides\s*(,|$)' THEN content_blocks.value
       ELSE content_blocks.value || ',guides' END;

CREATE TEMP TABLE old_footer ON COMMIT DROP AS
  SELECT slot, locale, value FROM content_blocks WHERE section = 'chrome' AND slot ~ '^footer\.links\.[0-9]+\.(label|href)$';
UPDATE content_blocks c SET value = o.value, updated_at = now()
FROM old_footer o
WHERE c.section = 'chrome' AND c.locale = o.locale
  AND c.slot ~ '^footer\.links\.[1-4]\.(label|href)$'
  AND o.slot = 'footer.links.' || (substr(c.slot, 14, 1)::int + 1) || substr(c.slot, 15);
DELETE FROM content_blocks WHERE section = 'chrome' AND slot ~ '^footer\.links\.5\.(label|href)$';

COMMIT;
