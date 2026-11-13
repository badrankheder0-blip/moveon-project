/**
 * The public pages' editable copy.
 *
 * Transcribed from the M.io Figma file, one `section` per page. The English
 * column is the designer's own wording; the other three are translations of
 * it, because the file supplies only one language for these pages.
 *
 * Only the two pages the website prototype has no counterpart for are left
 * here — the cookie policy and the price list. Every other page was rebuilt
 * from the prototype and its rows live in pages-content.ts.
 *
 * Numbered slots (`included.1.title`, `included.2.title`, …) are read by
 * `readList` in the block library, which stops at the first gap — so an editor
 * removes an item by clearing its row, and adds one by filling the next.
 */

export interface ContentSeed {
  section: string;
  slot: string;
  /**
   * "image" holds a picture's path or https URL, "video" a clip's; both are
   * the same in every locale.
   */
  kind: "text" | "textarea" | "image" | "video";
  label: string;
  sortOrder: number;
  values: { de: string; en: string; ar: string; tr: string };
}

/** Shorthand: most rows differ only in their four strings. */
function row(
  section: string,
  slot: string,
  label: string,
  sortOrder: number,
  values: ContentSeed["values"],
  kind: ContentSeed["kind"] = "text",
): ContentSeed {
  return { section, slot, kind, label, sortOrder, values };
}

const L = "page-legal-cookie";

export const PAGE_CONTENT: ContentSeed[] = [

  // ══ Cookie policy ══════════════════════════════════════════════════
  // The `page-legal-cookie` frame draws the legal-document shell with the
  // terms inside it, but the terms already live at /agb under `page-terms`,
  // and two reachable pages stating different cancellation windows is a real
  // hazard. This section therefore carries the document the /cookies route
  // actually promises — the one the footer names and the site was missing.
  //
  // Sentence case throughout: the eyebrow and the card labels are shouted by
  // the components, so storing them shouted as well would lock an editor out
  // of ever producing anything else.
  row(L, "doc.eyebrow", "Rail — eyebrow", 1, {
    de: "Rechtliche Dokumente",
    en: "Legal documents",
    ar: "المستندات القانونية",
    tr: "Yasal belgeler",
  }),
  row(L, "nav.1.label", "Rail — document 1 label", 2, {
    de: "1. Allgemeine Geschäftsbedingungen",
    en: "1. Terms of Service",
    ar: "1. شروط الخدمة",
    tr: "1. Hizmet Şartları",
  }),
  row(L, "nav.1.href", "Rail — document 1 route", 3, {
    de: "/agb",
    en: "/agb",
    ar: "/agb",
    tr: "/agb",
  }),
  row(L, "nav.2.label", "Rail — document 2 label", 4, {
    de: "2. Datenschutzerklärung",
    en: "2. Privacy Policy",
    ar: "2. سياسة الخصوصية",
    tr: "2. Gizlilik Politikası",
  }),
  row(L, "nav.2.href", "Rail — document 2 route", 5, {
    de: "/datenschutz",
    en: "/datenschutz",
    ar: "/datenschutz",
    tr: "/datenschutz",
  }),
  row(L, "nav.3.label", "Rail — document 3 label", 6, {
    de: "3. Impressum",
    en: "3. Imprint / Impressum",
    ar: "3. بيانات الناشر / Impressum",
    tr: "3. Künye / Impressum",
  }),
  row(L, "nav.3.href", "Rail — document 3 route", 7, {
    de: "/impressum",
    en: "/impressum",
    ar: "/impressum",
    tr: "/impressum",
  }),
  row(L, "nav.4.label", "Rail — document 4 label", 8, {
    de: "4. Cookie-Richtlinie",
    en: "4. Cookie Policy",
    ar: "4. سياسة ملفات تعريف الارتباط",
    tr: "4. Çerez Politikası",
  }),
  row(L, "nav.4.href", "Rail — document 4 route", 9, {
    de: "/cookies",
    en: "/cookies",
    ar: "/cookies",
    tr: "/cookies",
  }),

  row(L, "doc.title", "Document — title", 10, {
    de: "Cookie-Richtlinie",
    en: "Cookie Policy",
    ar: "سياسة ملفات تعريف الارتباط",
    tr: "Çerez Politikası",
  }),
  row(L, "doc.meta", "Document — last updated", 11, {
    de: "Zuletzt aktualisiert: 1. Januar 2026",
    en: "Last updated: January 1, 2026",
    ar: "آخر تحديث: 1 يناير 2026",
    tr: "Son güncelleme: 1 Ocak 2026",
  }),

  row(L, "clause.1.title", "Clause 1 — title", 12, {
    de: "1. Was Cookies sind und warum wir sie einsetzen",
    en: "1. What Cookies Are & Why We Use Them",
    ar: "1. ما هي ملفات تعريف الارتباط ولماذا نستخدمها",
    tr: "1. Çerez Nedir ve Neden Kullanıyoruz",
  }),
  row(
    L,
    "clause.1.body",
    "Clause 1 — body",
    13,
    {
      de: "Cookies sind kleine Textdateien, die eine Website auf Ihrem Gerät speichert, um Ihren Browser bei einem späteren Besuch wiederzuerkennen. m.on nutzt sie, damit Angebots- und Buchungsstrecke funktionieren, um Ihre Sprachauswahl zu merken und um nachzuvollziehen, wie die Website genutzt wird, damit wir sie verbessern können.",
      en: "Cookies are small text files a website stores on your device so it can recognise your browser on a later visit. m.on uses them to keep the quote and booking flow working, to remember the language you chose, and to understand how the site is used so we can improve it.",
      ar: "ملفات تعريف الارتباط ملفات نصّية صغيرة يخزّنها الموقع على جهازك ليتعرّف على متصفّحك عند زيارتك التالية. وتستخدمها m.on لإبقاء مسار التسعير والحجز يعمل، ولتذكّر اللغة التي اخترتها، ولفهم طريقة استخدام الموقع حتى نتمكّن من تحسينه.",
      tr: "Çerezler, bir web sitesinin tarayıcınızı sonraki ziyaretinizde tanıyabilmesi için cihazınıza kaydettiği küçük metin dosyalarıdır. m.on bunları teklif ve rezervasyon akışının çalışması, seçtiğiniz dilin hatırlanması ve siteyi geliştirebilmek için nasıl kullanıldığını anlamamız amacıyla kullanır.",
    },
    "textarea",
  ),
  row(L, "clause.2.title", "Clause 2 — title", 14, {
    de: "2. Die Kategorien, die wir setzen",
    en: "2. The Categories We Set",
    ar: "2. الفئات التي نستخدمها",
    tr: "2. Kullandığımız Çerez Kategorileri",
  }),
  row(
    L,
    "clause.2.body",
    "Clause 2 — body",
    15,
    {
      de: "Notwendige Cookies halten Ihre Sitzung, Ihre Sprache und Ihren Buchungsfortschritt aufrecht; sie lassen sich nicht abschalten. Präferenz-Cookies merken sich Einstellungen wie Ihre gespeicherten Adressen. Analyse-Cookies zeigen uns in zusammengefasster Form, welche Seiten genutzt werden und an welcher Stelle die Angebotsstrecke abgebrochen wird. Marketing-Cookies erlauben uns zu messen, welche Kampagnen Kundinnen und Kunden zu uns bringen. Außer den notwendigen Cookies setzen wir jede Kategorie nur mit Ihrer Einwilligung.",
      en: "Essential cookies keep your session, your language and your booking progress intact; they cannot be switched off. Preference cookies remember choices such as your saved addresses. Analytics cookies tell us, in aggregate, which pages are used and where the quote flow is abandoned. Marketing cookies let us measure which campaigns bring customers to us. Every category except the essential one is set only with your consent.",
      ar: "الملفات الضرورية تحافظ على جلستك ولغتك وتقدّمك في الحجز، ولا يمكن إيقافها. وملفات التفضيلات تتذكّر خياراتك مثل العناوين المحفوظة. أما الملفات التحليلية فتخبرنا بشكل إجمالي بالصفحات الأكثر استخداماً وبالمرحلة التي يُترك عندها مسار التسعير. وملفات التسويق تتيح لنا قياس الحملات التي تجلب العملاء إلينا. ولا نضع أي فئة عدا الضرورية إلا بموافقتك.",
      tr: "Zorunlu çerezler oturumunuzu, dilinizi ve rezervasyon ilerlemenizi korur; kapatılamazlar. Tercih çerezleri kayıtlı adresleriniz gibi seçimlerinizi hatırlar. Analiz çerezleri hangi sayfaların kullanıldığını ve teklif akışının nerede yarıda bırakıldığını toplu olarak gösterir. Pazarlama çerezleri hangi kampanyaların bize müşteri kazandırdığını ölçmemizi sağlar. Zorunlu kategori dışındaki her kategori yalnızca sizin onayınızla yerleştirilir.",
    },
    "textarea",
  ),
  row(L, "clause.3.title", "Clause 3 — title", 16, {
    de: "3. Speicherdauer und Drittanbieter",
    en: "3. Storage Duration & Third Parties",
    ar: "3. مدّة التخزين والأطراف الثالثة",
    tr: "3. Saklama Süresi ve Üçüncü Taraflar",
  }),
  row(
    L,
    "clause.3.body",
    "Clause 3 — body",
    17,
    {
      de: "Sitzungs-Cookies werden gelöscht, sobald Sie Ihren Browser schließen. Dauerhafte Cookies bleiben höchstens zwölf Monate gespeichert; danach fragen wir Ihre Einwilligung erneut ab. Einige Cookies stammen von Dienstleistern, die wir für Karten, Zahlungen und Reichweitenmessung einsetzen; sie verarbeiten Daten in unserem Auftrag auf Grundlage eines Auftragsverarbeitungsvertrags. Die Einzelheiten stehen in der Datenschutzerklärung.",
      en: "Session cookies are deleted when you close your browser. Persistent cookies last twelve months at most, after which we ask for your consent again. Some cookies are set by the service providers we use for maps, payment and traffic measurement; they process data on our behalf under a data processing agreement, and the details are listed in the privacy policy.",
      ar: "تُحذف ملفات الجلسة بمجرّد إغلاق المتصفّح. أما الملفات الدائمة فتبقى اثني عشر شهراً كحدّ أقصى، ثم نطلب موافقتك من جديد. وبعض الملفات تضعها جهات خدمة نستعين بها للخرائط والدفع وقياس الزيارات، وهي تعالج البيانات نيابةً عنّا بموجب عقد لمعالجة البيانات، والتفاصيل مذكورة في سياسة الخصوصية.",
      tr: "Oturum çerezleri tarayıcınızı kapattığınızda silinir. Kalıcı çerezler en fazla on iki ay saklanır; bu sürenin sonunda onayınızı yeniden isteriz. Bazı çerezler harita, ödeme ve trafik ölçümü için çalıştığımız hizmet sağlayıcılar tarafından yerleştirilir; bu sağlayıcılar verileri bir veri işleme sözleşmesi kapsamında bizim adımıza işler ve ayrıntılar gizlilik politikasında listelenmiştir.",
    },
    "textarea",
  ),
  row(L, "clause.4.title", "Clause 4 — title", 18, {
    de: "4. Einwilligung ändern oder widerrufen",
    en: "4. Changing or Withdrawing Your Consent",
    ar: "4. تعديل موافقتك أو سحبها",
    tr: "4. Onayınızı Değiştirme veya Geri Çekme",
  }),
  row(
    L,
    "clause.4.body",
    "Clause 4 — body",
    19,
    {
      de: "Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen; der Widerruf ist genauso einfach wie die Erteilung. Wenn Sie in den Einstellungen Ihres Browsers die Cookies für moveongo.de löschen, werden alle nicht notwendigen Cookies entfernt und wir fragen beim nächsten Besuch erneut. Die meisten Browser können Cookies auch vollständig blockieren — die Angebots- und Buchungsstrecke funktioniert dann allerdings nicht mehr durchgängig.",
      en: "You can withdraw your consent at any time with effect for the future, and withdrawing it is as easy as giving it. Clearing the cookies for moveongo.de in your browser settings removes every non-essential cookie and makes us ask again on your next visit. Most browsers can also block cookies outright, though the quote and booking flow will then no longer work end to end.",
      ar: "يمكنك سحب موافقتك في أي وقت وبأثر مستقبلي، وسحبها سهل تماماً كمنحها. وحذف ملفات تعريف الارتباط الخاصة بـ moveongo.de من إعدادات متصفّحك يزيل كل الملفات غير الضرورية ويجعلنا نسألك مجدداً في زيارتك التالية. كما يمكن لمعظم المتصفّحات حظر هذه الملفات كلياً، غير أنّ مسار التسعير والحجز لن يعمل حينها من أوّله إلى آخره.",
      tr: "Onayınızı ileriye dönük olarak dilediğiniz zaman geri çekebilirsiniz; geri çekmek, onay vermek kadar kolaydır. Tarayıcı ayarlarınızdan moveongo.de adresine ait çerezleri silmeniz zorunlu olmayan tüm çerezleri kaldırır ve bir sonraki ziyaretinizde size yeniden sormamızı sağlar. Çoğu tarayıcı çerezleri tamamen de engelleyebilir; ancak bu durumda teklif ve rezervasyon akışı baştan sona çalışmaz.",
    },
    "textarea",
  ),

  row(L, "card.title", "Contact card — title", 20, {
    de: "Verantwortlicher und Kontakt",
    en: "Controller & Contact",
    ar: "المسؤول عن المعالجة وجهة التواصل",
    tr: "Veri Sorumlusu ve İletişim",
  }),
  row(L, "card.1.label", "Contact card — group 1 label", 21, {
    de: "Verantwortlicher",
    en: "Controller",
    ar: "المسؤول عن المعالجة",
    tr: "Veri sorumlusu",
  }),
  row(
    L,
    "card.1.lines",
    "Contact card — group 1 lines",
    22,
    {
      de: "m.on GmbH\nAmtsgericht München: HRB 123456\nUSt-IdNr.: DE 987654321",
      en: "m.on GmbH\nAmtsgericht München: HRB 123456\nVAT ID: DE 987654321",
      ar: "m.on GmbH\nمحكمة ميونخ الابتدائية: HRB 123456\nالرقم الضريبي: DE 987654321",
      tr: "m.on GmbH\nMünih Yerel Mahkemesi: HRB 123456\nVergi No: DE 987654321",
    },
    "textarea",
  ),
  row(L, "card.2.label", "Contact card — group 2 label", 23, {
    de: "Datenschutzkontakt",
    en: "Data protection contact",
    ar: "جهة التواصل لحماية البيانات",
    tr: "Veri koruma iletişimi",
  }),
  row(
    L,
    "card.2.lines",
    "Contact card — group 2 lines",
    24,
    {
      de: "Adresse: Müllerstraße 14, 80469 München\nE-Mail: legal@moveongo.de\nTel.: +49 (0) 89 555 1234",
      en: "Address: Müllerstraße 14, 80469 München\nEmail: legal@moveongo.de\nTel: +49 (0) 89 555 1234",
      ar: "العنوان: Müllerstraße 14, 80469 München\nالبريد الإلكتروني: legal@moveongo.de\nهاتف: +49 (0) 89 555 1234",
      tr: "Adres: Müllerstraße 14, 80469 München\nE-posta: legal@moveongo.de\nTel: +49 (0) 89 555 1234",
    },
    "textarea",
  ),

  // `[[…]]` marks the run the frame paints brand yellow and underlines: the
  // inline link to the privacy policy. Deliberately not `**…**`, which the
  // block library renders brand red.
  row(L, "consent.title", "Cookie band — title", 30, {
    de: "Cookie-Einwilligung & Datenschutz",
    en: "Cookie Consent & Privacy",
    ar: "الموافقة على ملفات تعريف الارتباط والخصوصية",
    tr: "Çerez Onayı ve Gizlilik",
  }),
  row(
    L,
    "consent.body",
    "Cookie band — body",
    31,
    {
      de: "Wir verwenden notwendige und Analyse-Cookies, um Ihren Buchungsablauf zu optimieren, die Leistung der Website auszuwerten und passende Werbung auszuspielen. Mehr dazu in unserer [[Datenschutzerklärung]].",
      en: "We use essential and analytics cookies to optimize your platform booking flow, analyze website performance, and serve customized advertising. Learn more in our [[Privacy Policy]].",
      ar: "نستخدم ملفات تعريف ارتباط ضرورية وأخرى تحليلية لتحسين مسار الحجز لديك، وقياس أداء الموقع، وعرض إعلانات مخصّصة. اعرف المزيد في [[سياسة الخصوصية]].",
      tr: "Rezervasyon akışınızı iyileştirmek, site performansını analiz etmek ve size uygun reklamlar sunmak için zorunlu ve analiz çerezleri kullanıyoruz. Ayrıntılar [[Gizlilik Politikamızda]].",
    },
    "textarea",
  ),
  // The frame's three consent buttons. They record the decision under
  // `mon.cookie-consent`; nothing non-essential runs until it says so.
  row(L, "consent.reject", "Cookie band — reject button", 32, {
    de: "Nicht notwendige ablehnen",
    en: "Reject Non-Essential",
    ar: "رفض غير الضرورية",
    tr: "Zorunlu Olmayanları Reddet",
  }),
  row(L, "consent.manage", "Cookie band — manage button", 33, {
    de: "Verwalten",
    en: "Manage",
    ar: "إدارة",
    tr: "Yönet",
  }),
  row(L, "consent.accept", "Cookie band — accept button", 34, {
    de: "Alle akzeptieren",
    en: "Accept All",
    ar: "قبول الكل",
    tr: "Tümünü Kabul Et",
  }),

  // ══ Pricing ════════════════════════════════════════════════════════
  row("page-pricing", "hero.eyebrow", "Hero — eyebrow", 1, {
    de: "Keine versteckten Kosten",
    en: "No Hidden Fees",
    ar: "لا رسوم خفية",
    tr: "Gizli Ücret Yok",
  }),
  row("page-pricing", "hero.headline", "Hero — headline", 2, {
    de: "Vollständig transparenter Preisleitfaden",
    en: "Fully Transparent Pricing Guide",
    ar: "دليل أسعار شفّاف بالكامل",
    tr: "Tamamen Şeffaf Fiyat Rehberi",
  }),
  row(
    "page-pricing",
    "hero.subline",
    "Hero — subline",
    3,
    {
      de: "Wir verabscheuen unerwartete Aufschläge. Unser Preismodell listet jeden einzelnen Bestandteil Ihrer Rechnung vorab auf, damit Sie Ihr Angebot auf den Cent genau prüfen können.",
      en: "We despise unexpected surcharges. Our pricing model lists every single component of your bill upfront so you can audit your quotation down to the cent.",
      ar: "نكره الرسوم المفاجئة. يعرض نموذج التسعير لدينا كل بند في فاتورتك مسبقاً، لتتمكّن من مراجعة عرض السعر حتى آخر سنت.",
      tr: "Beklenmedik ek ücretlerden nefret ederiz. Fiyat modelimiz faturanızın her bir kalemini önceden listeler; böylece teklifinizi kuruşuna kadar denetleyebilirsiniz.",
    },
    "textarea",
  ),
  row("page-pricing", "hero.badge", "Hero — guarantee chip", 4, {
    de: "Garantierte Festpreisvereinbarung nach Freigabe",
    en: "Guaranteed Fixed Price Agreement on Approval",
    ar: "اتفاقية سعر ثابت مضمونة عند الموافقة",
    tr: "Onay Sonrası Garantili Sabit Fiyat Anlaşması",
  }),

  row("page-pricing", "factors.headline", "Rate table — headline", 10, {
    de: "Aufschlüsselung der Umzugskosten",
    en: "Relocation Cost Breakdown",
    ar: "تفصيل تكاليف النقل",
    tr: "Taşınma Maliyeti Dökümü",
  }),
  row("page-pricing", "factors.col.factor", "Rate table — column 1", 11, {
    de: "Abrechnungsfaktor",
    en: "Billing Factor",
    ar: "بند الاحتساب",
    tr: "Faturalama Kalemi",
  }),
  row("page-pricing", "factors.col.rate", "Rate table — column 2", 12, {
    de: "Standardsatz",
    en: "Standard Rate",
    ar: "السعر القياسي",
    tr: "Standart Ücret",
  }),
  row("page-pricing", "factors.col.scope", "Rate table — column 3", 13, {
    de: "Erklärung & Umfang",
    en: "Explanation & Scope",
    ar: "الشرح والنطاق",
    tr: "Açıklama ve Kapsam",
  }),

  row("page-pricing", "factors.1.factor", "Rate 1 — factor", 14, {
    de: "Grundservicepauschale",
    en: "Base Service Rate",
    ar: "أجرة الخدمة الأساسية",
    tr: "Temel Hizmet Ücreti",
  }),
  row("page-pricing", "factors.1.rate", "Rate 1 — price", 15, {
    de: "ab 129 €",
    en: "From €129",
    ar: "من 129 €",
    tr: "129 €'dan itibaren",
  }),
  row(
    "page-pricing",
    "factors.1.scope",
    "Rate 1 — scope",
    16,
    {
      de: "Enthält Transporter und Zwei-Mann-Team für bis zu 2 Stunden",
      en: "Includes truck and basic 2-person crew for up to 2 hours",
      ar: "تشمل الشاحنة وفريقاً أساسياً من شخصين لمدة تصل إلى ساعتين",
      tr: "Araç ve 2 kişilik temel ekip dahil, 2 saate kadar",
    },
    "textarea",
  ),
  row("page-pricing", "factors.2.factor", "Rate 2 — factor", 17, {
    de: "Entfernungszuschlag",
    en: "Distance Surcharge",
    ar: "رسوم المسافة",
    tr: "Mesafe Ek Ücreti",
  }),
  row("page-pricing", "factors.2.rate", "Rate 2 — price", 18, {
    de: "1,80 € / km",
    en: "€1.80 / km",
    ar: "1.80 € / كم",
    tr: "1,80 € / km",
  }),
  row(
    "page-pricing",
    "factors.2.scope",
    "Rate 2 — scope",
    19,
    {
      de: "Wird erst ab einer Fahrstrecke von über 20 Kilometern berechnet",
      en: "Evaluated only for road distances exceeding 20 kilometers",
      ar: "يُحتسب فقط للمسافات البرّية التي تتجاوز 20 كيلومتراً",
      tr: "Yalnızca 20 kilometreyi aşan karayolu mesafelerinde hesaplanır",
    },
    "textarea",
  ),
  row("page-pricing", "factors.3.factor", "Rate 3 — factor", 20, {
    de: "Etagenzuschlag",
    en: "Stairwell / Floor Premium",
    ar: "رسوم الطوابق والدرج",
    tr: "Merdiven / Kat Ek Ücreti",
  }),
  row("page-pricing", "factors.3.rate", "Rate 3 — price", 21, {
    de: "15 € / Etage",
    en: "€15 / floor",
    ar: "15 € / طابق",
    tr: "15 € / kat",
  }),
  row(
    "page-pricing",
    "factors.3.scope",
    "Rate 3 — scope",
    22,
    {
      de: "Gilt ab dem 3. Obergeschoss, wenn kein nutzbarer Aufzug vorhanden ist",
      en: "Applies to 3rd floor or higher if no active elevator exists",
      ar: "يُطبَّق من الطابق الثالث فما فوق إذا لم يتوفّر مصعد عامل",
      tr: "Çalışır bir asansör yoksa 3. kat ve üzeri için geçerlidir",
    },
    "textarea",
  ),
  row("page-pricing", "factors.4.factor", "Rate 4 — factor", 23, {
    de: "Aufzugsrabatt",
    en: "Elevator Surcharge Discount",
    ar: "خصم توفّر المصعد",
    tr: "Asansör İndirimi",
  }),
  row("page-pricing", "factors.4.rate", "Rate 4 — price", 24, {
    de: "−25 € gesamt",
    en: "-€25 total",
    ar: "−25 € إجمالاً",
    tr: "Toplam −25 €",
  }),
  row(
    "page-pricing",
    "factors.4.scope",
    "Rate 4 — scope",
    25,
    {
      de: "Eine Gutschrift, wenn ein funktionsfähiger Lastenaufzug verfügbar ist",
      en: "A credit applied back if functional service lift is available",
      ar: "رصيد يُعاد إليك إذا توفّر مصعد خدمة صالح للاستخدام",
      tr: "Çalışır bir yük asansörü varsa geri yansıtılan bir alacak",
    },
    "textarea",
  ),
  row("page-pricing", "factors.5.factor", "Rate 5 — factor", 26, {
    de: "Wochenendzuschlag",
    en: "Weekend Premium",
    ar: "رسوم عطلة نهاية الأسبوع",
    tr: "Hafta Sonu Ek Ücreti",
  }),
  row("page-pricing", "factors.5.rate", "Rate 5 — price", 27, {
    de: "+15 % Aufschlag",
    en: "+15% markup",
    ar: "زيادة 15 %",
    tr: "+%15 ek",
  }),
  row(
    "page-pricing",
    "factors.5.scope",
    "Rate 5 — scope",
    28,
    {
      de: "Gilt für Samstagstermine und bundesweite Feiertage",
      en: "Applicable on Saturday bookings and public national holiday slots",
      ar: "تنطبق على حجوزات السبت ومواعيد العطل الرسمية",
      tr: "Cumartesi rezervasyonları ve resmî tatil günleri için geçerlidir",
    },
    "textarea",
  ),
  row("page-pricing", "factors.6.factor", "Rate 6 — factor", 29, {
    de: "Mindestvolumen",
    en: "Minimum Total Volume",
    ar: "الحد الأدنى للحجم الإجمالي",
    tr: "Asgari Toplam Hacim",
  }),
  row("page-pricing", "factors.6.rate", "Rate 6 — price", 30, {
    de: "mindestens 10 m³",
    en: "10 m³ minimum",
    ar: "10 م³ كحدّ أدنى",
    tr: "En az 10 m³",
  }),
  row(
    "page-pricing",
    "factors.6.scope",
    "Rate 6 — scope",
    31,
    {
      de: "Standard-Einstiegswert für die Tourenplanung unseres Dispositionssystems",
      en: "Standard entry baseline for our dispatch system routing",
      ar: "الحدّ الأساسي المعتمد في تخطيط الجولات بنظام التوزيع لدينا",
      tr: "Sevkiyat sistemimizin rota planlaması için standart başlangıç değeri",
    },
    "textarea",
  ),

  row("page-pricing", "estimate.eyebrow", "Estimate — eyebrow", 40, {
    de: "Sofort-Testrechner",
    en: "Instant Sandbox",
    ar: "مختبر فوري",
    tr: "Anında Deneme",
  }),
  row("page-pricing", "estimate.headline", "Estimate — headline", 41, {
    de: "Testen Sie unseren Kostenrechner",
    en: "Try Our Cost Estimation Sandbox",
    ar: "جرّب مختبر تقدير التكاليف لدينا",
    tr: "Maliyet Tahmin Aracımızı Deneyin",
  }),
  row(
    "page-pricing",
    "estimate.subline",
    "Estimate — subline",
    42,
    {
      de: "Geben Sie unten Beispielangaben ein, um Ihre möglichen Umzugskosten zu modellieren. Eine originalgetreue Simulation unseres digitalen Vertragsassistenten.",
      en: "Enter sample criteria below to model your potential moving costs. A perfect simulation of our live digital contract builder.",
      ar: "أدخل بيانات تجريبية أدناه لتقدير تكاليف انتقالك المحتملة. محاكاة دقيقة لمُنشئ العقود الرقمي المباشر لدينا.",
      tr: "Olası taşınma maliyetinizi modellemek için aşağıya örnek ölçütler girin. Canlı dijital sözleşme oluşturucumuzun birebir simülasyonu.",
    },
    "textarea",
  ),
  row(
    "page-pricing",
    "estimate.fields.1.label",
    "Estimate input 1 — label",
    43,
    {
      de: "Geschätzte Wohnungsgröße",
      en: "Estimated Apartment Size",
      ar: "المساحة التقديرية للشقة",
      tr: "Tahmini Daire Büyüklüğü",
    },
  ),
  row(
    "page-pricing",
    "estimate.fields.1.value",
    "Estimate input 1 — value",
    44,
    {
      de: "2 Zimmer (~60 m²)",
      en: "2 Rooms (~60 m²)",
      ar: "غرفتان (~60 م²)",
      tr: "2 Oda (~60 m²)",
    },
  ),
  row(
    "page-pricing",
    "estimate.fields.2.label",
    "Estimate input 2 — label",
    45,
    {
      de: "Umzugsentfernung (einfach)",
      en: "Moving Distance (One Way)",
      ar: "مسافة النقل (اتجاه واحد)",
      tr: "Taşınma Mesafesi (Tek Yön)",
    },
  ),
  row(
    "page-pricing",
    "estimate.fields.2.value",
    "Estimate input 2 — value",
    46,
    {
      de: "15 Kilometer",
      en: "15 Kilometers",
      ar: "15 كيلومتراً",
      tr: "15 Kilometre",
    },
  ),
  row("page-pricing", "estimate.fields.2.hint", "Estimate input 2 — note", 47, {
    de: "Innerhalb der Grundzone",
    en: "Within base zone",
    ar: "ضمن النطاق الأساسي",
    tr: "Temel bölge içinde",
  }),
  row(
    "page-pricing",
    "estimate.fields.3.label",
    "Estimate input 3 — label",
    48,
    {
      de: "Aufzug vorhanden",
      en: "Elevator Accessibility",
      ar: "توفّر المصعد",
      tr: "Asansör Erişimi",
    },
  ),
  row(
    "page-pricing",
    "estimate.fields.3.value",
    "Estimate input 3 — value",
    49,
    {
      de: "Aufzug auf beiden Seiten",
      en: "Elevator on both sides",
      ar: "مصعد في الطرفين",
      tr: "Her iki tarafta asansör",
    },
  ),
  row("page-pricing", "estimate.panel.title", "Estimate panel — title", 50, {
    de: "Geschätzte Gesamtsumme",
    en: "Estimated Total",
    ar: "الإجمالي التقديري",
    tr: "Tahmini Toplam",
  }),
  row("page-pricing", "estimate.lines.1.label", "Estimate line 1 — label", 51, {
    de: "Grundpreis (inkl. Zwei-Mann-Team & Transporter)",
    en: "Base Rate (incl. 2-person crew & truck)",
    ar: "السعر الأساسي (شامل فريق من شخصين وشاحنة)",
    tr: "Temel Ücret (2 kişilik ekip ve araç dahil)",
  }),
  row("page-pricing", "estimate.lines.1.value", "Estimate line 1 — value", 52, {
    de: "299 €",
    en: "€299",
    ar: "299 €",
    tr: "299 €",
  }),
  row("page-pricing", "estimate.lines.2.label", "Estimate line 2 — label", 53, {
    de: "Entfernung (15 km)",
    en: "Distance (15 km)",
    ar: "المسافة (15 كم)",
    tr: "Mesafe (15 km)",
  }),
  row("page-pricing", "estimate.lines.2.value", "Estimate line 2 — value", 54, {
    de: "0 € (inklusive)",
    en: "€0 (Included)",
    ar: "0 € (مشمولة)",
    tr: "0 € (Dahil)",
  }),
  row("page-pricing", "estimate.lines.3.label", "Estimate line 3 — label", 55, {
    de: "Gutschrift Aufzugszuschlag",
    en: "Elevator Surcharge Credit",
    ar: "رصيد خصم المصعد",
    tr: "Asansör Ek Ücret İndirimi",
  }),
  row("page-pricing", "estimate.lines.3.value", "Estimate line 3 — value", 56, {
    de: "−25 €",
    en: "-€25",
    ar: "−25 €",
    tr: "−25 €",
  }),
  row("page-pricing", "estimate.lines.4.label", "Estimate line 4 — label", 57, {
    de: "Premium-Versicherungsschutz",
    en: "Premium Insurance coverage",
    ar: "تغطية تأمينية مميّزة",
    tr: "Premium Sigorta Teminatı",
  }),
  row("page-pricing", "estimate.lines.4.value", "Estimate line 4 — value", 58, {
    de: "Inklusive",
    en: "Included",
    ar: "مشمولة",
    tr: "Dahil",
  }),
  row("page-pricing", "estimate.total.label", "Estimate total — label", 59, {
    de: "Endgültiger Schätzpreis",
    en: "Final Estimated Price",
    ar: "السعر التقديري النهائي",
    tr: "Nihai Tahmini Fiyat",
  }),
  row("page-pricing", "estimate.total.value", "Estimate total — value", 60, {
    de: "274 €",
    en: "€274",
    ar: "274 €",
    tr: "274 €",
  }),
  row("page-pricing", "estimate.cta", "Estimate — button", 61, {
    de: "Diesen Preis sichern",
    en: "Lock-In This Price",
    ar: "ثبّت هذا السعر",
    tr: "Bu Fiyatı Sabitle",
  }),
];
