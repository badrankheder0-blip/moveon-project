-- Standorte (page-locations): the cities heading names the places and the
-- area around them, instead of "the most important" ones.
--   de "Unsere wichtigsten Einsatzorte" → "Unsere Einsatzorte und Umgebung"
--   en "Our main service locations"     → "Our service locations and surrounding areas"
--   ar "أهم أماكن عملنا"                 → "أماكن عملنا وما حولها"
--   tr "Başlıca hizmet bölgelerimiz"    → "Hizmet bölgelerimiz ve çevresi"
-- Undo: set the old values above back.
BEGIN;
UPDATE content_blocks c SET value = v.value, updated_at = now()
FROM (VALUES
  ('de', 'Unsere Einsatzorte und Umgebung'),
  ('en', 'Our service locations and surrounding areas'),
  ('ar', 'أماكن عملنا وما حولها'),
  ('tr', 'Hizmet bölgelerimiz ve çevresi')
) AS v(locale, value)
WHERE c.section = 'page-locations' AND c.slot = 'cities.title' AND c.locale = v.locale;
COMMIT;
