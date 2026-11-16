-- Geschäftskunden: drop the hero's "Leitfaden Büroumzug" button and take the
-- office-move guide ("Ein Büro an einem Wochenende umziehen") offline.
--
-- The button's text and address are emptied (the hero shows no second button
-- without a label). The guide keeps its copy; only its address is emptied, so
-- /ratgeber/office-weekend answers 404 and its card leaves the Umzug page and
-- the other guides' "more guides" lists, which only show guides with an address.
--
-- Undo: set page-blog svc.5.slug back to 'office-weekend' and page-for-business
-- hero.btn2 / hero.btn2Href back to their earlier values (see git history).
BEGIN;

UPDATE content_blocks SET value = '', updated_at = now()
WHERE section = 'page-for-business' AND slot IN ('hero.btn2', 'hero.btn2Href');

UPDATE content_blocks SET value = '', updated_at = now()
WHERE section = 'page-blog' AND slot = 'svc.5.slug';

COMMIT;
