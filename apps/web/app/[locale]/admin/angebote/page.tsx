"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { SERVICE_TEXT, dateTag, dayKey, euroDe, money } from "@/lib/admin/format";
import { ADMIN_PATHS } from "@/lib/admin/nav";
import { defineText, useText } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";
import { LOCALE_META } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { logoSrc } from "@/lib/site/defaults";

import css from "./page.module.css";

/**
 * Quotes & site visits, as the admin prototype runs them: every hand-priced
 * request from first contact to the customer's answer. KPIs, status tabs, the
 * list beside the open quote with its stepper, the customer, the site visit,
 * the priced lines with net, VAT and total, and the actions — send (emails the
 * customer), accepted (books a confirmed order), declined, reopen, print the
 * German Angebot, delete.
 *
 * Every edit saves at once (on leaving a field), as the prototype's do.
 */

const TEXT = defineText({
  title: { de: "Angebote & Besichtigungen", en: "Quotes & site visits", ar: "عروض الأسعار والمعاينات", tr: "Teklifler ve keşifler" },
  sub: {
    de: "Jede Anfrage vom ersten Kontakt bis zur Zusage des Kunden: Besichtigung vereinbaren, den Auftrag Position für Position kalkulieren und das Angebot senden.",
    en: "Every request from first contact to the customer’s approval: book the site visit, price the job line by line and send the quote.",
    ar: "كل طلب من أول تواصل حتى موافقة الزبون: حدّد موعد المعاينة، وسعّر العمل بنداً بنداً، ثم أرسل العرض.",
    tr: "İlk temastan müşteri onayına kadar her talep: keşif randevusunu planlayın, işi kalem kalem fiyatlandırın ve teklifi gönderin.",
  },
  newQuote: { de: "Neues Angebot", en: "New quote", ar: "عرض جديد", tr: "Yeni teklif" },
  kOpen: { de: "Angebote ohne Antwort", en: "Quotes waiting for an answer", ar: "عروض بانتظار الرد", tr: "Yanıt bekleyen teklifler" },
  kVisits: { de: "Besichtigungen in den nächsten 7 Tagen", en: "Site visits in the next 7 days", ar: "معاينات خلال 7 أيام", tr: "Önümüzdeki 7 gündeki keşifler" },
  kRate: { de: "Annahmequote", en: "Acceptance rate", ar: "نسبة القبول", tr: "Kabul oranı" },
  all: { de: "Alle offenen", en: "All open", ar: "كل المفتوحة", tr: "Tüm açık" },
  s_request: { de: "Anfrage", en: "Request", ar: "طلب", tr: "Talep" },
  s_visit: { de: "Besichtigung", en: "Site visit", ar: "معاينة", tr: "Keşif" },
  s_sent: { de: "Angebot gesendet", en: "Quote sent", ar: "عرض مُرسل", tr: "Teklif gönderildi" },
  s_accepted: { de: "Angenommen", en: "Accepted", ar: "مقبول", tr: "Kabul edildi" },
  s_declined: { de: "Abgelehnt", en: "Declined", ar: "مرفوض", tr: "Reddedildi" },
  visitOn: { de: "Besichtigung", en: "Visit", ar: "معاينة", tr: "Keşif" },
  unnamed: { de: "Neuer Kunde", en: "New customer", ar: "زبون جديد", tr: "Yeni müşteri" },
  src_website: { de: "Über die Website", en: "From the website", ar: "من الموقع", tr: "Web sitesinden" },
  src_phone: { de: "Telefonisch", en: "By phone", ar: "عبر الهاتف", tr: "Telefonla" },
  src_team: { de: "Vom Team angelegt", en: "Added by the team", ar: "أضافه الفريق", tr: "Ekip tarafından eklendi" },
  customer: { de: "Kunde", en: "Customer", ar: "الزبون", tr: "Müşteri" },
  name: { de: "Name", en: "Name", ar: "الاسم", tr: "Ad" },
  company: { de: "Firma (optional)", en: "Company (optional)", ar: "الشركة (اختياري)", tr: "Şirket (isteğe bağlı)" },
  email: { de: "E-Mail", en: "Email", ar: "البريد الإلكتروني", tr: "E-posta" },
  phone: { de: "Telefon", en: "Phone", ar: "الهاتف", tr: "Telefon" },
  addr: { de: "Adresse", en: "Address", ar: "العنوان", tr: "Adres" },
  svc: { de: "Leistung", en: "Service", ar: "الخدمة", tr: "Hizmet" },
  needs: { de: "Was der Kunde braucht", en: "What the customer needs", ar: "ما يحتاجه الزبون", tr: "Müşterinin ihtiyacı" },
  visit: { de: "Besichtigung", en: "Site visit", ar: "المعاينة", tr: "Keşif" },
  vDate: { de: "Datum", en: "Date", ar: "التاريخ", tr: "Tarih" },
  vTime: { de: "Uhrzeit", en: "Time", ar: "الوقت", tr: "Saat" },
  vWho: { de: "Wer besichtigt", en: "Who visits", ar: "من يقوم بالمعاينة", tr: "Keşfi kim yapacak" },
  vOther: { de: "Jemand anderes …", en: "Someone else…", ar: "شخص آخر…", tr: "Başka biri…" },
  vNote: { de: "Hinweis zur Besichtigung", en: "Note for the visit", ar: "ملاحظة للمعاينة", tr: "Keşif notu" },
  bookVisit: { de: "Besichtigung einplanen", en: "Book site visit", ar: "تثبيت موعد المعاينة", tr: "Keşif randevusu ver" },
  unassigned: { de: "Nicht zugewiesen", en: "Not assigned", ar: "غير معيّن", tr: "Atanmadı" },
  lines: { de: "Angebot", en: "Quote", ar: "العرض", tr: "Teklif" },
  lD: { de: "Beschreibung", en: "Description", ar: "الوصف", tr: "Açıklama" },
  lQ: { de: "Menge", en: "Qty", ar: "الكمية", tr: "Adet" },
  lP: { de: "Einzelpreis (netto)", en: "Unit price (net)", ar: "سعر الوحدة (صافٍ)", tr: "Birim fiyat (net)" },
  lT: { de: "Gesamt", en: "Total", ar: "المجموع", tr: "Toplam" },
  addLine: { de: "Position hinzufügen", en: "Add line", ar: "إضافة بند", tr: "Kalem ekle" },
  removeLine: { de: "Position entfernen", en: "Remove line", ar: "حذف البند", tr: "Kalemi kaldır" },
  noLines: { de: "Positionen und Preise nach der Besichtigung eintragen.", en: "Add the items and prices after the site visit.", ar: "أضف البنود والأسعار بعد المعاينة.", tr: "Kalemleri ve fiyatları keşiften sonra ekleyin." },
  net: { de: "Netto", en: "Net", ar: "المبلغ الصافي", tr: "Net" },
  vat: { de: "USt. {n} %", en: "VAT {n} %", ar: "ضريبة القيمة المضافة {n}%", tr: "KDV %{n}" },
  gross: { de: "Gesamt", en: "Total", ar: "الإجمالي", tr: "Toplam" },
  valid: { de: "Gültig bis", en: "Valid until", ar: "صالح حتى", tr: "Geçerlilik tarihi" },
  send: { de: "Angebot senden", en: "Send quote", ar: "إرسال العرض", tr: "Teklifi gönder" },
  resend: { de: "Erneut senden", en: "Send again", ar: "إعادة الإرسال", tr: "Tekrar gönder" },
  print: { de: "Drucken / PDF", en: "Print / PDF", ar: "طباعة / PDF", tr: "Yazdır / PDF" },
  accept: { de: "Kunde hat angenommen", en: "Customer accepted", ar: "وافق الزبون", tr: "Müşteri kabul etti" },
  decline: { de: "Kunde hat abgelehnt", en: "Customer declined", ar: "رفض الزبون", tr: "Müşteri reddetti" },
  reopen: { de: "Wieder öffnen", en: "Reopen", ar: "إعادة فتح", tr: "Yeniden aç" },
  openOrder: { de: "Auftrag öffnen", en: "Open booking", ar: "فتح الحجز", tr: "Siparişi aç" },
  remove: { de: "Angebot löschen", en: "Delete quote", ar: "حذف العرض", tr: "Teklifi sil" },
  removeQ: { de: "Dieses Angebot löschen?", en: "Delete this quote?", ar: "هل تريد حذف هذا العرض؟", tr: "Bu teklif silinsin mi?" },
  sentOn: { de: "Gesendet am", en: "Sent", ar: "أُرسل في", tr: "Gönderildi" },
  fromLead: { de: "Aus einer Website-Nachricht", en: "From a website message", ar: "من رسالة على الموقع", tr: "Bir web sitesi mesajından" },
  created: { de: "Angebot aus der Nachricht erstellt.", en: "Quote created from the message.", ar: "تم إنشاء عرض من الرسالة.", tr: "Mesajdan teklif oluşturuldu." },
  needDate: { de: "Wählen Sie zuerst ein Datum für die Besichtigung.", en: "Choose a date for the visit first.", ar: "اختر تاريخ المعاينة أولاً.", tr: "Önce keşif için bir tarih seçin." },
  visitSet: { de: "Besichtigung eingeplant.", en: "Site visit booked.", ar: "تم تثبيت موعد المعاينة.", tr: "Keşif randevusu verildi." },
  needLines: { de: "Fügen Sie vor dem Senden mindestens eine Position hinzu.", en: "Add at least one line before sending.", ar: "أضف بنداً واحداً على الأقل قبل الإرسال.", tr: "Göndermeden önce en az bir kalem ekleyin." },
  needEmail: { de: "Tragen Sie zuerst die E-Mail des Kunden ein.", en: "Add the customer’s email first.", ar: "أضف بريد الزبون أولاً.", tr: "Önce müşterinin e-postasını ekleyin." },
  sentT: { de: "Angebot an {email} gesendet.", en: "Quote sent to {email}.", ar: "تم إرسال العرض إلى {email}.", tr: "Teklif {email} adresine gönderildi." },
  orderT: { de: "Angebot angenommen. Auftrag {r} angelegt.", en: "Quote accepted. Booking {r} created.", ar: "تم قبول العرض وإنشاء الحجز {r}.", tr: "Teklif kabul edildi. {r} siparişi oluşturuldu." },
  declinedT: { de: "Angebot als abgelehnt markiert.", en: "Quote marked as declined.", ar: "تم تسجيل رفض العرض.", tr: "Teklif reddedildi olarak işaretlendi." },
  reopenedT: { de: "Angebot wieder geöffnet.", en: "Quote reopened.", ar: "تمت إعادة فتح العرض.", tr: "Teklif yeniden açıldı." },
  deletedT: { de: "Angebot gelöscht.", en: "Quote deleted.", ar: "تم حذف العرض.", tr: "Teklif silindi." },
  select: { de: "Wählen Sie ein Angebot aus, um es zu öffnen.", en: "Choose a quote to open it.", ar: "اختر عرضاً لفتحه.", tr: "Açmak için bir teklif seçin." },
  none: { de: "Hier sind keine Angebote.", en: "No quotes here.", ar: "لا توجد عروض هنا.", tr: "Burada teklif yok." },
  popup: { de: "Erlauben Sie Pop-ups, um das PDF zu laden.", en: "Allow pop-ups to download the PDF.", ar: "اسمح بالنوافذ المنبثقة لتحميل ملف PDF.", tr: "PDF'i indirmek için açılır pencerelere izin verin." },
  loadFailed: { de: "Die Angebote konnten nicht geladen werden.", en: "The quotes could not be loaded.", ar: "تعذّر تحميل العروض.", tr: "Teklifler yüklenemedi." },
  failed: { de: "Das hat nicht geklappt. Bitte erneut versuchen.", en: "That didn't work. Please try again.", ar: "لم تنجح العملية. حاول مرة أخرى.", tr: "Olmadı. Lütfen tekrar deneyin." },
  mailFailed: { de: "Die E-Mail konnte nicht gesendet werden. Das Angebot bleibt ungesendet.", en: "The email could not be sent. The quote stays unsent.", ar: "تعذّر إرسال البريد. يبقى العرض غير مُرسل.", tr: "E-posta gönderilemedi. Teklif gönderilmemiş olarak kalıyor." },
});

type Status = "request" | "visit" | "sent" | "accepted" | "declined";
type Source = "website" | "phone" | "team";

interface Line {
  description: string;
  qty: number;
  unitNet: number;
}

interface Quote {
  id: string;
  number: string;
  status: Status;
  source: Source;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  company: string | null;
  address: string | null;
  service: string | null;
  needs: string | null;
  visitDate: string | null;
  visitTime: string | null;
  visitBy: string | null;
  visitNote: string | null;
  lines: Line[];
  vatRate: string;
  validUntil: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  orderId: string | null;
  leadId: string | null;
  createdAt: string;
  order: { id: string; reference: string } | null;
  lead: { id: string; kind: string } | null;
}

interface Company {
  name: string;
  legalForm: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  register: string;
  vatId: string;
  taxNumber: string;
  managingDirector: string;
  iban: string;
  bic: string;
  bank: string;
  logo: string;
}

const STAGES: Status[] = ["request", "visit", "sent", "accepted"];

/** The prototype's pill colours per status: background, text. */
const ST: Record<Status, [string, string]> = {
  request: ["#fbf4e4", "#5c4a00"],
  visit: ["#eef2fb", "#3d5a99"],
  sent: ["#fff6f6", "#b7122b"],
  accepted: ["#edf5ed", "#3f705a"],
  declined: ["#f5f5f0", "#4a514d"],
};

/** The Who visits choice that switches to typing a name. */
const OTHER = "__other__";

const BUILTIN_SERVICES = ["moving", "cleaning", "renovation", "disposal"] as const;

const r2 = (n: number) => Math.round(n * 100) / 100;
const netOf = (lines: Line[]) => lines.reduce((sum, line) => sum + line.qty * line.unitNet, 0);
const grossOf = (lines: Line[], vat: number) => r2(netOf(lines) * (1 + vat / 100));
const vatOf = (q: Quote) => Number.parseFloat(q.vatRate) || 0;

/** "3,9", "3.9" and "1.234,50" all read as the number the office meant. */
function parseNum(value: string): number {
  let s = value.trim().replace(/\s|€/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

const card: CSSProperties = { background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, boxShadow: "0 12px 36px #202a2308" };
const fieldLabel: CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "#737870" };
const input: CSSProperties = { height: 38, padding: "0 10px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, color: "#252b28", minWidth: 0 };
const selectStyle: CSSProperties = { height: 38, padding: "0 8px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, color: "#252b28" };
const button: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, minHeight: 40, padding: "0 14px", whiteSpace: "nowrap", flex: "none", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 600 };
const divider = <div style={{ height: 1, background: "#eceee9" }} />;

export default function QuotesPage() {
  return (
    <AdminShell view="quotes">
      <Quotes />
    </AdminShell>
  );
}

type Tab = "all" | Status;

function Quotes() {
  const { sdk, can } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const sx = useText(SERVICE_TEXT);
  const toast = useToast();
  const queryClient = useQueryClient();
  const loc = dateTag(locale);
  const mayWrite = can("orders.write");

  const [tab, setTab] = useState<Tab>("all");
  const [selId, setSelId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useQuery({
    queryKey: ["admin", "sales-quotes"],
    queryFn: () => sdk.http.get<{ quotes: Quote[] }>("/api/sales-quotes"),
    refetchInterval: 30_000,
  });
  const quotes = useMemo(() => list.data?.quotes ?? [], [list.data]);

  // The teams that can do a site visit; an empty list until fleet exists.
  const teams = useQuery({
    queryKey: ["admin", "fleet", "teams"],
    queryFn: () => sdk.http.get<{ teams: { id: string; name: string; isActive?: boolean }[] }>("/api/fleet/teams").catch(() => ({ teams: [] })),
    staleTime: 60_000,
  });

  // The services on sale: the built-in four, plus custom ones once the catalogue serves them.
  const services = useQuery({
    queryKey: ["admin", "services", "options"],
    queryFn: () =>
      sdk.http
        .get<unknown>("/api/services")
        .then((data) => {
          const rows = (Array.isArray(data) ? data : (data as { services?: unknown[] })?.services) ?? [];
          return (rows as { key?: string; name?: Record<string, string> }[])
            .filter((row) => typeof row.key === "string")
            .map((row) => ({ key: row.key!, name: row.name ?? {} }));
        })
        .catch(() => [] as { key: string; name: Record<string, string> }[]),
    staleTime: 60_000,
  });

  const serviceName = (key: string | null) => {
    if (!key) return "";
    if ((BUILTIN_SERVICES as readonly string[]).includes(key)) return sx(key as keyof typeof SERVICE_TEXT);
    const custom = services.data?.find((s) => s.key === key);
    return custom?.name[locale] || custom?.name.de || key;
  };
  const serviceOptions = useMemo(() => {
    const keys: string[] = [...BUILTIN_SERVICES];
    for (const s of services.data ?? []) if (!keys.includes(s.key)) keys.push(s.key);
    return keys;
  }, [services.data]);

  const setQuote = (quote: Quote) =>
    queryClient.setQueryData<{ quotes: Quote[] }>(["admin", "sales-quotes"], (current) => {
      if (!current) return { quotes: [quote] };
      const exists = current.quotes.some((row) => row.id === quote.id);
      return { quotes: exists ? current.quotes.map((row) => (row.id === quote.id ? quote : row)) : [quote, ...current.quotes] };
    });

  const select = (id: string | null) => {
    setSelId(id);
    window.history.replaceState(null, "", id ? `?id=${id}` : window.location.pathname);
  };

  // A link from the inbox opens its quote, and says so when it was just made.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id || selId) return;
    if (quotes.some((q) => q.id === id)) {
      setSelId(id);
      if (params.get("from") === "lead") {
        toast(tx("created"));
        window.history.replaceState(null, "", `?id=${id}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes]);

  const create = async () => {
    setCreating(true);
    try {
      const { quote } = await sdk.http.post<{ quote: Quote }>("/api/sales-quotes", { source: "team" });
      setQuote(quote);
      setTab("all");
      select(quote.id);
    } catch {
      toast(tx("failed"));
    } finally {
      setCreating(false);
    }
  };

  const today = dayKey(new Date());
  const inWeek = dayKey(new Date(Date.now() + 7 * 864e5));
  const decided = quotes.filter((q) => q.status === "accepted" || q.status === "declined");
  const kpis = [
    { label: tx("kOpen"), value: money(quotes.filter((q) => q.status === "sent").reduce((sum, q) => sum + grossOf(q.lines, vatOf(q)), 0)) },
    { label: tx("kVisits"), value: String(quotes.filter((q) => q.status === "visit" && q.visitDate && q.visitDate >= today && q.visitDate <= inWeek).length) },
    { label: tx("kRate"), value: decided.length ? `${Math.round((100 * decided.filter((q) => q.status === "accepted").length) / decided.length)}%` : "—" },
  ];

  const inTab = (q: Quote, key: Tab) => (key === "all" ? q.status !== "declined" : q.status === key);
  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: tx("all") },
    ...STAGES.map((s) => ({ key: s as Tab, label: tx(`s_${s}`) })),
    { key: "declined", label: tx("s_declined") },
  ];
  const rows = quotes.filter((q) => inTab(q, tab));
  const sel = quotes.find((q) => q.id === selId) ?? null;
  const fd = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "short" });

  return (
    <section data-screen-label="Quotes and site visits" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 640 }}>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "var(--a-ls-h1)", lineHeight: 1.2 }}>{tx("title")}</h1>
          <p style={{ color: "#737870", fontSize: 13, marginTop: 6, textWrap: "pretty" }}>{tx("sub")}</p>
        </div>
        {mayWrite ? (
          <button type="button" className={css.red} disabled={creating} onClick={() => void create()} style={{ ...button, padding: "0 16px", border: "1px solid #d71635", background: "#d71635", color: "#ffffff" }}>
            <Icon d="M12 5v14M5 12h14" size={14} width={2.4} />
            {tx("newQuote")}
          </button>
        ) : null}
      </div>

      {list.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ ...card, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
            <small style={{ fontSize: 11.5, color: "#737870" }}>{k.label}</small>
            <b style={{ fontSize: 24, fontWeight: 650, letterSpacing: "var(--a-ls-h2)", fontVariantNumeric: "tabular-nums" }}>
              <bdi>{list.isLoading ? "—" : k.value}</bdi>
            </b>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tabs.map((t) => {
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={on}
              onClick={() => setTab(t.key)}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", minHeight: 34, padding: "0 13px", border: `1px solid ${on ? "#252b28" : "#e3e5de"}`, borderRadius: 999, background: on ? "#252b28" : "#ffffff", color: on ? "#ffffff" : "#4a514d", fontSize: 12, fontWeight: 600 }}
            >
              {t.label}
              <span style={{ fontSize: 11, opacity: 0.7 }}>{quotes.filter((q) => inTab(q, t.key)).length}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))", gap: 16, alignItems: "start" }}>
        <div style={{ ...card, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {list.isLoading
            ? [0, 1, 2, 3].map((i) => <div key={i} className="a-skel" style={{ height: 70, borderRadius: 8 }} />)
            : rows.map((q) => {
                const on = q.id === selId;
                const c = ST[q.status];
                const sub = q.status === "visit" && q.visitDate ? `${tx("visitOn")} ${fd(q.visitDate)} · ${q.visitTime ?? ""}` : serviceName(q.service);
                return (
                  <button
                    key={q.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => select(q.id)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: `1px solid ${on ? "#d71635" : "#eceee9"}`, borderRadius: 8, background: on ? "#fff6f6" : "#ffffff", textAlign: "start", width: "100%" }}
                  >
                    <span style={{ width: 36, height: 36, borderRadius: 8, background: "#f1f3f5", color: "#4a514d", display: "grid", placeItems: "center", flex: "none" }}>
                      <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h4" size={17} width={1.9} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                      <b style={{ fontSize: 13, fontWeight: 600, color: "#252b28", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.company || q.customerName || tx("unnamed")}</b>
                      <small style={{ fontSize: 11.5, color: "#737870", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <bdi>{q.number}</bdi> · {sub}
                      </small>
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flex: "none" }}>
                      <b style={{ fontSize: 12.5, fontWeight: 650, color: "#252b28", fontVariantNumeric: "tabular-nums" }}>
                        <bdi>{q.lines.length ? money(grossOf(q.lines, vatOf(q))) : "—"}</bdi>
                      </b>
                      <span style={{ padding: "3px 8px", borderRadius: 999, background: c[0], color: c[1], fontSize: 10.5, fontWeight: 650, whiteSpace: "nowrap" }}>{tx(`s_${q.status}`)}</span>
                    </span>
                  </button>
                );
              })}
          {!list.isLoading && rows.length === 0 ? <p style={{ padding: "30px 12px", textAlign: "center", color: "#737870", fontSize: 13 }}>{tx("none")}</p> : null}
        </div>

        <div style={{ ...card, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
          {!sel ? (
            <p style={{ padding: "40px 10px", textAlign: "center", color: "#737870", fontSize: 13 }}>{tx("select")}</p>
          ) : (
            <Detail
              key={sel.id}
              quote={sel}
              mayWrite={mayWrite}
              teams={(teams.data?.teams ?? []).filter((t) => t.isActive !== false).map((t) => t.name)}
              serviceOptions={serviceOptions}
              serviceName={serviceName}
              onChange={setQuote}
              onDeleted={() => {
                queryClient.setQueryData<{ quotes: Quote[] }>(["admin", "sales-quotes"], (current) =>
                  current ? { quotes: current.quotes.filter((row) => row.id !== sel.id) } : current,
                );
                select(null);
              }}
            />
          )}
        </div>
      </div>
    </section>
  );
}

/** What the inputs hold while they are being typed in; saved on leaving the field. */
interface Draft {
  customerName: string;
  company: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  needs: string;
  visitNote: string;
  visitBy: string;
  visitDate: string;
  visitTime: string;
  validUntil: string;
}

type LineDraft = { description: string; qty: string; unitNet: string };

const draftOf = (q: Quote): Draft => ({
  customerName: q.customerName ?? "",
  company: q.company ?? "",
  customerEmail: q.customerEmail ?? "",
  customerPhone: q.customerPhone ?? "",
  address: q.address ?? "",
  needs: q.needs ?? "",
  visitNote: q.visitNote ?? "",
  visitBy: q.visitBy ?? "",
  visitDate: q.visitDate ?? "",
  visitTime: q.visitTime ?? "10:00",
  validUntil: q.validUntil ?? "",
});

const linesOf = (q: Quote): LineDraft[] => q.lines.map((l) => ({ description: l.description, qty: String(l.qty), unitNet: String(l.unitNet) }));
const parseLines = (lines: LineDraft[]): Line[] => lines.map((l) => ({ description: l.description.trim(), qty: parseNum(l.qty), unitNet: parseNum(l.unitNet) }));

function Detail({
  quote,
  mayWrite,
  teams,
  serviceOptions,
  serviceName,
  onChange,
  onDeleted,
}: {
  quote: Quote;
  mayWrite: boolean;
  teams: string[];
  serviceOptions: string[];
  serviceName: (key: string | null) => string;
  onChange: (quote: Quote) => void;
  onDeleted: () => void;
}) {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const toast = useToast();
  const router = useRouter();
  const loc = dateTag(locale);
  const rtl = LOCALE_META[locale].dir === "rtl";

  const [draft, setDraft] = useState<Draft>(() => draftOf(quote));
  const [lines, setLines] = useState<LineDraft[]>(() => linesOf(quote));
  const [otherWho, setOtherWho] = useState(false);
  const [busy, setBusy] = useState(false);
  // Saves run one after another, and an action waits for the last one, so a
  // click on "Send" right after typing an email sends with that email.
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  const vat = vatOf(quote);
  const parsed = parseLines(lines);
  const net = r2(netOf(parsed));
  const gross = grossOf(parsed, vat);

  const save = (body: Record<string, unknown>) => {
    const next = chain.current.then(async () => {
      try {
        const { quote: fresh } = await sdk.http.patch<{ quote: Quote }>(`/api/sales-quotes/${quote.id}`, body);
        onChange(fresh);
      } catch {
        toast(tx("failed"));
      }
    });
    chain.current = next;
    return next;
  };

  const saveText = (key: keyof Draft) => {
    const value = draft[key].trim();
    const current = (key === "customerName" ? quote.customerName : quote[key]) ?? "";
    if (value !== current) void save({ [key]: value });
  };

  const saveLines = (next: LineDraft[]) => {
    // Compared as tuples: jsonb hands the lines back with their keys reordered.
    const key = (list: Line[]) => JSON.stringify(list.map((l) => [l.description, l.qty, l.unitNet]));
    if (key(parseLines(next)) !== key(quote.lines)) void save({ lines: parseLines(next) });
  };

  /** Runs a step after any pending save, then shows the result. */
  const act = async (path: string, done: (fresh: Quote, order?: { id: string; reference: string }) => string, body?: unknown) => {
    setBusy(true);
    try {
      await chain.current;
      const result = await sdk.http.post<{ quote: Quote; order?: { id: string; reference: string } }>(`/api/sales-quotes/${quote.id}/${path}`, body ?? {});
      onChange(result.quote);
      toast(done(result.quote, result.order));
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "";
      toast(
        /email first/i.test(message)
          ? tx("needEmail")
          : /at least one line/i.test(message)
            ? tx("needLines")
            : /date for the visit/i.test(message)
              ? tx("needDate")
              : error instanceof ApiError && error.status >= 500 && path === "send"
                ? tx("mailFailed")
                : tx("failed"),
      );
    } finally {
      setBusy(false);
    }
  };

  const onVisit = () => {
    if (!draft.visitDate) return toast(tx("needDate"));
    void act("visit", () => tx("visitSet"), { visitDate: draft.visitDate });
  };
  const onSend = () => {
    if (parsed.length === 0) return toast(tx("needLines"));
    if (!draft.customerEmail.trim()) return toast(tx("needEmail"));
    void act("send", (fresh) => tx("sentT", { email: fresh.customerEmail ?? "" }));
  };
  const onDelete = async () => {
    if (!window.confirm(tx("removeQ"))) return;
    try {
      await chain.current;
      await sdk.http.delete(`/api/sales-quotes/${quote.id}`);
      onDeleted();
      toast(tx("deletedT"));
    } catch {
      toast(tx("failed"));
    }
  };

  const onPrint = async () => {
    // Opened inside the click, before anything is awaited, or the browser
    // treats it as an unrequested pop-up.
    const w = window.open("", "_blank");
    if (!w) return toast(tx("popup"));
    try {
      await chain.current;
      const { company } = await sdk.http.get<{ company: Company }>("/api/sales-quotes/company");
      // A blob page rather than document.write into the blank window: it is a
      // real document of its own, so the logo loads before the print dialog.
      const url = URL.createObjectURL(new Blob([angebotHtml({ ...quote, lines: parsed }, company)], { type: "text/html" }));
      w.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      w.close();
      toast(tx("failed"));
    }
  };

  const si = STAGES.indexOf(quote.status);
  const c = ST[quote.status];
  const canEdit = mayWrite;
  const whoOptions = [...teams];
  if (draft.visitBy && !whoOptions.includes(draft.visitBy)) whoOptions.push(draft.visitBy);
  const services = quote.service && !serviceOptions.includes(quote.service) ? [...serviceOptions, quote.service] : serviceOptions;

  const text = (key: keyof Draft, label: string, extra?: { type?: string }) => (
    <label style={fieldLabel}>
      {label}
      <input
        dir="auto"
        type={extra?.type ?? "text"}
        value={draft[key]}
        readOnly={!canEdit}
        onChange={(event) => setDraft((d) => ({ ...d, [key]: event.target.value }))}
        onBlur={() => saveText(key)}
        style={input}
      />
    </label>
  );

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <b style={{ fontSize: 17, fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>
            <bdi>{quote.number}</bdi>
          </b>
          <small style={{ fontSize: 11.5, color: "#737870" }}>
            {new Date(quote.createdAt).toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
            {canEdit && quote.source !== "website" ? (
              <select className={css.src} value={quote.source} aria-label={tx("src_team")} onChange={(event) => void save({ source: event.target.value })}>
                <option value="phone">{tx("src_phone")}</option>
                <option value="team">{tx("src_team")}</option>
              </select>
            ) : (
              tx(`src_${quote.source}`)
            )}
          </small>
        </div>
        <span style={{ padding: "4px 10px", borderRadius: 999, background: c[0], color: c[1], fontSize: 11, fontWeight: 650 }}>{tx(`s_${quote.status}`)}</span>
      </div>

      {quote.status !== "declined" ? (
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          {STAGES.map((stage, i) => {
            const done = i <= si;
            return (
              <div key={stage} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${done ? "#d71635" : "#cfd3cb"}`, background: done ? "#d71635" : "#ffffff", color: done ? "#ffffff" : "#92958e", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flex: "none" }}>{i + 1}</span>
                  {i < STAGES.length - 1 ? <span style={{ flex: 1, height: 2, margin: "0 6px", borderRadius: 2, background: i < si ? "#d71635" : "#e3e5de" }} /> : null}
                </div>
                <small style={{ fontSize: 11, fontWeight: 600, color: done ? "#252b28" : "#92958e", paddingInlineEnd: 6 }}>{tx(`s_${stage}`)}</small>
              </div>
            );
          })}
        </div>
      ) : null}

      {quote.leadId ? (
        <button type="button" onClick={() => router.push(`/${locale}${ADMIN_PATHS.inbox}?id=${quote.leadId}`)} style={{ alignSelf: "flex-start", padding: 0, border: 0, background: "transparent", color: "#d71635", fontSize: 12, fontWeight: 600 }}>
          {tx("fromLead")} {rtl ? "‹" : "›"}
        </button>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <b style={{ fontSize: 13, fontWeight: 650 }}>{tx("customer")}</b>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,180px),1fr))", gap: 10 }}>
          {text("customerName", tx("name"))}
          {text("company", tx("company"))}
          {text("customerEmail", tx("email"), { type: "email" })}
          {text("customerPhone", tx("phone"), { type: "tel" })}
          {text("address", tx("addr"))}
          <label style={fieldLabel}>
            {tx("svc")}
            <select value={quote.service ?? ""} disabled={!canEdit} onChange={(event) => void save({ service: event.target.value })} style={selectStyle}>
              {services.map((key) => (
                <option key={key} value={key}>
                  {serviceName(key)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label style={fieldLabel}>
          {tx("needs")}
          <textarea
            dir="auto"
            rows={2}
            value={draft.needs}
            readOnly={!canEdit}
            onChange={(event) => setDraft((d) => ({ ...d, needs: event.target.value }))}
            onBlur={() => saveText("needs")}
            style={{ padding: "10px 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, color: "#252b28", resize: "vertical", fontFamily: "inherit" }}
          />
        </label>
      </div>

      {divider}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <b style={{ fontSize: 13, fontWeight: 650 }}>{tx("visit")}</b>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,140px),1fr))", gap: 10 }}>
          <label style={fieldLabel}>
            {tx("vDate")}
            <input dir="auto" type="date" value={draft.visitDate} disabled={!canEdit} onChange={(event) => setDraft((d) => ({ ...d, visitDate: event.target.value }))} onBlur={() => saveText("visitDate")} style={input} />
          </label>
          <label style={fieldLabel}>
            {tx("vTime")}
            <input dir="auto" type="time" value={draft.visitTime} disabled={!canEdit} onChange={(event) => setDraft((d) => ({ ...d, visitTime: event.target.value }))} onBlur={() => draft.visitTime && saveText("visitTime")} style={input} />
          </label>
          <label style={fieldLabel}>
            {tx("vWho")}
            {otherWho ? (
              <input
                dir="auto"
                autoFocus
                value={draft.visitBy}
                onChange={(event) => setDraft((d) => ({ ...d, visitBy: event.target.value }))}
                onBlur={() => {
                  saveText("visitBy");
                  setOtherWho(false);
                }}
                style={input}
              />
            ) : (
              <select
                value={draft.visitBy}
                disabled={!canEdit}
                onChange={(event) => {
                  if (event.target.value === OTHER) {
                    setDraft((d) => ({ ...d, visitBy: "" }));
                    setOtherWho(true);
                    return;
                  }
                  setDraft((d) => ({ ...d, visitBy: event.target.value }));
                  void save({ visitBy: event.target.value });
                }}
                style={selectStyle}
              >
                <option value="">{tx("unassigned")}</option>
                {whoOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                <option value={OTHER}>{tx("vOther")}</option>
              </select>
            )}
          </label>
        </div>
        <label style={fieldLabel}>
          {tx("vNote")}
          <input dir="auto" value={draft.visitNote} readOnly={!canEdit} onChange={(event) => setDraft((d) => ({ ...d, visitNote: event.target.value }))} onBlur={() => saveText("visitNote")} style={input} />
        </label>
        {canEdit && quote.status === "request" ? (
          <button type="button" className={css.dark} disabled={busy} onClick={onVisit} style={{ ...button, alignSelf: "flex-start", minHeight: 38, border: "1px solid #252b28" }}>
            <Icon d="M4 5h16v15H4zM4 10h16M9 3v4M15 3v4" size={15} width={2} />
            {tx("bookVisit")}
          </button>
        ) : null}
      </div>

      {divider}

      <div className={css.lines} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <b style={{ fontSize: 13, fontWeight: 650 }}>{tx("lines")}</b>
          {canEdit ? (
            <button
              type="button"
              className={css.line}
              onClick={() => {
                const next = [...lines, { description: "", qty: "1", unitNet: "0" }];
                setLines(next);
                saveLines(next);
              }}
              style={{ ...button, gap: 6, minHeight: 32, padding: "0 10px" }}
            >
              <Icon d="M12 5v14M5 12h14" size={12} width={2.6} />
              {tx("addLine")}
            </button>
          ) : null}
        </div>
        {lines.length === 0 ? (
          <p style={{ padding: 16, border: "1px dashed #cfd3cb", borderRadius: 8, textAlign: "center", color: "#737870", fontSize: 12.5 }}>{tx("noLines")}</p>
        ) : (
          <>
            <div className={css.lineRow} style={{ fontSize: 11, color: "#92958e", padding: "0 2px" }}>
              <span>{tx("lD")}</span>
              <span>{tx("lQ")}</span>
              <span>{tx("lP")}</span>
              <span style={{ textAlign: "end" }}>{tx("lT")}</span>
              <span />
            </div>
            {lines.map((line, i) => {
              const set = (key: keyof LineDraft, value: string) => setLines((current) => current.map((l, j) => (j === i ? { ...l, [key]: value } : l)));
              const cell: CSSProperties = { height: 36, padding: "0 8px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 12.5, color: "#252b28", minWidth: 0, fontVariantNumeric: "tabular-nums" };
              return (
                <div key={i} className={css.lineRow}>
                  <input dir="auto" value={line.description} readOnly={!canEdit} onChange={(event) => set("description", event.target.value)} onBlur={() => saveLines(lines)} style={{ ...cell, padding: "0 10px" }} />
                  <input dir="auto" inputMode="decimal" value={line.qty} readOnly={!canEdit} onChange={(event) => set("qty", event.target.value)} onBlur={() => saveLines(lines)} style={cell} />
                  <input dir="auto" inputMode="decimal" value={line.unitNet} readOnly={!canEdit} onChange={(event) => set("unitNet", event.target.value)} onBlur={() => saveLines(lines)} style={cell} />
                  <b style={{ fontSize: 12.5, fontWeight: 650, textAlign: "end", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                    <bdi>{money(parsed[i]!.qty * parsed[i]!.unitNet)}</bdi>
                  </b>
                  {canEdit ? (
                    <button
                      type="button"
                      className={css.del}
                      aria-label={tx("removeLine")}
                      onClick={() => {
                        const next = lines.filter((_, j) => j !== i);
                        setLines(next);
                        saveLines(next);
                      }}
                      style={{ width: 28, height: 28, display: "grid", placeItems: "center", border: 0, borderRadius: 6, background: "transparent", color: "#92958e", padding: 0 }}
                    >
                      <Icon d="M6 6l12 12M18 6L6 18" size={14} width={2.2} />
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4, paddingTop: 10, borderTop: "1px solid #eceee9", fontSize: 12.5 }}>
              <Sum label={tx("net")} value={money(net)} />
              <Sum label={tx("vat", { n: String(vat) })} value={money(gross - net)} />
              <Sum label={tx("gross")} value={money(gross)} strong />
            </div>
          </>
        )}
        <label style={{ ...fieldLabel, maxWidth: 200 }}>
          {tx("valid")}
          <input dir="auto" type="date" value={draft.validUntil} disabled={!canEdit} onChange={(event) => setDraft((d) => ({ ...d, validUntil: event.target.value }))} onBlur={() => saveText("validUntil")} style={input} />
        </label>
      </div>

      {divider}

      {quote.sentAt ? (
        <small style={{ fontSize: 11.5, color: "#737870" }}>
          {tx("sentOn")} {new Date(quote.sentAt).toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" })}
          {quote.customerEmail ? (
            <>
              {" · "}
              <bdi>{quote.customerEmail}</bdi>
            </>
          ) : null}
        </small>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {canEdit && ["request", "visit", "sent"].includes(quote.status) ? (
          <button type="button" className={css.red} disabled={busy} onClick={onSend} style={{ ...button, padding: "0 16px", border: "1px solid #d71635", background: "#d71635", color: "#ffffff" }}>
            <Icon d="M22 2L11 13M22 2l-7 20-4-9-9-4z" size={15} width={2} />
            {quote.status === "sent" ? tx("resend") : tx("send")}
          </button>
        ) : null}
        {canEdit && quote.status === "sent" ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void act("accept", (fresh, order) => tx("orderT", { r: order?.reference ?? fresh.order?.reference ?? "" }))}
              style={{ ...button, border: "1px solid #3f705a", background: "#edf5ed", color: "#2f5a47" }}
            >
              {tx("accept")}
            </button>
            <button type="button" disabled={busy} onClick={() => void act("decline", () => tx("declinedT"))} style={{ ...button, color: "#4a514d" }}>
              {tx("decline")}
            </button>
          </>
        ) : null}
        {canEdit && (quote.status === "accepted" || quote.status === "declined") ? (
          <button type="button" disabled={busy} onClick={() => void act("reopen", () => tx("reopenedT"))} style={button}>
            {tx("reopen")}
          </button>
        ) : null}
        {quote.order ? (
          <button type="button" onClick={() => router.push(`/${locale}${ADMIN_PATHS.orders}/${quote.order!.id}`)} style={{ ...button, border: "1px solid #3f705a", background: "#edf5ed", color: "#2f5a47" }}>
            <Icon d="M1 6h13v10H1zM14 9h4l3 3v4h-7M5.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" size={15} width={2} />
            {tx("openOrder")} · <bdi>{quote.order.reference}</bdi>
          </button>
        ) : null}
        <button type="button" className={css.line} onClick={() => void onPrint()} style={button}>
          <Icon d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z" size={15} width={2} />
          {tx("print")}
        </button>
        <span style={{ flex: 1 }} />
        {canEdit ? (
          <button type="button" onClick={() => void onDelete()} style={{ minHeight: 36, padding: "0 4px", border: 0, background: "transparent", color: "#b7122b", fontSize: 12, fontWeight: 600 }}>
            {tx("remove")}
          </button>
        ) : null}
      </div>
    </>
  );
}

function Sum({ label, value, strong }: { label: ReactNode; value: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, ...(strong ? { fontSize: 15, fontWeight: 700, color: "#252b28" } : { color: "#4a514d" }) }}>
      <span>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        <bdi>{value}</bdi>
      </span>
    </div>
  );
}

function Icon({ d, size, width }: { d: string; size: number; width: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

// ── The printed Angebot ───────────────────────────────────────────────────

const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
const deDate = (value: string | number | Date) => new Date(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value).toLocaleDateString("de-DE");
const rate = (value: number) => String(value).replace(".", ",");

/**
 * The German Angebot, as the prototype prints it: logo and title, the
 * customer's address beside the number, date and validity, the priced table
 * with net, VAT and total, and a footer with the company's details from the
 * settings — every line the settings leave empty is simply left out.
 */
function angebotHtml(q: Quote, co: Company): string {
  const vat = vatOf(q);
  const net = r2(netOf(q.lines));
  const gross = grossOf(q.lines, vat);
  // The same checked logo the dashboard shows; a path that no longer ships falls back.
  const logo = new URL(logoSrc(co.logo), window.location.origin).href;
  const name = [co.name, co.legalForm && !co.name.includes(co.legalForm) ? co.legalForm : ""].filter(Boolean).join(" ");
  const rows = q.lines
    .map((l) => `<tr><td>${esc(l.description || "—")}</td><td class="r">${esc(rate(l.qty))}</td><td class="r">${euroDe(l.unitNet)}</td><td class="r">${euroDe(l.qty * l.unitNet)}</td></tr>`)
    .join("");
  const foot = [
    [`<b>${esc(name)}</b>`, esc(co.address), co.managingDirector ? `Geschäftsführung: ${esc(co.managingDirector)}` : ""],
    [esc(co.email), esc(co.phone), esc(co.website)],
    [
      co.register ? esc(co.register) : "",
      co.vatId ? `USt-IdNr.: ${esc(co.vatId)}` : "",
      co.taxNumber ? `St.-Nr.: ${esc(co.taxNumber)}` : "",
      co.iban ? `IBAN: ${esc(co.iban)}${co.bic ? ` · BIC: ${esc(co.bic)}` : ""}` : "",
      co.bank ? esc(co.bank) : "",
    ],
  ]
    .map((col) => `<div>${col.filter(Boolean).join("<br>")}</div>`)
    .join("");
  const script = "scr" + "ipt";

  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Angebot ${esc(q.number)}</title><style>
body{font-family:Helvetica,Arial,sans-serif;color:#252b28;margin:48px;font-size:12.5px;line-height:1.5}
header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #d71635;padding-bottom:18px;margin-bottom:26px}
header img{height:34px}h1{font-size:24px;margin:0 0 4px}small{color:#737870}p{margin:0 0 6px}
.grid{display:grid;grid-template-columns:1.2fr 1fr;gap:28px;margin-bottom:22px}
.meta td{padding:2px 0;border:0}.meta td:first-child{color:#737870;padding-right:18px}
table{width:100%;border-collapse:collapse}td{padding:9px 0;border-bottom:1px solid #e3e5de;vertical-align:top}td+td{padding-left:14px}
.r{text-align:right;white-space:nowrap}.h td{color:#737870;font-size:11px}.t td{border-bottom:0;font-weight:700;font-size:15px;padding-top:12px}
footer{margin-top:40px;padding-top:14px;border-top:1px solid #e3e5de;display:grid;grid-template-columns:repeat(3,1fr);gap:18px;font-size:10.5px;color:#4a514d}
@media print{body{margin:18mm 16mm}}
</style></head><body>
<header>${logo ? `<img src="${esc(logo)}" alt="${esc(co.name)}">` : `<b style="font-size:20px;color:#d71635">${esc(co.name)}</b>`}<div style="text-align:right"><h1>Angebot</h1><small>${esc(q.number)}</small></div></header>
<div class="grid"><div><small>${esc(name)}${co.address ? ` · ${esc(co.address)}` : ""}</small><p style="margin-top:8px"><b>${esc(q.company || q.customerName)}</b>${q.company && q.customerName ? `<br>${esc(q.customerName)}` : ""}${q.address ? `<br>${esc(q.address)}` : ""}</p></div>
<table class="meta"><tr><td>Angebotsnr.</td><td>${esc(q.number)}</td></tr><tr><td>Datum</td><td>${deDate(q.sentAt ?? Date.now())}</td></tr>${q.validUntil ? `<tr><td>Gültig bis</td><td><b>${deDate(q.validUntil)}</b></td></tr>` : ""}</table></div>
<table><tr class="h"><td>Leistung</td><td class="r">Menge</td><td class="r">Einzelpreis</td><td class="r">Gesamt</td></tr>${rows}
<tr><td colspan="3">Nettobetrag</td><td class="r">${euroDe(net)}</td></tr>
<tr><td colspan="3">zzgl. ${esc(rate(vat))} % USt.</td><td class="r">${euroDe(gross - net)}</td></tr>
<tr class="t"><td colspan="3">Angebotssumme</td><td class="r">${euroDe(gross)}</td></tr></table>
<p style="margin-top:22px">Wir freuen uns auf Ihren Auftrag. Bitte bestätigen Sie das Angebot per E-Mail oder telefonisch.</p>
<footer>${foot}</footer>
<${script}>window.onload=function(){setTimeout(function(){window.print()},350)}</${script}>
</body></html>`;
}
