-- Entrümpelung (service-disposal). The rule for this service: everything is
-- taken away and disposed of; nothing is sorted out for the customer to keep
-- and nothing is swept ("besenrein").
--  * Hero facts: Sortiert fürs Recycling / Besenrein / Einzelne Teile →
--    Möbelentsorgung / Elektrogeräte / Jede Größe & Menge.
--  * "So funktioniert es" step 4 "Besenrein & fertig" → "Abtransport &
--    Entsorgung".
--  * The day timeline (also the homepage's Entrümpelung tab): heading without
--    "besenrein"; 08:30 "Behaltenes beiseitegestellt" becomes "Alles wird
--    mitgenommen" with another photo; 15:00 "Besenrein" removed.
--  * Private/business buttons open the booking planner in that flow with
--    disposal chosen.
--  * The guide "Behalten, verkaufen, spenden, entsorgen" (/ratgeber/declutter)
--    is taken offline: address emptied, copy kept.
--
-- Undo: restore these slots from /root/db-backups/before-business-*.dump or
-- git history of the seed (src/pages-content.ts).
BEGIN;

UPDATE content_blocks c SET value = v.value, updated_at = now()
FROM (VALUES
  ('hero.facts.1.value', 'de', 'Möbelentsorgung'),
  ('hero.facts.1.value', 'en', 'Furniture removal'),
  ('hero.facts.1.value', 'ar', 'التخلص من الأثاث'),
  ('hero.facts.1.value', 'tr', 'Mobilya tahliyesi'),
  ('hero.facts.1.label', 'de', 'Schränke, Sofas, Betten und mehr'),
  ('hero.facts.1.label', 'en', 'Wardrobes, sofas, beds and more'),
  ('hero.facts.1.label', 'ar', 'خزائن وكنب وأسرّة وغيرها'),
  ('hero.facts.1.label', 'tr', 'Dolaplar, koltuklar, yataklar ve daha fazlası'),
  ('hero.facts.2.value', 'de', 'Elektrogeräte'),
  ('hero.facts.2.value', 'en', 'Electrical appliances'),
  ('hero.facts.2.value', 'ar', 'الأجهزة الكهربائية'),
  ('hero.facts.2.value', 'tr', 'Elektrikli cihazlar'),
  ('hero.facts.2.label', 'de', 'Kühlschränke, Waschmaschinen, Elektronik'),
  ('hero.facts.2.label', 'en', 'Fridges, washing machines, electronics'),
  ('hero.facts.2.label', 'ar', 'برادات وغسالات وإلكترونيات'),
  ('hero.facts.2.label', 'tr', 'Buzdolapları, çamaşır makineleri, elektronik'),
  ('hero.facts.3.value', 'de', 'Jede Größe & Menge'),
  ('hero.facts.3.value', 'en', 'Any size & amount'),
  ('hero.facts.3.value', 'ar', 'أي حجم وأي كمية'),
  ('hero.facts.3.value', 'tr', 'Her boyut ve miktar'),
  ('hero.facts.3.label', 'de', 'Einzelne Teile oder ein ganzer Haushalt'),
  ('hero.facts.3.label', 'en', 'Single items or a whole household'),
  ('hero.facts.3.label', 'ar', 'قطع منفردة أو منزل كامل'),
  ('hero.facts.3.label', 'tr', 'Tek parçalar veya bütün bir ev'),

  ('steps.4.title', 'de', 'Abtransport & Entsorgung'),
  ('steps.4.title', 'en', 'Removal & disposal'),
  ('steps.4.title', 'ar', 'النقل والتخلص'),
  ('steps.4.title', 'tr', 'Taşıma ve bertaraf'),
  ('steps.4.text', 'de', 'Alles wird abtransportiert und fachgerecht entsorgt.'),
  ('steps.4.text', 'en', 'Everything is taken away and disposed of properly.'),
  ('steps.4.text', 'ar', 'نأخذ كل شيء ونتخلص منه بالطريقة الصحيحة.'),
  ('steps.4.text', 'tr', 'Her şey götürülür ve usulüne uygun bertaraf edilir.'),

  ('story.title', 'de', 'Vom vollen Keller bis zu leeren Räumen.'),
  ('story.title', 'en', 'From a full cellar to empty rooms.'),
  ('story.title', 'ar', 'من قبو ممتلئ إلى غرف فارغة.'),
  ('story.title', 'tr', 'Dolu bir bodrumdan boş odalara.'),
  ('story.2.title', 'de', 'Alles wird mitgenommen'),
  ('story.2.title', 'en', 'Everything goes'),
  ('story.2.title', 'ar', 'نأخذ كل شيء'),
  ('story.2.title', 'tr', 'Her şey götürülür'),
  ('story.2.text', 'de', 'Sie müssen nichts vorsortieren: Wir nehmen alles mit, was weg soll, und bringen es zur Entsorgung.'),
  ('story.2.text', 'en', 'Nothing to sort beforehand: we take everything that has to go and bring it to disposal.'),
  ('story.2.text', 'ar', 'لا حاجة لفرز أي شيء مسبقاً: نأخذ كل ما يجب التخلص منه وننقله للتخلص منه.'),
  ('story.2.text', 'tr', 'Önceden ayırmanıza gerek yok: Gidecek her şeyi alır ve bertarafa götürürüz.')
) AS v(slot, locale, value)
WHERE c.section = 'service-disposal' AND c.slot = v.slot AND c.locale = v.locale;

UPDATE content_blocks SET value = '/images/mon/photos/clear-bulky.webp', updated_at = now()
WHERE section = 'service-disposal' AND slot = 'story.2.img';

DELETE FROM content_blocks WHERE section = 'service-disposal' AND slot LIKE 'story.6.%';

UPDATE content_blocks SET updated_at = now(), value = '/rechner?type='
    || CASE WHEN slot IN ('pb.1.btnHref', 'steps.btnHref') THEN 'private' ELSE 'business' END
    || '&services=disposal'
WHERE section = 'service-disposal'
  AND slot IN ('pb.1.btnHref', 'steps.btnHref', 'pb.2.btnHref', 'steps.bizBtnHref');

UPDATE content_blocks SET value = '', updated_at = now()
WHERE section = 'page-blog' AND slot = 'svc.4.slug';

COMMIT;
