-- Reinigung (service-cleaning), and the private/business button rule on every
-- service page:
--  * Hero fact "4 Fenstertypen" → "Verschiedene Fenstertypen": many window
--    types are cleaned, not a fixed number.
--  * "So wird Ihr Preis berechnet": item 3 "Termine am Wochenende oder an
--    Feiertagen" removed (Saturdays only; no Sundays or public holidays).
--  * Private buttons ("Privat oder gewerblich?" and the "Für Privatkunden"
--    step) open the booking planner in the private flow, business ones in the
--    business flow, with the page's service chosen — here and on Umzug
--    (Renovierung and Entrümpelung have their own patches).
--  * The guide "Was Vermieter bei der Übergabe zuerst prüfen"
--    (/ratgeber/handover-check) is taken offline: address emptied, copy kept.
--
-- Undo: restore these slots from /root/db-backups/before-business-*.dump or
-- git history of the seed (src/pages-content.ts).
BEGIN;

UPDATE content_blocks c SET value = v.value, updated_at = now()
FROM (VALUES
  ('de', 'Verschiedene Fenstertypen'),
  ('en', 'Various window types'),
  ('ar', 'أنواع نوافذ مختلفة'),
  ('tr', 'Farklı pencere tipleri')
) AS v(locale, value)
WHERE c.section = 'service-cleaning' AND c.slot = 'hero.facts.2.value' AND c.locale = v.locale;

DELETE FROM content_blocks WHERE section = 'service-cleaning' AND slot = 'price.3.text';

UPDATE content_blocks SET updated_at = now(), value = '/rechner?type='
    || CASE WHEN slot IN ('pb.1.btnHref', 'steps.btnHref') THEN 'private' ELSE 'business' END
    || '&services=' || CASE section WHEN 'service-cleaning' THEN 'cleaning' ELSE 'moving' END
WHERE section IN ('service-cleaning', 'service-moving')
  AND slot IN ('pb.1.btnHref', 'steps.btnHref', 'pb.2.btnHref', 'steps.bizBtnHref');

UPDATE content_blocks SET value = '', updated_at = now()
WHERE section = 'page-blog' AND slot = 'svc.2.slug';

COMMIT;
