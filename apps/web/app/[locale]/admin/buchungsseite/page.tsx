"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { useDrafts } from "@/lib/admin/drafts";
import { ADMIN_PATHS } from "@/lib/admin/nav";
import { defineText, useText } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

import { contentRef, errorText, useContent, type Content, type Loc } from "../inhalte/_lib/cms";
import { EditedChip, KIT_TEXT, LangSwitch, NumBadge, UploadIcon, kit, pad2, useMediaDialog } from "../inhalte/_lib/ui";
import { CommonStepFields, fieldCount, useCommonFlow } from "./CommonFields";

/**
 * Booking site: the planner's start step (the private and business cards),
 * the wording of the steps every customer sees, the add-ons of "Crew &
 * extras" and the vehicle options — as the admin prototype lays them out.
 *
 * The words and pictures are rows of the `planner` CMS section, drafted as
 * "content"; an add-on's price is its rate-card key, drafted as "pricing",
 * because that is the number the pricing engine charges. As in the
 * prototype, a field shows the live text as its placeholder and an empty
 * field keeps it.
 */

const P = "planner";

const TEXT = defineText({
  title: { de: "Buchungsseite", en: "Booking site", ar: "موقع الحجز", tr: "Rezervasyon sitesi" },
  sub: {
    de: "Bearbeiten Sie jede Seite des Buchungsablaufs: die Startseite, die Schritte, die jeder Kunde sieht, Extras und Fahrzeugoptionen.",
    en: "Edit every page of the booking flow: the start page, the steps every customer sees, extras and vehicle options.",
    ar: "عدّل كل صفحات الحجز: الصفحة الأولى، الخطوات التي يراها كل زبون، الإضافات وخيارات السيارات.",
    tr: "Rezervasyon akışının her sayfasını düzenleyin: başlangıç sayfası, her müşterinin gördüğü adımlar, ekstralar ve araç seçenekleri.",
  },
  startPage: { de: "Startseite", en: "Start page", ar: "الصفحة الأولى", tr: "Başlangıç sayfası" },
  startSub: { de: "Hier wählt der Kunde Privat oder Geschäftlich.", en: "Where the customer chooses Private or Business.", ar: "حيث يختار الزبون فرد أو شركة.", tr: "Müşterinin Bireysel veya Kurumsal seçtiği yer." },
  private: { de: "Privatkunde", en: "Private customer", ar: "زبون فرد", tr: "Bireysel müşteri" },
  business: { de: "Geschäftskunde", en: "Business", ar: "شركة", tr: "Kurumsal" },
  cardTitle: { de: "Titel", en: "Title", ar: "العنوان", tr: "Başlık" },
  cardDesc: { de: "Beschreibung", en: "Description", ar: "الوصف", tr: "Açıklama" },
  point: { de: "Punkt {n}", en: "Point {n}", ar: "النقطة {n}", tr: "Madde {n}" },
  commonSteps: { de: "Gemeinsame Schritte", en: "Common steps", ar: "الخطوات المشتركة", tr: "Ortak adımlar" },
  commonSub: {
    de: "Schritte, die jeder Kunde sieht, egal welche Leistungen er wählt. Die eigenen Schritte jeder Leistung finden Sie unter Leistungen.",
    en: "Steps every customer sees, whatever services they pick. Each service’s own steps are in Services.",
    ar: "خطوات يراها كل زبون مهما اختار من خدمات. خطوات كل خدمة موجودة في صفحة الخدمات.",
    tr: "Her müşterinin, hangi hizmeti seçerse seçsin gördüğü adımlar. Her hizmetin kendi adımları Hizmetler'dedir.",
  },
  goServices: { de: "Leistungen öffnen", en: "Open services", ar: "فتح الخدمات", tr: "Hizmetleri aç" },
  shared: { de: "Von allen Leistungen geteilt", en: "Shared by all services", ar: "مشتركة بين كل الخدمات", tr: "Tüm hizmetlerde ortak" },
  texts: { de: "{n} Texte", en: "{n} texts", ar: "{n} نصوص", tr: "{n} metin" },
  fieldsN: { de: "{n} Felder", en: "{n} fields", ar: "{n} حقول", tr: "{n} alan" },
  edited: { de: "Geändert", en: "Edited", ar: "معدّل", tr: "Düzenlendi" },
  line1: { de: "Überschrift · Zeile 1", en: "Headline · line 1", ar: "العنوان · السطر الأول", tr: "Başlık · satır 1" },
  line2: { de: "Überschrift · Zeile 2", en: "Headline · line 2", ar: "العنوان · السطر الثاني", tr: "Başlık · satır 2" },
  intro: { de: "Einleitungstext", en: "Intro text", ar: "النص التعريفي", tr: "Giriş metni" },
  extras: { de: "Extras", en: "Extras", ar: "الإضافات", tr: "Ekstralar" },
  extrasSub: { de: "Optionale Zusatzleistungen im Schritt „Team & Extras“.", en: "Optional add-ons on the Crew & extras step.", ar: "إضافات اختيارية في خطوة العمّال والإضافات.", tr: "“Ekip ve ekstralar” adımındaki isteğe bağlı eklentiler." },
  vehOpts: { de: "Fahrzeugoptionen", en: "Vehicle options", ar: "خيارات السيارات", tr: "Araç seçenekleri" },
  vehOptsSub: { de: "Die Fahrzeuge, die ein Kunde für einen Umzug wählen kann.", en: "The vehicles a customer can choose for a move.", ar: "السيارات التي يستطيع الزبون اختيارها للنقل.", tr: "Müşterinin bir taşınma için seçebileceği araçlar." },
  name: { de: "Name", en: "Name", ar: "الاسم", tr: "Ad" },
  price: { de: "Preis", en: "Price", ar: "السعر", tr: "Fiyat" },
  priceRate: { de: "Preis (% des Umzugs)", en: "Price (% of the move)", ar: "السعر (% من النقل)", tr: "Fiyat (taşınmanın %'si)" },
  capacity: { de: "Kapazität", en: "Capacity", ar: "السعة", tr: "Kapasite" },
  shown: { de: "Sichtbar", en: "Shown", ar: "ظاهر", tr: "Görünür" },
  badPrice: { de: "Bitte einen Betrag wie 45 oder 45.50 eingeben.", en: "Enter an amount such as 45 or 45.50.", ar: "أدخل مبلغاً مثل 45 أو 45.50.", tr: "45 veya 45.50 gibi bir tutar girin." },
  badNumber: { de: "Bitte eine Zahl eingeben.", en: "Enter a number.", ar: "أدخل رقماً.", tr: "Bir sayı girin." },
  noRate: {
    de: "Für dieses Extra gibt es in den Preisen keinen eigenen Satz.",
    en: "This add-on has no rate of its own in Pricing.",
    ar: "لا يوجد سعر خاص لهذه الإضافة في صفحة الأسعار.",
    tr: "Bu eklentinin Fiyatlandırma'da kendi oranı yok.",
  },
  step_type: { de: "Kundentyp", en: "Customer type", ar: "نوع الزبون", tr: "Müşteri tipi" },
  step_services: { de: "Leistungen", en: "Services", ar: "الخدمات", tr: "Hizmetler" },
  step_account: { de: "Firma", en: "Company", ar: "الشركة", tr: "Şirket" },
  step_address: { de: "Adresse", en: "Address", ar: "العنوان", tr: "Adres" },
  step_schedule: { de: "Termin", en: "Date", ar: "الموعد", tr: "Tarih" },
  step_photos: { de: "Fotos", en: "Photos", ar: "الصور", tr: "Fotoğraflar" },
  step_review: { de: "Prüfen & Preis", en: "Review & price", ar: "المراجعة والسعر", tr: "Kontrol ve fiyat" },
  step_payment: { de: "Kontakt & Zahlung", en: "Contact & payment", ar: "التواصل والدفع", tr: "İletişim ve ödeme" },
});

const STEPS = ["type", "services", "account", "address", "schedule", "photos", "review", "payment"] as const;
/**
 * The planner's add-ons and the rate-card keys that may price each, newest
 * first: the rate card has been renamed once already, so the first key that
 * exists is the one shown. An add-on with none has no price to edit here.
 */
const EXTRAS = [
  { id: "insurance", rates: ["transport_insurance", "transport_insurance_percent"] },
  { id: "packing", rates: ["pack", "packing_service"] },
  { id: "parkingZone", rates: ["parking_zone"] },
  { id: "secondVan", rates: ["second_van", "second_van_surcharge"] },
] as const;
const DECIMAL = /^\d+(\.\d{1,2})?$/;

const CARD: CSSProperties = { background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 12, boxShadow: "0 12px 36px #202a2308" };
const LABEL: CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "#737870" };
const INPUT: CSSProperties = { width: "100%", height: 38, padding: "0 10px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 12.5, color: "#252b28" };
const H2: CSSProperties = { fontSize: 17, fontWeight: 600, letterSpacing: "var(--a-ls-h2)" };

export default function BookingSitePage() {
  return (
    <AdminShell view="site">
      <BookingSite />
    </AdminShell>
  );
}

function BookingSite() {
  const tx = useText(TEXT);
  const kx = useText(KIT_TEXT);
  const { locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const { sdk } = useApi();
  const c = useContent();
  const pricing = useDrafts("pricing");
  const flow = useCommonFlow();
  const [lang, setLang] = useState<Loc>(locale);
  const [openMedia, mediaDialog] = useMediaDialog();

  const rates = useQuery({
    queryKey: ["admin", "pricing", "rates"],
    queryFn: () => sdk.http.get<{ rates: { key: string; value: string; unit?: string }[] }>("/api/pricing"),
  });
  const rate = (key: string) => rates.data?.rates.find((row) => row.key === key)?.value ?? "";
  const rateFor = (keys: readonly string[]) => rates.data?.rates.find((row) => keys.includes(row.key));

  const field = { c, lang, toast, failed: kx("saveFailed") };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div className="a-page-head" style={{ display: "block" }}>
          <h1 style={{ lineHeight: 1.2 }}>{tx("title")}</h1>
          <p style={{ maxWidth: "none" }}>{tx("sub")}</p>
        </div>
        <LangSwitch value={lang} onChange={setLang} />
      </div>
      {c.error ? <p className="a-note is-error">{kx("loadFailed")}</p> : null}

      <div style={{ ...CARD, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h2 style={H2}>{tx("startPage")}</h2>
          <p style={{ fontSize: 12.5, color: "#737870", marginTop: 3 }}>{tx("startSub")}</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 14 }}>
          {(["private", "business"] as const).map((type) => {
            const image = `welcome.${type}.image`;
            const src = c.value(P, image, "de");
            const edited = c.edited(P, image, "de");
            const original = c.original(P, image);
            const restorable = !edited && original !== undefined && original !== src;
            return (
              <div key={type} style={{ border: "1px solid #e3e5de", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 10, background: "#fafaf7" }}>
                <span style={{ fontSize: 10.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#d71635" }}>{tx(type)}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <img src={src || undefined} alt="" style={{ width: 150, height: 96, objectFit: "cover", borderRadius: 8, border: `1px solid ${edited ? "#ffcb08" : "#e3e5de"}`, background: "#ffffff", display: "block" }} />
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => openMedia({ kind: "image", current: src, onApply: (url) => c.save([{ section: P, slot: image, locale: "*", value: url }]) })}
                      style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 36, padding: "0 12px", border: "1px solid #d71635", borderRadius: 8, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 550, whiteSpace: "nowrap" }}
                    >
                      <UploadIcon />
                      {kx("upload")}
                    </button>
                    {edited || restorable ? (
                      <button
                        type="button"
                        className={kit.soft}
                        onClick={() =>
                          (edited ? c.revert([contentRef(P, image, "*")]) : c.save([{ section: P, slot: image, locale: "*", value: original! }])).catch((error) => toast(errorText(error, kx("saveFailed"))))
                        }
                        style={{ minHeight: 36, padding: "0 10px", border: 0, borderRadius: 8, background: "transparent", color: "#737870", fontSize: 12, fontWeight: 550, whiteSpace: "nowrap" }}
                      >
                        {edited ? kx("reset") : kx("useOriginal")}
                      </button>
                    ) : null}
                  </div>
                </div>
                <label style={LABEL}>
                  {tx("cardTitle")}
                  <Override {...field} slot={`welcome.${type}.title`} />
                </label>
                <label style={LABEL}>
                  {tx("cardDesc")}
                  <Override {...field} slot={`welcome.${type}.desc`} area />
                </label>
                {[1, 2, 3].map((n) => (
                  <label key={n} style={LABEL}>
                    {tx("point", { n })}
                    <Override {...field} slot={`welcome.${type}.point${n}`} />
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", paddingTop: 6 }}>
        <div>
          <h2 style={{ ...H2, fontSize: 19 }}>{tx("commonSteps")}</h2>
          <p style={{ fontSize: 12.5, color: "#737870", marginTop: 3 }}>{tx("commonSub")}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/${locale}${ADMIN_PATHS.services}`)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 38, padding: "0 14px", border: "1px solid #d71635", borderRadius: 8, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 550, whiteSpace: "nowrap" }}
        >
          {tx("goServices")}
        </button>
      </div>

      {STEPS.map((step, i) => (
        <div key={step} style={{ ...CARD, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", background: "#fafaf7", borderBottom: "1px solid #eef0ea" }}>
            <NumBadge n={pad2(i + 1)} size={26} font={10} />
            <b style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 650 }}>{tx(`step_${step}`)}</b>
            {flow.edited(step) ? <EditedChip label={tx("edited")} /> : null}
            <span style={{ padding: "3px 8px", borderRadius: 999, background: "#f1f1ea", color: "#4a514d", fontSize: 10.5, fontWeight: 650 }}>{tx("shared")}</span>
            <small style={{ fontSize: 11.5, color: "#92958e", whiteSpace: "nowrap" }}>{tx("fieldsN", { n: fieldCount(flow, step) })}</small>
          </div>
          <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))", gap: "10px 12px" }}>
            <label style={LABEL}>
              {tx("line1")}
              <Override {...field} slot={`steps.${step}.title1`} />
            </label>
            <label style={LABEL}>
              {tx("line2")}
              <Override {...field} slot={`steps.${step}.title2`} />
            </label>
            <label style={{ ...LABEL, gridColumn: "1 / -1" }}>
              {tx("intro")}
              <Override {...field} slot={`steps.${step}.lead`} />
            </label>
          </div>
          <CommonStepFields step={step} lang={lang} editor={flow} />
        </div>
      ))}

      <div style={{ ...CARD, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
        <h2 style={H2}>{tx("extras")}</h2>
        <p style={{ fontSize: 12.5, color: "#737870", marginBottom: 8 }}>{tx("extrasSub")}</p>
        {EXTRAS.map((extra) => {
          const shownSlot = `extras.${extra.id}.shown`;
          const shown = c.value(P, shownSlot, "de") !== "0";
          const card = rateFor(extra.rates);
          const percent = card?.unit === "PERCENT" || card?.key.endsWith("_percent") === true;
          return (
            <div key={extra.id} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", padding: "12px 0", borderTop: "1px solid #f1f1ea", opacity: shown ? 1 : 0.55 }}>
              <label style={{ ...LABEL, flex: "1 1 220px" }}>
                {tx("name")}
                <Override {...field} slot={`extras.${extra.id}.name`} />
              </label>
              <label style={{ ...LABEL, flex: "2 1 280px" }}>
                {tx("cardDesc")}
                <Override {...field} slot={`extras.${extra.id}.desc`} />
              </label>
              <label style={{ ...LABEL, flex: "0 0 130px" }} title={card ? undefined : tx("noRate")}>
                {percent ? tx("priceRate") : tx("price")}
                {card ? (
                  <RateInput
                    value={pricing.edited(card.key) ? String(pricing.value(card.key, "")) : ""}
                    placeholder={rate(card.key)}
                    edited={pricing.edited(card.key)}
                    percent={percent}
                    onCommit={async (next) => {
                      if (next === "" || Number(next) === Number(rate(card.key))) return pricing.revert(card.key);
                      if (!DECIMAL.test(next)) throw new Error(tx("badPrice"));
                      return pricing.set(card.key, next);
                    }}
                  />
                ) : (
                  <input disabled placeholder="—" style={{ ...INPUT, background: "#fafaf7" }} />
                )}
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={shown}
                onClick={() => c.save([{ section: P, slot: shownSlot, locale: "*", value: shown ? "0" : "1" }]).catch((error) => toast(errorText(error, kx("saveFailed"))))}
                style={{ display: "flex", alignItems: "center", gap: 8, height: 38, border: 0, background: "transparent", padding: 0, fontSize: 12, fontWeight: 550, color: "#252b28", whiteSpace: "nowrap" }}
              >
                <Track on={shown} />
                {tx("shown")}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ ...CARD, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
        <h2 style={H2}>{tx("vehOpts")}</h2>
        <p style={{ fontSize: 12.5, color: "#737870", marginBottom: 8 }}>{tx("vehOptsSub")}</p>
        {[1, 2, 3].map((n) => (
          <div key={n} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", padding: "12px 0", borderTop: "1px solid #f1f1ea" }}>
            <label style={{ ...LABEL, flex: "1 1 200px" }}>
              {tx("name")}
              <Override {...field} slot={`vehicles.${n}.name`} />
            </label>
            <label style={{ ...LABEL, flex: "2 1 260px" }}>
              {tx("cardDesc")}
              <Override {...field} slot={`vehicles.${n}.desc`} />
            </label>
            <label style={{ ...LABEL, flex: "0 0 100px" }}>
              {tx("capacity")}
              <Override {...field} slot={`vehicles.${n}.capacity`} unit="m³" check={(value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? null : tx("badNumber"))} />
            </label>
            <label style={{ ...LABEL, flex: "0 0 120px" }}>
              {tx("price")}
              <Override {...field} slot={`vehicles.${n}.price`} euro check={(value) => (DECIMAL.test(value) ? null : tx("badPrice"))} />
            </label>
          </div>
        ))}
      </div>
      {mediaDialog}
    </section>
  );
}

function Track({ on }: { on: boolean }) {
  return (
    <span style={{ width: 34, height: 20, borderRadius: 10, background: on ? "#d71635" : "#d6d9d1", display: "flex", justifyContent: on ? "flex-end" : "flex-start", padding: 2 }}>
      <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#ffffff", boxShadow: "0 1px 2px #00000033" }} />
    </span>
  );
}

/**
 * A planner text as the prototype edits it: empty unless overridden, the
 * live text as its placeholder, and emptying it puts the live text back.
 */
function Override({
  c,
  lang,
  toast,
  failed,
  slot,
  area,
  unit,
  euro,
  check,
}: {
  c: Content;
  lang: Loc;
  toast: (message: string) => void;
  failed: string;
  slot: string;
  area?: boolean;
  unit?: string;
  euro?: boolean;
  check?: (value: string) => string | null;
}) {
  const [typing, setTyping] = useState<string | null>(null);
  const neutral = c.neutral(P, slot);
  const at: Loc | "*" = neutral ? "*" : lang;
  const edited = c.edited(P, slot, lang);
  const value = edited ? c.value(P, slot, lang) : "";
  const placeholder = c.live(P, slot, at);
  const dir = neutral ? "ltr" : lang === "ar" ? "rtl" : "ltr";

  const commit = async () => {
    if (typing === null) return;
    const next = typing.trim();
    try {
      if (next === value.trim()) return;
      if (next === "") await c.revert([contentRef(P, slot, at)]);
      else {
        const problem = check?.(next);
        if (problem) {
          toast(problem);
          return;
        }
        await c.save([{ section: P, slot, locale: at, value: next }]);
      }
    } catch (error) {
      toast(errorText(error, failed));
    } finally {
      setTyping(null);
    }
  };

  const border = edited ? "#ffcb08" : "#cfd3cb";
  const props = {
    dir,
    value: typing ?? value,
    placeholder,
    onChange: (event: { target: { value: string } }) => setTyping(event.target.value),
    onBlur: () => void commit(),
  };

  if (unit || euro) {
    return (
      <span style={{ display: "flex", alignItems: "center", height: 38, border: `1px solid ${border}`, borderRadius: 6, background: "#ffffff", overflow: "hidden", direction: "ltr" }}>
        {euro ? <span style={{ paddingLeft: 10, color: "#737870", fontSize: 12.5 }}>€</span> : null}
        <input {...props} inputMode="decimal" style={{ flex: 1, minWidth: 0, height: "100%", border: 0, padding: "0 8px", background: "transparent", fontSize: 13, fontWeight: 600, color: "#252b28", boxShadow: "none" }} />
        {unit ? <span style={{ padding: "0 8px", color: "#737870", fontSize: 11.5 }}>{unit}</span> : null}
      </span>
    );
  }
  return area ? (
    <textarea {...props} rows={2} style={{ ...INPUT, height: "auto", padding: "8px 10px", resize: "vertical", lineHeight: 1.5, borderColor: border }} />
  ) : (
    <input {...props} style={{ ...INPUT, borderColor: border }} />
  );
}

/** A rate-card price beside its add-on: € or %, placeholder = the live rate. */
function RateInput({ value, placeholder, edited, percent, onCommit }: { value: string; placeholder: string; edited: boolean; percent: boolean; onCommit: (next: string) => Promise<void> }) {
  const toast = useToast();
  const [typing, setTyping] = useState<string | null>(null);
  const commit = async () => {
    if (typing === null) return;
    try {
      if (typing.trim().replace(",", ".") !== value) await onCommit(typing.trim().replace(",", "."));
    } catch (error) {
      toast(errorText(error, error instanceof Error ? error.message : ""));
    } finally {
      setTyping(null);
    }
  };
  return (
    <span style={{ display: "flex", alignItems: "center", height: 38, border: `1px solid ${edited ? "#ffcb08" : "#cfd3cb"}`, borderRadius: 6, background: "#ffffff", overflow: "hidden", direction: "ltr" }}>
      {percent ? null : <span style={{ paddingLeft: 10, color: "#737870", fontSize: 12.5 }}>€</span>}
      <input
        value={typing ?? value}
        placeholder={placeholder}
        inputMode="decimal"
        onChange={(event) => setTyping(event.target.value)}
        onBlur={() => void commit()}
        style={{ flex: 1, minWidth: 0, height: "100%", border: 0, padding: "0 8px", background: "transparent", fontSize: 13, fontWeight: 600, color: "#252b28", boxShadow: "none" }}
      />
      {percent ? <span style={{ padding: "0 8px", color: "#737870", fontSize: 11.5 }}>%</span> : null}
    </span>
  );
}
