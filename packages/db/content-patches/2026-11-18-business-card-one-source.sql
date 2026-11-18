-- Geschäftskunden: card 4 "Mehrere Standorte" replaced by "Alles aus einer Hand" (layers icon).
BEGIN;
UPDATE content_blocks SET value = 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'
 WHERE section = 'page-for-business' AND slot = 'cards.4.icon';
UPDATE content_blocks SET value = v.value FROM (VALUES
 ('cards.4.title','de','Alles aus einer Hand'),
 ('cards.4.title','en','Everything from one source'),
 ('cards.4.title','ar','كل شيء من جهة واحدة'),
 ('cards.4.title','tr','Her şey tek elden'),
 ('cards.4.text','de','Umzug, Renovierung, Reinigung und Entrümpelung – mit einem Auftrag und einer Ansprechperson.'),
 ('cards.4.text','en','Moving, renovation, cleaning and clearance – one order, one contact person.'),
 ('cards.4.text','ar','نقل وترميم وتنظيف وإخلاء – بطلب واحد ومسؤول تواصل واحد.'),
 ('cards.4.text','tr','Taşınma, tadilat, temizlik ve boşaltma – tek sipariş, tek iletişim kişisi.')
) AS v(slot, locale, value)
WHERE content_blocks.section = 'page-for-business' AND content_blocks.slot = v.slot AND content_blocks.locale = v.locale;
COMMIT;
