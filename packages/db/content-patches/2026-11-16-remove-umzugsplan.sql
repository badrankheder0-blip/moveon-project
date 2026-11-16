-- Umzugsplan removed; Leistungen tidied.
--  * Main navigation: "Umzugsplan" (/so-funktioniert) goes; the links after
--    it move up one place. The page itself answers with a 301 to /leistungen
--    (next.config.js).
--  * Leistungen: the hero's "Umzug planen" button goes; "Für Privatkunden"
--    opens the booking planner in the private flow ("Wobei dürfen wir
--    helfen?"); "Für Unternehmen" keeps the Geschäftskunden page. The "Vier
--    Schritte vom Plan bis zum Schlüssel." section is removed in code.
--  * The Ratgeber page's hero button pointed at the moving plan; it now
--    points at Leistungen.
--
-- Undo: restore chrome nav.links.*, page-services and page-blog hero.btnHref
-- from /root/db-backups/ or git history.
BEGIN;

CREATE TEMP TABLE old_nav ON COMMIT DROP AS
  SELECT slot, locale, value FROM content_blocks WHERE section = 'chrome' AND slot ~ '^nav\.links\.[0-9]+\.(label|href)$';

UPDATE content_blocks c SET value = o.value, updated_at = now()
FROM old_nav o
WHERE c.section = 'chrome' AND c.locale = o.locale
  AND c.slot ~ '^nav\.links\.[2-5]\.(label|href)$'
  AND o.slot = 'nav.links.' || (substr(c.slot, 11, 1)::int + 1) || substr(c.slot, 12);

DELETE FROM content_blocks WHERE section = 'chrome' AND slot ~ '^nav\.links\.6\.(label|href)$';

UPDATE content_blocks SET value = '', updated_at = now()
WHERE section = 'page-services' AND slot IN ('hero.btn2', 'hero.btn2Href');

UPDATE content_blocks SET value = '/rechner?type=private', updated_at = now()
WHERE section = 'page-services' AND slot = 'forwho.1.href';

UPDATE content_blocks SET value = '/leistungen', updated_at = now()
WHERE section = 'page-blog' AND slot = 'hero.btnHref' AND value = '/so-funktioniert';

COMMIT;
