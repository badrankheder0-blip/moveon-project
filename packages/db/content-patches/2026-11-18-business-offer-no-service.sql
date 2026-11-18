-- Geschäftskunden (page-for-business): "Angebot anfordern" opens the booking
-- planner's "Wobei dürfen wir helfen?" for a business with no service chosen
-- (was: Umzug preselected). The planner now clears the choice for a link
-- that names only the type.
--
-- Undo: set hero.btnHref back to '/rechner?type=business&services=moving'.
BEGIN;

UPDATE content_blocks SET value = '/rechner?type=business', updated_at = now()
WHERE section = 'page-for-business' AND slot = 'hero.btnHref';

COMMIT;
