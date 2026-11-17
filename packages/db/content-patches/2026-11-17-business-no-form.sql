-- Geschäftskunden (page-for-business): the request box "Erzählen Sie uns von
-- Ihrem Unternehmen." (text and form) is removed from the page.
--  * Its copy (form.*) is deleted, so the content editor no longer offers it.
--  * The hero button "Angebot anfordern" pointed at #form; it now opens the
--    booking planner's business flow, like the other pages' business buttons.
--  * Step 1 said "über das Formular unten"; it now names the booking planner.
--    The Umzug page's business tab carries the same step, so it changes too.
--
-- Undo: restore page-for-business and service-moving steps from
-- /root/db-backups/ or the git history of src/pages-content.ts.
BEGIN;

DELETE FROM content_blocks WHERE section = 'page-for-business' AND slot LIKE 'form.%';

UPDATE content_blocks SET value = '/rechner?type=business&services=moving', updated_at = now()
WHERE section = 'page-for-business' AND slot = 'hero.btnHref';

UPDATE content_blocks c SET value = v.value, updated_at = now()
FROM (VALUES
  ('de', 'Sie fragen über den Buchungsplaner ein Angebot an.'),
  ('en', 'You request an offer through the booking planner.'),
  ('ar', 'تطلب عرض سعر عبر مخطّط الحجز.'),
  ('tr', 'Rezervasyon planlayıcısı üzerinden teklif istersiniz.')
) AS v(locale, value)
WHERE c.locale = v.locale
  AND ((c.section = 'page-for-business' AND c.slot = 'steps.1.text')
    OR (c.section = 'service-moving' AND c.slot = 'steps.biz.1.text'));

COMMIT;
