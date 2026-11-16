-- Standorte: the cities list's heading said "Städte, in denen wir arbeiten",
-- which reads as if m.on worked only there. It now names them as the main
-- places among others; the list itself and the "every town in between" note
-- stay as they are (the note is given more weight in the page's CSS).
--
-- Undo: set page-locations cities.title back to the values in git history.
BEGIN;

UPDATE content_blocks c SET value = v.value, updated_at = now()
FROM (VALUES
  ('de', 'Unsere wichtigsten Einsatzorte'),
  ('en', 'Our main service locations'),
  ('ar', 'أهم أماكن عملنا'),
  ('tr', 'Başlıca hizmet bölgelerimiz')
) AS v(locale, value)
WHERE c.section = 'page-locations' AND c.slot = 'cities.title' AND c.locale = v.locale;

COMMIT;
