"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type CSSProperties, type ReactNode } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { useDrafts } from "@/lib/admin/drafts";
import { defineText, useText } from "@/lib/admin/text";
import { useApi } from "@/lib/api";

import { errorText, useSiteSettingsDrafts } from "../inhalte/_lib/cms";
import { KIT_TEXT, UploadIcon, kit, useMediaDialog } from "../inhalte/_lib/ui";

/**
 * Settings: the logo, VAT, the company's details, the service areas, and
 * the teams and vehicles orders are assigned to — the admin prototype's
 * Settings screen.
 *
 * Logo, company and areas are `site_settings` rows drafted as "settings";
 * VAT is the rate card's `vat_percent`, drafted as "pricing". Both go live
 * with the frame's "Save & publish". Teams and vehicles save at once through
 * `/api/fleet`, because orders point at them.
 */

const TEXT = defineText({
  title: { de: "Einstellungen", en: "Settings", ar: "الإعدادات", tr: "Ayarlar" },
  sub: { de: "Logo, Steuer, Servicegebiete, Teams und Fahrzeuge.", en: "Logo, tax, service areas, teams and vehicles.", ar: "الشعار والضريبة ومناطق الخدمة والفرق والسيارات.", tr: "Logo, vergi, hizmet bölgeleri, ekipler ve araçlar." },
  logo: { de: "Logo", en: "Logo", ar: "الشعار", tr: "Logo" },
  logoFull: { de: "Vollständiges Logo", en: "Full logo", ar: "الشعار الكامل", tr: "Tam logo" },
  logoFullSub: { de: "Kopfzeile jeder Seite.", en: "Header of every page.", ar: "يظهر في أعلى كل صفحة.", tr: "Her sayfanın üst kısmı." },
  logoMark: { de: "Symbol", en: "Symbol", ar: "الرمز", tr: "Sembol" },
  logoMarkSub: { de: "Kleines Zeichen auf kompakten Bildschirmen.", en: "Small mark on compact screens.", ar: "علامة صغيرة للشاشات الصغيرة.", tr: "Küçük ekranlarda küçük işaret." },
  none: { de: "Standard", en: "Default", ar: "الأصلي", tr: "Varsayılan" },
  imgHint: { de: "JPG, PNG, WebP oder AVIF · oder eine Bildadresse", en: "JPG, PNG, WebP or AVIF · or an image address", ar: "JPG أو PNG أو WebP أو AVIF · أو رابط صورة", tr: "JPG, PNG, WebP veya AVIF · ya da bir görsel adresi" },
  company: { de: "Firmendaten", en: "Company details", ar: "بيانات الشركة", tr: "Şirket bilgileri" },
  companyName: { de: "Firmenname", en: "Company name", ar: "اسم الشركة", tr: "Şirket adı" },
  email: { de: "E-Mail", en: "Email", ar: "البريد الإلكتروني", tr: "E-posta" },
  phone: { de: "Telefon", en: "Phone", ar: "الهاتف", tr: "Telefon" },
  whatsapp: { de: "WhatsApp-Nummer (grüner Button auf der Website)", en: "WhatsApp number (green button on the website)", ar: "رقم واتساب (الزر الأخضر في الموقع)", tr: "WhatsApp numarası (sitedeki yeşil düğme)" },
  address: { de: "Adresse", en: "Address", ar: "العنوان", tr: "Adres" },
  legalForm: { de: "Rechtsform", en: "Legal form", ar: "الشكل القانوني", tr: "Hukuki yapı" },
  register: { de: "Handelsregister (Gericht & Nummer)", en: "Commercial register (court & number)", ar: "السجل التجاري (المحكمة والرقم)", tr: "Ticaret sicili (mahkeme ve numara)" },
  vatId: { de: "USt-IdNr.", en: "VAT ID (USt-IdNr.)", ar: "الرقم الضريبي (USt-IdNr.)", tr: "KDV no. (USt-IdNr.)" },
  taxNumber: { de: "Steuernummer", en: "Tax number (Steuernummer)", ar: "الرقم الضريبي المحلي (Steuernummer)", tr: "Vergi numarası (Steuernummer)" },
  iban: { de: "IBAN", en: "IBAN", ar: "IBAN", tr: "IBAN" },
  bic: { de: "BIC", en: "BIC", ar: "BIC", tr: "BIC" },
  bank: { de: "Bank", en: "Bank", ar: "البنك", tr: "Banka" },
  paymentTerm: { de: "Zahlungsziel (Tage)", en: "Payment term (days)", ar: "مدة الدفع (أيام)", tr: "Ödeme vadesi (gün)" },
  invoiceHint: {
    de: "Erscheint im Impressum, auf Angeboten und Rechnungen. Telefon, E-Mail und Adresse gelten auch für die Website.",
    en: "Shown in the imprint, on quotes and on invoices. Phone, email and address are also the website's contact details.",
    ar: "تظهر في بيانات الناشر وعلى العروض والفواتير. الهاتف والبريد والعنوان هي أيضاً بيانات التواصل في الموقع.",
    tr: "Künyede, tekliflerde ve faturalarda görünür. Telefon, e-posta ve adres sitenin iletişim bilgileridir.",
  },
  tax: { de: "Steuer", en: "Tax", ar: "الضريبة", tr: "Vergi" },
  vat: { de: "Mehrwertsteuersatz", en: "VAT rate", ar: "نسبة ضريبة القيمة المضافة", tr: "KDV oranı" },
  vatHint: {
    de: "Preise enthalten die MwSt. Dieser Satz teilt netto und MwSt. auf Angeboten und Rechnungen.",
    en: "Prices include VAT. This rate splits net and VAT on quotes and invoices.",
    ar: "الأسعار شاملة الضريبة. تُستخدم هذه النسبة لفصل الصافي عن الضريبة في العروض والفواتير.",
    tr: "Fiyatlara KDV dahildir. Bu oran tekliflerde ve faturalarda net tutarı ve KDV'yi ayırır.",
  },
  vatBad: { de: "Bitte eine Zahl wie 19 oder 7 eingeben.", en: "Enter a number such as 19 or 7.", ar: "أدخل رقماً مثل 19 أو 7.", tr: "19 veya 7 gibi bir sayı girin." },
  zones: { de: "Servicegebiete", en: "Service areas", ar: "مناطق الخدمة", tr: "Hizmet bölgeleri" },
  zonesSub: { de: "Städte oder Postleitzahlen, die Sie bedienen.", en: "Cities or postcodes you serve.", ar: "المدن أو الرموز البريدية التي تخدمها.", tr: "Hizmet verdiğiniz şehirler veya posta kodları." },
  zonePh: { de: "z. B. Köln oder 50667", en: "e.g. Köln or 50667", ar: "مثلاً Köln أو 50667", tr: "ör. Köln veya 50667" },
  add: { de: "Hinzufügen", en: "Add", ar: "إضافة", tr: "Ekle" },
  remove: { de: "Entfernen", en: "Remove", ar: "حذف", tr: "Kaldır" },
  onlyZones: { de: "Nur Adressen in diesen Gebieten annehmen", en: "Only accept addresses in these areas", ar: "قبول العناوين داخل هذه المناطق فقط", tr: "Yalnızca bu bölgelerdeki adresleri kabul et" },
  onlyZonesSub: {
    de: "Kunden außerhalb dieser Gebiete kommen nicht über den Adressschritt hinaus.",
    en: "Customers outside these areas can’t continue past the address step.",
    ar: "الزبون خارج هذه المناطق لا يستطيع تجاوز خطوة العنوان.",
    tr: "Bu bölgelerin dışındaki müşteriler adres adımından ileri gidemez.",
  },
  teams: { de: "Teams", en: "Teams", ar: "الفرق", tr: "Ekipler" },
  teamPh: { de: "Teamname", en: "Team name", ar: "اسم الفريق", tr: "Ekip adı" },
  areaPh: { de: "Gebiet", en: "Area", ar: "المنطقة", tr: "Bölge" },
  colour: { de: "Farbe", en: "Colour", ar: "اللون", tr: "Renk" },
  openJobs: { de: "Offene Aufträge", en: "Open orders", ar: "طلبات مفتوحة", tr: "Açık siparişler" },
  vehicles: { de: "Fahrzeuge", en: "Vehicles", ar: "السيارات", tr: "Araçlar" },
  vehPh: { de: "Fahrzeugname", en: "Vehicle name", ar: "اسم السيارة", tr: "Araç adı" },
  platePh: { de: "Kennzeichen", en: "Plate", ar: "اللوحة", tr: "Plaka" },
  deleteTeam: {
    de: "„{name}“ hat {n} offene Aufträge. Sie werden ohne Team weitergeführt. Löschen?",
    en: "“{name}” has {n} open orders. They will be left without a team. Delete?",
    ar: "لدى «{name}» {n} طلبات مفتوحة. ستبقى بدون فريق. حذف؟",
    tr: "“{name}” ekibinin {n} açık siparişi var. Ekipsiz kalacaklar. Silinsin mi?",
  },
  saved: { de: "Gespeichert.", en: "Saved.", ar: "تم الحفظ.", tr: "Kaydedildi." },
  fleetFailed: { de: "Teams und Fahrzeuge konnten nicht geladen werden.", en: "Teams and vehicles could not be loaded.", ar: "تعذّر تحميل الفرق والسيارات.", tr: "Ekipler ve araçlar yüklenemedi." },
});

interface Team {
  id: string;
  name: string;
  area: string | null;
  colour: string;
  isActive: boolean;
  sortOrder: number;
  activeJobs?: number;
}

interface Vehicle {
  id: string;
  name: string;
  plate: string | null;
  capacityM3: number | null;
  isActive: boolean;
  sortOrder: number;
}

const CARD: CSSProperties = { background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, padding: "22px 24px", display: "flex", flexDirection: "column", boxShadow: "0 12px 36px #202a2308" };
const H2: CSSProperties = { fontSize: 17, fontWeight: 600, letterSpacing: "var(--a-ls-h2)" };
const LABEL: CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "#737870" };
const INPUT: CSSProperties = { width: "100%", height: 41, padding: "0 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, color: "#252b28" };
const DASHED: CSSProperties = { ...INPUT, border: "1px dashed #c4c7bf", background: "#fafaf7" };
const ADD_BTN: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, minHeight: 41, padding: "0 14px", border: "1px solid #d71635", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 550, whiteSpace: "nowrap" };
const X_BTN: CSSProperties = { width: 32, height: 32, display: "grid", placeItems: "center", border: 0, borderRadius: 5, background: "transparent", color: "#92958e", padding: 0, flex: "none" };

const COMPANY_FIELDS: { key: string; label: keyof typeof TEXT; ph?: string; ltr?: boolean; type?: string }[] = [
  { key: "company.name", label: "companyName" },
  { key: "company.email", label: "email", ph: "hello@company.de", ltr: true, type: "email" },
  { key: "company.phone", label: "phone", ph: "+49 …", ltr: true },
  { key: "company.whatsapp", label: "whatsapp", ph: "+49 151 …", ltr: true },
  { key: "company.address", label: "address" },
  { key: "company.legalForm", label: "legalForm", ph: "GmbH", ltr: true },
  { key: "company.register", label: "register", ph: "Amtsgericht Köln, HRB 12345", ltr: true },
  { key: "company.vatId", label: "vatId", ph: "DE123456789", ltr: true },
  { key: "company.taxNumber", label: "taxNumber", ph: "214/5678/1234", ltr: true },
  { key: "company.iban", label: "iban", ph: "DE89 3704 0044 0532 0130 00", ltr: true },
  { key: "company.bic", label: "bic", ph: "COBADEFFXXX", ltr: true },
  { key: "company.bank", label: "bank", ph: "Commerzbank" },
  { key: "company.paymentTermDays", label: "paymentTerm", ph: "14", ltr: true },
];

export default function SettingsPage() {
  return (
    <AdminShell view="settings">
      <Settings />
    </AdminShell>
  );
}

function Settings() {
  const tx = useText(TEXT);
  const kx = useText(KIT_TEXT);
  const toast = useToast();
  const { sdk } = useApi();
  const settings = useSiteSettingsDrafts();
  const pricing = useDrafts("pricing");
  const [openMedia, mediaDialog] = useMediaDialog();

  const rates = useQuery({
    queryKey: ["admin", "pricing", "rates"],
    queryFn: () => sdk.http.get<{ rates: { key: string; value: string }[] }>("/api/pricing"),
  });
  const liveVat = rates.data?.rates.find((row) => row.key === "vat_percent")?.value ?? "";
  // "19.00" on the rate card reads as "19", as the prototype shows it.
  const vat = pricing.edited("vat_percent") ? String(pricing.value("vat_percent", liveVat)) : liveVat === "" ? "" : String(Number(liveVat));

  const saveSetting = (key: string, value: string) => settings.save([{ key, value }]).catch((error) => toast(errorText(error, kx("saveFailed"))));

  const areas = settings
    .value("company.serviceAreas")
    .split(/[,\n]/)
    .map((area) => area.trim())
    .filter(Boolean);
  const onlyInside = settings.value("company.onlyInsideAreas") === "true";

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="a-page-head" style={{ display: "block" }}>
        <h1 style={{ lineHeight: 1.2 }}>{tx("title")}</h1>
        <p>{tx("sub")}</p>
      </div>
      {settings.error ? <p className="a-note is-error">{kx("loadFailed")}</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,400px),1fr))", gap: 16, alignItems: "start" }}>
        <div style={{ ...CARD, gap: 18 }}>
          <h2 style={H2}>{tx("logo")}</h2>
          <LogoRow settingKey="brand.logo" title={tx("logoFull")} sub={tx("logoFullSub")} settings={settings} openMedia={openMedia} />
          <LogoRow settingKey="brand.mark" title={tx("logoMark")} sub={tx("logoMarkSub")} settings={settings} openMedia={openMedia} fill="#fafaf7" empty={tx("none")} />
          <small style={{ fontSize: 11, color: "#92958e" }}>{tx("imgHint")}</small>
        </div>

        <div style={{ ...CARD, gap: 14 }}>
          <h2 style={H2}>{tx("company")}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            {COMPANY_FIELDS.map((field) => (
              <label key={field.key} style={LABEL}>
                {tx(field.label)}
                <DraftInput
                  value={settings.value(field.key)}
                  edited={settings.edited(field.key)}
                  dir={field.ltr ? "ltr" : undefined}
                  type={field.type}
                  placeholder={field.ph}
                  onCommit={(value) => saveSetting(field.key, value)}
                />
              </label>
            ))}
          </div>
          <small style={{ fontSize: 11.5, color: "#92958e" }}>{tx("invoiceHint")}</small>
        </div>

        <div style={{ ...CARD, gap: 12 }}>
          <h2 style={H2}>{tx("tax")}</h2>
          <VatField
            label={tx("vat")}
            value={vat}
            edited={pricing.edited("vat_percent")}
            onCommit={async (next) => {
              if (next === liveVat || Number(next) === Number(liveVat)) return pricing.revert("vat_percent");
              if (!/^\d+(\.\d{1,2})?$/.test(next) || Number(next) > 100) throw new Error(tx("vatBad"));
              return pricing.set("vat_percent", next);
            }}
          />
          <p style={{ fontSize: 12, color: "#737870" }}>{tx("vatHint")}</p>
        </div>

        <div style={{ ...CARD, gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <h2 style={H2}>{tx("zones")}</h2>
            <p style={{ fontSize: 12.5, color: "#737870" }}>{tx("zonesSub")}</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {areas.map((area) => (
              <span key={area} style={{ display: "inline-flex", alignItems: "center", gap: 4, paddingBlock: 5, paddingInline: "10px 4px", border: `1px solid ${settings.edited("company.serviceAreas") ? "#ffcb08" : "#e3e5de"}`, borderRadius: 6, background: "#ffffff", fontSize: 12.5, fontWeight: 550 }}>
                {area}
                <button
                  type="button"
                  aria-label={`${tx("remove")} ${area}`}
                  className={kit.rowX}
                  onClick={() => saveSetting("company.serviceAreas", areas.filter((item) => item !== area).join(", "))}
                  style={{ width: 22, height: 22, display: "grid", placeItems: "center", border: 0, borderRadius: 4, background: "transparent", color: "#92958e", padding: 0 }}
                >
                  <X size={12} width={2.4} />
                </button>
              </span>
            ))}
          </div>
          <AddRow
            placeholder={tx("zonePh")}
            label={tx("add")}
            ariaLabel={tx("zones")}
            solid
            onAdd={(value) => {
              if (!areas.some((area) => area.toLowerCase() === value.toLowerCase())) void saveSetting("company.serviceAreas", [...areas, value].join(", "));
            }}
          />
          <button
            type="button"
            role="switch"
            aria-checked={onlyInside}
            onClick={() => void saveSetting("company.onlyInsideAreas", onlyInside ? "false" : "true")}
            style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", border: `1px solid ${settings.edited("company.onlyInsideAreas") ? "#ffcb08" : "#e3e5de"}`, borderRadius: 8, background: "#fafaf7", textAlign: "start", color: "#252b28" }}
          >
            <span style={{ width: 34, height: 20, borderRadius: 10, background: onlyInside ? "#d71635" : "#d6d9d1", display: "flex", justifyContent: onlyInside ? "flex-end" : "flex-start", padding: 2, flex: "none", marginTop: 1 }}>
              <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#ffffff", boxShadow: "0 1px 2px #00000033" }} />
            </span>
            <span>
              <b style={{ display: "block", fontSize: 12.5, fontWeight: 600 }}>{tx("onlyZones")}</b>
              <small style={{ fontSize: 11.5, color: "#737870" }}>{tx("onlyZonesSub")}</small>
            </span>
          </button>
        </div>

        <Teams />
        <Vehicles />
      </div>
      {mediaDialog}
    </section>
  );
}

function X({ size = 14, width = 2 }: { size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function Plus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function LogoRow({
  settingKey,
  title,
  sub,
  settings,
  openMedia,
  fill = "#ffffff",
  empty,
}: {
  settingKey: string;
  title: string;
  sub: string;
  settings: ReturnType<typeof useSiteSettingsDrafts>;
  openMedia: ReturnType<typeof useMediaDialog>[0];
  fill?: string;
  empty?: string;
}) {
  const kx = useText(KIT_TEXT);
  const toast = useToast();
  const src = settings.value(settingKey);
  const edited = settings.edited(settingKey);
  const original = settings.original(settingKey);
  const restorable = !edited && original !== undefined && original !== src;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <span style={{ width: 132, height: 64, border: `1px solid ${edited ? "#ffcb08" : "#e3e5de"}`, borderRadius: 8, background: fill, display: "grid", placeItems: "center", padding: 10, flex: "none", overflow: "hidden" }}>
        {src ? <img src={src} alt="" style={{ width: 110, height: 42, objectFit: "contain", display: "block" }} /> : <small style={{ fontSize: 11.5, color: "#92958e" }}>{empty}</small>}
      </span>
      <div style={{ flex: "1 1 140px", minWidth: 0 }}>
        <b style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>{title}</b>
        <small style={{ fontSize: 12, color: "#737870" }}>{sub}</small>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          className={kit.soft}
          onClick={() => openMedia({ kind: "image", current: src, onApply: (url) => settings.save([{ key: settingKey, value: url }]) })}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 38, padding: "0 13px", border: "1px solid #d71635", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 550 }}
        >
          <UploadIcon />
          {kx("upload")}
        </button>
        {edited || restorable ? (
          <button
            type="button"
            className={kit.soft}
            onClick={() => (edited ? settings.revert(settingKey) : settings.save([{ key: settingKey, value: original! }])).catch((error) => toast(errorText(error, kx("saveFailed"))))}
            style={{ minHeight: 38, padding: "0 10px", border: 0, borderRadius: 6, background: "transparent", color: "#737870", fontSize: 12, fontWeight: 550 }}
          >
            {edited ? kx("reset") : kx("useOriginal")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** A drafted field: shows the draft or the live value, yellow once changed, stored on blur. */
function DraftInput({
  value,
  edited,
  onCommit,
  dir,
  type,
  placeholder,
}: {
  value: string;
  edited: boolean;
  onCommit: (value: string) => Promise<unknown> | void;
  dir?: "ltr" | undefined;
  type?: string | undefined;
  placeholder?: string | undefined;
}) {
  const [typing, setTyping] = useState<string | null>(null);
  return (
    <input
      dir={dir}
      type={type ?? "text"}
      value={typing ?? value}
      placeholder={placeholder}
      onChange={(event) => setTyping(event.target.value)}
      onBlur={async () => {
        if (typing !== null && typing.trim() !== value) await onCommit(typing.trim());
        setTyping(null);
      }}
      style={{ ...INPUT, borderColor: edited ? "#ffcb08" : "#cfd3cb" }}
    />
  );
}

function VatField({ label, value, edited, onCommit }: { label: string; value: string; edited: boolean; onCommit: (next: string) => Promise<void> }) {
  const toast = useToast();
  const [typing, setTyping] = useState<string | null>(null);
  const shown = typing ?? value;
  const invalid = !/^\d+([.,]\d{1,2})?$/.test(shown.trim()) || Number(shown.replace(",", ".")) > 100;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, maxWidth: 220 }}>
      {label}
      <span style={{ display: "flex", alignItems: "center", height: 41, border: `1px solid ${invalid ? "#d71635" : edited ? "#ffcb08" : "#cfd3cb"}`, borderRadius: 6, background: invalid ? "#fff6f6" : "#ffffff", overflow: "hidden", direction: "ltr" }}>
        <input
          value={shown}
          inputMode="decimal"
          aria-invalid={invalid}
          onChange={(event) => setTyping(event.target.value)}
          onBlur={async () => {
            if (typing === null) return;
            const next = typing.trim().replace(",", ".");
            try {
              if (next !== value) await onCommit(next);
              setTyping(null);
            } catch (error) {
              toast(error instanceof Error ? error.message : String(error));
            }
          }}
          style={{ flex: 1, minWidth: 0, height: "100%", border: 0, padding: "0 12px", background: "transparent", fontSize: 14, fontWeight: 600, boxShadow: "none" }}
        />
        <span style={{ height: "100%", display: "flex", alignItems: "center", padding: "0 12px", borderLeft: "1px solid #e3e5de", background: "#fafaf7", color: "#737870", fontSize: 13 }}>%</span>
      </span>
    </label>
  );
}

/** The dashed "new …" input with its "+ Add" button. */
function AddRow({ placeholder, label, ariaLabel, onAdd, solid, extra }: { placeholder: string; label: string; ariaLabel?: string; onAdd: (value: string) => void; solid?: boolean; extra?: ReactNode }) {
  const [value, setValue] = useState("");
  const add = () => {
    if (!value.trim()) return;
    onAdd(value.trim());
    setValue("");
  };
  return (
    <div style={{ display: "flex", gap: 8, paddingTop: solid ? 0 : 4 }}>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add();
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        style={{ ...(solid ? INPUT : DASHED), flex: 1, minWidth: 0 }}
      />
      {extra}
      <button type="button" onClick={add} style={ADD_BTN}>
        <Plus />
        {label}
      </button>
    </div>
  );
}

// ── Teams and vehicles: saved at once ─────────────────────────────────

function useFleet<T>(kind: "teams" | "vehicles") {
  const { sdk } = useApi();
  const client = useQueryClient();
  const toast = useToast();
  const kx = useText(KIT_TEXT);
  const tx = useText(TEXT);
  const key = ["admin", "fleet", kind];
  const query = useQuery({ queryKey: key, queryFn: () => sdk.http.get<Record<string, T[]>>(`/api/fleet/${kind}`).then((data) => data[kind] ?? []) });

  const run = async (call: Promise<unknown>) => {
    try {
      await call;
      toast(tx("saved"));
    } catch (error) {
      toast(errorText(error, kx("saveFailed")));
    } finally {
      await client.invalidateQueries({ queryKey: key });
    }
  };

  return {
    rows: query.data ?? [],
    error: query.error,
    create: (body: Record<string, unknown>) => run(sdk.http.post(`/api/fleet/${kind}`, body)),
    update: (id: string, body: Record<string, unknown>) => run(sdk.http.patch(`/api/fleet/${kind}/${id}`, body)),
    remove: (id: string) => run(sdk.http.delete(`/api/fleet/${kind}/${id}`)),
  };
}

/** A field that saves itself on blur when its text changed. */
function LiveInput({ value, onSave, style, placeholder, ariaLabel, inputMode, dir }: { value: string; onSave: (value: string) => void; style?: CSSProperties; placeholder?: string; ariaLabel: string; inputMode?: "decimal"; dir?: "ltr" }) {
  const [typing, setTyping] = useState<string | null>(null);
  return (
    <input
      value={typing ?? value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      inputMode={inputMode}
      dir={dir}
      onChange={(event) => setTyping(event.target.value)}
      onBlur={() => {
        if (typing !== null && typing.trim() !== value) onSave(typing.trim());
        setTyping(null);
      }}
      style={{ ...INPUT, ...style }}
    />
  );
}

function Teams() {
  const tx = useText(TEXT);
  const fleet = useFleet<Team>("teams");
  return (
    <div style={{ ...CARD, gap: 12 }}>
      <h2 style={H2}>{tx("teams")}</h2>
      {fleet.error ? <p className="a-note is-error">{tx("fleetFailed")}</p> : null}
      {fleet.rows.map((team) => (
        <div key={team.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label title={tx("colour")} style={{ position: "relative", width: 18, height: 18, borderRadius: "50%", background: team.colour, flex: "none", cursor: "pointer", boxShadow: "inset 0 0 0 1px #0000001f" }}>
            <input
              type="color"
              value={team.colour}
              aria-label={`${tx("colour")} ${team.name}`}
              onChange={(event) => void fleet.update(team.id, { colour: event.target.value })}
              style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", border: 0, padding: 0 }}
            />
          </label>
          <LiveInput value={team.name} ariaLabel={tx("teamPh")} onSave={(name) => name && void fleet.update(team.id, { name })} style={{ flex: 1, minWidth: 0 }} />
          <LiveInput value={team.area ?? ""} ariaLabel={tx("areaPh")} placeholder={tx("areaPh")} onSave={(area) => void fleet.update(team.id, { area: area || null })} style={{ flex: "0 1 130px", minWidth: 0 }} />
          <span title={tx("openJobs")} style={{ flex: "none", minWidth: 40, padding: "4px 8px", borderRadius: 4, background: "#f5f5f0", fontSize: 11.5, fontWeight: 600, textAlign: "center" }}>
            <bdi>{team.activeJobs ?? 0}</bdi>
          </span>
          <button
            type="button"
            aria-label={`${tx("remove")} ${team.name}`}
            className={kit.rowX}
            onClick={() => {
              if ((team.activeJobs ?? 0) > 0 && !window.confirm(tx("deleteTeam", { name: team.name, n: team.activeJobs ?? 0 }))) return;
              void fleet.remove(team.id);
            }}
            style={X_BTN}
          >
            <X />
          </button>
        </div>
      ))}
      <AddRow placeholder={tx("teamPh")} label={tx("add")} onAdd={(name) => void fleet.create({ name })} />
    </div>
  );
}

function Vehicles() {
  const tx = useText(TEXT);
  const fleet = useFleet<Vehicle>("vehicles");
  const [m3, setM3] = useState("");
  const capacity = (value: string) => {
    const number = Number(value.replace(",", "."));
    return value.trim() && Number.isFinite(number) && number > 0 ? number : null;
  };
  return (
    <div style={{ ...CARD, gap: 12 }}>
      <h2 style={H2}>{tx("vehicles")}</h2>
      {fleet.error ? <p className="a-note is-error">{tx("fleetFailed")}</p> : null}
      {fleet.rows.map((vehicle) => (
        <div key={vehicle.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LiveInput value={vehicle.name} ariaLabel={tx("vehPh")} onSave={(name) => name && void fleet.update(vehicle.id, { name })} style={{ flex: 1, minWidth: 0 }} />
          <LiveInput
            value={vehicle.plate ?? ""}
            ariaLabel={tx("platePh")}
            placeholder={tx("platePh")}
            dir="ltr"
            onSave={(plate) => void fleet.update(vehicle.id, { plate: plate || null })}
            style={{ flex: "0 1 110px", minWidth: 0, fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12 }}
          />
          <span style={{ display: "flex", alignItems: "center", width: 96, height: 41, border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", overflow: "hidden", flex: "none", direction: "ltr" }}>
            <LiveInput
              value={vehicle.capacityM3 === null ? "" : String(vehicle.capacityM3)}
              ariaLabel="m³"
              inputMode="decimal"
              onSave={(value) => void fleet.update(vehicle.id, { capacityM3: capacity(value) })}
              style={{ flex: 1, minWidth: 0, height: "100%", border: 0, padding: "0 8px", background: "transparent", fontWeight: 600, boxShadow: "none" }}
            />
            <span style={{ padding: "0 8px", fontSize: 11.5, color: "#737870" }}>m³</span>
          </span>
          <button type="button" aria-label={`${tx("remove")} ${vehicle.name}`} className={kit.rowX} onClick={() => void fleet.remove(vehicle.id)} style={X_BTN}>
            <X />
          </button>
        </div>
      ))}
      <AddRow
        placeholder={tx("vehPh")}
        label={tx("add")}
        extra={<input value={m3} onChange={(event) => setM3(event.target.value)} inputMode="decimal" placeholder="m³" aria-label="m³" style={{ ...DASHED, width: 72, padding: "0 10px", direction: "ltr" }} />}
        onAdd={(name) => {
          void fleet.create({ name, capacityM3: capacity(m3) });
          setM3("");
        }}
      />
    </div>
  );
}
