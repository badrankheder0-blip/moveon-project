"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { useDrafts } from "@/lib/admin/drafts";
import { dayKey } from "@/lib/admin/format";
import { defineText, useText } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";

import styles from "./page.module.css";

/**
 * Discount codes, as the admin prototype's screen lists them: a form to add a
 * code (percent or euro off, valid-until date, and who may use it — everyone
 * or named customer emails), and a table where every code can be edited in
 * place, switched off or removed, with how often it was used.
 *
 * Codes are configuration: each is one draft (domain "discounts", ref = the
 * code) and the booking flow accepts the new rules after "Save & publish".
 * A code that was already used is switched off rather than deleted, so past
 * orders still name it.
 */

const TEXT = defineText({
  discTitle: { de: "Rabattcodes", en: "Discount codes", ar: "أكواد الخصم", tr: "İndirim kodları" },
  discSub: {
    de: "Kunden geben sie im Schritt „Prüfen & Preis“ ein.",
    en: "Customers enter these on the Review & price step.",
    ar: "يدخلها الزبون في خطوة المراجعة والسعر.",
    tr: "Müşteriler bunları “Kontrol ve fiyat” adımında girer.",
  },
  code: { de: "Code", en: "Code", ar: "الكود", tr: "Kod" },
  type: { de: "Art", en: "Type", ar: "النوع", tr: "Tür" },
  value: { de: "Wert", en: "Value", ar: "القيمة", tr: "Değer" },
  expires: { de: "Gültig bis", en: "Valid until", ar: "صالح حتى", tr: "Geçerlilik sonu" },
  addCode: { de: "Code hinzufügen", en: "Add code", ar: "إضافة كود", tr: "Kod ekle" },
  percent: { de: "% Rabatt", en: "% off", ar: "نسبة %", tr: "% indirim" },
  fixed: { de: "€ Rabatt", en: "€ off", ar: "مبلغ €", tr: "€ indirim" },
  codeMissing: { de: "Gib einen Code und einen Wert über 0 ein.", en: "Enter a code and a value above 0.", ar: "أدخل الكود وقيمة أكبر من 0.", tr: "Bir kod ve 0'dan büyük bir değer girin." },
  codeExists: { de: "Diesen Code gibt es schon.", en: "This code already exists.", ar: "هذا الكود موجود مسبقاً.", tr: "Bu kod zaten var." },
  codeNoEmail: { de: "Füge mindestens eine Kunden-E-Mail hinzu.", en: "Add at least one customer email.", ar: "أضف بريد زبون واحد على الأقل.", tr: "En az bir müşteri e-postası ekleyin." },
  codeBad: {
    de: "Nutze 3–32 Buchstaben, Ziffern, Bindestriche oder Unterstriche.",
    en: "Use 3–32 letters, digits, hyphens or underscores.",
    ar: "استخدم من 3 إلى 32 حرفاً أو رقماً أو شرطة.",
    tr: "3–32 harf, rakam, tire veya alt çizgi kullanın.",
  },
  badEmails: { de: "Keine gültigen E-Mails: {list}", en: "Not valid emails: {list}", ar: "عناوين بريد غير صالحة: {list}", tr: "Geçersiz e-postalar: {list}" },
  percentMax: { de: "Ein Prozentwert kann nicht über 100 liegen.", en: "A percentage can’t be more than 100.", ar: "لا يمكن أن تتجاوز النسبة 100.", tr: "Yüzde 100'den fazla olamaz." },
  badValue: { de: "Gib einen Wert über 0 ein.", en: "Enter a value above 0.", ar: "أدخل قيمة أكبر من 0.", tr: "0'dan büyük bir değer girin." },
  discFor: { de: "Wer ihn nutzen darf", en: "Who can use it", ar: "من يستطيع استخدامه", tr: "Kimler kullanabilir" },
  discForCol: { de: "FÜR", en: "FOR", ar: "لمن", tr: "KİME" },
  discAll: { de: "Alle", en: "Everyone", ar: "الجميع", tr: "Herkes" },
  discOne: { de: "Bestimmte Kunden", en: "Specific customers", ar: "زبائن محددون", tr: "Belirli müşteriler" },
  discEmails: { de: "Kunden-E-Mail", en: "Customer email", ar: "بريد الزبون", tr: "Müşteri e-postası" },
  discEmailsPh: { de: "name@email.com, another@email.com", en: "name@email.com, another@email.com", ar: "name@email.com, another@email.com", tr: "name@email.com, another@email.com" },
  discEmailsHint: {
    de: "Trenne mehrere E-Mails mit Kommas. Der Code gilt nur, wenn die Buchung eine dieser E-Mails nutzt.",
    en: "Separate several emails with commas. The code only works when the booking uses one of these emails.",
    ar: "افصل بين عدة عناوين بفاصلة. يعمل الكود فقط إذا كان الحجز بأحد هذه العناوين.",
    tr: "Birden fazla e-postayı virgülle ayırın. Kod yalnızca rezervasyon bu e-postalardan biriyle yapılırsa geçerlidir.",
  },
  used: { de: "Genutzt", en: "Used", ar: "الاستخدام", tr: "Kullanım" },
  activeCol: { de: "Aktiv", en: "Active", ar: "فعّال", tr: "Etkin" },
  expired: { de: "Abgelaufen", en: "Expired", ar: "منتهي", tr: "Süresi doldu" },
  noExpiry: { de: "Ohne Enddatum", en: "No end date", ar: "بدون تاريخ انتهاء", tr: "Bitiş tarihi yok" },
  remove: { de: "Entfernen", en: "Remove", ar: "حذف", tr: "Kaldır" },
  usedOff: {
    de: "Dieser Code wurde {n}× genutzt und wird daher abgeschaltet statt gelöscht.",
    en: "This code was used {n}×, so it is switched off instead of deleted.",
    ar: "استُخدم هذا الكود {n} مرة، لذلك سيتم إيقافه بدلاً من حذفه.",
    tr: "Bu kod {n} kez kullanıldı, bu yüzden silinmek yerine kapatılıyor.",
  },
  edited: { de: "Nicht veröffentlicht", en: "Unpublished", ar: "غير منشور", tr: "Yayınlanmadı" },
  empty: { de: "Noch keine Rabattcodes.", en: "No discount codes yet.", ar: "لا توجد أكواد خصم بعد.", tr: "Henüz indirim kodu yok." },
  saveFailed: { de: "Die Änderung konnte nicht gespeichert werden.", en: "The change could not be saved.", ar: "تعذّر حفظ التغيير.", tr: "Değişiklik kaydedilemedi." },
  loadFailed: { de: "Die Rabattcodes konnten nicht geladen werden.", en: "The discount codes could not be loaded.", ar: "تعذّر تحميل أكواد الخصم.", tr: "İndirim kodları yüklenemedi." },
  retry: { de: "Erneut versuchen", en: "Try again", ar: "حاول مجدداً", tr: "Tekrar dene" },
});

type Kind = "percentage" | "fixed";

interface CodeValue {
  kind: Kind;
  value: string;
  validUntil: string | null;
  isActive: boolean;
  audience: string[];
}

interface LiveCode {
  code: string;
  kind: Kind;
  value: string;
  isActive: boolean;
  validUntilDate: string | null;
  audience: string[];
  uses: number;
}

interface Row extends CodeValue {
  code: string;
  uses: number;
  published: boolean;
}

type DraftValue = CodeValue | { deleted: true };
const isDeleted = (value: unknown): value is { deleted: true } => Boolean(value && typeof value === "object" && "deleted" in value);

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;
const CODE = /^[A-Z0-9_-]{3,32}$/;
const DECIMAL = /^\d{1,6}(\.\d{1,2})?$/;
const PLUS = "M12 5v14M5 12h14";
const TRASH = "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6";

/** Splits a typed list of emails, keeping the ones that look like emails. */
function parseEmails(text: string): { valid: string[]; invalid: string[] } {
  const parts = text
    .split(/[\s,;]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  return { valid: [...new Set(parts.filter((part) => EMAIL.test(part)))], invalid: parts.filter((part) => !EMAIL.test(part)) };
}

/** "10.00" → "10", "12.50" → "12.5": how the prototype shows a stored value. */
const showValue = (value: string) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? String(n) : value;
};

const normaliseValue = (text: string) => text.replace(/[^\d.,]/g, "").replace(",", ".");

export default function DiscountsPage() {
  const { sdk } = useApi();
  const tx = useText(TEXT);
  const toast = useToast();
  const drafts = useDrafts("discounts");

  const [form, setForm] = useState({ code: "", kind: "percentage" as Kind, value: "", expires: "", audience: "all" as "all" | "one", to: "" });
  const [error, setError] = useState("");
  const [local, setLocal] = useState<Record<string, DraftValue>>({});

  const live = useQuery({
    queryKey: ["admin", "discounts"],
    queryFn: () => sdk.http.get<{ codes: LiveCode[] }>("/api/discounts"),
  });
  const emails = useQuery({
    queryKey: ["admin", "discounts", "emails"],
    queryFn: () => sdk.http.get<{ emails: string[] }>("/api/discounts/customer-emails"),
    staleTime: 60_000,
  });

  const rows = useMemo(() => {
    const codes = live.data?.codes ?? [];
    const byCode = new Map(codes.map((row) => [row.code, row]));
    // Live codes keep their place; codes added since the last publish follow.
    const keys = [...new Set([...codes.map((row) => row.code), ...drafts.drafts.keys(), ...Object.keys(local)])];
    const out: Row[] = [];
    for (const code of keys) {
      const draft = (local[code] ?? drafts.drafts.get(code)) as DraftValue | undefined;
      const base = byCode.get(code);
      if (isDeleted(draft)) continue;
      if (draft) out.push({ ...draft, code, uses: base?.uses ?? 0, published: Boolean(base) });
      else if (base)
        out.push({ code, kind: base.kind, value: base.value, validUntil: base.validUntilDate, isActive: base.isActive, audience: base.audience ?? [], uses: base.uses, published: true });
    }
    return out;
  }, [live.data, drafts.drafts, local]);

  async function write(code: string, value: DraftValue) {
    setLocal((current) => ({ ...current, [code]: value }));
    try {
      await drafts.set(code, value);
    } catch (caught) {
      toast(caught instanceof ApiError && caught.message ? caught.message : tx("saveFailed"));
    } finally {
      setLocal((current) => {
        if (current[code] !== value) return current;
        const next = { ...current };
        delete next[code];
        return next;
      });
    }
  }

  const update = (row: Row, patch: Partial<CodeValue>) => {
    const { kind, value, validUntil, isActive, audience } = { ...row, ...patch };
    void write(row.code, { kind, value, validUntil, isActive, audience });
  };

  /** A value as typed, checked for its kind; null (after saying why) if it can't be saved. */
  function checkValue(text: string, kind: Kind): string | null {
    const clean = normaliseValue(text);
    if (!DECIMAL.test(clean) || !(Number.parseFloat(clean) > 0)) {
      toast(tx("badValue"));
      return null;
    }
    if (kind === "percentage" && Number.parseFloat(clean) > 100) {
      toast(tx("percentMax"));
      return null;
    }
    return clean;
  }

  function addCode() {
    const code = form.code.trim().toUpperCase();
    const value = normaliseValue(form.value);
    if (!code || !DECIMAL.test(value) || !(Number.parseFloat(value) > 0)) return setError(tx("codeMissing"));
    if (!CODE.test(code)) return setError(tx("codeBad"));
    if (form.kind === "percentage" && Number.parseFloat(value) > 100) return setError(tx("percentMax"));
    if (rows.some((row) => row.code === code)) return setError(tx("codeExists"));
    const audience = form.audience === "one" ? parseEmails(form.to) : { valid: [], invalid: [] };
    if (form.audience === "one" && audience.invalid.length) return setError(tx("badEmails", { list: audience.invalid.join(", ") }));
    if (form.audience === "one" && !audience.valid.length) return setError(tx("codeNoEmail"));

    void write(code, { kind: form.kind, value, validUntil: form.expires || null, isActive: true, audience: audience.valid });
    setForm({ code: "", kind: "percentage", value: "", expires: "", audience: "all", to: "" });
    setError("");
  }

  function remove(row: Row) {
    if (row.uses > 0) {
      toast(tx("usedOff", { n: row.uses }));
      update(row, { isActive: false });
    } else if (!row.published) void drafts.revert(row.code).catch(() => toast(tx("saveFailed")));
    else void write(row.code, { deleted: true });
  }

  const today = dayKey(new Date());
  const typeOptions: { v: Kind; label: string }[] = [
    { v: "percentage", label: tx("percent") },
    { v: "fixed", label: tx("fixed") },
  ];

  return (
    <AdminShell view="discounts">
      <section data-screen-label="Discounts" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "var(--a-ls-h1)", lineHeight: 1.2 }}>{tx("discTitle")}</h1>
          <p style={{ color: "#737870", fontSize: 13, marginTop: 6 }}>{tx("discSub")}</p>
        </div>

        <div style={{ ...card, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label style={{ ...label, flex: "1 1 180px" }}>
              {tx("code")}
              <input
                dir="ltr"
                value={form.code}
                maxLength={32}
                placeholder="SUMMER15"
                onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                onKeyDown={(event) => event.key === "Enter" && addCode()}
                style={{ ...input, fontWeight: 650, letterSpacing: 0.5 }}
              />
            </label>
            <label style={{ ...label, flex: "0 1 140px" }}>
              {tx("type")}
              <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as Kind })} style={{ ...input, padding: "0 10px", fontWeight: 400 }}>
                {typeOptions.map((option) => (
                  <option key={option.v} value={option.v}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ ...label, flex: "0 1 120px" }}>
              {tx("value")}
              <input
                value={form.value}
                inputMode="decimal"
                placeholder="10"
                onChange={(event) => setForm({ ...form, value: event.target.value })}
                onKeyDown={(event) => event.key === "Enter" && addCode()}
                style={{ ...input, fontWeight: 600 }}
              />
            </label>
            <label style={{ ...label, flex: "0 1 170px" }}>
              {tx("expires")}
              <input type="date" value={form.expires} onChange={(event) => setForm({ ...form, expires: event.target.value })} style={{ ...input, padding: "0 10px", fontWeight: 400 }} />
            </label>
            <button type="button" className={styles.redBtn} onClick={addCode} style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 41, padding: "0 16px", border: "1px solid #d71635", borderRadius: 6, background: "#d71635", color: "#ffffff", fontSize: 12, fontWeight: 600 }}>
              <Svg d={PLUS} size={14} width={2.4} />
              {tx("addCode")}
            </button>
          </div>
          <div style={{ display: "flex", gap: "10px 14px", alignItems: "flex-end", flexWrap: "wrap", paddingTop: 4 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "#737870" }}>
              {tx("discFor")}
              <div role="group" aria-label={tx("discFor")} style={{ display: "inline-flex", padding: 3, border: "1px solid #cfd3cb", borderRadius: 8, background: "#ffffff" }}>
                {(["all", "one"] as const).map((key) => {
                  const on = form.audience === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setForm({ ...form, audience: key })}
                      style={{ minHeight: 33, padding: "0 14px", border: 0, borderRadius: 6, background: on ? "#252b28" : "transparent", color: on ? "#ffffff" : "#252b28", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
                    >
                      {key === "all" ? tx("discAll") : tx("discOne")}
                    </button>
                  );
                })}
              </div>
            </div>
            {form.audience === "one" ? (
              <label style={{ ...label, flex: "1 1 300px" }}>
                {tx("discEmails")}
                <input
                  dir="auto"
                  list="mon-cust-emails"
                  value={form.to}
                  placeholder={tx("discEmailsPh")}
                  onChange={(event) => setForm({ ...form, to: event.target.value })}
                  style={{ ...input, fontWeight: 400 }}
                />
              </label>
            ) : null}
          </div>
          {form.audience === "one" ? <small style={{ fontSize: 11.5, color: "#92958e" }}>{tx("discEmailsHint")}</small> : null}
          <datalist id="mon-cust-emails">
            {(emails.data?.emails ?? []).map((email) => (
              <option key={email} value={email} />
            ))}
          </datalist>
          {error ? (
            <small role="alert" style={{ fontSize: 12, color: "#d71635", fontWeight: 550 }}>
              {error}
            </small>
          ) : null}
        </div>

        {live.isError ? (
          <div className="a-note is-error" role="alert">
            <span style={{ flex: 1 }}>{tx("loadFailed")}</span>
            <button type="button" className="a-btn is-sm is-ghost" onClick={() => void live.refetch()}>
              {tx("retry")}
            </button>
          </div>
        ) : null}

        <div style={{ ...card, overflow: "hidden" }}>
          <div className={styles.wideOnly} style={{ display: "flex", gap: 14, padding: "11px 20px", background: "#fafaf7", borderBottom: "1px solid #e3e5de", fontSize: 10.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#737870" }}>
            <span style={{ flex: "1 1 160px" }}>{tx("code")}</span>
            <span style={{ flex: "1 1 200px" }}>{tx("discForCol")}</span>
            <span style={{ flex: "0 0 120px" }}>{tx("type")}</span>
            <span style={{ flex: "0 0 96px" }}>{tx("value")}</span>
            <span style={{ flex: "0 0 160px" }}>{tx("expires")}</span>
            <span style={{ flex: "0 0 70px" }}>{tx("used")}</span>
            <span style={{ flex: "0 0 110px" }}>{tx("activeCol")}</span>
            <span style={{ width: 32 }} />
          </div>
          {live.isLoading ? (
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="a-skel" />
              <div className="a-skel" style={{ width: "70%" }} />
            </div>
          ) : rows.length === 0 ? (
            <p style={{ padding: "22px 20px", fontSize: 12.5, color: "#737870" }}>{tx("empty")}</p>
          ) : (
            rows.map((row) => {
              const expired = Boolean(row.validUntil && row.validUntil < today);
              const dim = !row.isActive || expired ? 0.6 : 1;
              return (
                <div key={row.code} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 14px", padding: "12px 20px", borderBottom: "1px solid #eef0ea" }}>
                  <span style={{ flex: "1 1 160px", display: "flex", alignItems: "center", gap: 8, opacity: dim }}>
                    <b dir="ltr" style={{ padding: "5px 9px", border: "1px dashed #d71635", borderRadius: 5, fontSize: 13, fontWeight: 700, letterSpacing: 0.6, color: "#252b28" }}>
                      {row.code}
                    </b>
                    {expired ? <span style={{ padding: "3px 7px", borderRadius: 4, background: "#fff6f6", color: "#b7122b", fontSize: 10.5, fontWeight: 650 }}>{tx("expired")}</span> : null}
                    {drafts.edited(row.code) ? <i title={tx("edited")} style={{ display: "block", width: 7, height: 7, borderRadius: "50%", background: "#ffcb08" }} /> : null}
                  </span>
                  <label style={{ flex: "1 1 200px", minWidth: 0, display: "flex", alignItems: "center", gap: 7, height: 36, padding: "0 10px", border: "1px solid #cfd3cb", borderRadius: 6, background: row.audience.length ? "#fff6f6" : "#ffffff" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#737870" strokeWidth="1.9" strokeLinecap="round" style={{ flex: "none" }} aria-hidden="true">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21a8 8 0 0 1 16 0" />
                    </svg>
                    <CommitText
                      dir="auto"
                      list="mon-cust-emails"
                      value={row.audience.join(", ")}
                      placeholder={tx("discAll")}
                      aria-label={tx("discForCol")}
                      title={tx("discEmailsHint")}
                      onCommit={(text) => {
                        const parsed = parseEmails(text);
                        if (parsed.invalid.length) {
                          toast(tx("badEmails", { list: parsed.invalid.join(", ") }));
                          return false;
                        }
                        update(row, { audience: parsed.valid });
                        return true;
                      }}
                      style={{ flex: 1, width: "100%", minWidth: 0, border: 0, padding: 0, background: "transparent", fontSize: 12.5, color: "#252b28", boxShadow: "none" }}
                    />
                  </label>
                  <select
                    value={row.kind}
                    aria-label={tx("type")}
                    onChange={(event) => {
                      const kind = event.target.value as Kind;
                      if (kind === "percentage" && Number.parseFloat(row.value) > 100) return toast(tx("percentMax"));
                      update(row, { kind });
                    }}
                    style={{ flex: "0 0 120px", height: 36, padding: "0 8px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 12.5 }}
                  >
                    {typeOptions.map((option) => (
                      <option key={option.v} value={option.v}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <CommitText
                    value={showValue(row.value)}
                    inputMode="decimal"
                    aria-label={tx("value")}
                    onCommit={(text) => {
                      const value = checkValue(text, row.kind);
                      if (value === null) return false;
                      update(row, { value });
                      return true;
                    }}
                    style={{ flex: "0 0 96px", width: 96, height: 36, padding: "0 10px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, fontWeight: 600 }}
                  />
                  <input
                    type="date"
                    value={row.validUntil ?? ""}
                    aria-label={tx("expires")}
                    title={tx("noExpiry")}
                    onChange={(event) => update(row, { validUntil: event.target.value || null })}
                    style={{ flex: "0 0 160px", width: 160, height: 36, padding: "0 8px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 12.5 }}
                  />
                  <span className="a-num" style={{ flex: "0 0 70px", fontSize: 13, fontWeight: 600 }}>
                    <bdi dir="ltr">{row.uses}×</bdi>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={row.isActive}
                    onClick={() => update(row, { isActive: !row.isActive })}
                    style={{ flex: "0 0 110px", display: "flex", alignItems: "center", gap: 8, border: 0, background: "transparent", padding: 0, fontSize: 12, fontWeight: 550, color: "#252b28" }}
                  >
                    <span style={{ width: 34, height: 20, borderRadius: 10, background: row.isActive ? "#d71635" : "#d6d9d1", display: "flex", justifyContent: row.isActive ? "flex-end" : "flex-start", padding: 2, flex: "none" }}>
                      <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#ffffff", boxShadow: "0 1px 2px #00000033" }} />
                    </span>
                    {tx("activeCol")}
                  </button>
                  <button
                    type="button"
                    className={styles.trash}
                    aria-label={tx("remove")}
                    title={tx("remove")}
                    onClick={() => remove(row)}
                    style={{ width: 32, height: 32, display: "grid", placeItems: "center", border: 0, borderRadius: 5, background: "transparent", color: "#92958e", padding: 0 }}
                  >
                    <Svg d={TRASH} size={14} width={2} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>
    </AdminShell>
  );
}

/** Saves on leaving the field; `onCommit` returns false to put the saved value back. */
function CommitText({
  value,
  onCommit,
  ...rest
}: {
  value: string;
  onCommit: (value: string) => boolean;
  dir?: "ltr" | "rtl" | "auto";
  list?: string;
  placeholder?: string;
  inputMode?: "decimal" | "text";
  title?: string;
  style?: CSSProperties;
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
        if (text !== value && !onCommit(text)) setText(value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur();
      }}
    />
  );
}

function Svg({ d, size = 18, width = 1.8 }: { d: string; size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const card: CSSProperties = { background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, boxShadow: "0 12px 36px #202a2308" };
const label: CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "#737870", minWidth: 0 };
const input: CSSProperties = { width: "100%", height: 41, padding: "0 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, color: "#252b28" };
