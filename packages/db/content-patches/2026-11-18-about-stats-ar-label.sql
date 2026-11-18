-- Über uns (page-about): the third number's Arabic label is «خدمات»
-- (services, plural), as asked; it was «خدمة».
--
-- Undo: set stats.3.label (ar) back to 'خدمة'.
BEGIN;

UPDATE content_blocks SET value = 'خدمات', updated_at = now()
WHERE section = 'page-about' AND slot = 'stats.3.label' AND locale = 'ar';

COMMIT;
