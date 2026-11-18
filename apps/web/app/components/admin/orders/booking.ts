import { defineText, type TextFn } from "@/lib/admin/text";

import type { OrderDetail } from "./types";
import { splitName } from "@/lib/name";

/**
 * Every booking answer of an order, laid out as the prototype's booking flow
 * (General, then one section per service, step by step), with what is still
 * missing counted against the required questions.
 *
 * An answer comes from, in order: what the team filled in (`orders.answers`,
 * marked "Added by team"), the order's own columns, and the booking planner's
 * notes — which carry, as German sentences, everything no column holds
 * (rooms and items, parking, access notes, specials, payment wish).
 */

export const BOOKING_TEXT = defineText({
  // Steps
  s_type: { de: "Kundentyp", en: "Customer type", ar: "نوع الزبون", tr: "Müşteri tipi" },
  s_services: { de: "Leistungen", en: "Services", ar: "الخدمات", tr: "Hizmetler" },
  s_company: { de: "Firma", en: "Company", ar: "الشركة", tr: "Firma" },
  s_address: { de: "Adressen", en: "Addresses", ar: "العناوين", tr: "Adresler" },
  s_property: { de: "Objekt & Zugang", en: "Property & access", ar: "العقار والوصول", tr: "Mülk ve erişim" },
  s_volume: { de: "Ihr Zuhause", en: "Your home", ar: "المنزل", tr: "Eviniz" },
  s_office: { de: "Büroinventar", en: "Office inventory", ar: "جرد المكتب", tr: "Ofis envanteri" },
  s_extras: { de: "Team & Extras", en: "Crew & extras", ar: "العمّال والإضافات", tr: "Ekip ve ekstralar" },
  s_painting: { de: "Renovierung", en: "Renovation", ar: "الترميم", tr: "Tadilat" },
  s_cleaning: { de: "Reinigung", en: "Cleaning", ar: "التنظيف", tr: "Temizlik" },
  s_disposal: { de: "Entrümpelung", en: "Junk removal", ar: "إزالة الأغراض", tr: "Eşya tasfiyesi" },
  s_photos: { de: "Fotos", en: "Photos", ar: "الصور", tr: "Fotoğraflar" },
  s_date: { de: "Termine", en: "Schedule", ar: "المواعيد", tr: "Takvim" },
  s_payment: { de: "Kontakt & Zahlung", en: "Contact & payment", ar: "التواصل والدفع", tr: "İletişim ve ödeme" },
  s_more: { de: "Weitere Fragen", en: "More questions", ar: "أسئلة إضافية", tr: "Diğer sorular" },
  g_questions: { de: "Eigene Fragen", en: "Your questions", ar: "أسئلتكم الخاصة", tr: "Özel sorularınız" },

  // Groups
  g_pickup: { de: "Auszug", en: "Pickup", ar: "الاستلام", tr: "Alış" },
  g_delivery: { de: "Einzug", en: "Delivery", ar: "التسليم", tr: "Teslim" },
  g_service: { de: "Einsatzadresse", en: "Service address", ar: "عنوان الخدمة", tr: "Hizmet adresi" },
  g_windows: { de: "Fenster", en: "Windows", ar: "الشبابيك", tr: "Pencereler" },
  g_date_moving: { de: "Umzug", en: "Moving", ar: "النقل", tr: "Taşınma" },
  g_date_renovation: { de: "Besichtigung Renovierung", en: "Renovation site visit", ar: "زيارة الترميم", tr: "Tadilat keşfi" },
  g_date_cleaning: { de: "Reinigung", en: "Cleaning", ar: "التنظيف", tr: "Temizlik" },
  g_date_disposal: { de: "Entrümpelung", en: "Junk removal", ar: "إزالة الأغراض", tr: "Eşya tasfiyesi" },
  g_more: { de: "Weitere Angaben aus der Buchung", en: "More from the booking", ar: "معلومات إضافية من الحجز", tr: "Rezervasyondan diğer bilgiler" },

  // Fields
  f_customerType: { de: "Wer bucht?", en: "Who is booking?", ar: "من يحجز؟", tr: "Kim rezervasyon yapıyor?" },
  o_private: { de: "Privat", en: "Private", ar: "فرد", tr: "Bireysel" },
  o_business: { de: "Geschäftlich", en: "Business", ar: "شركة", tr: "Kurumsal" },
  f_services: { de: "Gewählte Leistungen", en: "Selected services", ar: "الخدمات المختارة", tr: "Seçilen hizmetler" },
  f_company: { de: "Firmenname", en: "Company name", ar: "اسم الشركة", tr: "Firma adı" },
  f_vat: { de: "USt-IdNr.", en: "VAT ID (USt-IdNr.)", ar: "الرقم الضريبي", tr: "KDV numarası (USt-IdNr.)" },
  f_contact: { de: "Ansprechpartner", en: "Contact person", ar: "الشخص المسؤول", tr: "İlgili kişi" },
  f_role: { de: "Position", en: "Role", ar: "المنصب", tr: "Pozisyon" },
  f_size: { de: "Unternehmensgröße", en: "Company size", ar: "حجم الشركة", tr: "Şirket büyüklüğü" },
  f_po: { de: "Bestellnummer", en: "PO number", ar: "رقم أمر الشراء", tr: "Sipariş numarası" },
  f_from: { de: "Auszugsadresse", en: "Pickup address", ar: "عنوان الاستلام", tr: "Alış adresi" },
  f_to: { de: "Einzugsadresse", en: "Delivery address", ar: "عنوان التسليم", tr: "Teslim adresi" },
  f_serviceAddr: { de: "Einsatzadresse", en: "Service address", ar: "عنوان الخدمة", tr: "Hizmet adresi" },
  f_floor: { de: "Welche Etage?", en: "Which floor?", ar: "أي طابق؟", tr: "Hangi kat?" },
  f_lift: { de: "Aufzug vorhanden", en: "Elevator available", ar: "يوجد مصعد", tr: "Asansör var" },
  f_fit: { de: "Was passt in den Aufzug?", en: "What will fit in the elevator?", ar: "ما الذي يتسع في المصعد؟", tr: "Asansöre ne sığar?" },
  o_fit_all: { de: "Alle Möbel", en: "All furniture", ar: "كل الأثاث", tr: "Tüm mobilyalar" },
  o_fit_small: { de: "Nur kleine Teile", en: "Small items only", ar: "القطع الصغيرة فقط", tr: "Sadece küçük eşyalar" },
  o_fit_unsure: { de: "Nicht sicher", en: "Not sure", ar: "غير متأكد", tr: "Emin değil" },
  f_parking: { de: "Parken für den LKW", en: "Truck parking", ar: "موقف الشاحنة", tr: "Kamyon parkı" },
  o_park_driveway: { de: "Einfahrt", en: "Driveway", ar: "مدخل خاص", tr: "Garaj yolu" },
  o_park_streetClose: { de: "Straße – kurzer Weg", en: "On the street — close walk", ar: "في الشارع — مسافة قريبة", tr: "Sokakta — kısa yürüme" },
  o_park_streetMedium: { de: "Straße – mittlerer Weg", en: "On the street — somewhat close walk", ar: "في الشارع — مسافة متوسطة", tr: "Sokakta — orta mesafe" },
  o_park_lotClose: { de: "Parkplatz / Laderampe – kurzer Weg", en: "Parking lot / loading dock — close walk", ar: "موقف / رصيف تحميل — مسافة قريبة", tr: "Otopark / yükleme rampası — kısa yürüme" },
  o_park_lotMedium: { de: "Parkplatz / Laderampe – mittlerer Weg", en: "Parking lot / loading dock — somewhat close walk", ar: "موقف / رصيف تحميل — مسافة متوسطة", tr: "Otopark / yükleme rampası — orta mesafe" },
  o_park_lotFar: { de: "Parkplatz / Laderampe – weiter Weg", en: "Parking lot / loading dock — far walk", ar: "موقف / رصيف تحميل — مسافة بعيدة", tr: "Otopark / yükleme rampası — uzun yürüme" },
  f_accessNotes: { de: "Hinweise zum Zugang", en: "Access notes", ar: "ملاحظات الوصول", tr: "Erişim notları" },
  f_mode: { de: "Wie sollen wir Ihren Umzug berechnen?", en: "How should we calculate your move?", ar: "كيف نحسب النقل؟", tr: "Taşınmanızı nasıl hesaplayalım?" },
  o_items: { de: "Nach Gegenständen", en: "By items", ar: "حسب القطع", tr: "Eşyaya göre" },
  o_area: { de: "Nach Wohnfläche", en: "By area", ar: "حسب المساحة", tr: "Alana göre" },
  f_livingArea: { de: "Wohnfläche", en: "Living area", ar: "مساحة السكن", tr: "Yaşam alanı" },
  f_rooms: { de: "Zimmer", en: "Rooms", ar: "عدد الغرف", tr: "Oda sayısı" },
  f_inventory: { de: "Räume & Gegenstände", en: "Rooms & items", ar: "الغرف والأغراض", tr: "Odalar ve eşyalar" },
  f_areaAssembly: { de: "Brauchen Sie Ab- oder Aufbau?", en: "Do you need any dismantling or assembly?", ar: "هل تحتاج فكاً أو تركيباً؟", tr: "Söküm veya kurulum gerekiyor mu?" },
  f_areaAsm: { de: "Ab- & Aufbau", en: "Dismantling & assembly", ar: "الفك والتركيب", tr: "Söküm ve kurulum" },
  f_specials: { de: "Sondergegenstände (nicht im Preis)", en: "Special items (not in the price)", ar: "أغراض خاصة (غير مشمولة بالسعر)", tr: "Özel eşyalar (fiyata dahil değil)" },
  f_office: { de: "Büroinventar", en: "Office items", ar: "أغراض المكتب", tr: "Ofis eşyaları" },
  f_helpers: { de: "Umzugshelfer", en: "Movers", ar: "عدد العمّال", tr: "Taşıyıcı sayısı" },
  f_packing: { de: "Packservice", en: "Packing service", ar: "خدمة التغليف", tr: "Paketleme hizmeti" },
  f_insurance: { de: "Zusatzversicherung", en: "Additional insurance", ar: "تأمين إضافي", tr: "Ek sigorta" },
  f_vehicle: { de: "Fahrzeug", en: "Vehicle", ar: "السيارة", tr: "Araç" },
  o_van: { de: "Umzugstransporter (7,5 m³)", en: "Moving Van (7.5 m³)", ar: "سيارة نقل (7.5 م³)", tr: "Taşıma minibüsü (7,5 m³)" },
  o_small: { de: "Kleiner LKW (19 m³)", en: "Small Truck (19 m³)", ar: "شاحنة صغيرة (19 م³)", tr: "Küçük kamyon (19 m³)" },
  o_large: { de: "Großer LKW (36 m³)", en: "Large Truck (36 m³)", ar: "شاحنة كبيرة (36 م³)", tr: "Büyük kamyon (36 m³)" },
  f_teamNotes: { de: "Sonst noch etwas für das Team?", en: "Anything else the team should know?", ar: "ملاحظات للفريق", tr: "Ekibin bilmesi gereken başka bir şey?" },
  f_work: { de: "Benötigte Arbeiten", en: "Work needed", ar: "الأعمال المطلوبة", tr: "Gereken işler" },
  o_painting: { de: "Malerarbeiten", en: "Painting", ar: "دهان", tr: "Boya" },
  o_flooring: { de: "Parkett & Boden", en: "Parquet & flooring", ar: "باركيه وأرضيات", tr: "Parke ve zemin" },
  o_repairs: { de: "Löcher & Wandreparaturen", en: "Filling holes & wall repairs", ar: "تصليح الجدران", tr: "Delik dolgusu ve duvar onarımı" },
  f_workArea: { de: "{work} · Fläche", en: "{work} · area", ar: "{work} · المساحة", tr: "{work} · alan" },
  f_notes: { de: "Hinweise", en: "Notes", ar: "ملاحظات", tr: "Notlar" },
  f_cleanType: { de: "Welche Reinigung brauchen Sie?", en: "What kind of clean do you need?", ar: "نوع التنظيف", tr: "Ne tür temizlik gerekiyor?" },
  o_handover: { de: "Umzugsreinigung", en: "Moving clean", ar: "تنظيف الانتقال", tr: "Taşınma temizliği" },
  o_windows: { de: "Nur Fenster", en: "Windows only", ar: "الشبابيك فقط", tr: "Sadece pencereler" },
  f_windowsToo: { de: "Fenster ebenfalls", en: "Windows too", ar: "مع الشبابيك", tr: "Pencereler de" },
  f_cleanArea: { de: "Zu reinigende Fläche", en: "Floor area to clean", ar: "المساحة المراد تنظيفها", tr: "Temizlenecek alan" },
  w_standard: { de: "Standardfenster", en: "Standard window", ar: "شباك عادي", tr: "Standart pencere" },
  w_patio: { de: "Balkon- / Terrassentür", en: "Balcony / patio door", ar: "باب بلكون", tr: "Balkon / teras kapısı" },
  w_large: { de: "Große Glasfläche", en: "Large / floor-to-ceiling glass", ar: "زجاج كبير", tr: "Büyük / boydan cam" },
  w_roof: { de: "Dachfenster", en: "Roof window / skylight", ar: "شباك سقف", tr: "Çatı penceresi" },
  d_largeFurniture: { de: "Große Möbel", en: "Large furniture", ar: "أثاث كبير", tr: "Büyük mobilya" },
  d_smallFurniture: { de: "Kleine Möbel", en: "Small furniture", ar: "أثاث صغير", tr: "Küçük mobilya" },
  d_largeElectronics: { de: "Großgeräte & Elektronik", en: "Large appliances & electronics", ar: "أجهزة كبيرة", tr: "Büyük cihazlar ve elektronik" },
  d_smallElectronics: { de: "Kleinelektronik", en: "Small electronics", ar: "أجهزة صغيرة", tr: "Küçük elektronik" },
  f_photos: { de: "Hochgeladene Fotos", en: "Uploaded photos", ar: "الصور المرفوعة", tr: "Yüklenen fotoğraflar" },
  f_date: { de: "Datum", en: "Date", ar: "التاريخ", tr: "Tarih" },
  f_window: { de: "Ankunftszeit", en: "Arrival window", ar: "وقت الوصول", tr: "Varış aralığı" },
  f_second: { de: "Zweiter Tag", en: "Second day", ar: "اليوم الثاني", tr: "İkinci gün" },
  f_name: { de: "Vollständiger Name", en: "Full name", ar: "الاسم الكامل", tr: "Ad soyad" },
  f_firstName: { de: "Vorname", en: "First name", ar: "الاسم الأول", tr: "Ad" },
  f_lastName: { de: "Nachname", en: "Last name", ar: "الكنية", tr: "Soyad" },
  f_phone: { de: "Telefon", en: "Phone", ar: "الهاتف", tr: "Telefon" },
  f_email: { de: "E-Mail", en: "Email", ar: "البريد الإلكتروني", tr: "E-posta" },
  f_pay: { de: "Zahlungsart", en: "Payment method", ar: "طريقة الدفع", tr: "Ödeme yöntemi" },
  o_card: { de: "Kreditkarte", en: "Credit card", ar: "بطاقة", tr: "Kredi kartı" },
  o_paypal: { de: "PayPal", en: "PayPal", ar: "PayPal", tr: "PayPal" },
  o_bank: { de: "Überweisung", en: "Bank transfer", ar: "تحويل بنكي", tr: "Banka havalesi" },
  o_cash: { de: "Bar bei Abschluss", en: "Cash on completion", ar: "نقداً عند الانتهاء", tr: "İş bitiminde nakit" },
  o_invoice: { de: "Rechnung", en: "Invoice", ar: "فاتورة", tr: "Fatura" },
  f_wish: { de: "Terminwunsch", en: "Preferred date and time", ar: "الموعد المفضّل", tr: "Tercih edilen tarih" },
  f_billTo: { de: "Rechnung an", en: "Invoice to", ar: "الفاتورة باسم", tr: "Fatura alıcısı" },
  f_otherNotes: { de: "Hinweise aus der Buchung", en: "Notes from the booking", ar: "ملاحظات من الحجز", tr: "Rezervasyon notları" },

  // Floors
  fl_m1: { de: "Keller", en: "Basement", ar: "القبو", tr: "Bodrum" },
  fl_0: { de: "Erdgeschoss", en: "Ground floor", ar: "الطابق الأرضي", tr: "Zemin kat" },
  fl_n: { de: "{n}. OG", en: "{n} floor", ar: "الطابق {n}", tr: "{n}. kat" },
  fl_10: { de: "10. OG oder höher", en: "10th floor or higher", ar: "الطابق 10 أو أعلى", tr: "10. kat veya üstü" },

  // List items
  prep_ready: { de: "transportbereit", en: "ready to move", ar: "جاهز للنقل", tr: "taşımaya hazır" },
  prep_dis: { de: "Abbau durch Team", en: "dismantled by the team", ar: "يفكّه الفريق", tr: "ekip söker" },
  prep_re: { de: "Aufbau durch Team", en: "assembled by the team", ar: "يركّبه الفريق", tr: "ekip kurar" },
  prep_both: { de: "Ab- und Aufbau durch Team", en: "dismantled and assembled by the team", ar: "يفكّه ويركّبه الفريق", tr: "ekip söker ve kurar" },
  prep_unanswered: { de: "Vorbereitung offen", en: "preparation not answered", ar: "التحضير غير محدد", tr: "hazırlık belirtilmedi" },
  customItem: { de: "eigener Eintrag, nicht im Preis", en: "own entry, not in the price", ar: "إدخال خاص، غير مشمول بالسعر", tr: "özel giriş, fiyata dahil değil" },
  sp_piano: { de: "Klavier / Flügel", en: "Piano", ar: "بيانو", tr: "Piyano" },
  sp_safe: { de: "Tresor", en: "Safe", ar: "خزنة", tr: "Kasa" },
  sp_aquarium: { de: "Aquarium / Terrarium", en: "Aquarium / terrarium", ar: "حوض أسماك", tr: "Akvaryum / teraryum" },
  sp_gym: { de: "Fitnessgerät", en: "Gym equipment", ar: "جهاز رياضي", tr: "Spor aleti" },
  sp_heavy: { de: "Sehr schwerer Gegenstand (>100 kg)", en: "Very heavy item (>100 kg)", ar: "غرض ثقيل جداً (>100 كغ)", tr: "Çok ağır eşya (>100 kg)" },
  sp_artwork: { de: "Kunstwerk / Spiegel", en: "Artwork / mirror", ar: "عمل فني / مرآة", tr: "Sanat eseri / ayna" },
  photosChosen: { de: "{n} Fotos im Planer ausgewählt", en: "{n} photos chosen in the planner", ar: "{n} صور اختيرت في المخطّط", tr: "Planlayıcıda {n} fotoğraf seçildi" },
  photosAsk: { de: "Nicht hochgeladen – bitte beim Kunden anfordern", en: "Not uploaded — ask the customer to send them", ar: "لم تُرفع — اطلبها من الزبون", tr: "Yüklenmedi — müşteriden isteyin" },
  itemsWord: { de: "Gegenstände", en: "Items", ar: "الأغراض", tr: "Eşyalar" },
});

type Tx = TextFn<typeof BOOKING_TEXT>;

// ── The planner's notes ────────────────────────────────────────────────────

export interface Access {
  floor: string | null;
  lift: "yes" | "no" | null;
  fit: string | null;
  parking: string | null;
  notes: string | null;
}

export interface ListItem {
  label: string;
  sub: string;
}

export interface ParsedNotes {
  planner: boolean;
  access: { from?: Access; to?: Access; service?: Access };
  rooms: { name: string; items: { name: string; count: number; prep: string | null; custom: boolean; notes: string }[] }[];
  areaAssembly: { name: string; count: number; prep: string | null }[];
  specials: { kind: string; count: number; notes: string }[];
  teamNotes: string | null;
  photos: number;
  wish: string | null;
  pay: string | null;
  billTo: string | null;
  moveClean: boolean;
  windows: Record<string, number>;
  other: string[];
}

const PARKING_DE: Record<string, string> = {
  Einfahrt: "driveway",
  "Straße, kurzer Weg": "streetClose",
  "Straße, mittlerer Weg": "streetMedium",
  "Parkplatz/Laderampe, kurzer Weg": "lotClose",
  "Parkplatz/Laderampe, mittlerer Weg": "lotMedium",
  "Parkplatz/Laderampe, weiter Weg": "lotFar",
};
const PREP_DE: Record<string, string> = {
  transportbereit: "ready",
  "Abbau durch Team": "dis",
  "Aufbau durch Team": "re",
  "Ab- und Aufbau durch Team": "both",
  "Vorbereitung offen": "unanswered",
};
const SPECIAL_DE: Record<string, string> = {
  "Klavier/Flügel": "piano",
  Tresor: "safe",
  "Aquarium/Terrarium": "aquarium",
  Fitnessgerät: "gym",
  "sehr schwerer Gegenstand (>100 kg)": "heavy",
  "Kunstwerk/Spiegel": "artwork",
};
const WINDOWS_DE: Record<string, string> = {
  Standardfenster: "standard",
  "Balkon-/Terrassentür": "patio",
  "große Glasfläche": "large",
  Dachfenster: "roof",
};
const PAY_DE: Record<string, string> = {
  Überweisung: "bank",
  Karte: "card",
  PayPal: "paypal",
  "bar bei Abschluss": "cash",
};

function parseAccess(parts: string): Access {
  const floorPart = parts.split(", ")[0] ?? "";
  const floor =
    floorPart === "Keller" ? "-1" : floorPart === "Erdgeschoss" ? "0" : floorPart.startsWith("10. OG") ? "10" : /^(\d)\. OG$/.test(floorPart) ? floorPart.charAt(0) : null;
  const fit = parts.includes("alle Möbel passen") ? "all" : parts.includes("nur kleine Teile") ? "small" : parts.includes("Aufzuggröße unklar") ? "unsure" : null;
  const parking = parts.match(/Parken: (.*?)(?=, Hinweis: |$)/)?.[1] ?? null;
  return {
    floor,
    lift: parts.includes("kein Aufzug") ? "no" : /(^|, )Aufzug/.test(parts) ? "yes" : null,
    fit,
    parking: parking ? (PARKING_DE[parking] ?? null) : null,
    notes: parts.match(/Hinweis: (.*)$/)?.[1] ?? null,
  };
}

/** Reads the planner's notes back into answers. Lines it does not know are kept as they are. */
export function parseNotes(notes: string | null): ParsedNotes {
  const out: ParsedNotes = {
    planner: false,
    access: {},
    rooms: [],
    areaAssembly: [],
    specials: [],
    teamNotes: null,
    photos: 0,
    wish: null,
    pay: null,
    billTo: null,
    moveClean: false,
    windows: {},
    other: [],
  };
  if (!notes) return out;

  const lines = notes.split(/\r?\n/);
  out.planner = /^Buchungsplaner/.test(lines[0] ?? "");
  let section: "rooms" | "area" | "specials" | null = null;

  for (const [index, line] of lines.entries()) {
    if (index === 0 && out.planner) continue;
    let m: RegExpMatchArray | null;

    if ((m = line.match(/^(Auszug|Einzug|Adresse): (.*?) \((.*)\)$/))) {
      out.access[m[1] === "Auszug" ? "from" : m[1] === "Einzug" ? "to" : "service"] = parseAccess(m[3] ?? "");
      section = null;
    } else if ((m = line.match(/^(Auszug|Einzug|Adresse): (.*)$/))) {
      section = null;
    } else if ((m = line.match(/^Berechnet nach Wohnfläche: /))) {
      section = "area";
    } else if (/^Sondergegenstände/.test(line)) {
      section = "specials";
    } else if ((m = line.match(/^- (.+?) × (\d+)(.*)$/)) && section) {
      const rest = m[3] ?? "";
      if (section === "specials") {
        out.specials.push({ kind: SPECIAL_DE[m[1] ?? ""] ?? m[1] ?? "", count: Number(m[2]), notes: rest.replace(/^ — /, "") });
      } else if (section === "area") {
        out.areaAssembly.push({ name: m[1] ?? "", count: Number(m[2]), prep: PREP_DE[rest.replace(/^: /, "")] ?? null });
      } else {
        const prep = rest.match(/^ \(([^)]*)\)/)?.[1] ?? "";
        out.rooms.at(-1)?.items.push({
          name: m[1] ?? "",
          count: Number(m[2]),
          prep: PREP_DE[prep] ?? null,
          custom: rest.includes("[eigener Eintrag"),
          notes: rest.match(/ — (.*)$/)?.[1] ?? "",
        });
      }
    } else if ((m = line.match(/^Hinweise an das Team: (.*)$/))) {
      out.teamNotes = m[1] ?? null;
      section = null;
    } else if ((m = line.match(/^Fotos im Planer ausgewählt \(nicht hochgeladen\): (\d+)/))) {
      out.photos = Number(m[1]);
    } else if ((m = line.match(/^Terminwunsch: (.*)$/))) {
      out.wish = m[1] ?? null;
    } else if ((m = line.match(/^Zahlungswunsch: (.*)$/))) {
      out.pay = PAY_DE[m[1] ?? ""] ?? null;
    } else if ((m = line.match(/^Rechnung an: (.*)$/))) {
      out.billTo = m[1] ?? null;
    } else if (/^Umzugsreinigung: /.test(line)) {
      out.moveClean = true;
    } else if ((m = line.match(/^Fenster \(separat zu bepreisen\): (.*)$/))) {
      for (const part of (m[1] ?? "").split(", ")) {
        const w = part.match(/^(\d+) × (.+)$/);
        const key = w ? WINDOWS_DE[w[2] ?? ""] : undefined;
        if (w && key) out.windows[key] = Number(w[1]);
      }
    } else if ((m = line.match(/^(.+):$/)) && out.planner) {
      // A room heading in the items list ("Living room:").
      out.rooms.push({ name: m[1] ?? "", items: [] });
      section = "rooms";
    } else if (line.trim()) {
      out.other.push(line);
    }
  }

  return out;
}

// ── The flow ───────────────────────────────────────────────────────────────

export type FieldType = "text" | "textarea" | "number" | "select" | "yesno" | "counter" | "multi" | "services" | "date" | "list";
export type Value = string | string[] | ListItem[];

type Svc = "M" | "P" | "C" | "D";
const SVC_OF: Record<string, Svc> = { moving: "M", renovation: "P", cleaning: "C", disposal: "D" };

interface FieldDef {
  id: string;
  type: FieldType;
  label: (tx: Tx) => string;
  req?: boolean;
  unit?: string;
  group?: keyof typeof BOOKING_TEXT;
  /** Which services the field belongs to (letters), when not all. */
  svcs?: string;
  opts?: (tx: Tx) => [string, string][];
  cond?: (get: (id: string) => string) => boolean;
  /** Left out entirely when it has no value (a second day only exists for long jobs). */
  hideEmpty?: boolean;
}

interface StepDef {
  id: string;
  /** "*" = General; otherwise the service letters the step serves. */
  svc: string;
  who?: "P" | "B";
  name: keyof typeof BOOKING_TEXT;
  fields: FieldDef[];
}

const label = (key: keyof typeof BOOKING_TEXT) => (tx: Tx) => tx(key);

export const WINDOW_STARTS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];
const windowLabel = (start: string) => `${start} – ${String(Number(start.slice(0, 2)) + 2).padStart(2, "0")}:00`;

const floorOpts = (tx: Tx): [string, string][] => [
  ["-1", tx("fl_m1")],
  ["0", tx("fl_0")],
  ...Array.from({ length: 9 }, (_, i) => [String(i + 1), tx("fl_n", { n: ordinal(i + 1, tx) })] as [string, string]),
  ["10", tx("fl_10")],
];

function ordinal(n: number, tx: Tx): string {
  // English floors read "1st floor"; the other languages carry the number in the template.
  if (tx("fl_n", { n: 1 }) !== "1 floor") return String(n);
  return `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
}

const isLifted = (k: string) => (get: (id: string) => string) => {
  const floor = get(`prop.${k}.floor`);
  return floor !== "" && floor !== "0";
};

const propFields = (k: "from" | "to" | "service", group: keyof typeof BOOKING_TEXT, svcs: string): FieldDef[] => [
  { id: `prop.${k}.floor`, group, svcs, type: "select", req: true, label: label("f_floor"), opts: floorOpts },
  { id: `prop.${k}.lift`, group, svcs, type: "yesno", req: true, label: label("f_lift"), cond: isLifted(k) },
  {
    id: `prop.${k}.fit`,
    group,
    svcs,
    type: "select",
    req: true,
    label: label("f_fit"),
    opts: (tx) => [["all", tx("o_fit_all")], ["small", tx("o_fit_small")], ["unsure", tx("o_fit_unsure")]],
    cond: (get) => isLifted(k)(get) && get(`prop.${k}.lift`) === "yes",
  },
  {
    id: `prop.${k}.parking`,
    group,
    svcs,
    type: "select",
    req: true,
    label: label("f_parking"),
    opts: (tx) => (["driveway", "streetClose", "streetMedium", "lotClose", "lotMedium", "lotFar"] as const).map((p) => [p, tx(`o_park_${p}`)]),
  },
  { id: `prop.${k}.notes`, group, svcs, type: "textarea", label: label("f_accessNotes") },
];

const isMovingArea = (get: (id: string) => string) => (get("volume.mode") || "area") === "area";
const WORK = ["painting", "flooring", "repairs"] as const;
const WINDOWS = ["standard", "patio", "large", "roof"] as const;
const DISPOSAL = ["largeFurniture", "smallFurniture", "largeElectronics", "smallElectronics"] as const;

const STEPS: StepDef[] = [
  {
    id: "type",
    svc: "*",
    name: "s_type",
    fields: [{ id: "customerType", type: "select", req: true, label: label("f_customerType"), opts: (tx) => [["private", tx("o_private")], ["business", tx("o_business")]] }],
  },
  { id: "services", svc: "*", name: "s_services", fields: [{ id: "services", type: "services", req: true, label: label("f_services") }] },
  {
    id: "company",
    svc: "*",
    who: "B",
    name: "s_company",
    fields: [
      { id: "company", type: "text", req: true, label: label("f_company") },
      { id: "bizInfo.vat", type: "text", label: label("f_vat") },
      { id: "bizInfo.contact", type: "text", req: true, label: label("f_contact") },
      { id: "bizInfo.role", type: "text", label: label("f_role") },
      { id: "bizInfo.size", type: "text", label: label("f_size") },
      { id: "bizInfo.po", type: "text", label: label("f_po") },
    ],
  },
  {
    id: "address",
    svc: "MPCD",
    name: "s_address",
    fields: [
      { id: "addr.from.text", svcs: "M", type: "text", req: true, label: label("f_from") },
      { id: "addr.to.text", svcs: "M", type: "text", req: true, label: label("f_to") },
      { id: "addr.service.text", svcs: "PCD", type: "text", req: true, label: label("f_serviceAddr") },
    ],
  },
  {
    id: "property",
    svc: "MCD",
    name: "s_property",
    fields: [...propFields("from", "g_pickup", "M"), ...propFields("to", "g_delivery", "M"), ...propFields("service", "g_service", "CD")],
  },
  {
    id: "volume",
    svc: "M",
    who: "P",
    name: "s_volume",
    fields: [
      { id: "volume.mode", type: "select", req: true, label: label("f_mode"), opts: (tx) => [["items", tx("o_items")], ["area", tx("o_area")]] },
      { id: "volume.area", type: "number", unit: "m²", req: true, label: label("f_livingArea"), cond: isMovingArea },
      { id: "volume.rooms", type: "number", label: label("f_rooms"), cond: isMovingArea },
      { id: "volume.list", type: "list", req: true, label: label("f_inventory"), cond: (get) => get("volume.mode") === "items" },
      { id: "volume.areaAssembly", type: "yesno", req: true, label: label("f_areaAssembly"), cond: isMovingArea },
      { id: "volume.areaAsm", type: "list", label: label("f_areaAsm"), cond: (get) => isMovingArea(get) && get("volume.areaAssembly") === "yes" },
      { id: "volume.specials", type: "list", label: label("f_specials") },
    ],
  },
  { id: "office", svc: "M", who: "B", name: "s_office", fields: [{ id: "office.items", type: "list", label: label("f_office") }] },
  {
    id: "extras",
    svc: "M",
    name: "s_extras",
    fields: [
      { id: "workers.helpers", type: "counter", req: true, label: label("f_helpers") },
      { id: "addons.packing", type: "yesno", label: label("f_packing") },
      { id: "addons.insurance", type: "yesno", label: label("f_insurance") },
      { id: "workers.vehicle", type: "select", label: label("f_vehicle"), opts: (tx) => [["van", tx("o_van")], ["small", tx("o_small")], ["large", tx("o_large")]] },
      { id: "workers.notes", type: "textarea", label: label("f_teamNotes") },
    ],
  },
  {
    id: "painting",
    svc: "P",
    name: "s_painting",
    fields: [
      { id: "painting.work", type: "multi", req: true, label: label("f_work"), opts: (tx) => WORK.map((w) => [w, tx(`o_${w}`)]) },
      ...WORK.map<FieldDef>((w) => ({
        id: `painting.areas.${w}`,
        type: "number",
        unit: "m²",
        label: (tx) => tx("f_workArea", { work: tx(`o_${w}`) }),
        cond: (get) => get("painting.work").split(",").includes(w),
      })),
      { id: "painting.notes", type: "textarea", label: label("f_notes") },
    ],
  },
  {
    id: "cleaning",
    svc: "C",
    name: "s_cleaning",
    fields: [
      { id: "cleaning.type", type: "select", req: true, label: label("f_cleanType"), opts: (tx) => [["handover", tx("o_handover")], ["windows", tx("o_windows")]] },
      { id: "cleaning.windowsEnabled", type: "yesno", label: label("f_windowsToo"), cond: (get) => get("cleaning.type") === "handover" },
      { id: "cleaning.area", type: "number", unit: "m²", req: true, label: label("f_cleanArea"), cond: (get) => get("cleaning.type") === "handover" },
      ...WINDOWS.map<FieldDef>((w) => ({
        id: `cleaning.windowCounts.${w}`,
        type: "counter",
        group: "g_windows",
        label: label(`w_${w}`),
        cond: (get) => get("cleaning.type") === "windows" || get("cleaning.windowsEnabled") === "yes",
      })),
    ],
  },
  {
    id: "disposal",
    svc: "D",
    name: "s_disposal",
    fields: [
      ...DISPOSAL.map<FieldDef>((d) => ({ id: `disposal.counts.${d}`, type: "counter", label: label(`d_${d}`) })),
      { id: "disposal.notes", type: "textarea", label: label("f_notes") },
    ],
  },
  { id: "photos", svc: "*", name: "s_photos", fields: [{ id: "photos", type: "list", label: label("f_photos") }] },
  {
    id: "date",
    svc: "MPCD",
    name: "s_date",
    fields: [
      { id: "dates.date", type: "date", req: true, label: label("f_date") },
      {
        id: "dates.win",
        type: "select",
        req: true,
        label: label("f_window"),
        opts: () => WINDOW_STARTS.map((start) => [start, windowLabel(start)]),
      },
      { id: "dates.second", type: "date", label: label("f_second"), hideEmpty: true },
    ],
  },
  {
    id: "payment",
    svc: "*",
    name: "s_payment",
    fields: [
      { id: "contact.firstName", type: "text", req: true, label: label("f_firstName") },
      { id: "contact.lastName", type: "text", req: true, label: label("f_lastName") },
      { id: "contact.phone", type: "text", req: true, label: label("f_phone") },
      { id: "contact.email", type: "text", req: true, label: label("f_email") },
      {
        id: "pay.method",
        type: "select",
        label: label("f_pay"),
        opts: (tx) => [["card", tx("o_card")], ["paypal", tx("o_paypal")], ["bank", tx("o_bank")], ["cash", tx("o_cash")], ["invoice", tx("o_invoice")]],
      },
    ],
  },
];

/** Read-only extras shown under "More from the booking" when the booking had them. */
const MORE: Record<string, { id: string; type: FieldType; label: keyof typeof BOOKING_TEXT }[]> = {
  payment: [
    { id: "schedule.wish", type: "text", label: "f_wish" },
    { id: "billTo", type: "text", label: "f_billTo" },
    { id: "notes.other", type: "textarea", label: "f_otherNotes" },
  ],
};

// ── Values ─────────────────────────────────────────────────────────────────

function derived(id: string, o: OrderDetail, n: ParsedNotes, tx: Tx): Value {
  const access = (k: string) => n.access[k as "from" | "to" | "service"];
  const prepText = (prep: string | null) => (prep ? tx(`prep_${prep}` as keyof typeof BOOKING_TEXT) : "");
  const extras = o.extraServices ?? {};
  let m: RegExpMatchArray | null;

  if ((m = id.match(/^prop\.(from|to|service)\.(floor|lift|fit|parking|notes)$/))) {
    const [k, part] = [m[1]!, m[2]!];
    const a = access(k);
    const isTo = k === "to";
    if (part === "floor") return a && a.floor === null ? "" : String(isTo ? o.destinationFloor : o.originFloor);
    if (part === "lift") return (isTo ? o.destinationHasElevator : o.originHasElevator) ? "yes" : a?.lift ?? "no";
    return a?.[part as "fit" | "parking" | "notes"] ?? "";
  }

  if ((m = id.match(/^cleaning\.windowCounts\.(\w+)$/))) return n.windows[m[1]!] ? String(n.windows[m[1]!]) : "";

  switch (id) {
    case "customerType":
      return o.customerType;
    case "services":
      return [o.serviceType];
    case "addr.from.text":
    case "addr.service.text":
      return o.originAddress;
    case "addr.to.text":
      return o.destinationAddress ?? "";
    case "volume.mode":
      return o.calculationMethod;
    case "volume.area":
    case "cleaning.area":
      return o.areaSqm != null ? String(o.areaSqm) : "";
    case "volume.list": {
      if (n.rooms.length) {
        return n.rooms
          .filter((room) => room.items.length)
          .map((room) => ({
            label: room.name,
            sub: room.items
              .map((item) => `${item.name} ×${item.count}${[prepText(item.prep), item.custom ? tx("customItem") : "", item.notes].filter(Boolean).map((x) => ` (${x})`).join("")}`)
              .join(", "),
          }));
      }
      return o.items.length ? [{ label: tx("itemsWord"), sub: o.items.map((item) => `${item.name} ×${item.count}`).join(", ") }] : [];
    }
    case "volume.areaAssembly":
      if (n.areaAssembly.length) return "yes";
      return n.planner && o.calculationMethod === "area" ? "no" : "";
    case "volume.areaAsm":
      return n.areaAssembly.map((item) => ({ label: `${item.name} ×${item.count}`, sub: prepText(item.prep) }));
    case "volume.specials":
      return n.specials.map((s) => ({
        label: `${s.kind in SPECIAL_KEYS ? tx(`sp_${s.kind}` as keyof typeof BOOKING_TEXT) : s.kind} ×${s.count}`,
        sub: s.notes,
      }));
    case "workers.helpers":
      return String(o.crewSize);
    case "addons.packing":
      return "packingService" in extras ? (extras.packingService ? "yes" : "no") : "";
    case "addons.insurance":
      return "transportInsurance" in extras ? (extras.transportInsurance ? "yes" : "no") : "";
    case "workers.notes":
      return n.teamNotes ?? "";
    case "cleaning.type":
      return n.moveClean || (o.serviceType === "cleaning" && o.areaSqm) ? "handover" : Object.keys(n.windows).length ? "windows" : "";
    case "cleaning.windowsEnabled":
      return Object.keys(n.windows).length ? "yes" : n.planner ? "no" : "";
    case "photos":
      return n.photos ? [{ label: tx("photosChosen", { n: n.photos }), sub: tx("photosAsk") }] : [];
    case "office.items":
      // No column or planner sentence holds an office inventory yet.
      return [];
    case "dates.date":
      return o.scheduledDate ?? "";
    case "dates.win":
      return o.scheduledTime ? o.scheduledTime.slice(0, 5) : "";
    case "dates.second":
      return o.scheduledSecondDate ?? "";
    case "contact.name":
      return o.contactName;
    case "contact.firstName":
      return o.contactFirstName ?? splitName(o.contactName).first;
    case "contact.lastName":
      return o.contactLastName ?? splitName(o.contactName).last;
    case "contact.phone":
      return o.contactPhone;
    case "contact.email":
      return o.contactEmail;
    case "pay.method":
      return n.pay ?? "";
    case "schedule.wish":
      return n.wish ?? "";
    case "billTo":
      return n.billTo ?? "";
    case "notes.other":
      return n.other.join("\n");
    default:
      return "";
  }
}

const SPECIAL_KEYS = { piano: 1, safe: 1, aquarium: 1, gym: 1, heavy: 1, artwork: 1 };

function isEmpty(value: Value, type: FieldType): boolean {
  if (Array.isArray(value)) return value.length === 0;
  if (type === "multi" || type === "services") return value.split(",").filter(Boolean).length === 0;
  return value.trim() === "";
}

// ── Sections ───────────────────────────────────────────────────────────────

export interface FieldView {
  kind: "field";
  id: string;
  type: FieldType;
  label: string;
  value: Value;
  req: boolean;
  missing: boolean;
  byTeam: boolean;
  na: boolean;
  unit: string;
  opts: [string, string][];
  /** Full-width fields span the grid. */
  span: boolean;
}

export interface HeadView {
  kind: "head";
  label: string;
}

export interface StepView {
  id: string;
  n: string;
  title: string;
  fields: (FieldView | HeadView)[];
  miss: number;
}

export interface SectionView {
  title: string;
  color: string;
  steps: StepView[];
  miss: number;
}

export const SECTION_COLOURS: Record<Svc, string> = { M: "#d71635", C: "#ffcb08", P: "#3f705a", D: "#252b28" };

// ── The office's own questions ─────────────────────────────────────────────

/**
 * A question the office added to the booking flow (Dashboard → Services),
 * labelled from the published flow. Its answer is `orders.answers[key]`.
 */
export interface ExtraQuestion {
  /** `extra.<flow step>.<question id>` */
  key: string;
  /** The planner step it was asked on ("home", "schedule", "questions"…). */
  step: string;
  label: string;
  type: "text" | "number" | "select" | "yesno" | "counter" | "address" | "photos" | "area";
  required: boolean;
  /** For a choice: [stored value (its German wording), label]. */
  options: [string, string][];
}

const QUESTION_FIELD: Record<ExtraQuestion["type"], FieldType> = {
  text: "text",
  address: "text",
  photos: "textarea",
  number: "number",
  area: "number",
  select: "select",
  yesno: "yesno",
  counter: "counter",
};

/** The planner's steps, as this editor names them. */
const STEP_OF: Record<string, string> = {
  type: "type",
  services: "services",
  account: "company",
  address: "address",
  property: "property",
  home: "volume",
  extras: "extras",
  renovation: "painting",
  cleaning: "cleaning",
  disposal: "disposal",
  photos: "photos",
  schedule: "date",
  review: "payment",
  payment: "payment",
};

export function buildBookingInfo(
  order: OrderDetail,
  tx: Tx,
  serviceName: (key: string) => string,
  flowWord: string,
  generalTitle: string,
  onlyMissing: boolean,
  questions: ExtraQuestion[] = [],
) {
  const notes = parseNotes(order.notes);
  const answers = order.answers ?? {};

  // Every value in the shape its control reads: lists and chip sets are
  // arrays, everything else a string, whatever the source held (or not).
  const valueOf = (id: string, type: FieldType): Value => {
    const answer = answers[id];
    const raw: unknown = answer && type !== "list" ? answer.value : derived(id, order, notes, tx);
    if (type === "list") return Array.isArray(raw) ? (raw as ListItem[]) : [];
    if (type === "multi" || type === "services") {
      if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string");
      return typeof raw === "string" ? raw.split(",").filter(Boolean) : [];
    }
    return typeof raw === "string" ? raw : raw == null ? "" : String(raw);
  };
  const flat = (id: string) => {
    const value = answers[id]?.value ?? derived(id, order, notes, tx);
    return Array.isArray(value) ? value.map((v) => (typeof v === "string" ? v : v.label)).join(",") : value;
  };

  const who = flat("customerType") === "business" ? "B" : "P";
  const svc = SVC_OF[order.serviceType] ?? "M";
  let total = 0;
  let done = 0;

  const visible = STEPS.filter((step) => !step.who || step.who === who);
  const generalSteps = visible.filter((step) => step.svc === "*");
  const serviceSteps = visible.filter((step) => step.svc !== "*" && step.svc.includes(svc));

  // Each added question sits in the step it was asked on; one asked where
  // this order's flow has no such step goes under "More questions".
  const placed = new Set([...generalSteps, ...serviceSteps].map((step) => step.id));
  const stepOfQuestion = (question: ExtraQuestion) => {
    const id = STEP_OF[question.step];
    return id && placed.has(id) ? id : "more";
  };
  if (questions.some((question) => stepOfQuestion(question) === "more")) {
    serviceSteps.push({ id: "more", svc, name: "s_more", fields: [] });
  }

  const build = (steps: StepDef[], k: Svc | null): StepView[] =>
    steps
      .map((step) => {
        const list = step.fields.filter((f) => !f.svcs || f.svcs.includes(k ?? svc));
        const fields: (FieldView | HeadView)[] = [];
        let miss = 0;
        let lastGroup = "";

        const asked = questions.filter((question) => stepOfQuestion(question) === step.id);
        const addQuestions = () => {
          let headed = false;
          for (const question of asked) {
            const type = QUESTION_FIELD[question.type];
            const value = typeof answers[question.key]?.value === "string" ? answers[question.key]!.value : "";
            const empty = type === "counter" ? !(Number(value) > 0) : value.trim() === "";
            const missing = question.required && empty;
            if (question.required) {
              total += 1;
              if (!empty) done += 1;
            }
            if (missing) miss += 1;
            if (onlyMissing && !missing) continue;
            if (!headed && step.id !== "more") {
              headed = true;
              fields.push({ kind: "head", label: tx("g_questions") });
            }
            fields.push({
              kind: "field",
              id: question.key,
              type,
              label: question.label,
              value,
              req: question.required,
              missing,
              byTeam: !!answers[question.key]?.byTeam,
              na: false,
              unit: question.type === "area" ? "m²" : "",
              // An answer to an option since renamed still shows.
              opts: !value || question.options.some(([option]) => option === value) ? question.options : [...question.options, [value, value]],
              span: type === "textarea",
            });
          }
        };

        for (const f of list) {
          const na = !!(f.cond && !f.cond(flat));
          const value = valueOf(f.id, f.type);
          const empty = isEmpty(value, f.type);
          const req = !!f.req;
          const missing = req && empty && !na;
          if (f.hideEmpty && empty) continue;

          if (req && !na) {
            total += 1;
            if (!empty) done += 1;
          }
          if (missing) miss += 1;
          if (onlyMissing && !missing) continue;

          if (f.group && f.group !== lastGroup) {
            lastGroup = f.group;
            fields.push({ kind: "head", label: tx(f.group) });
          }

          fields.push({
            kind: "field",
            id: f.id,
            type: f.type,
            label: f.label(tx),
            value,
            req: req && !na,
            missing,
            byTeam: !!answers[f.id]?.byTeam,
            na,
            unit: f.unit ?? "",
            opts: f.opts?.(tx) ?? [],
            span: ["textarea", "multi", "services", "list"].includes(f.type),
          });
        }

        addQuestions();

        if (!onlyMissing) {
          let headed = false;
          for (const extra of MORE[step.id] ?? []) {
            const value = valueOf(extra.id, extra.type);
            if (isEmpty(value, extra.type)) continue;
            if (!headed) {
              headed = true;
              fields.push({ kind: "head", label: tx("g_more") });
            }
            fields.push({
              kind: "field",
              id: extra.id,
              type: extra.type,
              label: tx(extra.label),
              value,
              req: false,
              missing: false,
              byTeam: !!answers[extra.id]?.byTeam,
              na: false,
              unit: "",
              opts: [],
              span: extra.type === "textarea",
            });
          }
        }

        // The schedule's fields sit under the service they date, as in the prototype.
        if (step.id === "date" && fields.length && k) {
          const group = { M: "g_date_moving", P: "g_date_renovation", C: "g_date_cleaning", D: "g_date_disposal" }[k] as keyof typeof BOOKING_TEXT;
          fields.unshift({ kind: "head", label: tx(group) });
        }

        // Make sure a stored window that is not one of the six still shows.
        for (const field of fields) {
          if (field.kind === "field" && field.id === "dates.win" && typeof field.value === "string" && field.value && !field.opts.some(([v]) => v === field.value)) {
            field.opts = [...field.opts, [field.value, field.value]];
          }
        }

        return { id: step.id, title: tx(step.name), fields, miss };
      })
      .filter((step) => step.fields.some((f) => f.kind === "field") && (!onlyMissing || step.miss > 0))
      .map((step, i) => ({ ...step, n: String(i + 1).padStart(2, "0") }));

  const general = build(generalSteps, null);
  const service = build(serviceSteps, svc);

  const sections: SectionView[] = [
    { title: generalTitle, color: "#92958e", steps: general, miss: general.reduce((a, s) => a + s.miss, 0) },
    { title: `${serviceName(order.serviceType)} · ${flowWord}`, color: SECTION_COLOURS[svc], steps: service, miss: service.reduce((a, s) => a + s.miss, 0) },
  ].filter((section) => section.steps.length > 0);

  const pct = total ? Math.round((done / total) * 100) : 100;
  return { sections, pct, done, total };
}
