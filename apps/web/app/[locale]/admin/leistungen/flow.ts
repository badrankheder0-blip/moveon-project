import type { Locale } from "@/lib/i18n/config";

/**
 * The booking planner's steps for each built-in service, and the answers each
 * step asks for — what the Services screen's flow editor lists.
 *
 * Read off the planner itself (lib/booking/plan.ts `flow()` and the step
 * components): the common steps (services, account, photos, review, payment)
 * belong to the Booking site screen, so a service shows only its own. The
 * wording is the planner's catalogue copy (`plan.step.*`, `plan.copy.*`), so
 * the preview's placeholders read exactly as the site does today.
 *
 * Step ids are the planner's `StepId`s and field ids are stable names the
 * planner can look up in `FlowStep.required`. A `locked` answer is one the
 * planner cannot do without (a price input, or a control that always has a
 * value), so the office cannot make it optional.
 */

export type L4 = Record<Locale, string>;

export type BuiltinServiceKey = "moving" | "renovation" | "cleaning" | "disposal";

export type MockType =
  | "text"
  | "textarea"
  | "number"
  | "area"
  | "select"
  | "multi"
  | "yesno"
  | "counter"
  | "date"
  | "list"
  | "address"
  | "photos";

export interface BuiltinField {
  id: string;
  type: MockType;
  label: L4;
  /** The planner's own rule. */
  required: boolean;
  locked?: boolean;
  unit?: string;
  /** Chips for a multi-choice; the first shows in a select's mock. */
  options?: L4[];
  placeholder?: L4;
  group?: L4;
}

export interface BuiltinStep {
  id: string;
  name: L4;
  title: L4;
  hint: L4;
  fields: BuiltinField[];
}

const l = (de: string, en: string, tr: string, ar: string): L4 => ({ de, en, tr, ar });

const NAME = {
  address: l("Adresse", "Address", "Adres", "العنوان"),
  property: l("Zugang", "Property", "Mülk", "الوصول إلى العقار"),
  home: l("Dein Zuhause", "Your home", "Eviniz", "منزلك"),
  extras: l("Team & Extras", "Crew & extras", "Ekip ve ekstralar", "الفريق والإضافات"),
  renovation: l("Renovierung", "Renovation", "Tadilat", "الترميم"),
  cleaning: l("Reinigung", "Cleaning", "Temizlik", "التنظيف"),
  disposal: l("Entrümpelung", "Junk removal", "Eşya tahliyesi", "إزالة المخلّفات"),
  schedule: l("Termin", "Schedule", "Takvim", "الموعد"),
  visit: l("Besichtigung", "Site visit", "Yerinde inceleme", "الزيارة الميدانية"),
};

const COPY = {
  address: [
    l("Wohin soll es gehen?", "Where are we taking you?", "Sizi nereye taşıyoruz?", "إلى أين ننقلك؟"),
    l(
      "Wähle deine Adressen. Wir zeigen sie auf der Karte; die Fahrstrecke berechnen wir mit dem Preis.",
      "Choose your locations. We map them and work out the driving distance with your price.",
      "Adreslerinizi seçin. Haritada gösteriyor, sürüş mesafesini fiyatla birlikte hesaplıyoruz.",
      "اختر عناوينك. سنعرضها على الخريطة ونحسب مسافة القيادة مع السعر.",
    ),
  ],
  addressAlt: [
    l("Wo können wir helfen?", "Where can we help you?", "Size nerede yardımcı olabiliriz?", "أين يمكننا مساعدتك؟"),
    l(
      "Wähle die Adressen, an denen du unsere Leistungen brauchst.",
      "Choose the places where you need our services.",
      "Hizmetlerimize ihtiyaç duyduğunuz yerleri seçin.",
      "اختر الأماكن التي تحتاج فيها خدماتنا.",
    ),
  ],
  property: [
    l("Wie kommen wir zu dir?", "How can we access your places?", "Mekânlarınıza nasıl ulaşırız?", "كيف نصل إلى أماكنك؟"),
    l(
      "Ein paar kurze Angaben, damit das richtige Team ohne Überraschungen kommt.",
      "A few quick details help us bring the right team, without surprises.",
      "Birkaç kısa bilgi, doğru ekibi sürprizsiz getirmemizi sağlar.",
      "بعض التفاصيل السريعة تساعدنا على إحضار الفريق المناسب دون مفاجآت.",
    ),
  ],
  home: [
    l("Dein Zuhause, Raum für Raum.", "Your home, mapped out.", "Eviniz, oda oda.", "منزلك، غرفة بغرفة."),
    l(
      "Lege deine Räume an, fülle sie mit dem, was du besitzt, und sag uns, wo wir mit anpacken.",
      "Add your spaces, fill them with what you own, and tell us what needs a helping hand.",
      "Odalarınızı ekleyin, eşyalarınızla doldurun ve neyin yardıma ihtiyacı olduğunu söyleyin.",
      "أضف غرفك، واملأها بما تملك، وأخبرنا بما يحتاج إلى مساعدة.",
    ),
  ],
  extras: [
    l("Die richtigen Hände für den Job.", "The right hands for the job.", "İş için doğru eller.", "الأيدي المناسبة للمهمة."),
    l(
      "Wähle dein Umzugsteam und die Extras, die deine Sachen brauchen.",
      "Choose your moving team and the extra care your belongings need.",
      "Taşıma ekibinizi ve eşyalarınızın ihtiyaç duyduğu ekstra özeni seçin.",
      "اختر فريق النقل والعناية الإضافية التي تحتاجها أغراضك.",
    ),
  ],
  renovation: [
    l("Erzähl uns von der Arbeit.", "Tell us the work.", "İşi bize anlatın.", "أخبرنا عن العمل."),
    l(
      "Wähle die Arbeiten und die ungefähre Fläche. Wir schauen sie uns vor Ort an.",
      "Choose the work and its approximate area. We’ll assess it on site.",
      "İşi ve yaklaşık alanını seçin. Yerinde değerlendireceğiz.",
      "اختر الأعمال ومساحتها التقريبية. سنقيّمها في الموقع.",
    ),
  ],
  cleaning: [
    l("Ein frischer Raum. Ganz nach dir.", "A fresh space. On your terms.", "Ferah bir alan. Sizin koşullarınızda.", "مساحة نظيفة. على طريقتك."),
    l(
      "Sag uns, was gereinigt werden soll. Um die Details kümmern wir uns.",
      "Tell us what needs cleaning. We’ll take care of the details.",
      "Neyin temizlenmesi gerektiğini söyleyin. Ayrıntıları biz hallederiz.",
      "أخبرنا بما يحتاج إلى تنظيف. سنهتم بالتفاصيل.",
    ),
  ],
  disposal: [
    l("Weniger Kram. Mehr Platz.", "A little less clutter. A little more space.", "Biraz daha az dağınıklık. Biraz daha fazla alan.", "فوضى أقل. مساحة أكثر."),
    l(
      "Sag uns, was weg soll und wie wir es erreichen.",
      "Tell us what needs to go and how we can reach it.",
      "Neyin gideceğini ve ona nasıl ulaşacağımızı söyleyin.",
      "أخبرنا بما يجب التخلص منه وكيف نصل إليه.",
    ),
  ],
  schedule: [
    l("Lass uns einen Termin finden.", "Let’s make a date of it.", "Bir tarih belirleyelim.", "لنحدّد موعداً."),
    l(
      "Wähle Tag und Ankunftsfenster, die für dich passen.",
      "Choose the day and arrival window that work for you.",
      "Size uygun günü ve varış aralığını seçin.",
      "اختر اليوم ونافذة الوصول المناسبين لك.",
    ),
  ],
  visit: [
    l("Ein Termin für die Besichtigung.", "A time to visit.", "İnceleme için bir zaman.", "موعد للزيارة."),
    l(
      "Wähle einen Wunschtermin für die Besichtigung. Das Team bestätigt ihn.",
      "Choose a preferred assessment date. The team will confirm availability.",
      "Tercih ettiğiniz inceleme tarihini seçin. Ekip uygunluğu onaylayacak.",
      "اختر موعداً مفضلاً للمعاينة. سيؤكد الفريق التوفر.",
    ),
  ],
} as const;

const step = (id: string, name: L4, copy: readonly [L4, L4], fields: BuiltinField[]): BuiltinStep => ({
  id,
  name,
  title: copy[0],
  hint: copy[1],
  fields,
});

// ── Answers ───────────────────────────────────────────────────────────────

const address = {
  from: { id: "address.from", type: "address", required: true, locked: true, label: l("Abholort", "Pickup location", "Alış noktası", "موقع الاستلام") },
  to: { id: "address.to", type: "address", required: true, locked: true, label: l("Lieferort", "Delivery location", "Teslim noktası", "موقع التسليم") },
  service: { id: "address.service", type: "address", required: true, locked: true, label: l("Adresse für den Einsatz", "Service address", "Hizmet adresi", "عنوان الخدمة") },
} satisfies Record<string, BuiltinField>;

function access(group: L4): BuiltinField[] {
  return [
    {
      id: "property.floor",
      type: "select",
      required: true,
      locked: true,
      group,
      label: l("Welches Stockwerk?", "Which floor?", "Hangi kat?", "أي طابق؟"),
      placeholder: l("Stockwerk wählen", "Select a floor", "Kat seçin", "اختر الطابق"),
    },
    { id: "property.lift", type: "yesno", required: true, locked: true, group, label: l("Aufzug vorhanden", "Elevator available", "Asansör var", "يوجد مصعد") },
    {
      id: "property.fit",
      type: "select",
      required: true,
      locked: true,
      group,
      label: l("Was passt in den Aufzug?", "What will fit in the elevator?", "Asansöre ne sığar?", "ما الذي يتسع في المصعد؟"),
      options: [
        l("Alle Möbel", "All furniture", "Tüm mobilyalar", "كل الأثاث"),
        l("Nur kleine Teile", "Small items only", "Yalnızca küçük eşyalar", "القطع الصغيرة فقط"),
        l("Ich bin nicht sicher", "I’m not sure", "Emin değilim", "لست متأكداً"),
      ],
    },
    {
      id: "property.parking",
      type: "select",
      required: true,
      locked: true,
      group,
      label: l("Parken für den LKW", "Truck parking", "Kamyon parkı", "موقف الشاحنة"),
      placeholder: l("Wo kann der LKW parken?", "Where can the truck park?", "Kamyon nereye park edebilir?", "أين يمكن أن تقف الشاحنة؟"),
    },
    { id: "property.notes", type: "textarea", required: false, group, label: l("Hinweise zum Zugang", "Access notes", "Erişim notları", "ملاحظات الوصول") },
  ];
}

const BY_AREA = l("Nach Wohnfläche", "By area", "Alana göre", "حسب المساحة");
const BY_ITEMS = l("Nach Gegenständen", "By items", "Eşyaya göre", "حسب الأغراض");
const WINDOWS_GROUP = l("Fenster & Glas", "Windows & glass", "Pencere ve cam", "النوافذ والزجاج");

function schedule(visit: boolean): BuiltinField[] {
  return [
    {
      id: "schedule.date",
      type: "date",
      required: true,
      locked: true,
      label: visit
        ? l("Renovierung – Besichtigung", "Renovation site visit", "Tadilat yerinde inceleme", "زيارة ميدانية للترميم")
        : l("Datum wählen", "Choose a date", "Tarih seçin", "اختر التاريخ"),
    },
    {
      id: "schedule.window",
      type: "select",
      required: true,
      locked: true,
      label: l("Ankunftsfenster", "Arrival window", "Varış aralığı", "نافذة الوصول"),
      placeholder: l("08:00–10:00", "08:00–10:00", "08:00–10:00", "08:00–10:00"),
    },
    { id: "schedule.notes", type: "textarea", required: false, label: l("Hinweis zum Termin", "Scheduling note", "Randevu notu", "ملاحظة حول الموعد") },
  ];
}

export const SERVICE_STEPS: Record<BuiltinServiceKey, BuiltinStep[]> = {
  moving: [
    step("address", NAME.address, COPY.address, [address.from, address.to]),
    step("property", NAME.property, COPY.property, [
      ...access(l("Abholort · Lieferort", "Pickup location · Delivery location", "Alış noktası · Teslim noktası", "موقع الاستلام · موقع التسليم")),
      {
        id: "moving.method",
        type: "multi",
        required: true,
        locked: true,
        label: l("Wie sollen wir deinen Umzug berechnen?", "How should we calculate your move?", "Taşınmanızı nasıl hesaplayalım?", "كيف نحسب انتقالك؟"),
        options: [BY_ITEMS, BY_AREA],
      },
    ]),
    step("home", NAME.home, COPY.home, [
      { id: "home.area", type: "number", unit: "m²", required: true, locked: true, group: BY_AREA, label: l("Wohnfläche", "Living area", "Yaşam alanı", "المساحة السكنية") },
      {
        id: "home.assembly",
        type: "yesno",
        required: true,
        locked: true,
        group: BY_AREA,
        label: l("Muss etwas ab- oder aufgebaut werden?", "Does anything need dismantling?", "Sökülmesi gereken bir şey var mı?", "هل يحتاج شيء إلى فك أو تركيب؟"),
      },
      { id: "home.items", type: "list", required: true, locked: true, group: BY_ITEMS, label: l("Was ist in diesem Raum?", "What’s in this room?", "Bu odada ne var?", "ماذا يوجد في هذه الغرفة؟") },
      {
        id: "home.acceptExtra",
        type: "yesno",
        required: true,
        locked: true,
        group: BY_ITEMS,
        label: l(
          "Nicht gelistete Gegenstände werden extra berechnet",
          "Accepts the extra charge for unlisted items",
          "Listede olmayan eşyalar için ek ücreti kabul eder",
          "يوافق على رسوم الأغراض غير المذكورة",
        ),
      },
      { id: "home.specials", type: "list", required: false, label: l("Besondere Gegenstände", "Special items", "Özel eşyalar", "أغراض خاصة") },
    ]),
    step("extras", NAME.extras, COPY.extras, [
      { id: "extras.team", type: "counter", required: true, locked: true, label: l("Umzugsteam", "Moving team", "Taşıma ekibi", "فريق النقل") },
      { id: "extras.secondVan", type: "yesno", required: true, locked: true, label: l("Zweiter Transporter", "Second van", "İkinci kamyonet", "شاحنة ثانية") },
      { id: "extras.packing", type: "yesno", required: true, locked: true, label: l("Packservice", "Packing service", "Paketleme hizmeti", "خدمة التغليف") },
      { id: "extras.insurance", type: "yesno", required: true, locked: true, label: l("Transportversicherung", "Transport insurance", "Taşıma sigortası", "تأمين النقل") },
      { id: "extras.parkingZone", type: "yesno", required: true, locked: true, label: l("Halteverbotszone", "No-parking zone", "Park yasağı alanı", "منطقة منع الوقوف") },
      {
        id: "extras.notes",
        type: "textarea",
        required: false,
        label: l("Was sollte das Team noch wissen?", "Anything else the team should know?", "Ekibin bilmesi gereken başka bir şey var mı?", "هل هناك شيء آخر يجب أن يعرفه الفريق؟"),
      },
    ]),
    step("schedule", NAME.schedule, COPY.schedule, schedule(false)),
  ],
  renovation: [
    step("address", NAME.address, COPY.addressAlt, [address.service]),
    step("renovation", NAME.renovation, COPY.renovation, [
      {
        id: "renovation.work",
        type: "multi",
        required: true,
        locked: true,
        label: l("Was sollen wir uns ansehen?", "What would you like us to assess?", "Neyi değerlendirmemizi istersiniz?", "ما الذي تريدنا أن نقيّمه؟"),
        options: [
          l("Malerarbeiten", "Painting", "Boya", "الدهان"),
          l("Parkett & Boden", "Parquet & flooring", "Parke ve zemin", "الباركيه والأرضيات"),
          l("Löcher & Wandreparaturen", "Filling holes & wall repairs", "Delik doldurma ve duvar onarımı", "سدّ الثقوب وإصلاح الجدران"),
        ],
      },
      { id: "renovation.paintingArea", type: "number", unit: "m²", required: true, locked: true, label: l("Fläche zum Streichen", "Painting area", "Boyanacak alan", "مساحة الدهان") },
      { id: "renovation.flooringArea", type: "number", unit: "m²", required: true, locked: true, label: l("Bodenfläche", "Floor area", "Zemin alanı", "مساحة الأرضية") },
      { id: "renovation.repairsArea", type: "number", unit: "m²", required: true, locked: true, label: l("Betroffene Wandfläche", "Wall area to repair", "Onarılacak duvar alanı", "مساحة الجدار المطلوب إصلاحها") },
    ]),
    step("schedule", NAME.visit, COPY.visit, schedule(true)),
  ],
  cleaning: [
    step("address", NAME.address, COPY.addressAlt, [address.service]),
    step("cleaning", NAME.cleaning, COPY.cleaning, [
      {
        id: "cleaning.type",
        type: "multi",
        required: true,
        locked: true,
        label: l("Welche Reinigung brauchst du?", "What kind of clean do you need?", "Ne tür bir temizliğe ihtiyacınız var?", "ما نوع التنظيف الذي تحتاجه؟"),
        options: [l("Umzugsreinigung", "Moving clean", "Taşınma temizliği", "تنظيف الانتقال"), l("Fenster", "Windows", "Pencereler", "النوافذ")],
      },
      { id: "cleaning.area", type: "number", unit: "m²", required: true, locked: true, label: l("Zu reinigende Fläche", "Floor area to clean", "Temizlenecek alan", "مساحة الأرضية المراد تنظيفها") },
      { id: "cleaning.windows.standard", type: "counter", required: true, locked: true, group: WINDOWS_GROUP, label: l("Standardfenster", "Standard window", "Standart pencere", "نافذة عادية") },
      { id: "cleaning.windows.patio", type: "counter", required: true, locked: true, group: WINDOWS_GROUP, label: l("Balkon- / Terrassentür", "Balcony / patio door", "Balkon / teras kapısı", "باب شرفة / تراس") },
      { id: "cleaning.windows.large", type: "counter", required: true, locked: true, group: WINDOWS_GROUP, label: l("Große / bodentiefe Glasfläche", "Large / floor-to-ceiling glass", "Büyük / tavana kadar cam", "زجاج كبير / من الأرض للسقف") },
      { id: "cleaning.windows.roof", type: "counter", required: true, locked: true, group: WINDOWS_GROUP, label: l("Dachfenster", "Roof window / skylight", "Çatı penceresi", "نافذة سقف") },
    ]),
    step("schedule", NAME.schedule, COPY.schedule, schedule(false)),
  ],
  disposal: [
    step("address", NAME.address, COPY.addressAlt, [address.service]),
    step("property", NAME.property, COPY.property, access(l("Abholort für die Entrümpelung", "Collection location", "Toplama noktası", "موقع جمع المخلّفات"))),
    step("disposal", NAME.disposal, COPY.disposal, [
      { id: "disposal.largeFurniture", type: "counter", required: true, locked: true, label: l("Große Möbel", "Large furniture", "Büyük mobilya", "أثاث كبير") },
      { id: "disposal.smallFurniture", type: "counter", required: true, locked: true, label: l("Kleine Möbel", "Small furniture", "Küçük mobilya", "أثاث صغير") },
      { id: "disposal.largeElectronics", type: "counter", required: true, locked: true, label: l("Großgeräte & Elektronik", "Large appliances & electronics", "Büyük cihaz ve elektronik", "أجهزة كبيرة وإلكترونيات") },
      { id: "disposal.smallElectronics", type: "counter", required: true, locked: true, label: l("Kleinelektronik", "Small electronics", "Küçük elektronik", "إلكترونيات صغيرة") },
      { id: "disposal.notes", type: "textarea", required: false, label: l("Sonst noch etwas?", "Anything else?", "Başka bir şey?", "شيء آخر؟") },
    ]),
    step("schedule", NAME.schedule, COPY.schedule, schedule(false)),
  ],
};

export const isBuiltinKey = (key: string): key is BuiltinServiceKey => key in SERVICE_STEPS;

// ── Custom questions ──────────────────────────────────────────────────────

export const QUESTION_TYPES = ["text", "number", "select", "yesno", "counter", "address", "photos", "area"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** What a new question asks until the office rewrites it (the prototype's `f_*`). */
export const QUESTION_DEFAULTS: Record<QuestionType, L4> = {
  text: l("Erzähl uns mehr", "Tell us more", "Bize daha fazlasını anlatın", "أخبرنا أكثر"),
  number: l("Wie viele?", "How many?", "Kaç tane?", "كم العدد؟"),
  select: l("Wähle eine Option", "Choose an option", "Bir seçenek seçin", "اختر خياراً"),
  yesno: l("Brauchst du das?", "Do you need this?", "Buna ihtiyacınız var mı?", "هل تحتاج هذا؟"),
  counter: l("Anzahl", "Quantity", "Adet", "الكمية"),
  address: l("Adresse für den Einsatz", "Service address", "Hizmet adresi", "عنوان الخدمة"),
  photos: l("Fotos vom Bereich", "Photos of the area", "Alanın fotoğrafları", "صور المكان"),
  area: l("Fläche", "Area", "Alan", "المساحة"),
};

export const DEFAULT_OPTIONS: L4[] = [l("Option 1", "Option 1", "Seçenek 1", "خيار 1"), l("Option 2", "Option 2", "Seçenek 2", "خيار 2")];

/** The question type as the mock controls draw it. */
export const mockOf = (type: QuestionType): MockType => type;

// ── Icons (the prototype's 24px stroke paths) ────────────────────────────

export const SERVICE_ICONS = ["box", "truck", "tool", "sparkle", "roller", "trash", "leaf", "key"] as const;
export type ServiceIcon = (typeof SERVICE_ICONS)[number];

export const SVC_ICON: Record<ServiceIcon, string> = {
  truck: "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  roller: "M4 2h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM10 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 16h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z",
  sparkle:
    "M11.02 2.81a1 1 0 0 1 1.96 0l1.05 5.56a2 2 0 0 0 1.6 1.6l5.55 1.05a1 1 0 0 1 0 1.96l-5.55 1.05a2 2 0 0 0-1.6 1.6l-1.05 5.56a1 1 0 0 1-1.96 0l-1.05-5.56a2 2 0 0 0-1.6-1.6l-5.55-1.05a1 1 0 0 1 0-1.96l5.55-1.05a2 2 0 0 0 1.6-1.6zM20 2v4M22 4h-4",
  trash: "M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6",
  box: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  tool: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z",
  leaf: "M11 20A7 7 0 0 1 4 13c0-6 7-10 16-10 0 9-4 17-9 17zM2 22c4-4 7-7 11-10",
  key: "M21 2l-2 2M11.39 11.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zM15.5 7.5l3 3L22 7l-3-3M11.4 11.6 19 4",
};

export const FIELD_ICON: Record<MockType, string> = {
  text: "M4 7V4h16v3M9 20h6M12 4v16",
  textarea: "M4 7V4h16v3M9 20h6M12 4v16",
  number: "M4 9h16M4 15h16M10 3 8 21M16 3l-2 18",
  select: "M4 6h16M4 12h10M4 18h10M16.5 15l2.5 3 2.5-3",
  multi: "M4 6h16M4 12h10M4 18h10M16.5 15l2.5 3 2.5-3",
  yesno: "M8 6h8a6 6 0 0 1 0 12H8A6 6 0 0 1 8 6zM16 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  counter: "M3 6h18v12H3zM6.5 12h4M14 12h4M16 10v4",
  address: "M12 22s8-6 8-12a8 8 0 0 0-16 0c0 6 8 12 8 12zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  photos: "M3 7h3l2-3h8l2 3h3v13H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  area: "M3 3h18v18H3zM3 9h4M3 15h4M9 3v4M15 3v4",
  date: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
};
