-- Partnerschaften (page-partner), form "Lassen Sie uns sprechen.":
--  * form.sub (intro under the title): no "kurzes Gespräch" any more; it asks
--    for the details and a file describing what the partner wants to offer us,
--    so we can review the request.
--  * form.fileHint (under "Datei-Upload"): says what the file should contain,
--    then the allowed types and size.
--
-- Undo: set form.sub back to "Senden Sie uns Ihre Daten, und wir vereinbaren
-- ein kurzes Gespräch." (en/ar/tr in git history of the seed) and form.fileHint
-- back to "PDF, DOC/DOCX, JPG oder PNG, max. 10 MB" (and its translations).
BEGIN;

UPDATE content_blocks c SET value = v.value, updated_at = now()
FROM (VALUES
  ('form.sub','de','Senden Sie uns Ihre Daten und fügen Sie eine Datei mit den Details zu dem bei, was Sie uns anbieten möchten. So können wir Ihre Anfrage prüfen und melden uns bei Ihnen.'),
  ('form.sub','en','Send us your details and attach a file describing what you would like to offer us, so we can review your request and get back to you.'),
  ('form.sub','ar','أرسل بياناتك، وأرفق ملفاً فيه تفاصيل ما تريد تقديمه لنا، لندرس طلبك ونتواصل معك.'),
  ('form.sub','tr','Bilgilerinizi gönderin ve bize ne sunmak istediğinizi anlatan bir dosya ekleyin; talebinizi inceleyip size dönüş yapalım.'),
  ('form.fileHint','de','Details zu dem, was Sie uns anbieten möchten, damit wir Ihre Anfrage prüfen können. PDF, DOC/DOCX, JPG oder PNG, max. 10 MB'),
  ('form.fileHint','en','Details of what you would like to offer us, so we can review your request. PDF, DOC/DOCX, JPG or PNG, max. 10 MB'),
  ('form.fileHint','ar','تفاصيل ما تريد تقديمه لنا، لندرس طلبك. PDF أو DOC/DOCX أو JPG أو PNG، بحد أقصى 10 ميغابايت'),
  ('form.fileHint','tr','Bize ne sunmak istediğinizin ayrıntıları; talebinizi inceleyebilmemiz için. PDF, DOC/DOCX, JPG veya PNG, en fazla 10 MB')
) AS v(slot, locale, value)
WHERE c.section = 'page-partner' AND c.slot = v.slot AND c.locale = v.locale;

UPDATE content_blocks SET label = 'Form — file: what to attach, allowed types', updated_at = now()
WHERE section = 'page-partner' AND slot = 'form.fileHint';

COMMIT;
