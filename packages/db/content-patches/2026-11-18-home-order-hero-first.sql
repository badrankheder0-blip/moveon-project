-- Startseite (home): the hero (four video panels) is the first section again.
-- A dashboard publish on 2026-11-17 17:30 UTC set layout.order to
-- "services,hero,…", so the page opened with the service cards (photos)
-- and the videos came second. Back to the default order (HomePage.tsx
-- DEFAULT_ORDER); everything after the first two is unchanged.
--
-- Undo: set layout.order back to
--   'services,hero,compare,area,audiences,stats,myths,marquee,why,story,reviews,faq,guides,cta'.
BEGIN;

UPDATE content_blocks
SET value = 'hero,services,compare,area,audiences,stats,myths,marquee,why,story,reviews,faq,guides,cta', updated_at = now()
WHERE section = 'home' AND slot = 'layout.order';

COMMIT;
