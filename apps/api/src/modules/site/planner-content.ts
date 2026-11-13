/**
 * The booking planner's editable copy: section `planner` of `content_blocks`.
 *
 * The dashboard's "Booking site" screen edits these rows: the two cards of
 * the start step, the headline and intro of the steps every customer sees,
 * the add-ons of "Crew & extras" and the vehicle options. They are created on
 * first read with the planner's own wording (its catalogue strings in all four
 * languages), so a database seeded before this screen existed gets them
 * without a seed run, and an office that has never opened the screen sees
 * exactly what the planner shows today.
 *
 * Add-on prices are not here: they are rate-card keys (`transport_insurance`,
 * `pack`, `parking_zone`) that the pricing engine already reads, and the
 * screen drafts them there. The vehicle options' prices are here, because no
 * rate prices a vehicle choice yet.
 */

type Words = { de: string; en: string; ar: string; tr: string };

export interface PlannerSeed {
  slot: string;
  kind: "text" | "textarea" | "image";
  label: string;
  values: Words;
}

const same = (value: string): Words => ({ de: value, en: value, ar: value, tr: value });

/**
 * A headline split over the planner's two lines, as the prototype sets it:
 * at the first full stop when there are two sentences ("Your plan." /
 * "Ready to review."), otherwise at the space nearest the middle ("What can
 * we" / "take care of?"). The planner prints the two halves joined by a space.
 */
export function splitHeadline(text: string): [string, string] {
  const stop = text.search(/[.!?]\s/);
  if (stop > 0 && stop < text.length - 2) return [text.slice(0, stop + 1).trim(), text.slice(stop + 2).trim()];

  const words = text.split(" ");
  if (words.length < 2) return [text, ""];

  let best = 1;
  let bestGap = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const gap = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (gap < bestGap) {
      best = i;
      bestGap = gap;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

function headline(id: string, name: string, title: Words, lead: Words): PlannerSeed[] {
  const one = {} as Words;
  const two = {} as Words;
  for (const locale of ["de", "en", "ar", "tr"] as const) {
    const [first, second] = splitHeadline(title[locale]);
    one[locale] = first;
    two[locale] = second;
  }
  return [
    { slot: `steps.${id}.title1`, kind: "text", label: `Step "${name}" — headline, line 1`, values: one },
    { slot: `steps.${id}.title2`, kind: "text", label: `Step "${name}" — headline, line 2`, values: two },
    { slot: `steps.${id}.lead`, kind: "textarea", label: `Step "${name}" — intro text`, values: lead },
  ];
}

export const PLANNER_CONTENT: PlannerSeed[] = [
  // ── Start step: who is booking? ─────────────────────────────────────
  { slot: "welcome.private.image", kind: "image", label: "Start — private customer card: picture", values: same("/images/planner/private.webp") },
  { slot: "welcome.private.tag", kind: "text", label: "Start — private customer card: small heading", values: { de: "Für dich & dein Zuhause", en: "For you & your home", ar: "لك ولمنزلك", tr: "Sizin ve eviniz için" } },
  { slot: "welcome.private.title", kind: "text", label: "Start — private customer card: title", values: { de: "Privatkunde", en: "Private customer", ar: "عميل خاص", tr: "Bireysel müşteri" } },
  { slot: "welcome.private.desc", kind: "textarea", label: "Start — private customer card: description", values: { de: "Umziehen, auffrischen oder ausmisten. Wir kümmern uns um die Details.", en: "Moving home, freshening up or clearing out. Let’s take care of the details.", ar: "انتقال أو تجديد أو تفريغ. دعنا نهتم بالتفاصيل.", tr: "Taşınma, yenileme veya boşaltma. Ayrıntıları biz halledelim." } },
  { slot: "welcome.private.point1", kind: "text", label: "Start — private customer card: point 1", values: { de: "Ein visuelles Inventar deines Zuhauses", en: "A visual inventory of your home", ar: "جرد مرئي لمنزلك", tr: "Evinizin görsel envanteri" } },
  { slot: "welcome.private.point2", kind: "text", label: "Start — private customer card: point 2", values: { de: "Genau die Hilfe, die du brauchst", en: "Choose exactly the help you need", ar: "اختر المساعدة التي تحتاجها بالضبط", tr: "Tam ihtiyacınız olan yardımı seçin" } },
  { slot: "welcome.private.point3", kind: "text", label: "Start — private customer card: point 3", values: { de: "Ein klarer, aufgeschlüsselter Plan", en: "One clear, itemised plan", ar: "خطة واضحة ومفصّلة", tr: "Tek, net ve ayrıntılı bir plan" } },
  { slot: "welcome.private.cta", kind: "text", label: "Start — private customer card: button", values: { de: "Meine Leistungen planen", en: "Plan my home services", ar: "خطّط لخدمات منزلي", tr: "Ev hizmetlerimi planla" } },
  { slot: "welcome.business.image", kind: "image", label: "Start — business customer card: picture", values: same("/images/planner/business.webp") },
  { slot: "welcome.business.tag", kind: "text", label: "Start — business customer card: small heading", values: { de: "Für dein Unternehmen", en: "For your organisation", ar: "لمؤسستك", tr: "Kuruluşunuz için" } },
  { slot: "welcome.business.title", kind: "text", label: "Start — business customer card: title", values: { de: "Geschäftskunde", en: "Business customer", ar: "عميل تجاري", tr: "Kurumsal müşteri" } },
  { slot: "welcome.business.desc", kind: "textarea", label: "Start — business customer card: description", values: { de: "Büros, Läden und Gewerbeflächen. Wähle deine Leistungen und vereinbare eine Besichtigung.", en: "Offices, shops and commercial spaces. Choose your services and arrange a site visit.", ar: "مكاتب ومتاجر ومساحات تجارية. اختر خدماتك ورتّب زيارة ميدانية.", tr: "Ofisler, mağazalar ve ticari alanlar. Hizmetlerinizi seçin ve yerinde inceleme ayarlayın." } },
  { slot: "welcome.business.point1", kind: "text", label: "Start — business customer card: point 1", values: { de: "Deine Kontodaten, wiederverwendet", en: "Your account details, reused", ar: "بيانات حسابك، تُستخدم من جديد", tr: "Hesap bilgileriniz, yeniden kullanılır" } },
  { slot: "welcome.business.point2", kind: "text", label: "Start — business customer card: point 2", values: { de: "Eine Adresse und eine Besichtigung", en: "One address and a site visit", ar: "عنوان واحد وزيارة ميدانية", tr: "Tek adres ve bir yerinde inceleme" } },
  { slot: "welcome.business.point3", kind: "text", label: "Start — business customer card: point 3", values: { de: "Ein maßgeschneidertes Angebot nach Prüfung", en: "A tailored quote after assessment", ar: "عرض سعر مخصص بعد المعاينة", tr: "İncelemeden sonra size özel teklif" } },
  { slot: "welcome.business.cta", kind: "text", label: "Start — business customer card: button", values: { de: "Geschäftsbesichtigung vereinbaren", en: "Arrange a business visit", ar: "رتّب زيارة للشركة", tr: "Kurumsal inceleme ayarla" } },

  // The four service cards' pictures (image-content.ts seeds the same rows).
  { slot: "services.moving.image", kind: "image", label: "Services — moving card: picture", values: same("/images/planner/service-moving.webp") },
  { slot: "services.renovation.image", kind: "image", label: "Services — renovation card: picture", values: same("/images/planner/service-renovation.webp") },
  { slot: "services.cleaning.image", kind: "image", label: "Services — cleaning card: picture", values: same("/images/planner/service-cleaning.webp") },
  { slot: "services.disposal.image", kind: "image", label: "Services — junk removal card: picture", values: same("/images/planner/service-disposal.webp") },

  // ── The steps every customer sees ───────────────────────────────────
  ...headline(
    "type",
    "Customer type",
    { de: "Ein Neuanfang. Ganz einfach.", en: "A fresh start. Made simple.", ar: "بداية جديدة. بكل بساطة.", tr: "Yeni bir başlangıç. Basitçe." },
    {
      de: "Sag uns, für wen du buchst. Wir bauen den passenden Plan gemeinsam – Schritt für Schritt.",
      en: "Tell us who you’re booking for. We’ll build the right plan together, one small detail at a time.",
      ar: "أخبرنا لمن تحجز. سنبني الخطة المناسبة معاً، خطوة بخطوة.",
      tr: "Kimin için rezervasyon yaptığınızı söyleyin. Doğru planı birlikte, adım adım oluşturalım.",
    },
  ),
  ...headline(
    "services",
    "Services",
    { de: "Wobei dürfen wir helfen?", en: "What can we take care of?", ar: "بماذا يمكننا أن نساعدك؟", tr: "Neyle ilgilenebiliriz?" },
    {
      de: "Wähle die Leistungen, die du brauchst. Wir bringen sie in einem Plan zusammen.",
      en: "Choose the services you need. We’ll bring them together in one plan.",
      ar: "اختر الخدمات التي تحتاجها. سنجمعها في خطة واحدة.",
      tr: "İhtiyacınız olan hizmetleri seçin. Hepsini tek bir planda birleştirelim.",
    },
  ),
  ...headline(
    "account",
    "Business account",
    { de: "Dein Geschäftskonto.", en: "Your business account.", ar: "حسابك التجاري.", tr: "Kurumsal hesabınız." },
    {
      de: "Einmal anmelden. Deine Angaben nutzen wir für die Besichtigung.",
      en: "Sign in once. Your details are reused for the visit.",
      ar: "سجّل الدخول مرة واحدة. سنستخدم بياناتك للزيارة.",
      tr: "Bir kez giriş yapın. Bilgileriniz inceleme için kullanılır.",
    },
  ),
  ...headline(
    "address",
    "Address",
    { de: "Wohin soll es gehen?", en: "Where are we taking you?", ar: "إلى أين ننقلك؟", tr: "Sizi nereye taşıyoruz?" },
    {
      de: "Wähle deine Adressen. Wir zeigen sie auf der Karte; die Fahrstrecke berechnen wir mit dem Preis.",
      en: "Choose your locations. We map them and work out the driving distance with your price.",
      ar: "اختر عناوينك. سنعرضها على الخريطة ونحسب مسافة القيادة مع السعر.",
      tr: "Adreslerinizi seçin. Haritada gösteriyor, sürüş mesafesini fiyatla birlikte hesaplıyoruz.",
    },
  ),
  ...headline(
    "schedule",
    "Schedule",
    { de: "Lass uns einen Termin finden.", en: "Let’s make a date of it.", ar: "لنحدّد موعداً.", tr: "Bir tarih belirleyelim." },
    {
      de: "Wähle Tag und Ankunftsfenster, die für dich passen.",
      en: "Choose the day and arrival window that work for you.",
      ar: "اختر اليوم ونافذة الوصول المناسبين لك.",
      tr: "Size uygun günü ve varış aralığını seçin.",
    },
  ),
  ...headline(
    "photos",
    "Photos",
    { de: "Zeig uns die kleinen Details.", en: "Show us the little details.", ar: "أرنا التفاصيل الصغيرة.", tr: "Bize küçük ayrıntıları gösterin." },
    {
      de: "Optional — Fotos von Räumen, Treppen und engen Stellen helfen uns beim Planen.",
      en: "Optional — photos of rooms, stairs and tight spots help us plan.",
      ar: "اختياري — صور الغرف والسلالم والأماكن الضيقة تساعدنا في التخطيط.",
      tr: "İsteğe bağlı — oda, merdiven ve dar yerlerin fotoğrafları planlamamıza yardımcı olur.",
    },
  ),
  ...headline(
    "review",
    "Review & price",
    { de: "Dein Plan. Bereit zur Prüfung.", en: "Your plan. Ready to review.", ar: "خطتك. جاهزة للمراجعة.", tr: "Planınız. Gözden geçirmeye hazır." },
    {
      de: "Nimm dir einen Moment und prüfe alles, bevor du weitermachst.",
      en: "Take a moment to check everything before continuing.",
      ar: "خذ لحظة لمراجعة كل شيء قبل المتابعة.",
      tr: "Devam etmeden önce her şeyi kontrol etmek için bir dakikanızı ayırın.",
    },
  ),
  ...headline(
    "payment",
    "Contact & payment",
    { de: "Die letzten Angaben.", en: "The last details.", ar: "التفاصيل الأخيرة.", tr: "Son ayrıntılar." },
    {
      de: "Prüfe deine Rechnungsdaten und wähle, wie du bezahlen möchtest.",
      en: "Check your billing details and choose how you’d like to pay.",
      ar: "تحقق من بيانات الفوترة واختر طريقة الدفع.",
      tr: "Fatura bilgilerinizi kontrol edin ve nasıl ödemek istediğinizi seçin.",
    },
  ),

  // ── Crew & extras: the add-ons ──────────────────────────────────────
  { slot: "extras.insurance.name", kind: "text", label: "Extras — transport insurance: name", values: { de: "Transportversicherung", en: "Transport insurance", ar: "تأمين النقل", tr: "Taşıma sigortası" } },
  { slot: "extras.insurance.desc", kind: "text", label: "Extras — transport insurance: description", values: { de: "Zusätzlicher Schutz für deine Sachen während des Umzugs.", en: "Extra cover for your belongings during the move.", ar: "حماية إضافية لأغراضك أثناء النقل.", tr: "Taşınma sırasında eşyalarınız için ek güvence." } },
  { slot: "extras.insurance.shown", kind: "text", label: "Extras — transport insurance: shown (1) or hidden (0)", values: same("1") },
  { slot: "extras.packing.name", kind: "text", label: "Extras — packing service: name", values: { de: "Packservice", en: "Packing service", ar: "خدمة التغليف", tr: "Paketleme hizmeti" } },
  { slot: "extras.packing.desc", kind: "text", label: "Extras — packing service: description", values: { de: "Wir packen und schützen deine Sachen fachgerecht.", en: "We pack and protect your belongings professionally.", ar: "نغلّف أغراضك ونحميها باحترافية.", tr: "Eşyalarınızı profesyonelce paketleyip koruruz." } },
  { slot: "extras.packing.shown", kind: "text", label: "Extras — packing service: shown (1) or hidden (0)", values: same("1") },
  { slot: "extras.parkingZone.name", kind: "text", label: "Extras — no-parking zone: name", values: { de: "Halteverbotszone", en: "No-parking zone", ar: "منطقة منع الوقوف", tr: "Park yasağı alanı" } },
  { slot: "extras.parkingZone.desc", kind: "text", label: "Extras — no-parking zone: description", values: { de: "Wir beantragen und stellen die Halteverbotsschilder für den LKW.", en: "We apply for and set up the no-parking signs for the truck.", ar: "نتقدم بطلب ونضع لافتات منع الوقوف للشاحنة.", tr: "Kamyon için park yasağı tabelalarını başvurup kurarız." } },
  { slot: "extras.parkingZone.shown", kind: "text", label: "Extras — no-parking zone: shown (1) or hidden (0)", values: same("1") },
  { slot: "extras.secondVan.name", kind: "text", label: "Extras — second van: name", values: { de: "Zweiter Transporter", en: "Second van", ar: "شاحنة ثانية", tr: "İkinci kamyonet" } },
  { slot: "extras.secondVan.desc", kind: "text", label: "Extras — second van: description", values: { de: "Für große Umzüge, damit alles in einer Fahrt kommt.", en: "For larger moves, so everything arrives in one trip.", ar: "للانتقالات الكبيرة، ليصل كل شيء في رحلة واحدة.", tr: "Büyük taşınmalarda her şey tek seferde gelsin diye." } },
  { slot: "extras.secondVan.shown", kind: "text", label: "Extras — second van: shown (1) or hidden (0)", values: same("1") },

  // ── Vehicle options ─────────────────────────────────────────────────
  { slot: "vehicles.1.name", kind: "text", label: "Vehicle option 1 — name", values: { de: "Umzugstransporter (7,5 m³)", en: "Moving Van (7.5 m³)", ar: "شاحنة نقل صغيرة (7.5 م³)", tr: "Taşıma kamyoneti (7,5 m³)" } },
  { slot: "vehicles.1.desc", kind: "text", label: "Vehicle option 1 — description", values: { de: "Kleine Wohnungen, bis zu 50 Kartons", en: "Small apartments, up to 50 boxes", ar: "شقق صغيرة، حتى 50 صندوقاً", tr: "Küçük daireler, en fazla 50 koli" } },
  { slot: "vehicles.1.capacity", kind: "text", label: "Vehicle option 1 — capacity in m³", values: same("7.5") },
  { slot: "vehicles.1.price", kind: "text", label: "Vehicle option 1 — price in €", values: same("0") },
  { slot: "vehicles.2.name", kind: "text", label: "Vehicle option 2 — name", values: { de: "Kleiner LKW (19 m³)", en: "Small Truck (19 m³)", ar: "شاحنة صغيرة (19 م³)", tr: "Küçük kamyon (19 m³)" } },
  { slot: "vehicles.2.desc", kind: "text", label: "Vehicle option 2 — description", values: { de: "1–2-Zimmer-Wohnungen, Standardmöbel", en: "1-2 bedroom flats, standard furniture", ar: "شقق بغرفة أو غرفتين، أثاث عادي", tr: "1-2 odalı daireler, standart mobilya" } },
  { slot: "vehicles.2.capacity", kind: "text", label: "Vehicle option 2 — capacity in m³", values: same("19") },
  { slot: "vehicles.2.price", kind: "text", label: "Vehicle option 2 — price in €", values: same("150") },
  { slot: "vehicles.3.name", kind: "text", label: "Vehicle option 3 — name", values: { de: "Großer LKW (36 m³)", en: "Large Truck (36 m³)", ar: "شاحنة كبيرة (36 م³)", tr: "Büyük kamyon (36 m³)" } },
  { slot: "vehicles.3.desc", kind: "text", label: "Vehicle option 3 — description", values: { de: "Große Häuser oder Büros", en: "Large houses or offices", ar: "منازل كبيرة أو مكاتب", tr: "Büyük evler veya ofisler" } },
  { slot: "vehicles.3.capacity", kind: "text", label: "Vehicle option 3 — capacity in m³", values: same("36") },
  { slot: "vehicles.3.price", kind: "text", label: "Vehicle option 3 — price in €", values: same("260") },
];
