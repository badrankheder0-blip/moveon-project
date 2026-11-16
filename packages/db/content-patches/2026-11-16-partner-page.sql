-- Partnerschaften (page-partner):
--  * "Partner, die Menschen bewegen.": Makler / Hausverwaltungen / Möbelhäuser
--    / Relocation-Services become the four services — Umzug, Renovierung,
--    Reinigung, Entrümpelung — each the booking planner's picture and its
--    name only (the icon rows become picture rows; the texts go).
--  * "Einfach ab der ersten Empfehlung.": three steps — Interesse, Anfrage
--    senden, Wir melden uns.
--  * Form: "Firmenname" (required), no "Art der Partnerschaft" dropdown, a
--    placeholder in "Nachricht", and an optional file (copy for its picker).
--
-- Undo: restore page-partner from /root/db-backups/ or git history of the seed.
BEGIN;

-- Cards: icon → picture, title → service name, text removed.
UPDATE content_blocks c SET slot = replace(c.slot, '.icon', '.img'), kind = 'image',
  label = replace(c.label, 'icon (SVG path)', 'photo'), updated_at = now(),
  value = '/images/planner/service-' || (ARRAY['moving','renovation','cleaning','disposal'])[substr(c.slot, 7, 1)::int] || '.webp'
WHERE c.section = 'page-partner' AND c.slot ~ '^cards\.[1-4]\.icon$';

DELETE FROM content_blocks WHERE section = 'page-partner' AND slot ~ '^cards\.[1-4]\.text$';

UPDATE content_blocks c SET value = v.value, updated_at = now()
FROM (VALUES
  ('cards.1.title','de','Umzug'), ('cards.1.title','en','Moving'), ('cards.1.title','ar','نقل الأثاث'), ('cards.1.title','tr','Taşınma'),
  ('cards.2.title','de','Renovierung'), ('cards.2.title','en','Renovation'), ('cards.2.title','ar','الترميم'), ('cards.2.title','tr','Tadilat'),
  ('cards.3.title','de','Reinigung'), ('cards.3.title','en','Cleaning'), ('cards.3.title','ar','التنظيف'), ('cards.3.title','tr','Temizlik'),
  ('cards.4.title','de','Entrümpelung'), ('cards.4.title','en','Junk removal'), ('cards.4.title','ar','إزالة الأغراض'), ('cards.4.title','tr','Eşya tahliyesi'),

  ('steps.1.title','de','Interesse'), ('steps.1.title','en','Interest'), ('steps.1.title','ar','الاهتمام'), ('steps.1.title','tr','İlgi'),
  ('steps.1.text','de','Sie möchten mit m.on zusammenarbeiten.'), ('steps.1.text','en','You would like to work with m.on.'),
  ('steps.1.text','ar','ترغب في التعاون مع m.on.'), ('steps.1.text','tr','m.on ile çalışmak istiyorsunuz.'),
  ('steps.2.title','de','Anfrage senden'), ('steps.2.title','en','Send your request'), ('steps.2.title','ar','أرسل طلبك'), ('steps.2.title','tr','Talebinizi gönderin'),
  ('steps.2.text','de','Sie füllen das Formular unten aus und senden es uns.'), ('steps.2.text','en','You fill in the form below and send it to us.'),
  ('steps.2.text','ar','تملأ النموذج في الأسفل وترسله إلينا.'), ('steps.2.text','tr','Aşağıdaki formu doldurup bize gönderirsiniz.'),
  ('steps.3.title','de','Wir melden uns'), ('steps.3.title','en','We get in touch'), ('steps.3.title','ar','نتواصل معك'), ('steps.3.title','tr','Size dönüş yaparız'),
  ('steps.3.text','de','Wir melden uns bei Ihnen und besprechen die Zusammenarbeit.'), ('steps.3.text','en','We get back to you and talk through working together.'),
  ('steps.3.text','ar','نتواصل معك ونناقش التعاون بيننا.'), ('steps.3.text','tr','Size dönüş yapar ve iş birliğini konuşuruz.'),

  ('form.company','de','Firmenname'), ('form.company','en','Company name'), ('form.company','ar','اسم الشركة'), ('form.company','tr','Şirket adı')
) AS v(slot, locale, value)
WHERE c.section = 'page-partner' AND c.slot = v.slot AND c.locale = v.locale;

DELETE FROM content_blocks WHERE section = 'page-partner' AND slot IN ('steps.4.title', 'steps.4.text', 'form.type', 'form.typeOptions');

INSERT INTO content_blocks (section, slot, locale, value, kind, label, sort_order)
SELECT 'page-partner', v.slot, v.locale, v.value, v.kind, v.label, v.sort_order
FROM (VALUES
  ('form.messagePlaceholder','de','Erzählen Sie uns von Ihrem Unternehmen und welche Leistungen Sie von uns benötigen.','textarea','Form — “message” field: hint inside the empty field',42),
  ('form.messagePlaceholder','en','Tell us about your company and which services you need from us.','textarea','Form — “message” field: hint inside the empty field',42),
  ('form.messagePlaceholder','ar','أخبرنا عن شركتك وما الخدمات التي تحتاجها منا.','textarea','Form — “message” field: hint inside the empty field',42),
  ('form.messagePlaceholder','tr','Bize şirketinizden ve bizden hangi hizmetlere ihtiyaç duyduğunuzdan bahsedin.','textarea','Form — “message” field: hint inside the empty field',42),
  ('form.file','de','Datei-Upload (optional)','text','Form — file: label',42),
  ('form.file','en','File upload (optional)','text','Form — file: label',42),
  ('form.file','ar','رفع ملف (اختياري)','text','Form — file: label',42),
  ('form.file','tr','Dosya yükleme (isteğe bağlı)','text','Form — file: label',42),
  ('form.fileHint','de','PDF, DOC/DOCX, JPG oder PNG, max. 10 MB','text','Form — file: allowed types',42),
  ('form.fileHint','en','PDF, DOC/DOCX, JPG or PNG, max. 10 MB','text','Form — file: allowed types',42),
  ('form.fileHint','ar','PDF أو DOC/DOCX أو JPG أو PNG، بحد أقصى 10 ميغابايت','text','Form — file: allowed types',42),
  ('form.fileHint','tr','PDF, DOC/DOCX, JPG veya PNG, en fazla 10 MB','text','Form — file: allowed types',42),
  ('form.fileChoose','de','Datei auswählen','text','Form — file: button',42),
  ('form.fileChoose','en','Choose file','text','Form — file: button',42),
  ('form.fileChoose','ar','اختر ملفاً','text','Form — file: button',42),
  ('form.fileChoose','tr','Dosya seçin','text','Form — file: button',42),
  ('form.fileRemove','de','Entfernen','text','Form — file: remove',42),
  ('form.fileRemove','en','Remove','text','Form — file: remove',42),
  ('form.fileRemove','ar','إزالة','text','Form — file: remove',42),
  ('form.fileRemove','tr','Kaldır','text','Form — file: remove',42),
  ('form.fileErrType','de','Bitte laden Sie eine PDF-, DOC-, DOCX-, JPG- oder PNG-Datei hoch.','text','Form — file: wrong type',42),
  ('form.fileErrType','en','Please upload a PDF, DOC, DOCX, JPG or PNG file.','text','Form — file: wrong type',42),
  ('form.fileErrType','ar','يرجى رفع ملف PDF أو DOC أو DOCX أو JPG أو PNG.','text','Form — file: wrong type',42),
  ('form.fileErrType','tr','Lütfen PDF, DOC, DOCX, JPG veya PNG dosyası yükleyin.','text','Form — file: wrong type',42),
  ('form.fileErrSize','de','Die Datei darf höchstens 10 MB groß sein.','text','Form — file: too large',42),
  ('form.fileErrSize','en','The file can be at most 10 MB.','text','Form — file: too large',42),
  ('form.fileErrSize','ar','يجب ألا يتجاوز حجم الملف 10 ميغابايت.','text','Form — file: too large',42),
  ('form.fileErrSize','tr','Dosya en fazla 10 MB olabilir.','text','Form — file: too large',42)
) AS v(slot, locale, value, kind, label, sort_order)
ON CONFLICT (section, slot, locale) DO UPDATE SET value = EXCLUDED.value;

COMMIT;
