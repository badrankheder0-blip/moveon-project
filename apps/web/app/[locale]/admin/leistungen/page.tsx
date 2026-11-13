"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { useDrafts } from "@/lib/admin/drafts";
import { ADMIN_PATHS } from "@/lib/admin/nav";
import { defineText, useText } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";
import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

import {
  DEFAULT_OPTIONS,
  FIELD_ICON,
  QUESTION_DEFAULTS,
  QUESTION_TYPES,
  SERVICE_ICONS,
  SERVICE_STEPS,
  SVC_ICON,
  isBuiltinKey,
  type BuiltinField,
  type BuiltinStep,
  type L4,
  type MockType,
  type QuestionType,
  type ServiceIcon,
} from "./flow";
import styles from "./page.module.css";

/**
 * Services: the four built-in services and any the office adds, as the admin
 * prototype's Services screen draws them — the card grid with its show/hide
 * switches, and an editor per service with its texts in the site's four
 * languages, its card photo, and either the booking-flow editor (built-in
 * services: every step the planner shows, its wording, which answers are
 * required, extra questions) or, for a custom service, its icon and its own
 * questions with a live customer preview.
 *
 * Everything here is configuration: each service is one draft (domain
 * "services", ref = the service key, value = the whole service) and reaches
 * the website and the planner only through the frame's "Save & publish".
 */

const TEXT = defineText({
  svcTitle: { de: "Leistungen", en: "Services", ar: "الخدمات", tr: "Hizmetler" },
  svcSub: {
    de: "Leistungen ein- oder ausblenden, ihre Texte ändern oder eine neue Leistung mit eigenen Fragen anlegen.",
    en: "Show or hide services, change their text, or build a new service with its own questions.",
    ar: "أظهر الخدمات أو أخفها، عدّل نصوصها، أو أنشئ خدمة جديدة بأسئلتها الخاصة.",
    tr: "Hizmetleri gösterin ya da gizleyin, metinlerini değiştirin veya kendi sorularıyla yeni bir hizmet oluşturun.",
  },
  newService: { de: "Neue Leistung", en: "New service", ar: "خدمة جديدة", tr: "Yeni hizmet" },
  builtin: { de: "Standard", en: "Built-in", ar: "أساسية", tr: "Yerleşik" },
  custom: { de: "Eigene", en: "Custom", ar: "مخصصة", tr: "Özel" },
  questionsN: { de: "{n} Fragen", en: "{n} questions", ar: "{n} أسئلة", tr: "{n} soru" },
  shown: { de: "Auf der Website sichtbar", en: "Shown on site", ar: "ظاهرة في الموقع", tr: "Sitede görünür" },
  hidden: { de: "Ausgeblendet", en: "Hidden", ar: "مخفية", tr: "Gizli" },
  edit: { de: "Bearbeiten", en: "Edit", ar: "تعديل", tr: "Düzenle" },
  edited: { de: "Geändert", en: "Edited", ar: "معدّلة", tr: "Değiştirildi" },
  allServices: { de: "Alle Leistungen", en: "All services", ar: "كل الخدمات", tr: "Tüm hizmetler" },
  undo: { de: "Änderungen verwerfen", en: "Undo changes", ar: "تراجع عن التغييرات", tr: "Değişiklikleri geri al" },
  nameL: { de: "Name · {lang}", en: "Name · {lang}", ar: "الاسم · {lang}", tr: "Ad · {lang}" },
  descL: { de: "Kurzbeschreibung · {lang}", en: "Short description · {lang}", ar: "وصف قصير · {lang}", tr: "Kısa açıklama · {lang}" },
  tagL: { de: "Slogan · {lang}", en: "Tagline · {lang}", ar: "سطر قصير · {lang}", tr: "Slogan · {lang}" },
  lang_de: { de: "Deutsch", en: "German", ar: "ألماني", tr: "Almanca" },
  lang_en: { de: "Englisch", en: "English", ar: "إنجليزي", tr: "İngilizce" },
  lang_tr: { de: "Türkisch", en: "Turkish", ar: "تركي", tr: "Türkçe" },
  lang_ar: { de: "Arabisch", en: "Arabic", ar: "عربي", tr: "Arapça" },
  cardPhoto: { de: "Foto auf der Leistungskarte", en: "Photo on the service card", ar: "صورة بطاقة الخدمة", tr: "Hizmet kartındaki fotoğraf" },
  imgHint: {
    de: "JPEG, PNG, WebP oder AVIF · bis {mb} MB",
    en: "JPEG, PNG, WebP or AVIF · up to {mb} MB",
    ar: "JPEG أو PNG أو WebP أو AVIF · حتى {mb} ميغابايت",
    tr: "JPEG, PNG, WebP veya AVIF · en fazla {mb} MB",
  },
  imgUrlHint: {
    de: "Bildpfad (/images/…) oder https-Link",
    en: "Image path (/images/…) or https link",
    ar: "مسار الصورة (/images/…) أو رابط https",
    tr: "Görsel yolu (/images/…) veya https bağlantısı",
  },
  imgUrl: { de: "Bildadresse", en: "Image address", ar: "عنوان الصورة", tr: "Görsel adresi" },
  upload: { de: "Hochladen", en: "Upload", ar: "رفع صورة", tr: "Yükle" },
  uploading: { de: "Wird hochgeladen…", en: "Uploading…", ar: "جارٍ الرفع…", tr: "Yükleniyor…" },
  reset: { de: "Original verwenden", en: "Use original", ar: "استرجاع الأصلية", tr: "Orijinali kullan" },
  removePhoto: { de: "Foto entfernen", en: "Remove photo", ar: "إزالة الصورة", tr: "Fotoğrafı kaldır" },
  tooBig: { de: "Das Bild ist größer als {mb} MB.", en: "This image is larger than {mb} MB.", ar: "حجم الصورة أكبر من {mb} ميغابايت.", tr: "Bu görsel {mb} MB'tan büyük." },
  uploadFailed: { de: "Das Bild konnte nicht hochgeladen werden.", en: "The image could not be uploaded.", ar: "تعذّر رفع الصورة.", tr: "Görsel yüklenemedi." },
  badUrl: {
    de: "Nutze einen /images/…-Pfad oder einen https-Link.",
    en: "Use an /images/… path or an https link.",
    ar: "استخدم مساراً يبدأ بـ /images/ أو رابط https.",
    tr: "Bir /images/… yolu veya https bağlantısı kullanın.",
  },
  flowTitle: { de: "Buchungsablauf", en: "Booking flow", ar: "خطوات الحجز", tr: "Rezervasyon akışı" },
  flowSub: {
    de: "Jeder Schritt, den diese Leistung auf der Buchungsseite zeigt. Ändere die Texte, lege fest, was dein Team braucht, oder füge jedem Schritt eigene Fragen hinzu.",
    en: "Every step this service shows on the booking site. Change the wording, mark what your team needs, or add your own questions to any step.",
    ar: "كل خطوة تظهر لهذه الخدمة في موقع الحجز. غيّر النصوص، حدّد ما يحتاجه فريقك، أو أضف أسئلتك الخاصة لأي خطوة.",
    tr: "Bu hizmetin rezervasyon sitesinde gösterdiği her adım. Metinleri değiştirin, ekibinizin neye ihtiyacı olduğunu belirleyin veya herhangi bir adıma kendi sorularınızı ekleyin.",
  },
  commonNote: {
    de: "Gemeinsame Schritte (Kundentyp, Kontakt, Fotos) findest du unter Buchungsseite",
    en: "Common steps (customer type, contact, photos) are in Booking site",
    ar: "الخطوات المشتركة (نوع الزبون، التواصل، الصور) موجودة في موقع الحجز",
    tr: "Ortak adımlar (müşteri tipi, iletişim, fotoğraflar) Rezervasyon sitesi bölümünde",
  },
  previewFlow: { de: "Wie auf der Buchungsseite", en: "As on the booking site", ar: "كما في موقع الحجز", tr: "Rezervasyon sitesindeki gibi" },
  previewLang: { de: "Sprache der Vorschau", en: "Preview language", ar: "لغة المعاينة", tr: "Önizleme dili" },
  stepOf: { de: "Schritt {a} von {b}", en: "Step {a} of {b}", ar: "الخطوة {a} من {b}", tr: "Adım {a} / {b}" },
  fieldsN: { de: "{n} Felder", en: "{n} fields", ar: "{n} حقول", tr: "{n} alan" },
  siteTitle: { de: "Überschrift", en: "Headline", ar: "العنوان", tr: "Başlık" },
  siteSub: { de: "Einleitung", en: "Intro text", ar: "النص التعريفي", tr: "Giriş metni" },
  qL: { de: "Frage · {lang}", en: "Question · {lang}", ar: "السؤال · {lang}", tr: "Soru · {lang}" },
  required: { de: "Pflicht", en: "Required", ar: "إجباري", tr: "Zorunlu" },
  locked: {
    de: "Die Buchungsseite fragt das immer ab.",
    en: "The booking site always asks for this.",
    ar: "موقع الحجز يطلب هذا دائماً.",
    tr: "Rezervasyon sitesi bunu her zaman sorar.",
  },
  moveUp: { de: "Nach oben", en: "Move up", ar: "للأعلى", tr: "Yukarı taşı" },
  moveDown: { de: "Nach unten", en: "Move down", ar: "للأسفل", tr: "Aşağı taşı" },
  remove: { de: "Entfernen", en: "Remove", ar: "حذف", tr: "Kaldır" },
  optionsL: {
    de: "Optionen · {lang}, durch Kommas getrennt",
    en: "Options · {lang}, separated by commas",
    ar: "الخيارات · {lang}، مفصولة بفواصل",
    tr: "Seçenekler · {lang}, virgülle ayrılmış",
  },
  addQuestion: { de: "Frage hinzufügen", en: "Add a question", ar: "إضافة سؤال", tr: "Soru ekle" },
  back: { de: "Zurück", en: "Back", ar: "رجوع", tr: "Geri" },
  next: { de: "Weiter", en: "Continue", ar: "متابعة", tr: "Devam" },
  icon: { de: "Symbol", en: "Icon", ar: "الأيقونة", tr: "Simge" },
  pricing: { de: "Preis", en: "Pricing", ar: "التسعير", tr: "Fiyatlandırma" },
  m_quote: { de: "Team schickt ein Angebot", en: "Team sends a quote", ar: "الفريق يرسل عرض سعر", tr: "Ekip teklif gönderir" },
  m_fixed: { de: "Festpreis", en: "Fixed price", ar: "سعر ثابت", tr: "Sabit fiyat" },
  m_perUnit: { de: "Aus den Antworten berechnet", en: "Calculated from answers", ar: "يُحسب من الإجابات", tr: "Cevaplardan hesaplanır" },
  pricingSoon: {
    de: "Eigene Leistungen kann die Buchungsseite noch nicht selbst berechnen – dein Team schickt ein Angebot.",
    en: "The booking site can’t price custom services yet, so your team sends a quote.",
    ar: "لا يستطيع موقع الحجز تسعير الخدمات المخصصة بعد، لذلك يرسل فريقك عرض سعر.",
    tr: "Rezervasyon sitesi özel hizmetleri henüz fiyatlandıramıyor; ekibiniz teklif gönderir.",
  },
  questions: { de: "Fragen an den Kunden", en: "Questions for the customer", ar: "أسئلة للزبون", tr: "Müşteriye sorular" },
  noQuestions: {
    de: "Noch keine Fragen. Wähle oben einen Typ, um die erste hinzuzufügen.",
    en: "No questions yet. Pick a type above to add the first one.",
    ar: "لا توجد أسئلة بعد. اختر نوعاً من الأعلى لإضافة أول سؤال.",
    tr: "Henüz soru yok. İlkini eklemek için yukarıdan bir tür seçin.",
  },
  deleteService: { de: "Leistung löschen", en: "Delete service", ar: "حذف الخدمة", tr: "Hizmeti sil" },
  confirmDelete: { de: "Diese Leistung löschen?", en: "Delete this service?", ar: "حذف هذه الخدمة؟", tr: "Bu hizmet silinsin mi?" },
  preview: { de: "KUNDENVORSCHAU", en: "CUSTOMER PREVIEW", ar: "معاينة الزبون", tr: "MÜŞTERİ ÖNİZLEMESİ" },
  previewSub: {
    de: "So erscheint die Leistung auf der Buchungsseite.",
    en: "How this service appears on the booking site.",
    ar: "هكذا تظهر الخدمة في موقع الحجز.",
    tr: "Bu hizmet rezervasyon sitesinde böyle görünür.",
  },
  untitled: { de: "Leistung ohne Namen", en: "Untitled service", ar: "خدمة بدون اسم", tr: "Adsız hizmet" },
  needName: {
    de: "Gib der Leistung in mindestens einer Sprache einen Namen – vorher erscheint sie nicht auf der Website.",
    en: "Give the service a name in at least one language — until then it won’t appear on the website.",
    ar: "أعطِ الخدمة اسماً بلغة واحدة على الأقل — لن تظهر في الموقع قبل ذلك.",
    tr: "Hizmete en az bir dilde ad verin — o zamana kadar sitede görünmez.",
  },
  ft_text: { de: "Text", en: "Text", ar: "نص", tr: "Metin" },
  ft_textarea: { de: "Text", en: "Text", ar: "نص", tr: "Metin" },
  ft_number: { de: "Zahl", en: "Number", ar: "رقم", tr: "Sayı" },
  ft_select: { de: "Auswahlliste", en: "Choice list", ar: "قائمة اختيار", tr: "Seçim listesi" },
  ft_multi: { de: "Auswahlliste", en: "Choice list", ar: "قائمة اختيار", tr: "Seçim listesi" },
  ft_yesno: { de: "Ja / Nein", en: "Yes / No", ar: "نعم / لا", tr: "Evet / Hayır" },
  ft_counter: { de: "Anzahl − / +", en: "Quantity − / +", ar: "عدّاد − / +", tr: "Adet − / +" },
  ft_address: { de: "Adresse", en: "Address", ar: "عنوان", tr: "Adres" },
  ft_photos: { de: "Foto-Upload", en: "Photo upload", ar: "رفع صور", tr: "Fotoğraf yükleme" },
  ft_area: { de: "Fläche m²", en: "Area m²", ar: "مساحة م²", tr: "Alan m²" },
  ft_date: { de: "Datum", en: "Date", ar: "تاريخ", tr: "Tarih" },
  ft_list: { de: "Liste", en: "List", ar: "قائمة", tr: "Liste" },
  saveFailed: { de: "Die Änderung konnte nicht gespeichert werden.", en: "The change could not be saved.", ar: "تعذّر حفظ التغيير.", tr: "Değişiklik kaydedilemedi." },
  loadFailed: { de: "Die Leistungen konnten nicht geladen werden.", en: "The services could not be loaded.", ar: "تعذّر تحميل الخدمات.", tr: "Hizmetler yüklenemedi." },
  retry: { de: "Erneut versuchen", en: "Try again", ar: "حاول مجدداً", tr: "Tekrar dene" },
});

/** The booking site's own words in the preview, in the preview's language. */
const PREVIEW: Record<string, L4> = {
  step: { de: "SCHRITT", en: "STEP", tr: "ADIM", ar: "الخطوة" },
  typeHere: { de: "Hier eingeben", en: "Type here", tr: "Buraya yazın", ar: "اكتب هنا" },
  yes: { de: "Ja", en: "Yes", tr: "Evet", ar: "نعم" },
  no: { de: "Nein", en: "No", tr: "Hayır", ar: "لا" },
  selectDate: { de: "Datum wählen", en: "Select a date", tr: "Tarih seçin", ar: "اختر التاريخ" },
  address: { de: "Straße, Hausnummer, PLZ", en: "Street, house number, postcode", tr: "Sokak, bina no, posta kodu", ar: "الشارع، رقم المبنى، الرمز البريدي" },
  photos: { de: "Fotos hinzufügen", en: "Add photos", tr: "Fotoğraf ekle", ar: "أضف صوراً" },
  areaPh: { de: "z. B. 85", en: "e.g. 85", tr: "örn. 85", ar: "مثلاً 85" },
  list: { de: "Hier trägt der Kunde seine Sachen ein.", en: "The customer adds items here.", tr: "Müşteri eşyalarını buraya ekler.", ar: "هنا يضيف الزبون الأغراض." },
  choose: { de: "Option wählen", en: "Choose an option", tr: "Bir seçenek seçin", ar: "اختر خياراً" },
  back: { de: "Zurück", en: "Back", tr: "Geri", ar: "رجوع" },
  next: { de: "Weiter", en: "Continue", tr: "Devam", ar: "متابعة" },
  quote: { de: "Unser Team schickt dir ein Angebot", en: "Our team sends you a quote", tr: "Ekibimiz size teklif gönderir", ar: "فريقنا يرسل لك عرض سعر" },
};

const LANGS: Locale[] = ["de", "en", "tr", "ar"];
const PLUS = "M12 5v14M5 12h14";
const TRASH = "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6";
const UP = "M18 15l-6-6-6 6";
const DOWN = "M6 9l6 6 6-6";
const PREV = "M15 18l-6-6 6-6";
const NEXT = "M9 18l6-6-6-6";

// ── Data ──────────────────────────────────────────────────────────────────

type Localized = Partial<Record<Locale, string>>;

interface FlowQuestion {
  id: string;
  type: QuestionType;
  label: Localized;
  required: boolean;
  options?: Localized[];
}

interface FlowStep {
  id: string;
  title?: Localized;
  hint?: Localized;
  required?: string[];
  questions?: FlowQuestion[];
}

interface Service {
  key: string;
  isBuiltin: boolean;
  isActive: boolean;
  name: Localized;
  description: Localized;
  tagline: Localized;
  image: string | null;
  defaultImage: string | null;
  defaults: { name: Localized; description: Localized; tagline: Localized } | null;
  icon: string | null;
  pricingModel: string;
  flow: FlowStep[];
  sortOrder: number;
}

type ServiceDraft = Pick<Service, "key" | "isActive" | "name" | "description" | "tagline" | "image" | "icon" | "pricingModel" | "flow" | "sortOrder">;
type DraftValue = ServiceDraft | { deleted: true };

const isDeleted = (value: unknown): value is { deleted: true } => Boolean(value && typeof value === "object" && "deleted" in value);

function toDraft(service: Service): ServiceDraft {
  const { key, isActive, name, description, tagline, image, icon, pricingModel, flow, sortOrder } = service;
  return { key, isActive, name, description, tagline, image, icon, pricingModel, flow, sortOrder };
}

const pick = (text: Localized | undefined, lang: Locale) => (text?.[lang] ?? "").trim();
const anyText = (text: Localized | undefined, lang: Locale) =>
  pick(text, lang) || pick(text, "en") || pick(text, "de") || LANGS.map((code) => pick(text, code)).find(Boolean) || "";

/** Sets one language of a text, dropping it when emptied. */
function withLang(text: Localized | undefined, lang: Locale, value: string): Localized {
  const next: Localized = { ...(text ?? {}) };
  if (value.trim()) next[lang] = value;
  else delete next[lang];
  return next;
}

const optionsText = (options: Localized[] | undefined, lang: Locale) =>
  (options ?? [])
    .map((option) => option[lang] ?? "")
    .filter((text) => text.trim())
    .join(", ");

/**
 * Rewrites one language of a choice list from its comma-separated text,
 * keeping the other languages' options in place by position.
 */
function setOptions(options: Localized[] | undefined, lang: Locale, text: string): Localized[] {
  const list = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const current = options ?? [];
  const others = current.reduce((last, option, index) => (LANGS.some((code) => code !== lang && option[code]?.trim()) ? index + 1 : last), 0);
  const out: Localized[] = [];
  for (let index = 0; index < Math.max(list.length, others); index += 1) {
    const option: Localized = { ...(current[index] ?? {}) };
    const value = list[index];
    if (value) option[lang] = value;
    else delete option[lang];
    if (LANGS.some((code) => option[code]?.trim())) out.push(option);
  }
  return out;
}

const rid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))
    .replace(/-/g, "")
    .slice(0, 8);

function newQuestion(type: QuestionType, required: boolean): FlowQuestion {
  const question: FlowQuestion = { id: `q${rid()}`, type, label: { ...QUESTION_DEFAULTS[type] }, required };
  if (type === "select") question.options = DEFAULT_OPTIONS.map((option) => ({ ...option }));
  return question;
}

/** The step's built-in answers the office needs: its override, or the planner's own. */
const defaultRequired = (step: BuiltinStep) => step.fields.filter((field) => field.required).map((field) => field.id);
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));

/** Drops what is empty, so a step without overrides leaves the flow entirely. */
function tidyStep(step: FlowStep): FlowStep | null {
  const out: FlowStep = { id: step.id };
  if (step.title && Object.keys(step.title).length) out.title = step.title;
  if (step.hint && Object.keys(step.hint).length) out.hint = step.hint;
  if (step.required) out.required = step.required;
  if (step.questions?.length) out.questions = step.questions;
  return Object.keys(out).length > 1 ? out : null;
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const { sdk, can } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const toast = useToast();
  const router = useRouter();
  const drafts = useDrafts("services");
  const rtl = LOCALE_META[locale].dir === "rtl";

  const [editKey, setEditKey] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState<Record<string, number>>({});
  const [previewLang, setPreviewLang] = useState<Locale>(locale);
  const [local, setLocal] = useState<Record<string, DraftValue>>({});

  const live = useQuery({
    queryKey: ["admin", "services", "all"],
    queryFn: () => sdk.http.get<{ services: Service[] }>("/api/services/all"),
  });

  const uploads = useQuery({
    queryKey: ["admin", "uploads"],
    queryFn: () => sdk.http.get<{ enabled: boolean; maxBytes: number }>("/api/site/uploads"),
    retry: false,
    enabled: can("content.write") || can("theme.write"),
  });

  useEffect(() => setPreviewLang(locale), [locale]);

  // Live rows with the drafts laid over them; a draft-only key is a new
  // custom service, a `{ deleted: true }` draft hides one.
  const services = useMemo(() => {
    const rows = live.data?.services ?? [];
    const byKey = new Map(rows.map((row) => [row.key, row]));
    const keys = [...new Set([...rows.map((row) => row.key), ...drafts.drafts.keys(), ...Object.keys(local)])];
    const out: Service[] = [];
    for (const key of keys) {
      const draft = (local[key] ?? drafts.drafts.get(key)) as DraftValue | undefined;
      const base = byKey.get(key);
      if (isDeleted(draft)) continue;
      if (draft) {
        out.push({
          isBuiltin: base?.isBuiltin ?? false,
          defaultImage: base?.defaultImage ?? null,
          defaults: base?.defaults ?? null,
          ...draft,
          flow: draft.flow ?? [],
        });
      } else if (base) out.push(base);
    }
    return out.sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));
  }, [live.data, drafts.drafts, local]);

  const editing = editKey ? services.find((service) => service.key === editKey) ?? null : null;

  useEffect(() => {
    // A discarded draft takes a new service with it.
    if (editKey && !drafts.loading && !live.isLoading && !editing) setEditKey(null);
  }, [editKey, editing, drafts.loading, live.isLoading]);

  async function write(key: string, value: DraftValue) {
    setLocal((current) => ({ ...current, [key]: value }));
    try {
      await drafts.set(key, value);
    } catch (error) {
      toast(error instanceof ApiError && error.message ? error.message : tx("saveFailed"));
    } finally {
      setLocal((current) => {
        if (current[key] !== value) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  const update = (key: string, change: (service: Service) => Service) => {
    const current = services.find((service) => service.key === key);
    if (current) void write(key, toDraft(change(current)));
  };

  function addService() {
    const key = `custom-${rid().slice(0, 6)}`;
    const sortOrder = Math.max(10, ...services.map((service) => service.sortOrder)) + 1;
    void write(key, {
      key,
      isActive: true,
      name: {},
      description: {},
      tagline: {},
      image: null,
      icon: "box",
      pricingModel: "quote",
      flow: [{ id: "questions", questions: [] }],
      sortOrder,
    });
    setEditKey(key);
  }

  async function deleteService(service: Service) {
    if (!window.confirm(tx("confirmDelete"))) return;
    const published = (live.data?.services ?? []).some((row) => row.key === service.key);
    setEditKey(null);
    if (published) await write(service.key, { deleted: true });
    else await drafts.revert(service.key).catch(() => toast(tx("saveFailed")));
  }

  return (
    <AdminShell view="services">
      <section data-screen-label="Services" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {live.isError ? (
          <div className="a-note is-error" role="alert">
            <span style={{ flex: 1 }}>{tx("loadFailed")}</span>
            <button type="button" className="a-btn is-sm is-ghost" onClick={() => void live.refetch()}>
              {tx("retry")}
            </button>
          </div>
        ) : editing ? (
          <Editor
            key={editing.key}
            service={editing}
            edited={drafts.edited(editing.key)}
            tx={tx}
            rtl={rtl}
            locale={locale}
            previewLang={previewLang}
            setPreviewLang={setPreviewLang}
            stepIndex={stepIdx[editing.key] ?? 0}
            setStepIndex={(index) => setStepIdx((current) => ({ ...current, [editing.key]: index }))}
            uploads={uploads.data?.enabled ? uploads.data : null}
            onUpdate={(change) => update(editing.key, change)}
            onBack={() => setEditKey(null)}
            onUndo={() => void drafts.revert(editing.key).catch(() => toast(tx("saveFailed")))}
            onDelete={() => void deleteService(editing)}
            onCommon={() => router.push(`/${locale}${ADMIN_PATHS.site}`)}
            upload={async (file) => {
              const form = new FormData();
              form.append("file", file);
              const { url } = await sdk.http.post<{ url: string }>("/api/site/uploads", form, { query: { kind: "image" }, timeoutMs: 120_000 });
              return url;
            }}
          />
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "var(--a-ls-h1)", lineHeight: 1.2 }}>{tx("svcTitle")}</h1>
                <p style={{ color: "#737870", fontSize: 13, marginTop: 6 }}>{tx("svcSub")}</p>
              </div>
              <button type="button" className={styles.redBtn} onClick={addService} style={redButton}>
                <Svg d={PLUS} size={14} width={2.4} />
                {tx("newService")}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 270px), 1fr))", gap: 14 }}>
              {live.isLoading
                ? [0, 1, 2, 3].map((n) => (
                    <div key={n} style={{ ...card, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                      <div className="a-skel" style={{ height: 150, margin: "-20px -20px 0" }} />
                      <div className="a-skel" style={{ width: "50%" }} />
                      <div className="a-skel" />
                    </div>
                  ))
                : services.map((service) => (
                    <ServiceCard
                      key={service.key}
                      service={service}
                      locale={locale}
                      tx={tx}
                      edited={drafts.edited(service.key)}
                      onToggle={() => update(service.key, (current) => ({ ...current, isActive: !current.isActive }))}
                      onEdit={() => setEditKey(service.key)}
                    />
                  ))}
            </div>
          </>
        )}
      </section>
    </AdminShell>
  );
}

type Tx = ReturnType<typeof useText<typeof TEXT>>;

// ── Index card ────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  locale,
  tx,
  edited,
  onToggle,
  onEdit,
}: {
  service: Service;
  locale: Locale;
  tx: Tx;
  edited: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const on = service.isActive;
  const opacity = on ? 1 : 0.62;
  const image = service.image ?? service.defaultImage;
  const questions = service.flow.reduce((sum, step) => sum + (step.questions?.length ?? 0), 0);

  return (
    <div style={{ ...card, padding: 20, display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
      {image ? (
        <img src={image} alt="" style={{ display: "block", width: "calc(100% + 40px)", maxWidth: "none", height: 150, margin: "-20px -20px 0", objectFit: "cover", opacity }} />
      ) : null}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, opacity }}>
        <span style={{ width: 44, height: 44, display: "grid", placeItems: "center", borderRadius: 10, background: "#fff6f6", color: "#d71635" }}>
          <Svg d={SVC_ICON[(service.icon as ServiceIcon) ?? "box"] ?? SVC_ICON.box} size={22} />
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {edited ? <span className="a-pill is-edited">{tx("edited")}</span> : null}
          <span style={{ padding: "4px 7px", borderRadius: 4, background: service.isBuiltin ? "#f5f5f0" : "#fbf4e4", fontSize: 10, fontWeight: 600, color: "#252b28" }}>
            {service.isBuiltin ? tx("builtin") : tx("custom")}
          </span>
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>{anyText(service.name, locale) || tx("untitled")}</h3>
        <p style={{ fontSize: 12.5, color: "#737870", lineHeight: 1.55 }}>{anyText(service.description, locale)}</p>
        {!service.isBuiltin ? <small style={{ fontSize: 11.5, color: "#92958e" }}>{tx("questionsN", { n: questions })}</small> : null}
      </div>
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 14, borderTop: "1px solid #eef0ea" }}>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={onToggle}
          style={{ display: "flex", alignItems: "center", gap: 9, border: 0, background: "transparent", padding: 0, fontSize: 12, fontWeight: 550, color: "#252b28" }}
        >
          <Track on={on} w={34} h={20} />
          {on ? tx("shown") : tx("hidden")}
        </button>
        <button type="button" className={styles.lineBtn} onClick={onEdit} style={{ minHeight: 34, padding: "0 13px", border: "1px solid #d71635", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 550 }}>
          {tx("edit")}
        </button>
      </div>
    </div>
  );
}

// ── Editor ────────────────────────────────────────────────────────────────

interface EditorProps {
  service: Service;
  edited: boolean;
  tx: Tx;
  rtl: boolean;
  locale: Locale;
  previewLang: Locale;
  setPreviewLang: (lang: Locale) => void;
  stepIndex: number;
  setStepIndex: (index: number) => void;
  uploads: { maxBytes: number } | null;
  onUpdate: (change: (service: Service) => Service) => void;
  onBack: () => void;
  onUndo: () => void;
  onDelete: () => void;
  onCommon: () => void;
  upload: (file: File) => Promise<string>;
}

function Editor(props: EditorProps) {
  const { service, tx, rtl, locale, onUpdate } = props;
  const named = LANGS.some((lang) => pick(service.name, lang));

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={props.onBack}
            style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 0", border: 0, background: "transparent", color: "#d71635", fontSize: 12, fontWeight: 600 }}
          >
            <Svg d={rtl ? NEXT : PREV} size={14} width={2.2} />
            {tx("allServices")}
          </button>
          {props.edited ? (
            <button type="button" className="a-link-btn" onClick={props.onUndo}>
              {tx("undo")}
            </button>
          ) : null}
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "var(--a-ls-h1)", lineHeight: 1.2 }}>{anyText(service.name, locale) || tx("untitled")}</h1>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 500px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <div className={styles.general} style={{ ...card, borderRadius: 10, padding: "22px 24px", boxShadow: "none" }}>
            <div className={styles.langGrid}>
              {(["name", "description", "tagline"] as const).map((part) =>
                LANGS.map((lang) => {
                  const label = tx(part === "name" ? "nameL" : part === "description" ? "descL" : "tagL", { lang: tx(`lang_${lang}`) });
                  const value = service[part][lang] ?? "";
                  const placeholder = service.defaults?.[part][lang] ?? "";
                  const commit = (text: string) => onUpdate((current) => ({ ...current, [part]: withLang(current[part], lang, text) }));
                  const invalid = part === "name" && !service.isBuiltin && !named;
                  return (
                    <label key={`${part}-${lang}`} style={labelStyle}>
                      {label}
                      {part === "description" ? (
                        <CommitText
                          multiline
                          dir={LOCALE_META[lang].dir}
                          lang={lang}
                          value={value}
                          placeholder={placeholder}
                          onCommit={commit}
                          style={{ ...inputStyle, height: "auto", padding: "10px 12px", fontWeight: 400, resize: "vertical", lineHeight: 1.5 }}
                        />
                      ) : (
                        <CommitText
                          dir={LOCALE_META[lang].dir}
                          lang={lang}
                          value={value}
                          placeholder={placeholder}
                          onCommit={commit}
                          aria-invalid={invalid || undefined}
                          style={{ ...inputStyle, ...(invalid ? { border: "1px solid #d71635", background: "#fff6f6" } : null) }}
                        />
                      )}
                    </label>
                  );
                }),
              )}
              {!service.isBuiltin && !named ? (
                <p className="a-note is-warn" style={{ gridColumn: "1 / -1" }}>
                  {tx("needName")}
                </p>
              ) : null}
              <PhotoRow {...props} />
            </div>
          </div>

          {service.isBuiltin && isBuiltinKey(service.key) ? <FlowEditor {...props} steps={SERVICE_STEPS[service.key]} /> : null}
          {!service.isBuiltin ? <CustomEditor {...props} /> : null}
        </div>
        {!service.isBuiltin ? <CustomPreview {...props} /> : null}
      </div>
    </>
  );
}

function PhotoRow({ service, tx, uploads, onUpdate, upload }: EditorProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [urlError, setUrlError] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const src = service.image ?? service.defaultImage;
  const mb = uploads ? Math.round(uploads.maxBytes / (1024 * 1024)) : 8;

  async function onFile(chosen: File | undefined) {
    if (!chosen || !uploads) return;
    if (chosen.size > uploads.maxBytes) {
      toast(tx("tooBig", { mb }));
      return;
    }
    setBusy(true);
    try {
      const url = await upload(chosen);
      onUpdate((current) => ({ ...current, image: url }));
    } catch (error) {
      toast(error instanceof ApiError && error.message ? error.message : tx("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", paddingTop: 14, borderTop: "1px solid #eef0ea" }}>
      {src ? (
        <img src={src} alt="" style={{ width: 188, height: 100, objectFit: "cover", borderRadius: 8, border: "1px solid #e3e5de", display: "block" }} />
      ) : (
        <span style={{ width: 188, height: 100, display: "grid", placeItems: "center", borderRadius: 8, border: "1px dashed #c4c7bf", background: "#fafaf7", color: "#92958e" }}>
          <Svg d={SVC_ICON[(service.icon as ServiceIcon) ?? "box"] ?? SVC_ICON.box} size={26} />
        </span>
      )}
      <div style={{ flex: "1 1 160px", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <b style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{tx("cardPhoto")}</b>
        <small style={{ fontSize: 11.5, color: "#737870" }}>{uploads ? tx("imgHint", { mb }) : tx("imgUrlHint")}</small>
        <CommitText
          dir="ltr"
          value={service.image ?? ""}
          placeholder={service.defaultImage ?? "https://…"}
          aria-label={tx("imgUrl")}
          aria-invalid={urlError || undefined}
          onCommit={(text) => {
            const value = text.trim();
            if (value && !/^(\/(?!\/)|https?:\/\/)/.test(value)) {
              setUrlError(true);
              toast(tx("badUrl"));
              return;
            }
            setUrlError(false);
            onUpdate((current) => ({ ...current, image: value || null }));
          }}
          style={{ ...inputStyle, height: 34, marginTop: 6, fontSize: 12, fontWeight: 400, ...(urlError ? { border: "1px solid #d71635", background: "#fff6f6" } : null) }}
        />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {uploads ? (
          <label
            className={styles.lineBtn}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 36, padding: "0 12px", border: "1px solid #d71635", borderRadius: 8, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 550, cursor: busy ? "wait" : "pointer", whiteSpace: "nowrap" }}
          >
            <input
              ref={file}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={busy}
              onChange={(event) => {
                const chosen = event.target.files?.[0];
                event.target.value = "";
                void onFile(chosen);
              }}
              style={{ display: "none" }}
            />
            <Svg d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" size={14} width={1.9} />
            {busy ? tx("uploading") : tx("upload")}
          </label>
        ) : null}
        {service.image ? (
          <button
            type="button"
            className={styles.ghost}
            onClick={() => onUpdate((current) => ({ ...current, image: null }))}
            style={{ minHeight: 36, padding: "0 10px", border: 0, borderRadius: 8, background: "transparent", color: "#737870", fontSize: 12, fontWeight: 550, whiteSpace: "nowrap" }}
          >
            {service.defaultImage ? tx("reset") : tx("removePhoto")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ── Built-in service: the booking flow ────────────────────────────────────

function FlowEditor({ service, steps, tx, rtl, locale, previewLang, setPreviewLang, stepIndex, setStepIndex, onUpdate, onCommon }: EditorProps & { steps: BuiltinStep[] }) {
  const index = Math.min(stepIndex, steps.length - 1);
  const step = steps[index]!;
  const override = service.flow.find((entry) => entry.id === step.id) ?? { id: step.id };
  const required = override.required ?? defaultRequired(step);
  const questions = override.questions ?? [];
  const pl = previewLang;
  const pdir = LOCALE_META[pl].dir;

  const updateStep = (id: string, change: (current: FlowStep) => FlowStep) =>
    onUpdate((current) => {
      const flow = current.flow.filter((entry) => entry.id !== id);
      const before = current.flow.find((entry) => entry.id === id) ?? { id };
      const next = tidyStep(change(before));
      const position = current.flow.findIndex((entry) => entry.id === id);
      if (next) flow.splice(position < 0 ? flow.length : position, 0, next);
      return { ...current, flow };
    });

  const setQuestions = (change: (list: FlowQuestion[]) => FlowQuestion[]) =>
    updateStep(step.id, (current) => ({ ...current, questions: change(current.questions ?? []) }));

  const toggleRequired = (field: BuiltinField) =>
    updateStep(step.id, (current) => {
      const now = current.required ?? defaultRequired(step);
      const next = now.includes(field.id) ? now.filter((id) => id !== field.id) : [...now, field.id];
      const out: FlowStep = { ...current };
      if (sameSet(next, defaultRequired(step))) delete out.required;
      else out.required = next;
      return out;
    });

  const counts = (entry: BuiltinStep) => entry.fields.length + (service.flow.find((item) => item.id === entry.id)?.questions?.length ?? 0);
  let lastGroup = "";

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 6 }}>
        <h2 style={{ fontSize: 19, fontWeight: 600, letterSpacing: "var(--a-ls-h2)" }}>{tx("flowTitle")}</h2>
        <p style={{ fontSize: 12.5, color: "#737870", lineHeight: 1.55 }}>{tx("flowSub")}</p>
        <button
          type="button"
          onClick={onCommon}
          style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, padding: "2px 0", border: 0, background: "transparent", color: "#d71635", fontSize: 12, fontWeight: 600, textAlign: "start" }}
        >
          {tx("commonNote")}
          <Svg d={rtl ? PREV : NEXT} size={13} width={2.2} />
        </button>
      </div>
      <div className={styles.flowRow}>
        <nav className={styles.stepNav}>
          {steps.map((entry, i) => {
            const on = i === index;
            return (
              <button
                key={entry.id}
                type="button"
                aria-current={on ? "step" : undefined}
                onClick={() => setStepIndex(i)}
                style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "0 12px", border: `1px solid ${on ? "#d71635" : "#e3e5de"}`, borderRadius: 10, background: on ? "#fff6f6" : "#ffffff", color: "#252b28", textAlign: "start", width: "100%" }}
              >
                <span style={{ width: 24, height: 24, display: "grid", placeItems: "center", borderRadius: "50%", background: on ? "#d71635" : "#f1f1ea", color: on ? "#ffffff" : "#4a514d", fontSize: 10, fontWeight: 700, flex: "none" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <b style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.name[locale]}</b>
                <small style={{ fontSize: 10.5, color: "#92958e" }}>{tx("fieldsN", { n: counts(entry) })}</small>
              </button>
            );
          })}
        </nav>

        <div style={{ flex: "1 1 460px", minWidth: 0, background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 14, boxShadow: "0 18px 50px #202a2312", overflow: "hidden" }}>
          <PreviewBar tx={tx} label={`m.on · ${tx("stepOf", { a: index + 1, b: steps.length })}`} lang={pl} setLang={setPreviewLang} />
          <div dir={pdir} lang={pl} style={{ padding: "28px 30px 22px", display: "flex", flexDirection: "column", gap: 18, textAlign: "start" }}>
            <span style={{ fontSize: 10, fontWeight: 650, letterSpacing: pl === "ar" ? 0 : 1.5, color: "#737870" }}>
              {PREVIEW.step![pl]} {String(index + 1).padStart(2, "0")} · {step.name[pl]}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <CommitText
                key={`title-${step.id}-${pl}`}
                className={styles.inlineEdit}
                value={override.title?.[pl] ?? ""}
                placeholder={step.title[pl]}
                aria-label={tx("siteTitle")}
                onCommit={(text) => updateStep(step.id, (current) => ({ ...current, title: withLang(current.title, pl, text) }))}
                style={{ width: "100%", border: "1px dashed transparent", borderRadius: 6, background: "transparent", padding: "2px 6px", margin: "0 -6px", fontSize: 32, fontWeight: 600, letterSpacing: pl === "ar" ? 0 : -1.2, color: "#252b28", boxShadow: "none" }}
              />
              <CommitText
                key={`hint-${step.id}-${pl}`}
                className={styles.inlineEdit}
                value={override.hint?.[pl] ?? ""}
                placeholder={step.hint[pl]}
                aria-label={tx("siteSub")}
                onCommit={(text) => updateStep(step.id, (current) => ({ ...current, hint: withLang(current.hint, pl, text) }))}
                style={{ width: "100%", border: "1px dashed transparent", borderRadius: 6, background: "transparent", padding: "4px 6px", margin: "6px -6px 0", fontSize: 14, color: "#737870", boxShadow: "none" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {step.fields.map((field) => {
                const head = field.group && field.group.en !== lastGroup ? field.group : null;
                if (field.group) lastGroup = field.group.en;
                const on = required.includes(field.id);
                return (
                  <div key={field.id} style={{ display: "contents" }}>
                    {head ? <div style={{ paddingTop: 6, fontSize: 10.5, fontWeight: 650, letterSpacing: pl === "ar" ? 0 : 1.5, color: "#92958e", textTransform: "uppercase" }}>{head[pl]}</div> : null}
                    <div className={styles.row} style={rowStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ flex: "1 1 200px", minWidth: 0, borderBottom: "1px dashed transparent", padding: "2px 0", fontSize: 13, fontWeight: 650, color: "#252b28" }}>{field.label[pl]}</span>
                        {on ? <b style={{ color: "#d71635", fontSize: 13 }}>*</b> : null}
                        <SmallSwitch on={on} label={tx("required")} disabled={field.locked === true} title={field.locked ? tx("locked") : undefined} onClick={() => toggleRequired(field)} />
                      </div>
                      <Mock type={field.type} variant="flow" lang={pl} unit={field.unit} options={field.options?.map((option) => option[pl])} placeholder={field.placeholder?.[pl]} />
                    </div>
                  </div>
                );
              })}
              {questions.map((question, i) => (
                <div key={question.id} className={styles.row} style={rowStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <CommitText
                      key={`${question.id}-${pl}`}
                      dir={pdir}
                      value={question.label[pl] ?? ""}
                      placeholder={tx("qL", { lang: tx(`lang_${pl}`) })}
                      aria-label={tx("qL", { lang: tx(`lang_${pl}`) })}
                      onCommit={(text) => setQuestions((list) => list.map((item) => (item.id === question.id ? { ...item, label: withLang(item.label, pl, text) } : item)))}
                      style={{ flex: "1 1 200px", minWidth: 0, border: 0, borderBottom: "1px dashed #d6d9d1", background: "transparent", padding: "2px 0", fontSize: 13, fontWeight: 650, color: "#252b28", boxShadow: "none", borderRadius: 0 }}
                    />
                    {question.required ? <b style={{ color: "#d71635", fontSize: 13 }}>*</b> : null}
                    <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <SmallSwitch
                        on={question.required}
                        label={tx("required")}
                        onClick={() => setQuestions((list) => list.map((item) => (item.id === question.id ? { ...item, required: !item.required } : item)))}
                      />
                      <MoveButtons
                        tx={tx}
                        size={26}
                        first={i === 0}
                        last={i === questions.length - 1}
                        onMove={(dir) => setQuestions((list) => move(list, i, dir))}
                        onRemove={() => setQuestions((list) => list.filter((item) => item.id !== question.id))}
                      />
                    </span>
                  </div>
                  <Mock
                    type={question.type}
                    variant="flow"
                    lang={pl}
                    unit={question.type === "area" ? "m²" : undefined}
                    options={(question.options ?? []).map((option) => option[pl] ?? "").filter(Boolean)}
                  />
                  {question.type === "select" ? (
                    <CommitText
                      key={`opts-${question.id}-${pl}`}
                      dir={pdir}
                      value={optionsText(question.options, pl)}
                      placeholder={tx("optionsL", { lang: tx(`lang_${pl}`) })}
                      aria-label={tx("optionsL", { lang: tx(`lang_${pl}`) })}
                      onCommit={(text) => setQuestions((list) => list.map((item) => (item.id === question.id ? { ...item, options: setOptions(item.options, pl, text) } : item)))}
                      style={{ width: "100%", height: 38, padding: "0 10px", border: "1px dashed #cfd3cb", borderRadius: 6, background: "#fafaf7", fontSize: 12.5, color: "#252b28" }}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", padding: 12, border: "1.5px dashed #e3e5de", borderRadius: 10 }}>
              <small style={{ fontSize: 11.5, color: "#737870", marginInlineEnd: 4 }}>{tx("addQuestion")}</small>
              {QUESTION_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={styles.typeBtn}
                  onClick={() => setQuestions((list) => [...list, newQuestion(type, false)])}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 32, padding: "0 10px", border: "1px solid #e3e5de", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 11.5, fontWeight: 550 }}
                >
                  <Svg d={FIELD_ICON[type]} size={13} width={1.9} stroke="#d71635" />
                  {tx(`ft_${type}`)}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 16, borderTop: "1px solid #eef0ea" }}>
              <button
                type="button"
                disabled={index <= 0}
                onClick={() => setStepIndex(Math.max(0, index - 1))}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 40, padding: "0 4px", border: 0, background: "transparent", color: "#d71635", fontSize: 12.5, fontWeight: 600 }}
              >
                <Svg d={pdir === "rtl" ? NEXT : PREV} size={14} width={2.2} />
                {PREVIEW.back![pl]}
              </button>
              <button
                type="button"
                disabled={index >= steps.length - 1}
                onClick={() => setStepIndex(Math.min(steps.length - 1, index + 1))}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 40, padding: "0 18px", border: "1px solid #d71635", borderRadius: 6, background: "#d71635", color: "#ffffff", fontSize: 12.5, fontWeight: 600 }}
              >
                {PREVIEW.next![pl]}
                <Svg d={pdir === "rtl" ? PREV : NEXT} size={14} width={2.2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Custom service ────────────────────────────────────────────────────────

const questionsOf = (service: Service) => service.flow.find((step) => step.id === "questions")?.questions ?? [];

function setCustomQuestions(service: Service, change: (list: FlowQuestion[]) => FlowQuestion[]): Service {
  const rest = service.flow.filter((step) => step.id !== "questions");
  return { ...service, flow: [{ id: "questions", questions: change(questionsOf(service)) }, ...rest] };
}

function CustomEditor({ service, tx, onUpdate, onDelete }: EditorProps) {
  const questions = questionsOf(service);
  const icon = (service.icon as ServiceIcon) ?? "box";
  const setQuestions = (change: (list: FlowQuestion[]) => FlowQuestion[]) => onUpdate((current) => setCustomQuestions(current, change));

  return (
    <>
      <div style={{ ...card, borderRadius: 10, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 18, boxShadow: "none" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <b style={{ fontSize: 12, fontWeight: 600 }}>{tx("icon")}</b>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SERVICE_ICONS.map((key) => {
              const on = icon === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  aria-label={key}
                  onClick={() => onUpdate((current) => ({ ...current, icon: key }))}
                  style={{ width: 42, height: 42, display: "grid", placeItems: "center", border: `1px solid ${on ? "#d71635" : "#e3e5de"}`, borderRadius: 8, background: on ? "#fff6f6" : "#ffffff", color: on ? "#d71635" : "#252b28", padding: 0 }}
                >
                  <Svg d={SVC_ICON[key]} size={19} />
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <b style={{ fontSize: 12, fontWeight: 600 }}>{tx("pricing")}</b>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
            {(["quote", "fixed", "perUnit"] as const).map((model) => {
              const on = model === "quote";
              return (
                <button
                  key={model}
                  type="button"
                  aria-pressed={on}
                  disabled={!on}
                  title={on ? undefined : tx("pricingSoon")}
                  style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 46, padding: "0 14px", border: `1px solid ${on ? "#d71635" : "#e3e5de"}`, borderRadius: 8, background: "#ffffff", color: "#252b28", fontSize: 12.5, fontWeight: 550, textAlign: "start" }}
                >
                  <span style={{ width: 18, height: 18, borderRadius: "50%", border: on ? "5px solid #d71635" : "1.3px solid #d71635", background: "#ffffff", flex: "none" }} />
                  {tx(`m_${model}`)}
                </button>
              );
            })}
          </div>
          <small style={{ fontSize: 11.5, color: "#92958e" }}>{tx("pricingSoon")}</small>
        </div>
      </div>

      <div style={{ ...card, borderRadius: 10, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14, boxShadow: "none" }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "var(--a-ls-h2)" }}>{tx("questions")}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <small style={{ fontSize: 11.5, color: "#737870" }}>{tx("addQuestion")}</small>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {QUESTION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={styles.dashedType}
                onClick={() => setQuestions((list) => [...list, newQuestion(type, true)])}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 36, padding: "0 12px", border: "1px dashed #c4c7bf", borderRadius: 6, background: "#fafaf7", color: "#252b28", fontSize: 12, fontWeight: 550 }}
              >
                <Svg d={FIELD_ICON[type]} size={14} width={1.9} stroke="#d71635" />
                {tx(`ft_${type}`)}
              </button>
            ))}
          </div>
        </div>
        {questions.length === 0 ? (
          <p style={{ padding: "22px 16px", border: "1px dashed #e3e5de", borderRadius: 8, textAlign: "center", fontSize: 12.5, color: "#737870" }}>{tx("noQuestions")}</p>
        ) : null}
        {questions.map((question, i) => {
          const patch = (change: (item: FlowQuestion) => FlowQuestion) => setQuestions((list) => list.map((item) => (item.id === question.id ? change(item) : item)));
          return (
            <div key={question.id} style={{ border: "1px solid #e3e5de", borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ width: 24, height: 24, display: "grid", placeItems: "center", border: "1px solid #d71635", borderRadius: "50%", fontSize: 10, color: "#737870", flex: "none" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 650 }}>
                  <Svg d={FIELD_ICON[question.type]} size={15} width={1.9} stroke="#d71635" />
                  {tx(`ft_${question.type}`)}
                </span>
                <span style={{ flex: 1 }} />
                <button
                  type="button"
                  role="switch"
                  aria-checked={question.required}
                  onClick={() => patch((item) => ({ ...item, required: !item.required }))}
                  style={{ display: "flex", alignItems: "center", gap: 8, border: 0, background: "transparent", padding: 0, fontSize: 12, fontWeight: 550, color: "#252b28" }}
                >
                  <Track on={question.required} w={30} h={18} />
                  {tx("required")}
                </button>
                <MoveButtons
                  tx={tx}
                  size={30}
                  first={i === 0}
                  last={i === questions.length - 1}
                  onMove={(dir) => setQuestions((list) => move(list, i, dir))}
                  onRemove={() => setQuestions((list) => list.filter((item) => item.id !== question.id))}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                {LANGS.map((lang) => (
                  <label key={lang} style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "#737870" }}>
                    {tx("qL", { lang: tx(`lang_${lang}`) })}
                    <CommitText
                      dir={LOCALE_META[lang].dir}
                      lang={lang}
                      value={question.label[lang] ?? ""}
                      onCommit={(text) => patch((item) => ({ ...item, label: withLang(item.label, lang, text) }))}
                      style={{ ...inputStyle, fontWeight: 400, color: "#252b28" }}
                    />
                  </label>
                ))}
              </div>
              {question.type === "select" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                  {LANGS.map((lang) => (
                    <label key={lang} style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "#737870" }}>
                      {tx("optionsL", { lang: tx(`lang_${lang}`) })}
                      <CommitText
                        dir={LOCALE_META[lang].dir}
                        lang={lang}
                        value={optionsText(question.options, lang)}
                        onCommit={(text) => patch((item) => ({ ...item, options: setOptions(item.options, lang, text) }))}
                        style={{ ...inputStyle, fontWeight: 400, color: "#252b28" }}
                      />
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className={styles.deleteSvc}
        onClick={onDelete}
        style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 7, minHeight: 38, padding: "0 12px", border: "1px solid transparent", borderRadius: 6, background: "transparent", color: "#b7122b", fontSize: 12, fontWeight: 600 }}
      >
        <Svg d={TRASH} size={14} width={2} />
        {tx("deleteService")}
      </button>
    </>
  );
}

function CustomPreview({ service, tx, previewLang, setPreviewLang }: EditorProps) {
  const pl = previewLang;
  const questions = questionsOf(service);
  const icon = (service.icon as ServiceIcon) ?? "box";

  return (
    <aside style={{ flex: "1 1 320px", maxWidth: 420, position: "sticky", top: 100, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div>
          <span style={{ fontSize: 10, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#737870" }}>{tx("preview")}</span>
          <p style={{ fontSize: 12, color: "#737870", marginTop: 3 }}>{tx("previewSub")}</p>
        </div>
        <LangSwitch tx={tx} lang={pl} setLang={setPreviewLang} />
      </div>
      <div dir={LOCALE_META[pl].dir} lang={pl} style={{ background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, padding: 20, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 12px 36px #202a2310", textAlign: "start" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 14, border: "1.5px solid #d71635", borderRadius: 8, background: "#ffffff" }}>
          <span style={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 8, background: "#fff6f6", color: "#d71635", flex: "none" }}>
            <Svg d={SVC_ICON[icon] ?? SVC_ICON.box} size={20} />
          </span>
          <span style={{ minWidth: 0 }}>
            <b style={{ display: "block", fontSize: 14, fontWeight: 650 }}>{anyText(service.name, pl) || tx("untitled")}</b>
            <small style={{ display: "block", fontSize: 12, color: "#737870", lineHeight: 1.5, marginTop: 2 }}>{anyText(service.description, pl)}</small>
          </span>
        </div>
        {questions.map((question) => (
          <div key={question.id} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              {anyText(question.label, pl) || "—"}
              {question.required ? <b style={{ color: "#d71635", fontWeight: 600 }}> *</b> : null}
            </span>
            <Mock type={question.type} variant="card" lang={pl} options={(question.options ?? []).map((option) => anyText(option, pl)).filter(Boolean)} />
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 14, borderTop: "1px solid #eef0ea" }}>
          <small style={{ fontSize: 12, color: "#737870" }}>{PREVIEW.quote![pl]}</small>
          <span style={{ display: "inline-flex", alignItems: "center", minHeight: 38, padding: "0 15px", borderRadius: 6, background: "#d71635", color: "#ffffff", fontSize: 12, fontWeight: 600 }}>{PREVIEW.next![pl]}</span>
        </div>
      </div>
    </aside>
  );
}

// ── Pieces ────────────────────────────────────────────────────────────────

function PreviewBar({ tx, label, lang, setLang }: { tx: Tx; label: string; lang: Locale; setLang: (lang: Locale) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 40, padding: "0 14px", background: "#f5f5f0", borderBottom: "1px solid #e3e5de", flexWrap: "wrap" }}>
      <i style={{ display: "block", width: 9, height: 9, borderRadius: "50%", background: "#d71635" }} />
      <i style={{ display: "block", width: 9, height: 9, borderRadius: "50%", background: "#ffcb08" }} />
      <i style={{ display: "block", width: 9, height: 9, borderRadius: "50%", background: "#d6d9d1" }} />
      <span style={{ flex: 1, textAlign: "center", fontSize: 11, color: "#737870" }}>{label}</span>
      <LangSwitch tx={tx} lang={lang} setLang={setLang} />
      <small style={{ fontSize: 10.5, color: "#92958e" }}>{tx("previewFlow")}</small>
    </div>
  );
}

/** Which of the site's four languages the preview shows and edits. */
function LangSwitch({ tx, lang, setLang }: { tx: Tx; lang: Locale; setLang: (lang: Locale) => void }) {
  return (
    <span role="group" aria-label={tx("previewLang")} style={{ display: "inline-flex", gap: 2, padding: 2, border: "1px solid #e3e5de", borderRadius: 6, background: "#ffffff" }}>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={code === lang}
          title={tx(`lang_${code}`)}
          onClick={() => setLang(code)}
          style={{ minHeight: 20, padding: "0 6px", border: 0, borderRadius: 4, background: code === lang ? "#252b28" : "transparent", color: code === lang ? "#ffffff" : "#4a514d", fontSize: 10, fontWeight: 650 }}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </span>
  );
}

function MoveButtons({ tx, size, first, last, onMove, onRemove }: { tx: Tx; size: number; first: boolean; last: boolean; onMove: (dir: -1 | 1) => void; onRemove: () => void }) {
  const base: CSSProperties = { width: size, height: size, display: "grid", placeItems: "center", border: 0, borderRadius: 5, background: "transparent", color: "#737870", padding: 0 };
  const icon = size > 26 ? 14 : 13;
  return (
    <span style={{ display: "flex", gap: size > 26 ? 2 : 1 }}>
      <button type="button" className={styles.ghost} aria-label={tx("moveUp")} disabled={first} onClick={() => onMove(-1)} style={base}>
        <Svg d={UP} size={icon} width={2.2} />
      </button>
      <button type="button" className={styles.ghost} aria-label={tx("moveDown")} disabled={last} onClick={() => onMove(1)} style={base}>
        <Svg d={DOWN} size={icon} width={2.2} />
      </button>
      <button type="button" className={styles.danger} aria-label={tx("remove")} onClick={onRemove} style={{ ...base, color: size > 26 ? "#92958e" : "#737870" }}>
        <Svg d={TRASH} size={icon} width={2.1} />
      </button>
    </span>
  );
}

function move<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir;
  if (target < 0 || target >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item!);
  return next;
}

function SmallSwitch({ on, label, onClick, disabled, title }: { on: boolean; label: string; onClick: () => void; disabled?: boolean; title?: string | undefined }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      title={title}
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 6, border: 0, background: "transparent", padding: 0, fontSize: 11, fontWeight: 550, color: "#4a514d", whiteSpace: "nowrap", ...(disabled ? { opacity: 0.6, cursor: "not-allowed" } : null) }}
    >
      <Track on={on} w={28} h={16} />
      {label}
    </button>
  );
}

/** The prototype's switch track: red when on, knob at the end. */
function Track({ on, w, h }: { on: boolean; w: number; h: number }) {
  const knob = h - 4;
  return (
    <span style={{ width: w, height: h, borderRadius: h / 2, background: on ? "#d71635" : "#d6d9d1", display: "flex", justifyContent: on ? "flex-end" : "flex-start", padding: 2, transition: "background .15s", flex: "none" }}>
      <span style={{ width: knob, height: knob, borderRadius: "50%", background: "#ffffff", boxShadow: "0 1px 2px #00000033" }} />
    </span>
  );
}

/**
 * The answer a field asks for, drawn the way the booking site draws it:
 * `flow` is the step preview (red outlines), `card` the custom-service preview.
 */
function Mock({ type, variant, lang, unit, options, placeholder }: { type: MockType; variant: "flow" | "card"; lang: Locale; unit?: string | undefined; options?: string[] | undefined; placeholder?: string | undefined }) {
  const red = variant === "flow";
  const border = red ? "1px solid #d71635" : "1px solid #cfd3cb";
  const soft = red ? "1px solid #d71635" : "1px solid #e3e5de";
  const w = (key: keyof typeof PREVIEW) => PREVIEW[key]![lang];
  const box: CSSProperties = { height: red ? 40 : 41, padding: "0 12px", display: "flex", alignItems: "center", border, borderRadius: 6, background: "#ffffff", fontSize: 13, color: "#92958e" };

  switch (type) {
    case "text":
      return <span style={box}>{w("typeHere")}</span>;
    case "textarea":
      return <span style={{ ...box, height: 62, alignItems: "flex-start", padding: "10px 12px" }}>{w("typeHere")}</span>;
    case "number":
    case "area": {
      const suffix = unit ?? (type === "area" ? "m²" : "");
      return (
        <span style={{ ...box, width: red ? 200 : type === "area" ? 180 : 140, padding: 0, overflow: "hidden" }}>
          <span style={{ flex: 1, padding: "0 12px" }}>{type === "area" && !red ? w("areaPh") : "0"}</span>
          {suffix ? <span style={{ height: "100%", display: "flex", alignItems: "center", padding: "0 12px", background: "#fafaf7", borderInlineStart: "1px solid #e3e5de", color: "#737870", fontSize: red ? 13 : 12 }}>{suffix}</span> : null}
        </span>
      );
    }
    case "select":
      if (!red) {
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(options?.length ? options : [w("choose")]).map((option, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 40, padding: "0 12px", border: "1px solid #e3e5de", borderRadius: 6, fontSize: 13 }}>
                <span style={{ width: 16, height: 16, borderRadius: "50%", border: "1.3px solid #d71635", flex: "none" }} />
                {option}
              </span>
            ))}
          </div>
        );
      }
      return (
        <span style={{ ...box, justifyContent: "space-between" }}>
          {placeholder ?? options?.[0] ?? w("choose")}
          <Svg d={DOWN} size={14} width={2} stroke="#737870" />
        </span>
      );
    case "multi":
      return (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(options ?? []).slice(0, 6).map((option, i) => (
            <span key={i} style={{ padding: "6px 12px", border: "1px solid #d71635", borderRadius: 999, fontSize: 12, color: "#252b28" }}>
              {option}
            </span>
          ))}
        </div>
      );
    case "yesno":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: red ? 320 : undefined }}>
          {[w("yes"), w("no")].map((label) => (
            <span key={label} style={{ minHeight: 40, display: "grid", placeItems: "center", border: soft, borderRadius: 6, fontSize: 13, fontWeight: 550, color: "#252b28" }}>
              {label}
            </span>
          ))}
        </div>
      );
    case "counter":
      return (
        <span style={{ display: "inline-flex", alignItems: "center", alignSelf: "flex-start", border, borderRadius: 6, overflow: "hidden" }}>
          <span style={{ width: red ? 36 : 38, height: red ? 36 : 38, display: "grid", placeItems: "center", color: "#737870", fontSize: red ? 13 : 16 }}>−</span>
          <b style={{ width: red ? 32 : 36, textAlign: "center", fontSize: 13 }}>0</b>
          <span style={{ width: red ? 36 : 38, height: red ? 36 : 38, display: "grid", placeItems: "center", color: "#d71635", background: red ? "#fbf4e4" : undefined, fontSize: red ? 13 : 16 }}>+</span>
        </span>
      );
    case "date":
      return (
        <span style={{ ...box, width: 220, gap: 8 }}>
          <Svg d={FIELD_ICON.date} size={14} width={1.9} stroke="#d71635" />
          {w("selectDate")}
        </span>
      );
    case "address":
      return (
        <span style={{ ...box, gap: 8 }}>
          <Svg d={FIELD_ICON.address} size={15} width={1.9} stroke="#d71635" />
          {w("address")}
        </span>
      );
    case "photos":
      return (
        <span style={{ minHeight: 96, border: "1.5px dashed #c4c7bf", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#252b28", background: "#fafaf7" }}>
          <Svg d={FIELD_ICON.photos} size={20} stroke="#d71635" />
          {w("photos")}
        </span>
      );
    case "list":
      return (
        <span style={{ minHeight: 58, padding: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px dashed #c4c7bf", borderRadius: 8, background: "#fafaf7", fontSize: 12, color: "#737870" }}>
          {w("list")}
        </span>
      );
  }
}

/**
 * A text field that saves when you leave it (or press Enter), as the
 * prototype's change events do: every save is a draft round-trip, so it is
 * not sent per keystroke.
 */
function CommitText({
  value,
  onCommit,
  multiline,
  ...rest
}: {
  value: string;
  onCommit: (value: string) => void;
  multiline?: boolean;
  dir?: "ltr" | "rtl";
  lang?: string;
  placeholder?: string | undefined;
  className?: string | undefined;
  style?: CSSProperties;
  "aria-label"?: string;
  "aria-invalid"?: boolean | undefined;
}) {
  const [text, setText] = useState(value);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);

  const commit = () => {
    focused.current = false;
    if (text !== value) onCommit(text);
  };

  const shared = {
    ...rest,
    value: text,
    onFocus: () => {
      focused.current = true;
    },
    onBlur: commit,
  };

  return multiline ? (
    <textarea {...shared} rows={3} onChange={(event) => setText(event.target.value)} />
  ) : (
    <input
      {...shared}
      onChange={(event) => setText(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur();
      }}
    />
  );
}

function Svg({ d, size = 18, width = 1.8, stroke = "currentColor" }: { d: string; size?: number; width?: number; stroke?: string }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

// ── Styles (the prototype's inline values) ───────────────────────────────

const card: CSSProperties = { background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, boxShadow: "0 12px 36px #202a2308", minWidth: 0 };
const redButton: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, minHeight: 41, padding: "0 16px", border: "1px solid #d71635", borderRadius: 6, background: "#d71635", color: "#ffffff", fontSize: 12, fontWeight: 600 };
const labelStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, minWidth: 0 };
const inputStyle: CSSProperties = { width: "100%", height: 41, padding: "0 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, fontWeight: 500 };
const rowStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", border: "1px solid #eef0ea", borderRadius: 10, background: "#ffffff" };
