"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { useToast } from "@/app/components/admin/AdminShell";
import { useDrafts } from "@/lib/admin/drafts";
import { defineText, useText, type TextFn } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import {
  COMMON_FIELDS,
  type CatalogService,
  type CommonField,
  type CommonFieldSettings,
  type CommonFlow,
  type CommonStepId,
  type FlowQuestion,
  type L4,
} from "@/lib/booking/catalog";

import { errorText, type Loc } from "../inhalte/_lib/cms";
import { DEFAULT_OPTIONS, FIELD_ICON, QUESTION_DEFAULTS, type MockType, type QuestionType } from "../leistungen/flow";

/**
 * Booking site → Common steps: each step's built-in answers (label in the
 * editing language, Required, Shown) and the questions the office adds for
 * every customer — the admin prototype's rows under each step card.
 *
 * Drafted per step in domain "bookingflow" (see the API's common-flow.ts);
 * "Save & publish" puts them live with everything else.
 */

const TEXT = defineText({
  required: { de: "Pflicht", en: "Required", ar: "إجباري", tr: "Zorunlu" },
  shown: { de: "Sichtbar", en: "Shown", ar: "ظاهر", tr: "Görünür" },
  locked: {
    de: "Die Buchungsseite braucht diese Angabe – sie ist immer Pflicht und sichtbar.",
    en: "The booking site needs this answer, so it is always required and shown.",
    ar: "موقع الحجز يحتاج هذه الإجابة، لذا هي دائماً إجبارية وظاهرة.",
    tr: "Rezervasyon sitesi bu cevaba ihtiyaç duyar; her zaman zorunlu ve görünürdür.",
  },
  answered: {
    de: "Hat immer einen Wert (eine Vorauswahl) – Sie können sie nur ausblenden.",
    en: "Always has a value (a default), so it can only be hidden.",
    ar: "لها قيمة دائماً (اختيار افتراضي)، لذا يمكن إخفاؤها فقط.",
    tr: "Her zaman bir değeri vardır (varsayılan); yalnızca gizlenebilir.",
  },
  optional: {
    de: "Diese Angabe ist immer freiwillig – Sie können sie nur ausblenden.",
    en: "This answer is always optional, so it can only be hidden.",
    ar: "هذه الإجابة اختيارية دائماً، لذا يمكن إخفاؤها فقط.",
    tr: "Bu cevap her zaman isteğe bağlıdır; yalnızca gizlenebilir.",
  },
  noLabel: {
    de: "Die Überschrift des Schritts oben stellt diese Frage.",
    en: "The step’s headline above asks this.",
    ar: "عنوان الخطوة أعلاه يطرح هذا السؤال.",
    tr: "Bunu yukarıdaki adım başlığı sorar.",
  },
  labelIn: { de: "Bezeichnung · {lang}", en: "Label · {lang}", ar: "التسمية · {lang}", tr: "Etiket · {lang}" },
  questionIn: { de: "Frage · {lang}", en: "Question · {lang}", ar: "السؤال · {lang}", tr: "Soru · {lang}" },
  optionsIn: {
    de: "Optionen · {lang}, durch Kommas getrennt",
    en: "Options · {lang}, separated by commas",
    ar: "الخيارات · {lang}، مفصولة بفواصل",
    tr: "Seçenekler · {lang}, virgülle ayrılmış",
  },
  addQuestion: { de: "Frage hinzufügen", en: "Add a question", ar: "إضافة سؤال", tr: "Soru ekle" },
  moveUp: { de: "Nach oben", en: "Move up", ar: "للأعلى", tr: "Yukarı taşı" },
  moveDown: { de: "Nach unten", en: "Move down", ar: "للأسفل", tr: "Aşağı taşı" },
  remove: { de: "Entfernen", en: "Remove", ar: "حذف", tr: "Kaldır" },
  addressNote: {
    de: "Die Adressfelder gehören zu jeder Leistung (Leistungen). Fragen hier werden jedem Kunden gestellt.",
    en: "The address fields belong to each service (Services). Questions added here are asked of every customer.",
    ar: "حقول العنوان تخص كل خدمة (الخدمات). الأسئلة المضافة هنا تُطرح على كل زبون.",
    tr: "Adres alanları her hizmete aittir (Hizmetler). Buraya eklenen sorular her müşteriye sorulur.",
  },
  saveFailed: { de: "Konnte nicht gespeichert werden.", en: "Could not be saved.", ar: "تعذّر الحفظ.", tr: "Kaydedilemedi." },
  lang_de: { de: "Deutsch", en: "German", ar: "ألماني", tr: "Almanca" },
  lang_en: { de: "Englisch", en: "English", ar: "إنجليزي", tr: "İngilizce" },
  lang_tr: { de: "Türkisch", en: "Turkish", ar: "تركي", tr: "Türkçe" },
  lang_ar: { de: "Arabisch", en: "Arabic", ar: "عربي", tr: "Arapça" },
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
});

type Tx = TextFn<typeof TEXT>;

/** The question types the prototype offers on a common step. */
const COMMON_QUESTION_TYPES: QuestionType[] = ["text", "number", "select", "yesno", "counter", "address", "area"];

interface StepValue {
  fields?: Record<string, CommonFieldSettings>;
  questions?: FlowQuestion[];
}

const LANGS: Loc[] = ["de", "en", "tr", "ar"];

/** Drops what says nothing, so a step back at the planner's own leaves no draft behind. */
function tidy(value: StepValue): StepValue {
  const fields: Record<string, CommonFieldSettings> = {};
  for (const [id, entry] of Object.entries(value.fields ?? {})) {
    const out: CommonFieldSettings = {};
    const label: L4 = {};
    for (const lang of LANGS) if (entry.label?.[lang]?.trim()) label[lang] = entry.label[lang]!.trim();
    if (Object.keys(label).length) out.label = label;
    if (entry.required) out.required = true;
    if (entry.hidden) out.hidden = true;
    if (Object.keys(out).length) fields[id] = out;
  }
  const out: StepValue = {};
  if (Object.keys(fields).length) out.fields = fields;
  if (value.questions?.length) out.questions = value.questions;
  return out;
}

const same = (a: StepValue, b: StepValue) => JSON.stringify(tidy(a)) === JSON.stringify(tidy(b));

const rid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))
    .replace(/-/g, "")
    .slice(0, 8);

/** The live common steps, the drafts over them, and the way to change one. */
export function useCommonFlow() {
  const { sdk } = useApi();
  const toast = useToast();
  const tx = useText(TEXT);
  const drafts = useDrafts("bookingflow");
  const [local, setLocal] = useState<Record<string, StepValue>>({});

  const live = useQuery({
    queryKey: ["admin", "services", "all"],
    queryFn: () => sdk.http.get<{ services: CatalogService[]; common?: CommonFlow }>("/api/services/all"),
  });

  const liveOf = (id: CommonStepId): StepValue => {
    const entry = live.data?.common?.find((step) => step.id === id);
    return entry ? { ...(entry.fields ? { fields: entry.fields } : {}), ...(entry.questions ? { questions: entry.questions } : {}) } : {};
  };

  const valueOf = (id: CommonStepId): StepValue => local[id] ?? (drafts.drafts.get(id) as StepValue | undefined) ?? liveOf(id);

  async function update(id: CommonStepId, change: (current: StepValue) => StepValue) {
    const next = tidy(change(valueOf(id)));
    setLocal((current) => ({ ...current, [id]: next }));
    try {
      // Back to what is live: the draft goes rather than publishing a no-op.
      if (same(next, liveOf(id))) {
        if (drafts.edited(id)) await drafts.revert(id);
      } else await drafts.set(id, next);
    } catch (error) {
      toast(errorText(error, tx("saveFailed")));
    } finally {
      setLocal((current) => {
        if (current[id] !== next) return current;
        const out = { ...current };
        delete out[id];
        return out;
      });
    }
  }

  return { valueOf, update, edited: (id: CommonStepId) => drafts.edited(id), loading: live.isLoading || drafts.loading };
}

export type CommonFlowEditor = ReturnType<typeof useCommonFlow>;

/** How many answers a common step asks for, for the step card's header. */
export function fieldCount(editor: CommonFlowEditor, step: CommonStepId): number {
  return COMMON_FIELDS.filter((field) => field.step === step).length + (editor.valueOf(step).questions?.length ?? 0);
}

const ICON_OF: Record<string, MockType> = { text: "text", textarea: "textarea", select: "select", multi: "multi", yesno: "yesno", photos: "photos" };

/** The rows under one common step card, and its "Add a question" chips. */
export function CommonStepFields({ step, lang, editor }: { step: CommonStepId; lang: Loc; editor: CommonFlowEditor }) {
  const tx = useText(TEXT);
  const value = editor.valueOf(step);
  const fields = COMMON_FIELDS.filter((field) => field.step === step);
  const questions = value.questions ?? [];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const setField = (id: string, change: (current: CommonFieldSettings) => CommonFieldSettings) =>
    void editor.update(step, (current) => ({ ...current, fields: { ...current.fields, [id]: change(current.fields?.[id] ?? {}) } }));
  const setQuestions = (change: (list: FlowQuestion[]) => FlowQuestion[]) =>
    void editor.update(step, (current) => ({ ...current, questions: change(current.questions ?? []) }));

  const addQuestion = (type: QuestionType) =>
    setQuestions((list) => [
      ...list,
      {
        id: `q${rid()}`,
        type,
        label: { ...QUESTION_DEFAULTS[type] },
        required: false,
        ...(type === "select" ? { options: DEFAULT_OPTIONS.map((option) => ({ ...option })) } : {}),
      },
    ]);

  return (
    <div style={{ padding: "4px 20px 16px", display: "flex", flexDirection: "column", borderTop: "1px solid #eef0ea" }}>
      {step === "address" ? <p style={{ padding: "12px 0 4px", fontSize: 12, color: "#737870", lineHeight: 1.5 }}>{tx("addressNote")}</p> : null}

      {fields.map((field) => (
        <BuiltinRow key={field.id} field={field} settings={value.fields?.[field.id] ?? {}} lang={lang} dir={dir} tx={tx} onChange={(change) => setField(field.id, change)} />
      ))}

      {questions.map((question, index) => (
        <div key={question.id} style={ROW}>
          <div style={ROW_LINE}>
            <TypeIcon type={question.type} />
            <div style={{ flex: "1 1 300px", minWidth: 0 }}>
              <CommitInput
                key={`${question.id}-${lang}`}
                dir={dir}
                value={question.label[lang] ?? ""}
                placeholder={QUESTION_DEFAULTS[question.type][lang]}
                aria-label={tx("questionIn", { lang: tx(`lang_${lang}`) })}
                onCommit={(text) => setQuestions((list) => list.map((item) => (item.id === question.id ? { ...item, label: withLang(item.label, lang, text) } : item)))}
              />
            </div>
            <span style={TYPE}>{tx(`ft_${question.type}` as keyof typeof TEXT)}</span>
            <Switch on={question.required} label={tx("required")} onClick={() => setQuestions((list) => list.map((item) => (item.id === question.id ? { ...item, required: !item.required } : item)))} />
            <span style={{ display: "flex", gap: 2 }}>
              <IconButton label={tx("moveUp")} d="M18 15l-6-6-6 6" disabled={index === 0} onClick={() => setQuestions((list) => move(list, index, -1))} />
              <IconButton label={tx("moveDown")} d="M6 9l6 6 6-6" disabled={index === questions.length - 1} onClick={() => setQuestions((list) => move(list, index, 1))} />
              <IconButton label={tx("remove")} d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" danger onClick={() => setQuestions((list) => list.filter((item) => item.id !== question.id))} />
            </span>
          </div>
          {question.type === "select" ? (
            <CommitInput
              key={`opts-${question.id}-${lang}`}
              dir={dir}
              value={(question.options ?? []).map((option) => option[lang] ?? "").filter((text) => text.trim()).join(", ")}
              placeholder={tx("optionsIn", { lang: tx(`lang_${lang}`) })}
              aria-label={tx("optionsIn", { lang: tx(`lang_${lang}`) })}
              onCommit={(text) => setQuestions((list) => list.map((item) => (item.id === question.id ? { ...item, options: setOptions(item.options, lang, text) } : item)))}
              style={{ marginInlineStart: 40, width: "calc(100% - 40px)", border: "1px dashed #c4c7bf", background: "#fafaf7" }}
            />
          ) : null}
        </div>
      ))}

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", paddingTop: 12 }}>
        <small style={{ fontSize: 11.5, color: "#737870", marginInlineEnd: 4 }}>{tx("addQuestion")}</small>
        {COMMON_QUESTION_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => addQuestion(type)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 32, padding: "0 10px", border: "1px dashed #c4c7bf", borderRadius: 6, background: "#fafaf7", color: "#252b28", fontSize: 11.5, fontWeight: 550 }}
          >
            <Svg d={FIELD_ICON[type]} size={13} stroke="#d71635" />
            {tx(`ft_${type}` as keyof typeof TEXT)}
          </button>
        ))}
      </div>
    </div>
  );
}

function BuiltinRow({
  field,
  settings,
  lang,
  dir,
  tx,
  onChange,
}: {
  field: CommonField;
  settings: CommonFieldSettings;
  lang: Loc;
  dir: "ltr" | "rtl";
  tx: Tx;
  onChange: (change: (current: CommonFieldSettings) => CommonFieldSettings) => void;
}) {
  const required = field.mode === "locked" || field.mode === "answered" || (field.mode === "free" && settings.required === true);
  const hidden = field.mode !== "locked" && settings.hidden === true;
  const why = field.mode === "locked" ? tx("locked") : field.mode === "answered" ? tx("answered") : field.mode === "optional" ? tx("optional") : undefined;

  return (
    <div style={{ ...ROW, opacity: hidden ? 0.5 : 1 }}>
      <div style={ROW_LINE}>
        <TypeIcon type={ICON_OF[field.type] ?? "text"} />
        <div style={{ flex: "1 1 300px", minWidth: 0 }} title={field.noLabel ? tx("noLabel") : undefined}>
          <CommitInput
            key={`${field.id}-${lang}`}
            dir={dir}
            value={settings.label?.[lang] ?? ""}
            placeholder={field.label[lang]}
            disabled={field.noLabel === true}
            aria-label={tx("labelIn", { lang: tx(`lang_${lang}`) })}
            onCommit={(text) => onChange((current) => ({ ...current, label: withLang(current.label, lang, text) }))}
          />
        </div>
        <span style={TYPE}>{tx(`ft_${field.type}` as keyof typeof TEXT)}</span>
        <Switch on={required} label={tx("required")} disabled={field.mode !== "free"} title={field.mode !== "free" ? why : undefined} onClick={() => onChange((current) => ({ ...current, required: !current.required }))} />
        <Switch on={!hidden} green label={tx("shown")} disabled={field.mode === "locked"} title={field.mode === "locked" ? why : undefined} onClick={() => onChange((current) => ({ ...current, hidden: !current.hidden }))} />
      </div>
    </div>
  );
}

// ── Pieces ────────────────────────────────────────────────────────────────

const ROW: CSSProperties = { display: "flex", flexDirection: "column", gap: 8, padding: "10px 0", borderBottom: "1px solid #f1f1ea" };
const ROW_LINE: CSSProperties = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" };
const TYPE: CSSProperties = { fontSize: 11, color: "#92958e", whiteSpace: "nowrap" };
const INPUT: CSSProperties = { width: "100%", height: 36, padding: "0 10px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 12.5, color: "#252b28" };

function Svg({ d, size, stroke = "currentColor", width = 1.9 }: { d: string; size: number; stroke?: string; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function TypeIcon({ type }: { type: MockType }) {
  return (
    <span style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 7, background: "#fff6f6", color: "#d71635", flex: "none" }}>
      <Svg d={FIELD_ICON[type]} size={15} />
    </span>
  );
}

/** The prototype's switch: red for Required, green for Shown; grey when off. */
function Switch({ on, label, onClick, disabled, title, green }: { on: boolean; label: string; onClick: () => void; disabled?: boolean; title?: string | undefined; green?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      title={title}
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 7, border: 0, background: "transparent", padding: 0, fontSize: 11.5, fontWeight: 550, color: "#252b28", whiteSpace: "nowrap", ...(disabled ? { cursor: "not-allowed", opacity: 0.7 } : null) }}
    >
      <span style={{ width: 30, height: 18, borderRadius: 9, background: on ? (green ? "#3f705a" : "#d71635") : "#d6d9d1", display: "flex", justifyContent: on ? "flex-end" : "flex-start", padding: 2, direction: "ltr" }}>
        <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#ffffff", boxShadow: "0 1px 2px #00000033" }} />
      </span>
      {label}
    </button>
  );
}

function IconButton({ label, d, onClick, disabled, danger }: { label: string; d: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      style={{ width: 28, height: 28, display: "grid", placeItems: "center", border: 0, borderRadius: 5, background: "transparent", color: danger ? "#92958e" : "#737870", padding: 0, ...(disabled ? { opacity: 0.4 } : null) }}
    >
      <Svg d={d} size={13} width={2.1} />
    </button>
  );
}

/** A text that saves when you leave it (or press Enter): every save is a draft round-trip. */
function CommitInput({
  value,
  onCommit,
  style,
  ...rest
}: {
  value: string;
  onCommit: (value: string) => void;
  style?: CSSProperties;
  dir?: "ltr" | "rtl";
  placeholder?: string | undefined;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const [text, setText] = useState(value);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);

  return (
    <input
      {...rest}
      value={text}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => {
        focused.current = false;
        if (text.trim() !== value.trim()) onCommit(text);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur();
      }}
      style={{ ...INPUT, ...(rest.disabled ? { background: "#fafaf7", color: "#92958e" } : null), ...style }}
    />
  );
}

function withLang(text: L4 | undefined, lang: Loc, value: string): L4 {
  const next: L4 = { ...(text ?? {}) };
  if (value.trim()) next[lang] = value.trim();
  else delete next[lang];
  return next;
}

/** Rewrites one language of a choice list from its comma-separated text, keeping the others by position. */
function setOptions(options: L4[] | undefined, lang: Loc, text: string): L4[] {
  const list = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const current = options ?? [];
  const others = current.reduce((last, option, index) => (LANGS.some((code) => code !== lang && option[code]?.trim()) ? index + 1 : last), 0);
  const out: L4[] = [];
  for (let index = 0; index < Math.max(list.length, others); index += 1) {
    const option: L4 = { ...(current[index] ?? {}) };
    const value = list[index];
    if (value) option[lang] = value;
    else delete option[lang];
    if (LANGS.some((code) => option[code]?.trim())) out.push(option);
  }
  return out;
}

function move<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir;
  if (target < 0 || target >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item!);
  return next;
}
