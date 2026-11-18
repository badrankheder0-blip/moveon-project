-- Über uns (page-about): its own numbers, editable in the Über uns editor.
-- The page used to show the homepage's two (home stats.*), so the Über uns
-- editor had nothing to change. It now has three: the same 1,000+ Umzüge and
-- 98% pünktlich, plus 10+ Leistungen. The homepage keeps its own.
--
-- Undo: DELETE FROM content_blocks WHERE section = 'page-about' AND slot LIKE 'stats.%';
--   (the page then falls back to the homepage's numbers).
BEGIN;

INSERT INTO content_blocks (section, slot, locale, value, kind, label, sort_order)
SELECT 'page-about', v.slot, v.locale, v.value, v.kind, v.label, v.sort_order
FROM (VALUES
  ('stats.1.value','de','1,000+','text','Numbers — 1: figure (counts up from zero)',170),
  ('stats.1.value','en','1,000+','text','Numbers — 1: figure (counts up from zero)',170),
  ('stats.1.value','ar','+1000','text','Numbers — 1: figure (counts up from zero)',170),
  ('stats.1.value','tr','1,000+','text','Numbers — 1: figure (counts up from zero)',170),
  ('stats.1.label','de','Umzüge','text','Numbers — 1: label',171),
  ('stats.1.label','en','moves','text','Numbers — 1: label',171),
  ('stats.1.label','ar','عملية نقل','text','Numbers — 1: label',171),
  ('stats.1.label','tr','taşınma','text','Numbers — 1: label',171),
  ('stats.2.value','de','98%','text','Numbers — 2: figure (counts up from zero)',172),
  ('stats.2.value','en','98%','text','Numbers — 2: figure (counts up from zero)',172),
  ('stats.2.value','ar','98%','text','Numbers — 2: figure (counts up from zero)',172),
  ('stats.2.value','tr','98%','text','Numbers — 2: figure (counts up from zero)',172),
  ('stats.2.label','de','pünktlich','text','Numbers — 2: label',173),
  ('stats.2.label','en','on time','text','Numbers — 2: label',173),
  ('stats.2.label','ar','في الموعد','text','Numbers — 2: label',173),
  ('stats.2.label','tr','zamanında','text','Numbers — 2: label',173),
  ('stats.3.value','de','10+','text','Numbers — 3: figure (counts up from zero)',174),
  ('stats.3.value','en','10+','text','Numbers — 3: figure (counts up from zero)',174),
  ('stats.3.value','ar','+10','text','Numbers — 3: figure (counts up from zero)',174),
  ('stats.3.value','tr','10+','text','Numbers — 3: figure (counts up from zero)',174),
  ('stats.3.label','de','Leistungen','text','Numbers — 3: label',175),
  ('stats.3.label','en','services','text','Numbers — 3: label',175),
  ('stats.3.label','ar','خدمة','text','Numbers — 3: label',175),
  ('stats.3.label','tr','hizmet','text','Numbers — 3: label',175)
) AS v(slot, locale, value, kind, label, sort_order)
ON CONFLICT (section, slot, locale) DO UPDATE SET value = EXCLUDED.value, label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

COMMIT;
