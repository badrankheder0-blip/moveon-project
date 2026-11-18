import type { Locale } from "@/lib/i18n/config";

import type { Plan, StepId } from "./plan";

/**
 * What the office configures for the booking planner under Dashboard →
 * Services (`GET /api/services`): which services are offered and in what
 * order, how each card reads, and per booking step the headline, the
 * built-in answers it insists on and the questions it added.
 *
 * Only types and pure lookups live here, so `plan.ts` can validate against
 * the catalogue without the two modules depending on each other at runtime.
 */

export type L4 = Partial<Record<Locale, string>>;

export const QUESTION_TYPES = ["text", "number", "select", "yesno", "counter", "address", "photos", "area"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface FlowQuestion {
  id: string;
  type: QuestionType;
  label: L4;
  required: boolean;
  options?: L4[];
}

export interface FlowStepConfig {
  /** A planner step id ("home", "schedule"…), or "questions" for a custom service's own step. */
  id: string;
  title?: L4;
  hint?: L4;
  /** The step's built-in answers the office needs (Services → Booking flow). */
  required?: string[];
  questions?: FlowQuestion[];
}

export interface CatalogService {
  key: string;
  isBuiltin: boolean;
  name: L4;
  description: L4;
  tagline: L4;
  image: string | null;
  icon: string | null;
  /** "builtin": the planner's own rules; "quote": the team prices it. */
  pricingModel: string;
  flow: FlowStepConfig[];
  sortOrder: number;
}

/** The published catalogue, or null when it could not be read (the planner then offers its four). */
export type BookingCatalog = CatalogService[] | null;

// ── The steps every customer sees (Dashboard → Booking site) ───────────────

export const COMMON_STEP_IDS = ["type", "services", "account", "address", "schedule", "photos", "review", "payment"] as const;
export type CommonStepId = (typeof COMMON_STEP_IDS)[number];

export interface CommonFieldSettings {
  label?: L4;
  required?: boolean;
  hidden?: boolean;
}

/** One common step as the office set it up; absent parts keep the planner's own. */
export interface CommonStep {
  id: CommonStepId;
  fields?: Record<string, CommonFieldSettings>;
  questions?: FlowQuestion[];
}

export type CommonFlow = CommonStep[];

/**
 * What the office may change about a built-in answer of a common step:
 *   locked     — the planner cannot do without it: required, always shown;
 *   answered   — always has a value (a default), so it may be hidden, not required;
 *   optional   — never required (a discount code), but it may be hidden;
 *   free       — both switches work.
 */
export type CommonFieldMode = "locked" | "answered" | "optional" | "free";

export interface CommonField {
  /** `<step>.<field>`, as stored under the step's `fields`. */
  id: string;
  step: CommonStepId;
  /** How the dashboard draws it (the icon and the type name). */
  type: "text" | "textarea" | "select" | "multi" | "yesno" | "photos";
  /** The planner's own label (its catalogue wording), the placeholder of the dashboard's label field. */
  label: Required<L4>;
  mode: CommonFieldMode;
  /** The planner shows no label for it (the step's headline says it), so there is none to rename. */
  noLabel?: boolean;
}

const w = (de: string, en: string, tr: string, ar: string): Required<L4> => ({ de, en, tr, ar });

/** The built-in answers of the common steps, read off the planner's own screens. */
export const COMMON_FIELDS: CommonField[] = [
  { id: "type.customerType", step: "type", type: "select", label: w("Wer bucht?", "Who is booking?", "Kim rezervasyon yapıyor?", "من يحجز؟"), mode: "locked", noLabel: true },
  { id: "services.services", step: "services", type: "multi", label: w("Gewählte Leistungen", "Selected services", "Seçilen hizmetler", "الخدمات المختارة"), mode: "locked", noLabel: true },
  { id: "account.company", step: "account", type: "text", label: w("Firmenname", "Company name", "Şirket adı", "اسم الشركة"), mode: "locked" },
  { id: "account.phone", step: "account", type: "text", label: w("Telefonnummer", "Phone number", "Telefon numarası", "رقم الهاتف"), mode: "free" },
  { id: "schedule.notes", step: "schedule", type: "textarea", label: w("Hinweis zum Termin", "Scheduling note", "Randevu notu", "ملاحظة حول الموعد"), mode: "free" },
  { id: "photos.photos", step: "photos", type: "photos", label: w("Fotos hinzufügen", "Add photos", "Fotoğraf ekle", "إضافة صور"), mode: "free" },
  { id: "review.discount", step: "review", type: "text", label: w("Rabattcode", "Discount code", "İndirim kodu", "رمز الخصم"), mode: "optional" },
  { id: "payment.firstName", step: "payment", type: "text", label: w("Vorname", "First name", "Ad", "الاسم الأول"), mode: "locked" },
  { id: "payment.lastName", step: "payment", type: "text", label: w("Nachname", "Last name", "Soyad", "الكنية"), mode: "locked" },
  { id: "payment.phone", step: "payment", type: "text", label: w("Telefonnummer", "Phone number", "Telefon numarası", "رقم الهاتف"), mode: "locked" },
  { id: "payment.email", step: "payment", type: "text", label: w("E-Mail-Adresse", "Email address", "E-posta adresi", "البريد الإلكتروني"), mode: "locked" },
  { id: "payment.billTo", step: "payment", type: "yesno", label: w("Jemand anderen", "Someone else", "Başka biri", "شخص آخر"), mode: "optional" },
  { id: "payment.method", step: "payment", type: "select", label: w("Wie möchtest du bezahlen?", "How would you like to pay?", "Nasıl ödemek istersiniz?", "كيف تريد الدفع؟"), mode: "answered" },
  { id: "payment.terms", step: "payment", type: "yesno", label: w("Bevor du bestätigst", "Before you confirm", "Onaylamadan önce", "قبل التأكيد"), mode: "locked" },
];

export const commonField = (id: string) => COMMON_FIELDS.find((field) => field.id === id);

const commonSettings = (common: CommonFlow | null | undefined, fieldId: string): CommonFieldSettings | undefined =>
  common?.find((step) => step.id === fieldId.split(".")[0])?.fields?.[fieldId];

/** Whether the office made a common field required (a locked one always is). */
export function commonRequired(common: CommonFlow | null | undefined, fieldId: string): boolean {
  const field = commonField(fieldId);
  if (field?.mode === "locked" || field?.mode === "answered") return true;
  if (field?.mode === "optional") return false;
  return commonSettings(common, fieldId)?.required === true;
}

/** Whether the office hid a common field. A locked one never hides. */
export function commonHidden(common: CommonFlow | null | undefined, fieldId: string): boolean {
  if (commonField(fieldId)?.mode === "locked") return false;
  return commonSettings(common, fieldId)?.hidden === true;
}

/** The office's label for a common field in this language, or "" for the planner's own. */
export function commonLabel(common: CommonFlow | null | undefined, fieldId: string, locale: Locale): string {
  if (commonField(fieldId)?.noLabel) return "";
  return textIn(commonSettings(common, fieldId)?.label, locale);
}

/** The questions the office added to a common step, asked of every customer. */
export function commonQuestions(common: CommonFlow | null | undefined, step: string): AskedQuestion[] {
  const entry = common?.find((item) => item.id === step);
  return (entry?.questions ?? []).map((question) => ({ key: answerKey(step, question.id), question }));
}

/** Every question added to the common steps. */
export function allCommonQuestions(common: CommonFlow | null | undefined): AskedQuestion[] {
  return (common ?? []).flatMap((step) => commonQuestions(common, step.id));
}

const BUILTIN_ORDER = ["moving", "renovation", "cleaning", "disposal"] as const;

/**
 * Built-in answers a service may mark as required. These are the ones the
 * planner leaves optional by itself (the rest of `required` repeats what it
 * already insists on).
 */
export const OPTIONAL_FIELDS = ["property.notes", "home.specials", "extras.notes", "schedule.notes", "disposal.notes"] as const;

const LOCALE_ORDER: Locale[] = ["de", "en", "tr", "ar"];

/** The text in this language only — what a headline override uses. */
export const textIn = (text: L4 | undefined, locale: Locale): string => text?.[locale]?.trim() ?? "";

/** The text in this language, or any language it was written in. A name must never be blank. */
export const textAny = (text: L4 | undefined, locale: Locale): string =>
  textIn(text, locale) || LOCALE_ORDER.map((lang) => textIn(text, lang)).find(Boolean) || "";

/** How a chosen option is stored: its German wording (the office's language), or any. */
export const optionValue = (option: L4): string => textAny(option, "de");

export const customStepId = (key: string): StepId => `svc-${key}`;
export const customKeyOf = (step: string): string | null => (step.startsWith("svc-") ? step.slice(4) : null);

/** The answer key a question is stored and sent under. */
export const answerKey = (flowStepId: string, questionId: string) => `extra.${flowStepId}.${questionId}`;

export function findService(catalog: BookingCatalog, key: string): CatalogService | undefined {
  return catalog?.find((service) => service.key === key);
}

/** The custom services on offer, in the office's order. */
export function customServices(catalog: BookingCatalog): CatalogService[] {
  return (catalog ?? []).filter((service) => !service.isBuiltin);
}

/** The selected services the catalogue knows: built-ins in planner order, then custom ones. */
export function selectedCatalogServices(plan: Plan, catalog: BookingCatalog): CatalogService[] {
  if (!catalog) return [];
  const builtins = BUILTIN_ORDER.filter((key) => plan.services[key])
    .map((key) => findService(catalog, key))
    .filter((service): service is CatalogService => Boolean(service));
  const custom = plan.customServices
    .map((key) => findService(catalog, key))
    .filter((service): service is CatalogService => Boolean(service && !service.isBuiltin));
  return [...builtins, ...custom];
}

/** The planner step a flow entry belongs to. */
function plannerStep(service: CatalogService, entryId: string): string {
  return !service.isBuiltin && entryId === "questions" ? customStepId(service.key) : entryId;
}

/** The selected services' flow entries for one planner step. */
function entriesFor(plan: Plan, catalog: BookingCatalog, step: StepId) {
  const out: Array<{ service: CatalogService; entry: FlowStepConfig }> = [];
  for (const service of selectedCatalogServices(plan, catalog)) {
    for (const entry of service.flow) {
      if (plannerStep(service, entry.id) === step) out.push({ service, entry });
    }
  }
  return out;
}

/**
 * The headline and intro the office wrote for this step, in this language.
 * When several selected services override a shared step, the first in the
 * planner's service order wins, part by part.
 */
export function stepOverride(plan: Plan, catalog: BookingCatalog, step: StepId, locale: Locale): { title: string; hint: string } {
  const entries = entriesFor(plan, catalog, step);
  return {
    title: entries.map(({ entry }) => textIn(entry.title, locale)).find(Boolean) ?? "",
    hint: entries.map(({ entry }) => textIn(entry.hint, locale)).find(Boolean) ?? "",
  };
}

/**
 * Whether a built-in answer (`property.notes`…) is required: by any selected
 * service (Services), or for everyone (Booking site → Common steps).
 */
export function fieldRequired(plan: Plan, catalog: BookingCatalog, fieldId: string, common?: CommonFlow | null): boolean {
  const step = fieldId.split(".")[0] as StepId;
  if (commonField(fieldId)?.mode === "free" && commonRequired(common, fieldId)) return true;
  return entriesFor(plan, catalog, step).some(({ entry }) => entry.required?.includes(fieldId));
}

export interface AskedQuestion {
  /** `extra.<flow step>.<question id>` */
  key: string;
  /** The service that asks it; none for a question every customer is asked. */
  service?: CatalogService;
  question: FlowQuestion;
}

/**
 * The questions the office added to this step: those every customer is asked
 * (Booking site), then the selected services' own (Services).
 */
export function stepQuestions(plan: Plan, catalog: BookingCatalog, step: StepId, common?: CommonFlow | null): AskedQuestion[] {
  const seen = new Set<string>();
  const out: AskedQuestion[] = [];
  for (const asked of commonQuestions(common, step)) {
    seen.add(asked.key);
    out.push(asked);
  }
  for (const { service, entry } of entriesFor(plan, catalog, step)) {
    for (const question of entry.questions ?? []) {
      const key = answerKey(entry.id, question.id);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ key, service, question });
    }
  }
  return out;
}

/** Every question a service asks, wherever it is asked. */
export function serviceQuestions(service: CatalogService): AskedQuestion[] {
  return service.flow.flatMap((entry) =>
    (entry.questions ?? []).map((question) => ({ key: answerKey(entry.id, question.id), service, question })),
  );
}

/** Photo answers keep the chosen file names, one per line. */
export const photoNames = (raw: string | undefined): string[] => (raw ?? "").split("\n").filter(Boolean);

/** Why an answer cannot be accepted, as a translation key, or null. */
export function answerProblem(question: FlowQuestion, raw: string | undefined): string | null {
  const value = (raw ?? "").trim();

  if (question.type === "photos") {
    return question.required && photoNames(raw).length === 0 ? "plan.error.answer" : null;
  }
  if (question.type === "counter") {
    return question.required && !(Number(value) > 0) ? "plan.error.answer" : null;
  }
  if (!value) return question.required ? "plan.error.answer" : null;

  if (question.type === "number" || question.type === "area") {
    const number = Number(value.replace(",", "."));
    if (!Number.isFinite(number) || number < 0) return "plan.error.number";
  }
  if (question.type === "select" && !(question.options ?? []).some((option) => optionValue(option) === value)) {
    return "plan.error.answer";
  }
  if (question.type === "yesno" && value !== "yes" && value !== "no") return "plan.error.answer";
  return null;
}

/**
 * An answer as the office reads it, in German: options by their German
 * wording, yes/no spelled out, photos counted (they stay in the browser).
 */
export function answerText(question: FlowQuestion, raw: string | undefined): string {
  const value = (raw ?? "").trim();
  switch (question.type) {
    case "yesno":
      return value === "yes" ? "Ja" : value === "no" ? "Nein" : "";
    case "area":
      return value ? `${value} m²` : "";
    case "counter":
      return value && value !== "0" ? value : "";
    case "photos": {
      const names = photoNames(raw);
      return names.length ? `${names.length} Foto(s) im Planer ausgewählt (nicht hochgeladen): ${names.join(", ")}` : "";
    }
    default:
      return value;
  }
}
