"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { useToast } from "@/app/components/admin/AdminShell";
import { dateTag } from "@/lib/admin/format";
import { defineText, useText } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

/**
 * The small window a day opens in the admin calendar: how much of the day is
 * booked, and — with `availability.write` — blocking it (with a reason the
 * office sees) and giving it its own limit of jobs in place of the default.
 *
 * Public holidays (NRW) and Sundays are closed automatically: the window says
 * so and offers nothing to change. Blocking a day does not touch the jobs
 * already on it; it stops new bookings.
 */

const TEXT = defineText({
  booked: { de: "Gebucht", en: "Booked", ar: "محجوز", tr: "Rezerve" },
  of: { de: "{used} von {max}", en: "{used} of {max}", ar: "{used} من {max}", tr: "{used} / {max}" },
  holiday: { de: "Feiertag in NRW · automatisch gesperrt", en: "Public holiday in NRW · closed automatically", ar: "عطلة رسمية في NRW · مغلق تلقائياً", tr: "NRW resmi tatili · otomatik kapalı" },
  closed: { de: "Sonntag · immer gesperrt", en: "Sunday · always closed", ar: "الأحد · مغلق دائماً", tr: "Pazar · her zaman kapalı" },
  block: { de: "Diesen Tag sperren", en: "Block this day", ar: "إغلاق هذا اليوم", tr: "Bu günü kapat" },
  blockSub: {
    de: "Kunden können an diesem Tag nicht buchen. Bestehende Aufträge bleiben.",
    en: "Customers cannot book this day. Existing orders stay.",
    ar: "لن يتمكن الزبائن من الحجز في هذا اليوم. الطلبات الموجودة تبقى.",
    tr: "Müşteriler bu gün rezervasyon yapamaz. Mevcut siparişler kalır.",
  },
  reason: { de: "Grund (nur intern)", en: "Reason (internal only)", ar: "السبب (داخلي فقط)", tr: "Sebep (yalnızca dahili)" },
  reasonPh: { de: "z. B. Betriebsurlaub", en: "e.g. company holiday", ar: "مثلاً: إجازة الشركة", tr: "örn. şirket tatili" },
  limit: { de: "Kunden an diesem Tag", en: "Customers on this day", ar: "عدد الزبائن في هذا اليوم", tr: "Bu gündeki müşteri sayısı" },
  limitDefault: { de: "Standard ({n})", en: "Default ({n})", ar: "الافتراضي ({n})", tr: "Varsayılan ({n})" },
  limitOwn: { de: "Eigenes Limit", en: "Own limit", ar: "حد خاص", tr: "Özel sınır" },
  limitHint: {
    de: "So viele Aufträge nimmt der Tag an. Ein Auftrag mit zweitem Transporter zählt doppelt.",
    en: "How many orders the day takes. An order with a second van counts twice.",
    ar: "عدد الطلبات التي يقبلها اليوم. الطلب مع سيارة ثانية يُحسب مرتين.",
    tr: "Günün kabul ettiği sipariş sayısı. İkinci araçlı sipariş iki sayılır.",
  },
  cancel: { de: "Abbrechen", en: "Cancel", ar: "إلغاء", tr: "İptal" },
  close: { de: "Schließen", en: "Close", ar: "إغلاق", tr: "Kapat" },
  save: { de: "Speichern", en: "Save", ar: "حفظ", tr: "Kaydet" },
  saved: { de: "Der Tag wurde gespeichert.", en: "The day was saved.", ar: "تم حفظ اليوم.", tr: "Gün kaydedildi." },
  saveFailed: { de: "Speichern fehlgeschlagen. Bitte erneut versuchen.", en: "Saving failed. Please try again.", ar: "تعذّر الحفظ. حاول مرة أخرى.", tr: "Kaydedilemedi. Lütfen tekrar deneyin." },
  loadFailed: { de: "Der Tag konnte nicht geladen werden.", en: "The day could not be loaded.", ar: "تعذّر تحميل اليوم.", tr: "Gün yüklenemedi." },
});

/** One day as GET /api/availability/admin returns it. */
export interface AdminDay {
  date: string;
  used: number;
  maxCapacity: number;
  ownLimit: number | null;
  blocked: { reason: string } | null;
  holiday: string | null;
  closed: boolean;
}

export interface AdminRange {
  defaultCapacity: number;
  closedWeekday: number;
  days: AdminDay[];
}

export const availabilityKey = ["admin", "availability"] as const;

export function DayDialog({ date, canEdit, onClose }: { date: string; canEdit: boolean; onClose: () => void }) {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const toast = useToast();
  const queryClient = useQueryClient();

  const info = useQuery({
    queryKey: [...availabilityKey, "day", date],
    queryFn: () => sdk.http.get<AdminRange>("/api/availability/admin", { from: date, to: date }),
  });
  const day = info.data?.days[0];
  const defaultCapacity = info.data?.defaultCapacity ?? 0;

  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState("");
  const [own, setOwn] = useState(false);
  const [limit, setLimit] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!day || ready) return;
    setBlocked(Boolean(day.blocked));
    setReason(day.blocked?.reason === "Gesperrt" ? "" : (day.blocked?.reason ?? ""));
    setOwn(day.ownLimit !== null);
    setLimit(String(day.ownLimit ?? defaultCapacity));
    setReady(true);
  }, [day, ready, defaultCapacity]);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const parsedLimit = Number.parseInt(limit, 10);
  const limitValid = !own || (Number.isInteger(parsedLimit) && parsedLimit >= 0 && parsedLimit <= 50);

  const save = useMutation({
    mutationFn: () =>
      sdk.http.patch<AdminDay>(`/api/availability/days/${date}`, {
        blocked,
        ...(blocked && reason.trim() ? { reason: reason.trim() } : {}),
        maxCapacity: own ? parsedLimit : null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: availabilityKey });
      toast(tx("saved"));
      onClose();
    },
    onError: () => toast(tx("saveFailed")),
  });

  const autoClosed = Boolean(day && (day.holiday || day.closed));
  const editable = canEdit && ready && !autoClosed;
  const title = new Date(`${date}T12:00:00`).toLocaleDateString(dateTag(locale), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const full = day ? day.used >= day.maxCapacity : false;
  const radio = (on: boolean): CSSProperties => ({ width: 16, height: 16, borderRadius: "50%", border: `1.5px solid ${on ? "#d71635" : "#cfd3cb"}`, display: "grid", placeItems: "center", flex: "none" });

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 900, background: "#1d222066", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "clamp(12px,10vh,96px) 16px", overflowY: "auto" }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ width: "100%", maxWidth: 420, background: "#ffffff", borderRadius: 16, boxShadow: "0 30px 80px #0000003d", overflow: "hidden" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px", borderBottom: "1px solid #eef0ea" }}>
          <h2 style={{ fontSize: 16, fontWeight: 650 }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={tx("close")}
            style={{ width: 32, height: 32, display: "grid", placeItems: "center", border: 0, borderRadius: 8, background: "#f5f5f0", color: "#252b28", padding: 0, flex: "none" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {info.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}
          {!day && !info.isError ? (
            <>
              <div className="a-skel" style={{ maxWidth: 200 }} />
              <div className="a-skel" />
            </>
          ) : null}

          {day ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", borderRadius: 10, background: "#fafaf7", border: "1px solid #eef0ea" }}>
                <span style={{ fontSize: 12.5, color: "#4a514d", fontWeight: 600 }}>{tx("booked")}</span>
                <b style={{ fontSize: 13.5, fontWeight: 700, color: full ? "#b7122b" : "#252b28", fontVariantNumeric: "tabular-nums" }}>
                  {tx("of", { used: day.used, max: day.maxCapacity })}
                </b>
              </div>

              {day.holiday ? (
                <div className="a-note is-warn">
                  <span>
                    <b>{day.holiday}</b> · {tx("holiday")}
                  </span>
                </div>
              ) : day.closed ? (
                <div className="a-note is-warn">{tx("closed")}</div>
              ) : (
                <fieldset disabled={!editable || save.isPending} style={{ border: 0, margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={blocked}
                    onClick={() => setBlocked((value) => !value)}
                    style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", border: `1.5px solid ${blocked ? "#d71635" : "#e3e5de"}`, borderRadius: 10, background: blocked ? "#fff6f6" : "#ffffff", textAlign: "start", color: "#252b28" }}
                  >
                    <span style={{ width: 16, height: 16, marginTop: 2, borderRadius: 4, border: `1.5px solid ${blocked ? "#d71635" : "#cfd3cb"}`, background: blocked ? "#d71635" : "#ffffff", display: "grid", placeItems: "center", flex: "none", color: "#ffffff" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <b style={{ fontSize: 13, fontWeight: 650 }}>{tx("block")}</b>
                      <small style={{ fontSize: 11.5, color: "#737870", lineHeight: 1.4 }}>{tx("blockSub")}</small>
                    </span>
                  </button>

                  {blocked ? (
                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5, fontWeight: 600, color: "#4a514d" }}>
                      {tx("reason")}
                      <input
                        dir="auto"
                        value={reason}
                        maxLength={200}
                        placeholder={tx("reasonPh")}
                        onChange={(event) => setReason(event.target.value)}
                        style={{ height: 40, padding: "0 12px", border: "1px solid #cfd3cb", borderRadius: 8, background: "#ffffff", fontSize: 13.5, color: "#252b28" }}
                      />
                    </label>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: "#4a514d" }}>{tx("limit")}</span>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={!own}
                          onClick={() => setOwn(false)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 38, padding: "0 12px", border: `1px solid ${!own ? "#d71635" : "#e3e5de"}`, borderRadius: 8, background: !own ? "#fff6f6" : "#ffffff", color: "#252b28", fontSize: 12.5, fontWeight: 600 }}
                        >
                          <span style={radio(!own)}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: !own ? "#d71635" : "transparent" }} />
                          </span>
                          {tx("limitDefault", { n: defaultCapacity })}
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={own}
                          onClick={() => setOwn(true)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 38, padding: "0 12px", border: `1px solid ${own ? "#d71635" : "#e3e5de"}`, borderRadius: 8, background: own ? "#fff6f6" : "#ffffff", color: "#252b28", fontSize: 12.5, fontWeight: 600 }}
                        >
                          <span style={radio(own)}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: own ? "#d71635" : "transparent" }} />
                          </span>
                          {tx("limitOwn")}
                        </button>
                        {own ? (
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={50}
                            value={limit}
                            aria-label={tx("limitOwn")}
                            aria-invalid={!limitValid}
                            onChange={(event) => setLimit(event.target.value)}
                            style={{ width: 80, height: 38, padding: "0 10px", border: `1px solid ${limitValid ? "#cfd3cb" : "#d71635"}`, borderRadius: 8, background: "#ffffff", fontSize: 14, fontWeight: 650, color: "#252b28", textAlign: "center" }}
                          />
                        ) : null}
                      </div>
                      <small style={{ fontSize: 11.5, color: "#737870", lineHeight: 1.4 }}>{tx("limitHint")}</small>
                    </div>
                  )}
                </fieldset>
              )}
            </>
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "12px 20px", borderTop: "1px solid #eef0ea", background: "#fafaf7" }}>
          {editable ? (
            <>
              <button
                type="button"
                onClick={onClose}
                style={{ minHeight: 38, padding: "0 14px", border: "1px solid #e3e5de", borderRadius: 8, background: "#ffffff", color: "#252b28", fontSize: 12.5, fontWeight: 600 }}
              >
                {tx("cancel")}
              </button>
              <button
                type="button"
                disabled={save.isPending || !limitValid}
                onClick={() => save.mutate()}
                style={{ minHeight: 38, padding: "0 18px", border: "1px solid #d71635", borderRadius: 8, background: "#d71635", color: "#ffffff", fontSize: 12.5, fontWeight: 600, opacity: save.isPending || !limitValid ? 0.6 : 1 }}
              >
                {tx("save")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              style={{ minHeight: 38, padding: "0 18px", border: "1px solid #252b28", borderRadius: 8, background: "#252b28", color: "#ffffff", fontSize: 12.5, fontWeight: 600 }}
            >
              {tx("close")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
