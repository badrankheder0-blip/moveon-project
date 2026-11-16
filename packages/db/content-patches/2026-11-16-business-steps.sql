-- Geschäftskunden, "Vom ersten Anruf bis zum ersten Arbeitstag.": replace the
-- four steps (Besichtigung, Schriftliches Angebot, Umzug "meist nach
-- Feierabend", Zurück an die Arbeit) with the five that match how the office
-- works: Anfrage → Rückmeldung innerhalb von 48 Stunden → Besichtigung →
-- Angebot per E-Mail → Umzug. Step 5 is new, so the rows after it (the form)
-- move two places down in the dashboard's order.
--
-- Undo: restore content_blocks page-for-business steps.* and sort orders from
-- /root/db-backups/before-business-*.dump or from git history of the seed.
BEGIN;

UPDATE content_blocks SET sort_order = sort_order + 2, updated_at = now()
WHERE section = 'page-for-business' AND sort_order > 40;

INSERT INTO content_blocks (section, slot, locale, value, kind, label, sort_order)
SELECT 'page-for-business', s.slot, l.locale, '', s.kind, s.label, s.sort_order
FROM (VALUES
  ('steps.5.title', 'text', 'How it works — step 5: title', 41),
  ('steps.5.text', 'textarea', 'How it works — step 5: text', 42)
) AS s(slot, kind, label, sort_order)
CROSS JOIN (VALUES ('de'), ('en'), ('ar'), ('tr')) AS l(locale)
ON CONFLICT (section, slot, locale) DO NOTHING;

UPDATE content_blocks c SET value = v.value, updated_at = now()
FROM (VALUES
  ('steps.1.title', 'de', 'Anfrage'),
  ('steps.1.text',  'de', 'Sie fragen über das Formular unten ein Angebot an.'),
  ('steps.2.title', 'de', 'Rückmeldung innerhalb von 48 Stunden'),
  ('steps.2.text',  'de', 'Wir melden uns per E-Mail und vereinbaren einen Besichtigungstermin.'),
  ('steps.3.title', 'de', 'Besichtigung'),
  ('steps.3.text',  'de', 'Wir sehen uns Ihre Räume und Ihr Inventar vor Ort an.'),
  ('steps.4.title', 'de', 'Angebot per E-Mail'),
  ('steps.4.text',  'de', 'Umfang, Ablauf und Preis erhalten Sie schriftlich per E-Mail.'),
  ('steps.5.title', 'de', 'Umzug'),
  ('steps.5.text',  'de', 'Wir führen Ihren Umzug zum vereinbarten Termin durch.'),

  ('steps.1.title', 'en', 'Request'),
  ('steps.1.text',  'en', 'You request an offer using the form below.'),
  ('steps.2.title', 'en', 'Reply within 48 hours'),
  ('steps.2.text',  'en', 'We get back to you by email and arrange a site visit.'),
  ('steps.3.title', 'en', 'Site visit'),
  ('steps.3.text',  'en', 'We look at your premises and inventory on site.'),
  ('steps.4.title', 'en', 'Offer by email'),
  ('steps.4.text',  'en', 'You receive the scope, schedule and price in writing by email.'),
  ('steps.5.title', 'en', 'Move'),
  ('steps.5.text',  'en', 'We carry out your move on the agreed date.'),

  ('steps.1.title', 'ar', 'الطلب'),
  ('steps.1.text',  'ar', 'تطلب عرض سعر عبر النموذج في الأسفل.'),
  ('steps.2.title', 'ar', 'الرد خلال 48 ساعة'),
  ('steps.2.text',  'ar', 'نتواصل معك عبر البريد الإلكتروني ونحدد موعداً للمعاينة.'),
  ('steps.3.title', 'ar', 'المعاينة'),
  ('steps.3.text',  'ar', 'نعاين مكاتبك ومحتوياتها في الموقع.'),
  ('steps.4.title', 'ar', 'العرض بالبريد الإلكتروني'),
  ('steps.4.text',  'ar', 'يصلك نطاق العمل والجدول والسعر مكتوباً عبر البريد الإلكتروني.'),
  ('steps.5.title', 'ar', 'النقل'),
  ('steps.5.text',  'ar', 'ننفّذ نقلك في الموعد المتفق عليه.'),

  ('steps.1.title', 'tr', 'Talep'),
  ('steps.1.text',  'tr', 'Aşağıdaki form üzerinden teklif istersiniz.'),
  ('steps.2.title', 'tr', '48 saat içinde dönüş'),
  ('steps.2.text',  'tr', 'Size e-postayla dönüş yapar ve bir keşif randevusu belirleriz.'),
  ('steps.3.title', 'tr', 'Keşif'),
  ('steps.3.text',  'tr', 'Mekânınızı ve eşyalarınızı yerinde inceleriz.'),
  ('steps.4.title', 'tr', 'E-postayla teklif'),
  ('steps.4.text',  'tr', 'Kapsam, süreç ve fiyatı yazılı olarak e-postayla alırsınız.'),
  ('steps.5.title', 'tr', 'Taşınma'),
  ('steps.5.text',  'tr', 'Taşınmanızı kararlaştırılan tarihte gerçekleştiririz.')
) AS v(slot, locale, value)
WHERE c.section = 'page-for-business' AND c.slot = v.slot AND c.locale = v.locale;

COMMIT;
