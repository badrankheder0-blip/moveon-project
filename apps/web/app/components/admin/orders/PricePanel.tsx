"use client";

import { useEffect, useState } from "react";

import { money } from "@/lib/admin/format";
import { defineText, useText } from "@/lib/admin/text";
import { useI18n } from "@/lib/i18n/provider";

import styles from "./orders.module.css";
import type { OrderDetail, PriceLineView } from "./types";

/**
 * The order's price lines, as the prototype's sidebar card edits them: a
 * description and a gross amount per line, "Add a line", remove, and the
 * subtotal, discount and total below. Every change is saved at once; the
 * server splits net and VAT and re-applies a discount code.
 */

export const PRICE_TEXT = defineText({
  price: { de: "Preis", en: "Price", ar: "السعر", tr: "Fiyat" },
  addLine: { de: "Position hinzufügen", en: "Add a line", ar: "إضافة بند", tr: "Kalem ekle" },
  lineDesc: { de: "Beschreibung", en: "Description", ar: "الوصف", tr: "Açıklama" },
  amount: { de: "Betrag", en: "Amount", ar: "المبلغ", tr: "Tutar" },
  remove: { de: "Entfernen", en: "Remove", ar: "حذف", tr: "Kaldır" },
  noLines: {
    de: "Noch keine Preispositionen. Fügen Sie eine hinzu, um ein Angebot zu senden.",
    en: "No priced lines yet. Add one to send a quote.",
    ar: "لا توجد بنود مسعّرة بعد. أضف بنداً لإرسال العرض.",
    tr: "Henüz fiyatlı kalem yok. Teklif göndermek için bir tane ekleyin.",
  },
  subtotal: { de: "Zwischensumme", en: "Subtotal", ar: "المجموع الفرعي", tr: "Ara toplam" },
  discount: { de: "Rabatt", en: "Discount", ar: "الخصم", tr: "İndirim" },
  total: { de: "Gesamt", en: "Total", ar: "المجموع", tr: "Toplam" },
  vatNote: { de: "Inkl. {v}% MwSt. ({a})", en: "Includes {v}% VAT ({a})", ar: "يشمل ضريبة {v}% ({a})", tr: "%{v} KDV dahil ({a})" },
  rateNet: { de: "{q} × {p} netto", en: "{q} × {p} net", ar: "{q} × {p} صافي", tr: "{q} × {p} net" },
  quoteSentOn: { de: "Angebot gesendet {d}", en: "Quote sent {d}", ar: "أُرسل العرض {d}", tr: "Teklif gönderildi {d}" },
  newLine: { de: "Zusatzleistung", en: "Extra service", ar: "خدمة إضافية", tr: "Ek hizmet" },
});

/** The line keys the shared catalogue has a caption for (the small rate text). */
const CAPTIONS = new Set([
  "line.area", "line.selected_items", "line.travel", "line.travel_long_distance", "line.floor_surcharge", "line.transport_insurance",
  "line.saturday_surcharge", "line.business_discount", "line.stairs_from", "line.stairs_to", "line.volume", "line.volume_estimated",
  "line.crew", "line.dismantling", "line.reassembly", "line.assembly_both", "line.packing", "line.special", "line.special_piano", "line.special_safe",
  "line.special_aquarium", "line.special_gym", "line.special_heavy", "line.special_artwork", "line.cleaning_area", "line.windows_standard",
  "line.windows_patio", "line.windows_large", "line.windows_roof", "line.zone_surcharge",
]);

/** Line keys the shared catalogue names. */
const NAMED = /^line\.(base_rate|area|selected_items|travel(_long_distance)?|floor_surcharge|packing_service|parking_zone|transport_insurance|crew_of_three|second_van|saturday_surcharge|business_discount|discount_code|minimum_order_value|assembly|disassembly|stairs_(from|to)|volume(_estimated)?|crew|dismantling|reassembly|assembly_both|packing|insurance|special(_\w+)?|saturday|holiday_surcharge|zone_surcharge|cleaning_area|windows_\w+)$/;

interface Draft {
  key: string;
  params: Record<string, string | number>;
  label: string;
  /** The catalogue's name for the line, so an unchanged label is not saved as an override. */
  standard: string;
  raw: string;
  /** The small rate text under the description. */
  rate: string;
  /** The saved amount, to tell whether the office changed it. */
  gross: number;
}

export interface LineSave {
  key: string;
  label?: string;
  params: Record<string, string | number>;
  gross: number;
}

/** "1.234,50", "1,234.50" or "1234.5" → 1234.5. */
export function parseAmount(raw: string): number {
  const s = raw.replace(/[\s€]/g, "");
  const normal = /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  const n = Number(normal);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/** A changed amount no longer matches the quantity and unit price it came with. */
function withoutRate(params: Record<string, string | number>) {
  const { qty: _qty, unitNet: _unitNet, rate: _rate, ...rest } = params;
  return rest;
}

const amountText = (value: string | number) => {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

export function usePriceLabels() {
  const { t } = useI18n();
  const px = useText(PRICE_TEXT);
  const standard = (line: { key: string; params: Record<string, string | number> }) => {
    const { label: _label, ...params } = line.params;
    if (!NAMED.test(line.key)) return px("newLine");
    return t(line.key, { values: params });
  };
  const label = (line: PriceLineView) => (typeof line.params.label === "string" && line.params.label ? line.params.label : standard(line));
  const rate = (line: PriceLineView) => {
    // Lines from an accepted quote carry their quantity and net unit price.
    const qty = Number(line.params.qty);
    const unit = Number(line.params.unitNet);
    if (line.params.qty !== undefined && Number.isFinite(qty) && Number.isFinite(unit)) return px("rateNet", { q: qty, p: money(unit) });
    if (!CAPTIONS.has(line.key) || line.params.label) return "";
    const text = t(`${line.key}.caption`, { values: line.params });
    return /\{\w+\}/.test(text) ? "" : text;
  };
  return { standard, label, rate };
}

export function PricePanel({
  order,
  editable,
  onSave,
}: {
  order: OrderDetail;
  editable: boolean;
  onSave: (lines: LineSave[]) => Promise<unknown>;
}) {
  const px = useText(PRICE_TEXT);
  const { locale } = useI18n();
  const labels = usePriceLabels();

  const fromOrder = (): Draft[] =>
    order.price.lines.map((line) => ({ key: line.key, params: line.params, label: labels.label(line), standard: labels.standard(line), raw: amountText(line.gross), rate: labels.rate(line), gross: Number(line.gross) || 0 }));

  const [lines, setLines] = useState<Draft[]>(fromOrder);
  // A fresh order from the server replaces the drafts (after a save, or a colleague's change).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setLines(fromOrder()), [order.price, locale]);

  const save = (next: Draft[]) => {
    setLines(next);
    void onSave(
      next.map((line) => ({
        key: line.key,
        params: parseAmount(line.raw) === line.gross ? line.params : withoutRate(line.params),
        gross: parseAmount(line.raw),
        ...(line.label.trim() && line.label.trim() !== line.standard ? { label: line.label.trim() } : {}),
      })),
    );
  };

  const changed = (a: Draft[]) => {
    const before = fromOrder();
    return a.length !== before.length || a.some((line, i) => line.label !== before[i]?.label || parseAmount(line.raw) !== parseAmount(before[i]?.raw ?? ""));
  };

  const subtotal = lines.reduce((sum, line) => sum + parseAmount(line.raw), 0);
  const discount = order.price.discount ? Math.min(Number(order.price.discount.gross) || 0, Math.max(subtotal, 0)) : 0;
  const total = Math.max(0, subtotal - discount);
  const vat = Number.parseFloat(order.vatRate) || 0;
  const vatAmount = total - total / (1 + vat / 100);
  const fmtDT = (iso: string) =>
    new Date(iso).toLocaleString(locale === "ar" ? "ar-u-nu-latn" : locale === "en" ? "en-GB" : locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 12, boxShadow: "0 12px 36px #202a2308", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "16px 20px 10px" }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 650 }}>{px("price")}</h3>
        {editable ? (
          <button
            type="button"
            onClick={() => save([...lines, { key: "line.custom", params: {}, label: px("newLine"), standard: "", raw: "0", rate: "", gross: 0 }])}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 0", border: 0, background: "transparent", color: "#d71635", fontSize: 12, fontWeight: 600 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {px("addLine")}
          </button>
        ) : null}
      </div>

      {lines.map((line, i) => {
        const rate = line.rate;
        return (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "8px 14px 8px 12px", borderTop: "1px solid #f1f1ea" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
              <input
                value={line.label}
                disabled={!editable}
                aria-label={px("lineDesc")}
                className={styles.lineInput}
                onChange={(e) => setLines(lines.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))}
                onBlur={() => changed(lines) && save(lines)}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                style={{ width: "100%", height: 30, padding: "0 6px", border: "1px solid transparent", borderRadius: 5, background: "transparent", fontSize: 12.5, fontWeight: 550, color: "#252b28" }}
              />
              {rate ? <small style={{ padding: "0 6px", fontSize: 10.5, color: "#92958e", lineHeight: 1.4 }}>{rate}</small> : null}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 3, height: 30, padding: "0 7px", border: "1px solid #cfd3cb", borderRadius: 5, background: "#ffffff", width: 94, flex: "none", direction: "ltr" }}>
              <span style={{ fontSize: 11.5, color: "#737870" }}>€</span>
              <input
                value={line.raw}
                disabled={!editable}
                inputMode="decimal"
                aria-label={px("amount")}
                onChange={(e) => setLines(lines.map((l, j) => (j === i ? { ...l, raw: e.target.value } : l)))}
                onBlur={() => changed(lines) && save(lines)}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", textAlign: "right", fontSize: 12.5, fontWeight: 600, fontVariantNumeric: "tabular-nums", boxShadow: "none", padding: 0, outline: "none" }}
              />
            </label>
            {editable ? (
              <button
                type="button"
                aria-label={px("remove")}
                title={px("remove")}
                className={styles.remove}
                onClick={() => save(lines.filter((_, j) => j !== i))}
                style={{ width: 28, height: 30, display: "grid", placeItems: "center", border: 0, borderRadius: 5, background: "transparent", color: "#92958e", padding: 0, flex: "none" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>
        );
      })}

      {lines.length === 0 ? <p style={{ padding: "12px 20px", borderTop: "1px solid #f1f1ea", fontSize: 12, color: "#737870" }}>{px("noLines")}</p> : null}

      <div style={{ padding: "14px 20px 16px", background: "#fafaf7", borderTop: "1px solid #eef0ea", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#737870" }}>
          <span>{px("subtotal")}</span>
          <span dir="ltr" style={{ fontVariantNumeric: "tabular-nums" }}>{money(subtotal)}</span>
        </div>
        {order.price.discount ? (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#737870" }}>
            <span>
              {px("discount")} (<bdi dir="ltr">{order.price.discount.code}</bdi>)
            </span>
            <b dir="ltr" style={{ color: "#d71635", fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>−{money(discount)}</b>
          </div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 8, marginTop: 2, borderTop: "1px solid #e3e5de" }}>
          <b style={{ fontSize: 13, fontWeight: 650 }}>{px("total")}</b>
          <b dir="ltr" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.6px", fontVariantNumeric: "tabular-nums" }}>{money(total)}</b>
        </div>
        <small style={{ fontSize: 11, color: "#92958e", textAlign: "end" }}>{px("vatNote", { v: Number.isInteger(vat) ? vat : vat.toFixed(2), a: money(vatAmount) })}</small>
        {order.quoteSentAt ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "#3f705a", fontWeight: 600 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {px("quoteSentOn", { d: fmtDT(order.quoteSentAt) })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
