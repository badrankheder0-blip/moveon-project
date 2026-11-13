"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { SERVICE_TEXT } from "@/lib/admin/format";
import { defineText, useText, type TextFn } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { optionValue, textAny, type CatalogService, type CommonFlow, type FlowQuestion } from "@/lib/booking/catalog";
import { useI18n } from "@/lib/i18n/provider";

import { BOOKING_TEXT, buildBookingInfo, type ExtraQuestion, type FieldView, type ListItem } from "./booking";
import type { OrderDetail } from "./types";

/**
 * The questions the office added to the booking flow that concern this
 * order: every question of its service's published flow (so the team can
 * fill in one asked after the booking), and any other answer it carries —
 * a question since moved or removed keeps its last known label, or its id.
 */
function useExtraQuestions(order: OrderDetail): ExtraQuestion[] {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const { data } = useQuery({
    queryKey: ["admin", "services", "all"],
    queryFn: () => sdk.http.get<{ services: CatalogService[]; common?: CommonFlow }>("/api/services/all"),
    staleTime: 60_000,
  });

  return useMemo(() => {
    const services = data?.services ?? [];
    const common = data?.common ?? [];
    const toQuestion = (step: string, question: FlowQuestion): ExtraQuestion => ({
      key: `extra.${step}.${question.id}`,
      step,
      label: textAny(question.label, locale) || question.id,
      type: question.type,
      required: question.required,
      options: (question.options ?? []).map((option) => [optionValue(option), textAny(option, locale)] as [string, string]),
    });

    const out = new Map<string, ExtraQuestion>();
    // Asked of every customer (Booking site → Common steps).
    for (const entry of common) for (const question of entry.questions ?? []) out.set(`extra.${entry.id}.${question.id}`, toQuestion(entry.id, question));
    const own = services.find((service) => service.key === order.serviceType);
    for (const entry of own?.flow ?? []) for (const question of entry.questions ?? []) out.set(`extra.${entry.id}.${question.id}`, toQuestion(entry.id, question));

    for (const key of Object.keys(order.answers ?? {})) {
      const match = /^extra\.([^.]+)\.(.+)$/.exec(key);
      if (!match || out.has(key)) continue;
      const [, step, id] = match as unknown as [string, string, string];
      const found = [...services.flatMap((service) => service.flow), ...common]
        .filter((entry) => entry.id === step)
        .flatMap((entry) => entry.questions ?? [])
        .find((question) => question.id === id);
      out.set(key, found ? toQuestion(step, found) : { key, step, label: id, type: "text", required: false, options: [] });
    }
    return [...out.values()];
  }, [data, order.serviceType, order.answers, locale]);
}

/**
 * The booking-completeness editor: how many of the required answers the
 * order has, every step of the booking with its answers, and a control per
 * answer for the team to fill in what is missing after calling the customer.
 * Each change is saved at once and marked "Added by team".
 */

const TEXT = defineText({
  infoTitle: { de: "Buchungsangaben", en: "Booking information", ar: "معلومات الحجز", tr: "Rezervasyon bilgileri" },
  infoSub: { de: "{a} von {b} Pflichtangaben", en: "{a} of {b} required answers", ar: "{a} من {b} إجابات مطلوبة", tr: "{b} zorunlu yanıttan {a}" },
  infoHint: {
    de: "Ergänzen Sie Fehlendes nach dem Gespräch mit dem Kunden. Ihre Änderungen werden als „Vom Team ergänzt“ markiert.",
    en: "Fill in anything missing after you talk to the customer. Your changes are marked “Added by team”.",
    ar: "أكمل أي معلومة ناقصة بعد التواصل مع الزبون. تظهر تعديلاتك بعلامة «أضافه الفريق».",
    tr: "Müşteriyle konuştuktan sonra eksikleri tamamlayın. Değişiklikleriniz “Ekip ekledi” olarak işaretlenir.",
  },
  onlyMissing: { de: "Nur fehlende", en: "Missing only", ar: "الناقص فقط", tr: "Sadece eksikler" },
  complete: { de: "Vollständig", en: "Complete", ar: "مكتمل", tr: "Tamamlandı" },
  missing: { de: "Fehlt", en: "Missing", ar: "ناقص", tr: "Eksik" },
  missingN: { de: "{n} fehlen", en: "{n} missing", ar: "{n} ناقصة", tr: "{n} eksik" },
  byTeam: { de: "Vom Team ergänzt", en: "Added by team", ar: "أضافه الفريق", tr: "Ekip ekledi" },
  notNeeded: { de: "Nicht nötig", en: "Not needed", ar: "غير مطلوب", tr: "Gerekmiyor" },
  yes: { de: "Ja", en: "Yes", ar: "نعم", tr: "Evet" },
  no: { de: "Nein", en: "No", ar: "لا", tr: "Hayır" },
  nothingProvided: { de: "Keine Angaben.", en: "Nothing provided.", ar: "لم تُرسل معلومات.", tr: "Bilgi verilmedi." },
  generalInfo: { de: "Allgemein", en: "General", ar: "معلومات عامة", tr: "Genel" },
  flowWord: { de: "Ablauf", en: "flow", ar: "الخطوات", tr: "akış" },
});

const CHECK = "M20 6 9 17l-5-5";

export function BookingInfo({
  order,
  editable,
  onSave,
}: {
  order: OrderDetail;
  editable: boolean;
  onSave: (answers: Record<string, string>) => void;
}) {
  const tx = useText(TEXT);
  const bx = useText(BOOKING_TEXT);
  const sx = useText(SERVICE_TEXT);
  const { dir } = useI18n();
  const [onlyMissing, setOnlyMissing] = useState(false);

  const serviceName = (key: string) => (key in SERVICE_TEXT ? sx(key as keyof typeof SERVICE_TEXT) : key);
  const questions = useExtraQuestions(order);
  const info = useMemo(
    () => buildBookingInfo(order, bx, serviceName, tx("flowWord"), tx("generalInfo"), onlyMissing, questions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [order, bx, tx, onlyMissing, questions],
  );

  const pctColor = info.pct === 100 ? "#3f705a" : info.pct >= 75 ? "#252b28" : "#d71635";
  const ls = dir === "rtl" ? "0" : undefined;

  return (
    <>
      <div style={{ background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 12, boxShadow: "0 12px 36px #202a2308", padding: "18px 20px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <b style={{ fontSize: 36, fontWeight: 650, letterSpacing: "-1.4px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: pctColor }}>
          <span dir="ltr">{info.pct}%</span>
        </b>
        <div style={{ flex: "1 1 240px", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <b style={{ fontSize: 13.5, fontWeight: 650 }}>{tx("infoTitle")}</b>
            <span style={{ fontSize: 12, color: "#737870", whiteSpace: "nowrap" }}>{tx("infoSub", { a: info.done, b: info.total })}</span>
          </div>
          <div dir="ltr" style={{ height: 8, borderRadius: 4, background: "#f1f1ea", overflow: "hidden" }}>
            <div style={{ width: `${info.pct}%`, height: "100%", borderRadius: 4, background: pctColor, transition: "width .3s" }} />
          </div>
          <small style={{ fontSize: 11.5, color: "#737870", lineHeight: 1.5 }}>{tx("infoHint")}</small>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={onlyMissing}
          onClick={() => setOnlyMissing((on) => !on)}
          style={{ display: "flex", alignItems: "center", gap: 9, border: 0, background: "transparent", padding: 0, fontSize: 12, fontWeight: 600, color: "#252b28" }}
        >
          <span style={{ width: 34, height: 20, borderRadius: 10, background: onlyMissing ? "#d71635" : "#d6d9d1", display: "flex", justifyContent: onlyMissing ? "flex-end" : "flex-start", padding: 2, direction: "ltr" }}>
            <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#ffffff", boxShadow: "0 1px 2px #00000033" }} />
          </span>
          {tx("onlyMissing")}
        </button>
      </div>

      {info.sections.map((section) => (
        <div key={section.title} style={{ display: "contents" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 2px 0" }}>
            <i style={{ display: "block", width: 10, height: 10, borderRadius: 3, background: section.color, flex: "none" }} />
            <h2 style={{ fontSize: 17, fontWeight: 650, letterSpacing: ls ?? "-0.3px", whiteSpace: "nowrap" }}>{section.title}</h2>
            <i style={{ flex: 1, display: "block", height: 1, background: "#e3e5de" }} />
            <small style={{ fontSize: 11.5, fontWeight: 650, color: section.miss ? "#b7122b" : "#3f705a", whiteSpace: "nowrap" }}>
              {section.miss ? tx("missingN", { n: section.miss }) : tx("complete")}
            </small>
          </div>
          {section.steps.map((step) => (
            <div key={step.id} style={{ background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 12, boxShadow: "0 12px 36px #202a2308", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid #eef0ea", background: "#fafaf7" }}>
                <span style={{ width: 26, height: 26, display: "grid", placeItems: "center", border: "1px solid #d71635", borderRadius: "50%", fontSize: 10, fontWeight: 600, color: "#737870", flex: "none" }}>{step.n}</span>
                <b style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 650 }}>{step.title}</b>
                {step.miss > 0 ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 9px", borderRadius: 999, background: "#fff6f6", color: "#b7122b", fontSize: 11, fontWeight: 700 }}>
                    <i style={{ display: "block", width: 6, height: 6, borderRadius: "50%", background: "#d71635" }} />
                    {tx("missingN", { n: step.miss })}
                  </span>
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 999, background: "#edf5ed", color: "#3f705a", fontSize: 11, fontWeight: 700 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={CHECK} />
                    </svg>
                    {tx("complete")}
                  </span>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,240px),1fr))", gap: "16px 18px", padding: "18px 20px 20px" }}>
                {step.fields.map((field, i) =>
                  field.kind === "head" ? (
                    <div key={`h${i}`} style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, fontSize: 10.5, fontWeight: 650, letterSpacing: ls ?? "1.5px", color: "#737870" }}>
                      <span style={{ whiteSpace: "nowrap" }}>{field.label}</span>
                      <i style={{ flex: 1, display: "block", height: 1, background: "#eef0ea" }} />
                    </div>
                  ) : (
                    <Field key={field.id} field={field} editable={editable} onSave={(value) => onSave({ [field.id]: value })} serviceName={serviceName} tx={tx} />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function Field({
  field,
  editable,
  onSave,
  serviceName,
  tx,
}: {
  field: FieldView;
  editable: boolean;
  onSave: (value: string) => void;
  serviceName: (key: string) => string;
  tx: TextFn<typeof TEXT>;
}) {
  const border = field.missing ? "#d71635" : "#cfd3cb";
  const bg = field.missing ? "#fff6f6" : "#ffffff";
  const text = typeof field.value === "string" ? field.value : "";
  const [draft, setDraft] = useState(text);
  useEffect(() => setDraft(text), [text]);

  const commit = (value: string) => {
    if (value !== text) onSave(value);
  };
  const pill = (bgc: string, fg: string, label: string, weight = 700) => (
    <span style={{ padding: "2px 7px", borderRadius: 999, background: bgc, color: fg, fontSize: 10, fontWeight: weight }}>{label}</span>
  );

  return (
    <div style={{ gridColumn: field.span ? "1 / -1" : "auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 6, opacity: field.na ? 0.5 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minHeight: 20 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#4a514d" }}>{field.label}</span>
        {field.req ? <b style={{ color: "#d71635", fontSize: 12 }}>*</b> : null}
        {field.missing ? pill("#d71635", "#ffffff", tx("missing")) : null}
        {field.byTeam ? pill("#fbf4e4", "#5c4a00", tx("byTeam")) : null}
        {field.na ? pill("#f1f1ea", "#737870", tx("notNeeded"), 650) : null}
      </div>

      {field.type === "text" ? (
        <input
          value={draft}
          disabled={!editable}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="—"
          style={{ width: "100%", height: 40, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, background: bg, fontSize: 13, opacity: 1 }}
        />
      ) : null}

      {field.type === "textarea" ? (
        <textarea
          value={draft}
          disabled={!editable}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          rows={2}
          placeholder="—"
          style={{ width: "100%", padding: "9px 12px", border: `1px solid ${border}`, borderRadius: 6, background: bg, fontSize: 13, lineHeight: 1.5, resize: "vertical" }}
        />
      ) : null}

      {field.type === "number" ? (
        <span style={{ display: "flex", alignItems: "center", height: 40, border: `1px solid ${border}`, borderRadius: 6, background: bg, overflow: "hidden", direction: "ltr" }}>
          <input
            value={draft}
            disabled={!editable}
            inputMode="decimal"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commit(draft.trim())}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            placeholder="—"
            style={{ flex: 1, minWidth: 0, height: "100%", border: 0, padding: "0 12px", background: "transparent", fontSize: 13, fontWeight: 600, boxShadow: "none", outline: "none" }}
          />
          {field.unit ? (
            <span style={{ height: "100%", display: "flex", alignItems: "center", padding: "0 12px", borderLeft: "1px solid #e3e5de", background: "#fafaf7", color: "#737870", fontSize: 12 }}>{field.unit}</span>
          ) : null}
        </span>
      ) : null}

      {field.type === "select" ? (
        <select
          value={text}
          disabled={!editable}
          onChange={(e) => commit(e.target.value)}
          style={{ width: "100%", height: 40, padding: "0 10px", border: `1px solid ${border}`, borderRadius: 6, background: bg, fontSize: 13 }}
        >
          <option value="">—</option>
          {field.opts.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      ) : null}

      {field.type === "yesno" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {(["yes", "no"] as const).map((option) => {
            const on = text === option;
            return (
              <button
                key={option}
                type="button"
                disabled={!editable}
                aria-pressed={on}
                onClick={() => commit(option)}
                style={{ minHeight: 40, border: `1px solid ${field.missing ? "#d71635" : "#cfd3cb"}`, borderRadius: 6, background: on ? "#252b28" : "#ffffff", color: on ? "#ffffff" : "#252b28", fontSize: 12.5, fontWeight: 600, opacity: 1 }}
              >
                {tx(option)}
              </button>
            );
          })}
        </div>
      ) : null}

      {field.type === "counter" ? (
        <span dir="ltr" style={{ display: "inline-flex", alignItems: "center", alignSelf: "flex-start", height: 40, border: `1px solid ${border}`, borderRadius: 6, background: bg, overflow: "hidden" }}>
          <button type="button" aria-label="−" disabled={!editable} onClick={() => commit(String(Math.max(0, (Number(text) || 0) - 1)))} style={{ width: 40, height: "100%", border: 0, background: "transparent", color: "#737870", fontSize: 17 }}>
            −
          </button>
          <b style={{ minWidth: 38, textAlign: "center", fontSize: 13.5, fontVariantNumeric: "tabular-nums" }}>{text === "" ? "—" : String(Number(text) || 0)}</b>
          <button type="button" aria-label="+" disabled={!editable} onClick={() => commit(String((Number(text) || 0) + 1))} style={{ width: 40, height: "100%", border: 0, background: "transparent", color: "#d71635", fontSize: 17 }}>
            +
          </button>
        </span>
      ) : null}

      {field.type === "multi" || field.type === "services" ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(field.type === "services" ? (["moving", "renovation", "cleaning", "disposal"] as const).map((k) => [k, serviceName(k)] as [string, string]) : field.opts).map(([value, label]) => {
            const selected = (field.value as string[]).includes(value);
            const list = field.value as string[];
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                // The booked service is a fact of the order, not an answer to change here.
                disabled={!editable || field.type === "services"}
                onClick={() => commit((selected ? list.filter((v) => v !== value) : [...list, value]).join(","))}
                style={{
                  minHeight: 34,
                  padding: "0 12px",
                  border: `1px solid ${selected ? "#d71635" : "#e3e5de"}`,
                  borderRadius: 999,
                  background: selected ? "#fff6f6" : "#ffffff",
                  color: selected ? "#b7122b" : "#252b28",
                  fontSize: 12,
                  fontWeight: 600,
                  opacity: 1,
                  cursor: field.type === "services" ? "default" : undefined,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}

      {field.type === "date" ? (
        <input
          type="date"
          value={text}
          disabled={!editable}
          onChange={(e) => commit(e.target.value)}
          style={{ width: "100%", height: 40, padding: "0 10px", border: `1px solid ${border}`, borderRadius: 6, background: bg, fontSize: 13 }}
        />
      ) : null}

      {field.type === "list" ? (
        <div style={{ border: `1px solid ${border}`, borderRadius: 8, background: bg, overflow: "hidden" }}>
          {(field.value as ListItem[]).map((item, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 12px", borderBottom: "1px solid #f1f1ea" }}>
              <b style={{ fontSize: 12.5, fontWeight: 600 }}>{item.label}</b>
              {item.sub ? <small style={{ fontSize: 11.5, color: "#737870", lineHeight: 1.5 }}>{item.sub}</small> : null}
            </div>
          ))}
          {(field.value as ListItem[]).length === 0 ? <p style={{ padding: "10px 12px", fontSize: 12, color: "#92958e" }}>{tx("nothingProvided")}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
