"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/app/components/admin/AdminShell";
import { useDrafts } from "@/lib/admin/drafts";
import { formatDate } from "@/lib/admin/format";
import { defineText, useText } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Pricing: every rate the booking site prices with, as the admin
 * prototype's Pricing screen groups them — moving, cleaning, windows,
 * dismantling & assembly, special items, surcharges and the holiday dates.
 * All prices include VAT; the VAT rate is in Settings.
 *
 * Edits are drafts (domain "pricing"): a field saves its draft when it
 * loses focus, and nothing reaches the pricing engine until the frame's
 * "Save & publish". New bookings then use the new rates; existing orders
 * keep their price.
 */

const TEXT = defineText({
  priceTitle: { de: "Preise", en: "Pricing", ar: "الأسعار", tr: "Fiyatlandırma" },
  priceSub: {
    de: "Die Buchungsseite berechnet jedes Angebot aus diesen Preisen. Alle Preise inklusive MwSt.",
    en: "The booking site calculates every quote from these prices. All prices include VAT.",
    ar: "يحسب موقع الحجز كل عرض من هذه الأسعار. جميع الأسعار شاملة الضريبة.",
    tr: "Rezervasyon sitesi her teklifi bu fiyatlarla hesaplar. Tüm fiyatlara KDV dahildir.",
  },
  vatInSettings: { de: "Den MwSt.-Satz finden Sie in den Einstellungen.", en: "The VAT rate is in Settings.", ar: "نسبة الضريبة في صفحة الإعدادات.", tr: "KDV oranı Ayarlar'dadır." },
  invalid: { de: "Geben Sie 0 oder mehr ein.", en: "Enter 0 or more.", ar: "أدخل 0 أو أكثر.", tr: "0 veya daha fazla girin." },
  holidays: { de: "Feiertage", en: "Public holiday dates", ar: "تواريخ العطل الرسمية", tr: "Resmî tatil günleri" },
  addDate: { de: "Datum hinzufügen", en: "Add date", ar: "إضافة تاريخ", tr: "Tarih ekle" },
  remove: { de: "Entfernen", en: "Remove", ar: "حذف", tr: "Kaldır" },
  loadFailed: { de: "Die Preise konnten nicht geladen werden.", en: "The prices could not be loaded.", ar: "تعذّر تحميل الأسعار.", tr: "Fiyatlar yüklenemedi." },
  saveFailed: { de: "Der Entwurf konnte nicht gespeichert werden.", en: "The draft could not be saved.", ar: "تعذّر حفظ المسودة.", tr: "Taslak kaydedilemedi." },
  g_moving: { de: "Umzug", en: "Moving", ar: "النقل", tr: "Taşınma" },
  g_moving_sub: { de: "Strecke, Volumen, Team und Zugang.", en: "Distance, volume, crew and access.", ar: "المسافة والحجم والعمّال والوصول.", tr: "Mesafe, hacim, ekip ve erişim." },
  g_cleaning: { de: "Reinigung", en: "Cleaning", ar: "التنظيف", tr: "Temizlik" },
  g_cleaning_sub: { de: "Fläche und Mindestauftrag.", en: "Floor area and minimum order.", ar: "المساحة والحد الأدنى للطلب.", tr: "Alan ve minimum sipariş." },
  g_windows: { de: "Fenster", en: "Windows", ar: "الشبابيك", tr: "Pencereler" },
  g_windows_sub: { de: "Bei 0 bepreist das Team auf Anfrage.", en: "Set 0 and the team prices it on request.", ar: "ضع 0 ليحدد الفريق السعر عند الطلب.", tr: "0 girerseniz ekip talep üzerine fiyatlandırır." },
  g_assembly: { de: "Ab- & Aufbau", en: "Dismantling & assembly", ar: "الفك والتركيب", tr: "Söküm ve montaj" },
  g_assembly_sub: { de: "Pro Möbelstück.", en: "Per piece of furniture.", ar: "لكل قطعة أثاث.", tr: "Mobilya parçası başına." },
  g_surcharge: { de: "Zuschläge", en: "Surcharges", ar: "الزيادات", tr: "Ek ücretler" },
  g_surcharge_sub: {
    de: "Kommt hinzu, wenn ein Einsatz auf einen Samstag oder Feiertag fällt.",
    en: "Added when a job falls on a Saturday or a public holiday.",
    ar: "تُضاف عندما يكون الموعد يوم سبت أو عطلة رسمية.",
    tr: "İş cumartesiye veya resmî tatile denk geldiğinde eklenir.",
  },
  km: { de: "Strecke", en: "Distance", ar: "المسافة", tr: "Mesafe" },
  m3: { de: "Transportvolumen", en: "Transport volume", ar: "حجم النقل", tr: "Taşıma hacmi" },
  hour: { de: "Träger, pro Stunde", en: "Mover, per hour", ar: "العامل بالساعة", tr: "Taşıyıcı, saat başı" },
  floor_move: { de: "Treppen ohne Aufzug", en: "Stairs without elevator", ar: "الدرج بدون مصعد", tr: "Asansörsüz merdiven" },
  floor_large: { de: "Große Teile über die Treppe", en: "Large items by stairs", ar: "القطع الكبيرة على الدرج", tr: "Büyük eşyalar merdivenden" },
  pack: { de: "Packservice", en: "Packing service", ar: "خدمة التغليف", tr: "Paketleme hizmeti" },
  move_min: { de: "Mindestauftrag Umzug", en: "Minimum moving order", ar: "الحد الأدنى لطلب النقل", tr: "Minimum taşınma siparişi" },
  clean_m2: { de: "Umzugsreinigung", en: "Moving clean", ar: "تنظيف الانتقال", tr: "Taşınma temizliği" },
  clean_min: { de: "Mindestauftrag Reinigung", en: "Minimum cleaning order", ar: "الحد الأدنى لطلب التنظيف", tr: "Minimum temizlik siparişi" },
  win_standard: { de: "Standardfenster", en: "Standard window", ar: "شباك عادي", tr: "Standart pencere" },
  win_patio: { de: "Balkon- / Terrassentür", en: "Balcony / patio door", ar: "باب بلكون أو تراس", tr: "Balkon / teras kapısı" },
  win_large: { de: "Große / raumhohe Verglasung", en: "Large / floor-to-ceiling glass", ar: "زجاج كبير من الأرض للسقف", tr: "Büyük / boydan boya cam" },
  win_roof: { de: "Dachfenster / Oberlicht", en: "Roof window / skylight", ar: "شباك سقف", tr: "Çatı penceresi / tavan penceresi" },
  asm_dis: { de: "Abbau", en: "Dismantling", ar: "فك", tr: "Söküm" },
  asm_re: { de: "Aufbau", en: "Assembly", ar: "تركيب", tr: "Montaj" },
  asm_both: { de: "Ab- + Aufbau", en: "Dismantling + assembly", ar: "فك وتركيب", tr: "Söküm + montaj" },
  sat_move: { de: "Samstag · Umzug", en: "Saturday · moving", ar: "يوم السبت · النقل", tr: "Cumartesi · taşınma" },
  sat_other: { de: "Samstag · Reinigung & Renovierung", en: "Saturday · cleaning & renovation", ar: "يوم السبت · التنظيف والترميم", tr: "Cumartesi · temizlik ve tadilat" },
  holiday: { de: "Feiertag", en: "Public holiday", ar: "العطل الرسمية", tr: "Resmî tatil" },
  u_km: { de: "/ km", en: "/ km", ar: "/ كم", tr: "/ km" },
  u_m3: { de: "/ m³", en: "/ m³", ar: "/ م³", tr: "/ m³" },
  u_hour: { de: "/ Std.", en: "/ hour", ar: "/ ساعة", tr: "/ saat" },
  u_floor: { de: "/ Etage", en: "/ floor", ar: "/ طابق", tr: "/ kat" },
  u_order: { de: "pro Auftrag", en: "per order", ar: "لكل طلب", tr: "sipariş başına" },
  u_m2: { de: "/ m²", en: "/ m²", ar: "/ م²", tr: "/ m²" },
  u_win: { de: "/ Fenster", en: "/ window", ar: "/ شباك", tr: "/ pencere" },
  u_door: { de: "/ Tür", en: "/ door", ar: "/ باب", tr: "/ kapı" },
  u_unit: { de: "/ Element", en: "/ unit", ar: "/ قطعة", tr: "/ adet" },
  u_piece: { de: "/ Stück", en: "/ piece", ar: "/ قطعة", tr: "/ parça" },
  u_item: { de: "/ Stück", en: "/ item", ar: "/ قطعة", tr: "/ adet" },
  u_job: { de: "pro Einsatz", en: "per job", ar: "لكل موعد", tr: "iş başına" },
});

type Key = keyof typeof TEXT;

/** The prototype's groups, rows and units, over the version-2 rate keys. */
const GROUPS: { title: Key; sub: Key; rows: [string, Key][]; surcharge?: boolean }[] = [
  { title: "g_moving", sub: "g_moving_sub", rows: [["km", "u_km"], ["m3", "u_m3"], ["hour", "u_hour"], ["floor_move", "u_floor"], ["floor_large", "u_floor"], ["pack", "u_m3"], ["move_min", "u_order"]] },
  { title: "g_cleaning", sub: "g_cleaning_sub", rows: [["clean_m2", "u_m2"], ["clean_min", "u_order"]] },
  { title: "g_windows", sub: "g_windows_sub", rows: [["win_standard", "u_win"], ["win_patio", "u_door"], ["win_large", "u_unit"], ["win_roof", "u_win"]] },
  { title: "g_assembly", sub: "g_assembly_sub", rows: [["asm_dis", "u_piece"], ["asm_re", "u_piece"], ["asm_both", "u_piece"]] },
  // Special items (piano, safe…) are not here any more: they are catalogue
  // rows of kind "special", managed under Catalogue, so the office can add and
  // rename them instead of only repricing a fixed six.
  { title: "g_surcharge", sub: "g_surcharge_sub", rows: [["sat_move", "u_job"], ["sat_other", "u_job"], ["holiday", "u_job"]], surcharge: true },
];

const HOLIDAY_REF = "holidayDates";
const DECIMAL = /^\d+(\.\d{1,2})?$/;

/** "12.50" → "12.5", "8.00" → "8": how the prototype shows a rate. */
const show = (value: string) => String(Number.parseFloat(value));

interface Rate {
  key: string;
  value: string;
}

export default function PricingPage() {
  const { sdk, can } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const drafts = useDrafts("pricing");
  const mayWrite = can("pricing.write");

  const data = useQuery({
    queryKey: ["admin", "pricing"],
    queryFn: () => sdk.http.get<{ rates: Rate[]; holidayDates: string[] }>("/api/pricing"),
  });

  const live = useMemo(() => new Map((data.data?.rates ?? []).map((rate) => [rate.key, rate.value])), [data.data]);

  // What each field shows: the typed text while editing, else draft or live.
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [newDate, setNewDate] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => setTyped({}), [data.data]);

  const fieldValue = (key: string) => typed[key] ?? show(drafts.value(key, live.get(key) ?? "0"));
  const invalid = (key: string) => !DECIMAL.test(fieldValue(key).trim().replace(",", "."));

  const commit = async (key: string) => {
    const raw = typed[key];
    if (raw === undefined) return;
    const value = raw.trim().replace(",", ".");
    if (!DECIMAL.test(value)) return;
    setFailed(false);
    try {
      const current = live.get(key) ?? "0";
      if (Number.parseFloat(value) === Number.parseFloat(current)) {
        if (drafts.edited(key)) await drafts.revert(key);
      } else {
        await drafts.set(key, Number.parseFloat(value).toFixed(2));
      }
      setTyped((state) => {
        const next = { ...state };
        delete next[key];
        return next;
      });
    } catch {
      setFailed(true);
    }
  };

  const holidays = drafts.value<string[]>(HOLIDAY_REF, data.data?.holidayDates ?? []).slice().sort();
  const setHolidays = async (next: string[]) => {
    setFailed(false);
    try {
      const sorted = [...new Set(next)].sort();
      if (sorted.join() === (data.data?.holidayDates ?? []).slice().sort().join()) await drafts.revert(HOLIDAY_REF);
      else await drafts.set(HOLIDAY_REF, sorted);
    } catch {
      setFailed(true);
    }
  };

  return (
    <AdminShell view="pricing">
      <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "var(--a-ls-h1)", lineHeight: 1.2 }}>{tx("priceTitle")}</h1>
          <p style={{ color: "#737870", fontSize: 13, marginTop: 6 }}>
            {tx("priceSub")} {tx("vatInSettings")}
          </p>
        </div>

        {data.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}
        {failed ? <div className="a-note is-error">{tx("saveFailed")}</div> : null}

        {GROUPS.map((group) => (
          <div key={group.title} style={{ background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, padding: "22px 24px", boxShadow: "0 12px 36px #202a2308" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "var(--a-ls-h2)" }}>{tx(group.title)}</h2>
              <p style={{ fontSize: 12.5, color: "#737870" }}>{tx(group.sub)}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: "14px 16px" }}>
              {group.rows.map(([key, unit]) => {
                const bad = invalid(key);
                return (
                  <label key={key} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{tx(key as Key)}</span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        height: 41,
                        border: `1px solid ${bad ? "#d71635" : "#cfd3cb"}`,
                        borderRadius: 6,
                        background: drafts.edited(key) ? "#fffbea" : "#ffffff",
                        overflow: "hidden",
                        direction: "ltr",
                      }}
                    >
                      <span style={{ paddingLeft: 12, color: "#737870", fontSize: 13 }}>€</span>
                      <input
                        value={data.isLoading ? "" : fieldValue(key)}
                        inputMode="decimal"
                        readOnly={!mayWrite}
                        aria-label={tx(key as Key)}
                        aria-invalid={bad}
                        onChange={(event) => setTyped((state) => ({ ...state, [key]: event.target.value }))}
                        onBlur={() => void commit(key)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") (event.target as HTMLInputElement).blur();
                        }}
                        style={{ flex: 1, minWidth: 0, height: "100%", border: 0, padding: "0 8px", background: "transparent", fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums", boxShadow: "none" }}
                      />
                      <span style={{ height: "100%", display: "flex", alignItems: "center", padding: "0 12px", borderLeft: "1px solid #e3e5de", background: "#fafaf7", color: "#737870", fontSize: 12, whiteSpace: "nowrap" }}>
                        {tx(unit)}
                      </span>
                    </span>
                    {bad ? <small style={{ color: "#d71635", fontSize: 11.5 }}>{tx("invalid")}</small> : null}
                  </label>
                );
              })}
            </div>

            {group.surcharge ? (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #eef0ea", display: "flex", flexDirection: "column", gap: 10 }}>
                <b style={{ fontSize: 12, fontWeight: 600 }}>{tx("holidays")}</b>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {holidays.map((day) => (
                    <span key={day} style={{ display: "inline-flex", alignItems: "center", gap: 4, paddingBlock: 5, paddingInline: "10px 4px", border: "1px solid #e3e5de", borderRadius: 6, background: "#ffffff", fontSize: 12 }}>
                      {formatDate(day, locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                      {mayWrite ? (
                        <button
                          type="button"
                          aria-label={tx("remove")}
                          onClick={() => void setHolidays(holidays.filter((d) => d !== day))}
                          className="a-holiday-x"
                          style={{ width: 22, height: 22, display: "grid", placeItems: "center", border: 0, borderRadius: 4, background: "transparent", color: "#92958e", padding: 0 }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      ) : null}
                    </span>
                  ))}
                </div>
                {mayWrite ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      type="date"
                      value={newDate}
                      aria-label={tx("addDate")}
                      onChange={(event) => setNewDate(event.target.value)}
                      style={{ height: 41, padding: "0 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13 }}
                    />
                    <button
                      type="button"
                      disabled={!newDate}
                      onClick={() => {
                        void setHolidays([...holidays, newDate]);
                        setNewDate("");
                      }}
                      style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 41, padding: "0 14px", border: "1px solid #d71635", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 550 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      {tx("addDate")}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </section>
    </AdminShell>
  );
}
