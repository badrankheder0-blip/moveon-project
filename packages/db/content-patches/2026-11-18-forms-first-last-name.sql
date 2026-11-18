-- Name fields: every form asks for "Vorname" and "Nachname" separately.
-- Contact (page-contact) and partner (page-partner) forms: the one label
-- form.name ("Vollständiger Name") becomes form.firstName + form.lastName,
-- all four languages. (page-jobs form.name is not shown anywhere: the job
-- application form already has its own first/last name fields.)
--
-- Undo: re-insert form.name from the seed and
--   DELETE FROM content_blocks WHERE section IN ('page-contact','page-partner') AND slot IN ('form.firstName','form.lastName');
BEGIN;

INSERT INTO content_blocks (section, slot, locale, value, kind, label, sort_order)
SELECT s.section, v.slot, v.locale, v.value, 'text', v.label, s.sort_order
FROM (VALUES ('page-contact', 25), ('page-partner', 37)) AS s(section, sort_order)
CROSS JOIN (VALUES
  ('form.firstName','de','Vorname','Form — “first name” field: label'),
  ('form.firstName','en','First name','Form — “first name” field: label'),
  ('form.firstName','ar','الاسم الأول','Form — “first name” field: label'),
  ('form.firstName','tr','Ad','Form — “first name” field: label'),
  ('form.lastName','de','Nachname','Form — “last name” field: label'),
  ('form.lastName','en','Last name','Form — “last name” field: label'),
  ('form.lastName','ar','الكنية','Form — “last name” field: label'),
  ('form.lastName','tr','Soyad','Form — “last name” field: label')
) AS v(slot, locale, value, label)
ON CONFLICT DO NOTHING;

DELETE FROM content_blocks WHERE section IN ('page-contact', 'page-partner') AND slot = 'form.name';

COMMIT;
