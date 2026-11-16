-- No phone contact, site-wide; and the Fragen page reorganised.
--  * The forms' error text no longer says "oder rufen Sie uns an".
--  * The service pages' first business step no longer offers a date
--    "online oder telefonisch".
--  * Fragen (page-contact): the "Wählen Sie den schnellsten Weg." cards go —
--    "Rufen Sie uns an", "FAQ lesen" and "Buchung verwalten" — and a single
--    FAQ banner (faqBanner.*) follows the form instead.
-- The header's number and the other phone elements are removed in code.
-- Legal pages (Impressum, cookie policy) are left as they are.
--
-- Undo: restore these slots from /root/db-backups/ or git history.
BEGIN;

UPDATE content_blocks c SET value = v.value, updated_at = now()
FROM (VALUES
  ('de', 'Das hat leider nicht geklappt. Bitte versuchen Sie es erneut.'),
  ('en', 'Sorry, that didn’t work. Please try again.'),
  ('ar', 'عذراً، لم يتم الإرسال. حاول مرة أخرى.'),
  ('tr', 'Üzgünüz, gönderilemedi. Lütfen tekrar deneyin.')
) AS v(locale, value)
WHERE c.slot = 'form.errSend' AND c.locale = v.locale;

UPDATE content_blocks c SET value = v.value, updated_at = now()
FROM (VALUES
  ('de', 'Wählen Sie online einen passenden Termin.'),
  ('en', 'Choose a date that suits you online.'),
  ('ar', 'اختر الموعد المناسب لك عبر الإنترنت.'),
  ('tr', 'Size uygun bir tarihi internetten seçin.')
) AS v(locale, value)
WHERE c.slot = 'steps.biz.1.text' AND c.section LIKE 'service-%' AND c.locale = v.locale;

DELETE FROM content_blocks WHERE section = 'page-contact' AND slot LIKE 'quick.%';

INSERT INTO content_blocks (section, slot, locale, value, kind, label, sort_order)
SELECT 'page-contact', v.slot, v.locale, v.value, 'text', v.label, v.sort_order
FROM (VALUES
  ('faqBanner.text','de','Antworten auf häufige Fragen finden Sie in unseren FAQ.','FAQ banner — text',40),
  ('faqBanner.text','en','You’ll find answers to common questions in our FAQ.','FAQ banner — text',40),
  ('faqBanner.text','ar','تجد إجابات الأسئلة الشائعة في صفحة الأسئلة الشائعة.','FAQ banner — text',40),
  ('faqBanner.text','tr','Sık sorulan soruların yanıtlarını SSS sayfamızda bulabilirsiniz.','FAQ banner — text',40),
  ('faqBanner.btn','de','FAQ lesen','FAQ banner — button: text',41),
  ('faqBanner.btn','en','Read the FAQ','FAQ banner — button: text',41),
  ('faqBanner.btn','ar','اقرأ الأسئلة الشائعة','FAQ banner — button: text',41),
  ('faqBanner.btn','tr','SSS''yi okuyun','FAQ banner — button: text',41),
  ('faqBanner.btnHref','de','/faq','FAQ banner — button: address',42),
  ('faqBanner.btnHref','en','/faq','FAQ banner — button: address',42),
  ('faqBanner.btnHref','ar','/faq','FAQ banner — button: address',42),
  ('faqBanner.btnHref','tr','/faq','FAQ banner — button: address',42)
) AS v(slot, locale, value, label, sort_order)
ON CONFLICT (section, slot, locale) DO UPDATE SET value = EXCLUDED.value;

COMMIT;
