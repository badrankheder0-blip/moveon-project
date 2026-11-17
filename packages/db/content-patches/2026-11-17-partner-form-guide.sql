-- Partnerschaften (page-partner), form "Lassen Sie uns sprechen.": the empty
-- space under the intro gets an explanation — "Was gehört in die Datei?" with
-- four numbered points (who you are, what you offer us, how we would work
-- together, references) and a "Nach dem Senden" box (we read it and reply by
-- email, usually within one working day — as form.sentText already says).
-- New rows form.guide.title, form.guide.N.title/.text (N = 1–4),
-- form.after.title, form.after.text; all four languages.
--
-- Undo: DELETE FROM content_blocks WHERE section = 'page-partner'
--   AND slot ~ '^form\.(guide|after)\.';
BEGIN;

INSERT INTO content_blocks (section, slot, locale, value, kind, label, sort_order)
SELECT 'page-partner', v.slot, v.locale, v.value, v.kind, v.label, v.sort_order
FROM (VALUES
  ('form.guide.title','de','Was gehört in die Datei?','text','Form — side: “what goes in the file” title',35),
  ('form.guide.title','en','What goes in the file?','text','Form — side: “what goes in the file” title',35),
  ('form.guide.title','ar','ماذا تضع في الملف؟','text','Form — side: “what goes in the file” title',35),
  ('form.guide.title','tr','Dosyada neler olmalı?','text','Form — side: “what goes in the file” title',35),
  ('form.guide.1.title','de','Wer Sie sind','text','Form — side: point 1 title',35),
  ('form.guide.1.title','en','Who you are','text','Form — side: point 1 title',35),
  ('form.guide.1.title','ar','من أنتم','text','Form — side: point 1 title',35),
  ('form.guide.1.title','tr','Siz kimsiniz','text','Form — side: point 1 title',35),
  ('form.guide.1.text','de','Firmenname, Branche und wo Sie tätig sind.','textarea','Form — side: point 1 text',35),
  ('form.guide.1.text','en','Company name, line of business and where you work.','textarea','Form — side: point 1 text',35),
  ('form.guide.1.text','ar','اسم الشركة، مجال عملها، والمناطق التي تعملون فيها.','textarea','Form — side: point 1 text',35),
  ('form.guide.1.text','tr','Şirket adı, faaliyet alanı ve çalıştığınız bölgeler.','textarea','Form — side: point 1 text',35),
  ('form.guide.2.title','de','Was Sie uns anbieten','text','Form — side: point 2 title',35),
  ('form.guide.2.title','en','What you offer us','text','Form — side: point 2 title',35),
  ('form.guide.2.title','ar','ما تقدّمونه لنا','text','Form — side: point 2 title',35),
  ('form.guide.2.title','tr','Bize ne sunuyorsunuz','text','Form — side: point 2 title',35),
  ('form.guide.2.text','de','Die Leistung, das Produkt oder die Art der Zusammenarbeit, die Sie vorschlagen.','textarea','Form — side: point 2 text',35),
  ('form.guide.2.text','en','The service, product or kind of cooperation you propose.','textarea','Form — side: point 2 text',35),
  ('form.guide.2.text','ar','الخدمة أو المنتج أو نوع التعاون الذي تقترحونه.','textarea','Form — side: point 2 text',35),
  ('form.guide.2.text','tr','Önerdiğiniz hizmet, ürün veya iş birliği türü.','textarea','Form — side: point 2 text',35),
  ('form.guide.3.title','de','Wie wir zusammenarbeiten','text','Form — side: point 3 title',35),
  ('form.guide.3.title','en','How we’d work together','text','Form — side: point 3 title',35),
  ('form.guide.3.title','ar','شكل التعاون','text','Form — side: point 3 title',35),
  ('form.guide.3.title','tr','İş birliği nasıl olur','text','Form — side: point 3 title',35),
  ('form.guide.3.text','de','Wie Sie sich die Zusammenarbeit vorstellen, mit Preisen oder Konditionen, falls vorhanden.','textarea','Form — side: point 3 text',35),
  ('form.guide.3.text','en','How you see the cooperation, with prices or terms if you have them.','textarea','Form — side: point 3 text',35),
  ('form.guide.3.text','ar','كيف ترون العمل معاً، مع الأسعار أو الشروط إن وُجدت.','textarea','Form — side: point 3 text',35),
  ('form.guide.3.text','tr','Birlikte çalışmayı nasıl düşündüğünüz; varsa fiyatlar veya koşullar.','textarea','Form — side: point 3 text',35),
  ('form.guide.4.title','de','Referenzen','text','Form — side: point 4 title',35),
  ('form.guide.4.title','en','References','text','Form — side: point 4 title',35),
  ('form.guide.4.title','ar','أعمال سابقة','text','Form — side: point 4 title',35),
  ('form.guide.4.title','tr','Referanslar','text','Form — side: point 4 title',35),
  ('form.guide.4.text','de','Bisherige Projekte, Partner oder Bilder, die Ihr Unternehmen zeigen.','textarea','Form — side: point 4 text',35),
  ('form.guide.4.text','en','Past projects, partners or pictures that show your company.','textarea','Form — side: point 4 text',35),
  ('form.guide.4.text','ar','مشاريع أو شركاء أو صور تعرّف بشركتكم.','textarea','Form — side: point 4 text',35),
  ('form.guide.4.text','tr','Şirketinizi tanıtan önceki projeler, iş ortakları veya görseller.','textarea','Form — side: point 4 text',35),
  ('form.after.title','de','Nach dem Senden','text','Form — side: “after sending” title',35),
  ('form.after.title','en','After you send it','text','Form — side: “after sending” title',35),
  ('form.after.title','ar','بعد الإرسال','text','Form — side: “after sending” title',35),
  ('form.after.title','tr','Gönderdikten sonra','text','Form — side: “after sending” title',35),
  ('form.after.text','de','Wir lesen Ihre Anfrage und die Datei genau und antworten per E-Mail, meist innerhalb eines Werktags.','textarea','Form — side: “after sending” text',35),
  ('form.after.text','en','We read your request and the file carefully and reply by email, usually within one working day.','textarea','Form — side: “after sending” text',35),
  ('form.after.text','ar','نقرأ طلبك والملف بعناية، ونردّ عليك عبر البريد الإلكتروني، عادةً خلال يوم عمل واحد.','textarea','Form — side: “after sending” text',35),
  ('form.after.text','tr','Talebinizi ve dosyanızı dikkatle inceler, genellikle bir iş günü içinde e-postayla yanıt veririz.','textarea','Form — side: “after sending” text',35)
) AS v(slot, locale, value, kind, label, sort_order)
ON CONFLICT (section, slot, locale) DO UPDATE SET value = EXCLUDED.value, label = EXCLUDED.label;

COMMIT;
