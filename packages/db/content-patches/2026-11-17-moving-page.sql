-- Umzug (service-moving):
--  * Hero: the "Nach m³ oder Stück" fact goes (customers cannot estimate a
--    volume; the planner does); "Bis 500.000 €" and the team size stay.
--  * "So funktioniert es", private tab: three steps — Online berechnen &
--    Angebot anfragen, Preis erhalten, Wir führen Ihren Umzug durch.
--    Business tab: the Geschäftskunden process (Anfrage → Rückmeldung
--    innerhalb von 48 Stunden → Besichtigung → Angebot per E-Mail → Umzug).
--    Both buttons already open the booking planner (2026-11-16-cleaning-page).
--  * "So wird Ihr Preis berechnet": item 5 "Termine am Wochenende oder an
--    Feiertagen" removed.
--  * The guide "Eine Küche an einem Nachmittag packen" (/ratgeber/pack-kitchen)
--    is taken offline (address emptied, copy kept); "Ein Büro an einem
--    Wochenende umziehen" already was.
-- The day timeline ("Vom ersten Klopfen bis zum ersten Abend.") is left off
-- the Umzug page in code; the homepage keeps its Umzug tab.
--
-- Undo: restore service-moving and page-blog svc.1.slug from /root/db-backups/
-- or git history of the seed.
BEGIN;

CREATE TEMP TABLE old_rows ON COMMIT DROP AS
  SELECT section, slot, locale, value FROM content_blocks
  WHERE (section = 'service-moving' AND slot LIKE 'hero.facts.%') OR (section = 'page-for-business' AND slot ~ '^steps\.[1-5]\.(title|text)$');

-- Facts: 2 → 1, 3 → 2, drop 3.
UPDATE content_blocks c SET value = o.value, updated_at = now()
FROM old_rows o
WHERE c.section = 'service-moving' AND o.section = 'service-moving' AND c.locale = o.locale
  AND c.slot ~ '^hero\.facts\.[12]\.(value|label)$'
  AND o.slot = 'hero.facts.' || (substr(c.slot, 12, 1)::int + 1) || substr(c.slot, 13);
DELETE FROM content_blocks WHERE section = 'service-moving' AND slot ~ '^hero\.facts\.3\.(value|label)$';

-- Private steps: three.
UPDATE content_blocks c SET value = v.value, updated_at = now()
FROM (VALUES
  ('steps.1.title','de','Online berechnen & Angebot anfragen'), ('steps.1.title','en','Calculate online & request an offer'),
  ('steps.1.title','ar','احسب عبر الإنترنت واطلب عرضاً'), ('steps.1.title','tr','Online hesaplayın ve teklif isteyin'),
  ('steps.1.text','de','Im Buchungsplaner geben Sie Strecke, Zimmer und Gegenstände in wenigen Minuten ein.'),
  ('steps.1.text','en','In the booking planner you enter your route, rooms and items in a few minutes.'),
  ('steps.1.text','ar','في مخطّط الحجز تُدخل المسار والغرف والأغراض خلال دقائق.'),
  ('steps.1.text','tr','Rezervasyon planlayıcısında güzergâhı, odaları ve eşyaları birkaç dakikada girersiniz.'),
  ('steps.3.title','de','Wir führen Ihren Umzug durch'), ('steps.3.title','en','We carry out your move'),
  ('steps.3.title','ar','ننفّذ نقلك'), ('steps.3.title','tr','Taşınmanızı gerçekleştiririz'),
  ('steps.3.text','de','Zum vereinbarten Termin, sorgfältig vom ersten Karton bis zum letzten Möbelstück.'),
  ('steps.3.text','en','On the agreed date, with care from the first box to the last piece of furniture.'),
  ('steps.3.text','ar','في الموعد المتفق عليه، بعناية من أول صندوق حتى آخر قطعة أثاث.'),
  ('steps.3.text','tr','Kararlaştırılan tarihte, ilk koliden son mobilyaya kadar özenle.')
) AS v(slot, locale, value)
WHERE c.section = 'service-moving' AND c.slot = v.slot AND c.locale = v.locale;
DELETE FROM content_blocks WHERE section = 'service-moving' AND slot IN ('steps.4.title', 'steps.4.text');

-- Business steps: the Geschäftskunden page's five, in every language.
INSERT INTO content_blocks (section, slot, locale, value, kind, label, sort_order)
SELECT 'service-moving', 'steps.biz.' || substr(o.slot, 7), o.locale, o.value,
  CASE WHEN o.slot LIKE '%.text' THEN 'textarea' ELSE 'text' END,
  'How it works (business) — step ' || substr(o.slot, 7, 1) || ': ' || CASE WHEN o.slot LIKE '%.text' THEN 'text' ELSE 'title' END,
  90 + (substr(o.slot, 7, 1)::int) * 2 - CASE WHEN o.slot LIKE '%.title' THEN 1 ELSE 0 END
FROM old_rows o
WHERE o.section = 'page-for-business'
ON CONFLICT (section, slot, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

DELETE FROM content_blocks WHERE section = 'service-moving' AND slot = 'price.5.text';

UPDATE content_blocks SET value = '', updated_at = now() WHERE section = 'page-blog' AND slot = 'svc.1.slug';

COMMIT;
