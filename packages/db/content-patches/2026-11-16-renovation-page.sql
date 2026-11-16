-- Renovierung (service-renovation):
--  * "Privat oder gewerblich?": both buttons read "Jetzt buchen" and open the
--    booking planner straight in the private / business flow with renovation
--    chosen, instead of the planner's start screen or the Geschäftskunden page.
--  * "So funktioniert es": the private tab's button is the site-visit request
--    the business tab uses ("Besichtigungstermin anfragen"), since a
--    renovation is priced after a visit for everyone; both open the planner.
--  * The guide "Vor der Übergabe: wann neu streichen?" (/ratgeber/repaint) is
--    taken offline: its address is emptied, the copy kept.
-- The hero's "Zur Anfrage hinzufügen" toggle and the "Ratgeber zu dieser
-- Leistung" section are removed in the page template (ServicePage.tsx).
--
-- Undo: restore these slots from /root/db-backups/before-business-*.dump or
-- git history of the seed (src/pages-content.ts).
BEGIN;

UPDATE content_blocks c SET value = p.value, updated_at = now()
FROM content_blocks p
WHERE c.section = 'service-renovation' AND c.slot = 'pb.2.btn'
  AND p.section = 'service-renovation' AND p.slot = 'pb.1.btn' AND p.locale = c.locale;

UPDATE content_blocks c SET value = p.value, updated_at = now()
FROM content_blocks p
WHERE c.section = 'service-renovation' AND c.slot = 'steps.btn'
  AND p.section = 'service-renovation' AND p.slot = 'steps.bizBtn' AND p.locale = c.locale;

UPDATE content_blocks SET updated_at = now(), value = CASE slot
    WHEN 'pb.1.btnHref' THEN '/rechner?type=private&services=renovation'
    WHEN 'steps.btnHref' THEN '/rechner?type=private&services=renovation'
    WHEN 'pb.2.btnHref' THEN '/rechner?type=business&services=renovation'
    WHEN 'steps.bizBtnHref' THEN '/rechner?type=business&services=renovation'
  END
WHERE section = 'service-renovation' AND slot IN ('pb.1.btnHref', 'steps.btnHref', 'pb.2.btnHref', 'steps.bizBtnHref');

UPDATE content_blocks SET value = '', updated_at = now()
WHERE section = 'page-blog' AND slot = 'svc.3.slug';

COMMIT;
