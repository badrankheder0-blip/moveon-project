-- Geschäftskunden, "Gemacht für die Arbeitsweise von Unternehmen.": keep
-- Zahlung per Rechnung, Eine feste Ansprechperson, Versicherter Transport and
-- Mehrere Standorte; drop "Umzüge nach Feierabend" (no evening or weekend
-- moves) and "Einrichtung inklusive"; add "Angebot per E-Mail innerhalb von
-- 48 Stunden". Five cards: 1 Rechnung, 2 Ansprechperson, 3 Versicherter
-- Transport, 4 Mehrere Standorte, 5 Angebot per E-Mail.
--
-- Undo: restore content_blocks rows page-for-business cards.* from the backup
-- /root/db-backups/before-business-*.dump or from git history of the seed.
BEGIN;

CREATE TEMP TABLE old_cards ON COMMIT DROP AS
  SELECT slot, locale, value FROM content_blocks
  WHERE section = 'page-for-business' AND slot LIKE 'cards.%';

-- Card 3 becomes "Versicherter Transport" (was card 5).
UPDATE content_blocks c SET value = o.value, updated_at = now()
FROM old_cards o
WHERE c.section = 'page-for-business'
  AND c.slot IN ('cards.3.icon', 'cards.3.title', 'cards.3.text')
  AND o.slot = replace(c.slot, 'cards.3.', 'cards.5.') AND o.locale = c.locale;

-- Card 5 becomes the new "Angebot per E-Mail innerhalb von 48 Stunden".
UPDATE content_blocks SET updated_at = now(), value = 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6'
WHERE section = 'page-for-business' AND slot = 'cards.5.icon';

UPDATE content_blocks c SET updated_at = now(), value = v.value
FROM (VALUES
  ('de', 'Angebot per E-Mail innerhalb von 48 Stunden'),
  ('en', 'Offer by email within 48 hours'),
  ('ar', 'عرض السعر بالبريد الإلكتروني خلال 48 ساعة'),
  ('tr', '48 saat içinde e-postayla teklif')
) AS v(locale, value)
WHERE c.section = 'page-for-business' AND c.slot = 'cards.5.title' AND c.locale = v.locale;

UPDATE content_blocks c SET updated_at = now(), value = v.value
FROM (VALUES
  ('de', 'Nach der Besichtigung erhalten Sie Ihr Angebot schriftlich per E-Mail.'),
  ('en', 'After the site visit, you receive your written offer by email.'),
  ('ar', 'بعد المعاينة يصلك عرضنا مكتوباً عبر البريد الإلكتروني.'),
  ('tr', 'Keşiften sonra yazılı teklifinizi e-postayla alırsınız.')
) AS v(locale, value)
WHERE c.section = 'page-for-business' AND c.slot = 'cards.5.text' AND c.locale = v.locale;

-- "Einrichtung inklusive" goes.
DELETE FROM content_blocks WHERE section = 'page-for-business' AND slot LIKE 'cards.6.%';

COMMIT;
