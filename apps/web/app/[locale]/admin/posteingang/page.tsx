"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { dateTag } from "@/lib/admin/format";
import { ADMIN_PATHS } from "@/lib/admin/nav";
import { defineText, useText } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

import css from "./page.module.css";

/**
 * Website inbox: what visitors send through the contact, business, partnership
 * and job forms, as the admin prototype's inbox lays it out — counters, kind
 * tabs, the list beside the open message with every field the form had, a
 * reply by email or phone, the status, an internal note, and "Create quote",
 * which turns the request into a quote on the Quotes screen.
 *
 * Opening a new message marks it read (the API does that on reading it).
 */

const TEXT = defineText({
  title: { de: "Website-Posteingang", en: "Website inbox", ar: "صندوق رسائل الموقع", tr: "Web sitesi gelen kutusu" },
  sub: {
    de: "Nachrichten aus den Kontakt-, Firmen- und Partnerformularen der Website. Antworten, Notizen festhalten und aus einer Anfrage ein Angebot machen.",
    en: "Messages from the contact, business and partnership forms on the website. Reply, keep notes and turn a request into a quote.",
    ar: "الرسائل الواردة من نماذج التواصل والشركات والشراكات على الموقع. ردّ عليها، ودوّن ملاحظاتك، وحوّل الطلب إلى عرض سعر.",
    tr: "Web sitesindeki iletişim, kurumsal ve ortaklık formlarından gelen mesajlar. Yanıtlayın, not alın ve bir talebi teklife dönüştürün.",
  },
  kNew: { de: "Ungelesen", en: "Unread", ar: "غير مقروءة", tr: "Okunmamış" },
  kOpen: { de: "Warten auf Antwort", en: "Waiting for a reply", ar: "بانتظار الرد", tr: "Yanıt bekleyen" },
  kWeek: { de: "Letzte 7 Tage", en: "Last 7 days", ar: "آخر 7 أيام", tr: "Son 7 gün" },
  all: { de: "Alle", en: "All", ar: "الكل", tr: "Tümü" },
  closed: { de: "Geschlossen", en: "Closed", ar: "مغلقة", tr: "Kapalı" },
  k_contact: { de: "Kontakt", en: "Contact", ar: "تواصل معنا", tr: "İletişim" },
  k_business: { de: "Firma", en: "Business", ar: "طلب شركة", tr: "Kurumsal" },
  k_partner: { de: "Partnerschaft", en: "Partnership", ar: "شراكة", tr: "Ortaklık" },
  k_job: { de: "Bewerbung", en: "Job application", ar: "طلب توظيف", tr: "İş başvurusu" },
  s_new: { de: "Neu", en: "New", ar: "جديدة", tr: "Yeni" },
  s_read: { de: "Gelesen", en: "Read", ar: "مقروءة", tr: "Okundu" },
  s_replied: { de: "Beantwortet", en: "Replied", ar: "تم الرد", tr: "Yanıtlandı" },
  s_closed: { de: "Geschlossen", en: "Closed", ar: "مغلقة", tr: "Kapalı" },
  min: { de: "vor {n} Min.", en: "{n} min ago", ar: "قبل {n} دقيقة", tr: "{n} dk önce" },
  hr: { de: "vor {n} Std.", en: "{n} h ago", ar: "قبل {n} ساعة", tr: "{n} sa önce" },
  f_company: { de: "Firma", en: "Company", ar: "الشركة", tr: "Şirket" },
  f_name: { de: "Name", en: "Name", ar: "الاسم", tr: "Ad" },
  f_firstName: { de: "Vorname", en: "First name", ar: "الاسم الأول", tr: "Ad" },
  f_lastName: { de: "Nachname", en: "Last name", ar: "الكنية", tr: "Soyad" },
  f_email: { de: "E-Mail", en: "Email", ar: "البريد الإلكتروني", tr: "E-posta" },
  f_phone: { de: "Telefon", en: "Phone", ar: "الهاتف", tr: "Telefon" },
  f_size: { de: "Arbeitsplätze", en: "Workstations", ar: "عدد المكاتب", tr: "Çalışma alanı" },
  f_type: { de: "Partnerart", en: "Partner type", ar: "نوع الشراكة", tr: "Ortaklık türü" },
  f_topic: { de: "Thema", en: "Topic", ar: "الموضوع", tr: "Konu" },
  f_role: { de: "Position", en: "Role", ar: "الوظيفة", tr: "Pozisyon" },
  f_moveDate: { de: "Umzugstermin", en: "Move date", ar: "تاريخ النقل", tr: "Taşınma tarihi" },
  f_fleetSize: { de: "Fuhrparkgröße", en: "Fleet size", ar: "حجم الأسطول", tr: "Filo büyüklüğü" },
  f_area: { de: "Einsatzgebiet", en: "Coverage area", ar: "منطقة التغطية", tr: "Hizmet bölgesi" },
  f_certificates: { de: "Zertifikate (Datei)", en: "Certificates (file)", ar: "الشهادات (ملف)", tr: "Sertifikalar (dosya)" },
  f_address: { de: "Adresse", en: "Address", ar: "العنوان", tr: "Adres" },
  msg: { de: "Nachricht", en: "Message", ar: "الرسالة", tr: "Mesaj" },
  reply: { de: "Per E-Mail antworten", en: "Reply by email", ar: "الرد بالبريد", tr: "E-posta ile yanıtla" },
  call: { de: "Anrufen", en: "Call", ar: "اتصال", tr: "Ara" },
  toQuote: { de: "Angebot erstellen", en: "Create quote", ar: "إنشاء عرض سعر", tr: "Teklif oluştur" },
  openQuote: { de: "Angebot öffnen", en: "Open quote", ar: "فتح العرض", tr: "Teklifi aç" },
  status: { de: "Status", en: "Status", ar: "الحالة", tr: "Durum" },
  note: { de: "Interne Notiz", en: "Internal note", ar: "ملاحظة داخلية", tr: "Dahili not" },
  notePh: { de: "Nur Ihr Team sieht das.", en: "Only your team sees this.", ar: "يراها فريقك فقط.", tr: "Bunu yalnızca ekibiniz görür." },
  noteSaved: { de: "Notiz gespeichert.", en: "Note saved.", ar: "تم حفظ الملاحظة.", tr: "Not kaydedildi." },
  closeMsg: { de: "Nachricht schließen", en: "Close message", ar: "إغلاق الرسالة", tr: "Mesajı kapat" },
  reopen: { de: "Nachricht wieder öffnen", en: "Reopen message", ar: "إعادة فتح الرسالة", tr: "Mesajı yeniden aç" },
  select: { de: "Wählen Sie eine Nachricht aus, um sie zu lesen.", en: "Choose a message to read it.", ar: "اختر رسالة لقراءتها.", tr: "Okumak için bir mesaj seçin." },
  none: { de: "Hier sind keine Nachrichten.", en: "No messages here.", ar: "لا توجد رسائل هنا.", tr: "Burada mesaj yok." },
  loadFailed: { de: "Die Nachrichten konnten nicht geladen werden.", en: "The messages could not be loaded.", ar: "تعذّر تحميل الرسائل.", tr: "Mesajlar yüklenemedi." },
  failed: { de: "Das hat nicht geklappt. Bitte erneut versuchen.", en: "That didn't work. Please try again.", ar: "لم تنجح العملية. حاول مرة أخرى.", tr: "Olmadı. Lütfen tekrar deneyin." },
});

type Kind = "contact" | "business" | "partner" | "job";
type Status = "new" | "read" | "replied" | "closed";

interface Lead {
  id: string;
  kind: Kind;
  status: Status;
  name: string;
  /** The halves of `name` when the form asked for them (older messages: null). */
  firstName?: string | null;
  lastName?: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  message: string | null;
  data: Record<string, string>;
  note: string | null;
  locale: string;
  createdAt: string;
  quote: { id: string; number: string } | null;
}

const KINDS: Kind[] = ["contact", "business", "partner", "job"];
const STATUSES: Status[] = ["new", "read", "replied", "closed"];

/** The prototype's pill colours per status: background, text. */
const ST: Record<Status, [string, string]> = {
  new: ["#fbf4e4", "#5c4a00"],
  read: ["#eef2fb", "#3d5a99"],
  replied: ["#edf5ed", "#3f705a"],
  closed: ["#f5f5f0", "#4a514d"],
};

const KIND_ICON: Record<Kind, string> = {
  job: "M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18",
  contact: "M4 5h16v14H4zM4 7l8 6 8-6",
  business: "M3 21h18M5 21V5h10v16M15 9h4v12M8 9h4M8 13h4M8 17h4",
  partner: "M8 12l3 3 5-5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
};

/**
 * The labels for the fields the forms send, in the order the prototype lists
 * them; anything else a form adds is shown under its own name after these.
 */
const FIELD_ORDER = ["size", "type", "topic", "service", "role", "moveDate", "fleetSize", "area", "address", "certificates"] as const;
const FIELD_LABEL: Record<string, keyof typeof TEXT> = {
  size: "f_size",
  type: "f_type",
  topic: "f_topic",
  service: "f_topic",
  role: "f_role",
  moveDate: "f_moveDate",
  fleetSize: "f_fleetSize",
  area: "f_area",
  address: "f_address",
  certificates: "f_certificates",
};

const card: CSSProperties = { background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, boxShadow: "0 12px 36px #202a2308" };

export default function InboxPage() {
  return (
    <AdminShell view="inbox">
      <Inbox />
    </AdminShell>
  );
}

type Tab = "all" | Kind | "closed";

function Inbox() {
  const { sdk, can } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const loc = dateTag(locale);

  const [tab, setTab] = useState<Tab>("all");
  const [selId, setSelId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const mayWrite = can("messages.write");
  const mayQuote = can("orders.write");

  const list = useQuery({
    queryKey: ["admin", "leads"],
    queryFn: () => sdk.http.get<{ leads: Lead[] }>("/api/leads"),
    refetchInterval: 30_000,
  });
  const all = useMemo(() => list.data?.leads ?? [], [list.data]);

  const setLead = (lead: Lead) => {
    queryClient.setQueryData<{ leads: Lead[] }>(["admin", "leads"], (current) =>
      current ? { leads: current.leads.map((row) => (row.id === lead.id ? lead : row)) } : current,
    );
    void queryClient.invalidateQueries({ queryKey: ["admin", "counts"] });
  };

  // Reading a new message is what marks it read; the API does it on GET.
  const open = (lead: Lead) => {
    setSelId(lead.id);
    setNote(lead.note ?? "");
    window.history.replaceState(null, "", `?id=${lead.id}`);
    if (lead.status === "new") {
      setLead({ ...lead, status: "read" });
      sdk.http
        .get<{ lead: Lead }>(`/api/leads/${lead.id}`)
        .then(({ lead: fresh }) => setLead(fresh))
        .catch(() => undefined);
    }
  };

  // A link from a quote ("From a website message") opens its message.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id || selId || all.length === 0) return;
    const lead = all.find((row) => row.id === id);
    if (lead) open(lead);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  const patch = async (lead: Lead, body: { status?: Status; note?: string | null }) => {
    try {
      const { lead: fresh } = await sdk.http.patch<{ lead: Lead }>(`/api/leads/${lead.id}`, body);
      setLead(fresh);
      return true;
    } catch {
      toast(tx("failed"));
      return false;
    }
  };

  const createQuote = async (lead: Lead) => {
    setBusy(true);
    try {
      const { quote } = await sdk.http.post<{ quote: { id: string } }>("/api/sales-quotes", { leadId: lead.id });
      void queryClient.invalidateQueries({ queryKey: ["admin", "sales-quotes"] });
      router.push(`/${locale}${ADMIN_PATHS.quotes}?id=${quote.id}&from=lead`);
    } catch {
      toast(tx("failed"));
      setBusy(false);
    }
  };

  const isOpen = (lead: Lead) => lead.status !== "closed";
  const inTab = (lead: Lead, key: Tab) => (key === "all" ? isOpen(lead) : key === "closed" ? !isOpen(lead) : lead.kind === key && isOpen(lead));
  const rows = all.filter((lead) => inTab(lead, tab));
  const sel = all.find((lead) => lead.id === selId) ?? null;

  const week = Date.now() - 7 * 864e5;
  const kpis = [
    { label: tx("kNew"), value: all.filter((lead) => lead.status === "new").length },
    { label: tx("kOpen"), value: all.filter((lead) => lead.status === "new" || lead.status === "read").length },
    { label: tx("kWeek"), value: all.filter((lead) => new Date(lead.createdAt).getTime() > week).length },
  ];
  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: tx("all") },
    ...KINDS.map((kind) => ({ key: kind as Tab, label: tx(`k_${kind}`) })),
    { key: "closed", label: tx("closed") },
  ];

  const ago = (iso: string) => {
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 60) return tx("min", { n: Math.max(1, minutes) });
    const hours = Math.round(minutes / 60);
    if (hours < 24) return tx("hr", { n: hours });
    return new Date(iso).toLocaleDateString(loc, { day: "numeric", month: "short" });
  };

  return (
    <section data-screen-label="Website inbox" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ maxWidth: 640 }}>
        <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "var(--a-ls-h1)", lineHeight: 1.2 }}>{tx("title")}</h1>
        <p style={{ color: "#737870", fontSize: 13, marginTop: 6, textWrap: "pretty" }}>{tx("sub")}</p>
      </div>

      {list.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ ...card, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
            <small style={{ fontSize: 11.5, color: "#737870" }}>{k.label}</small>
            <b style={{ fontSize: 24, fontWeight: 650, letterSpacing: "var(--a-ls-h2)", fontVariantNumeric: "tabular-nums" }}>{list.isLoading ? "—" : k.value}</b>
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
              <span style={{ fontSize: 11, opacity: 0.7 }}>{all.filter((lead) => inTab(lead, t.key)).length}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 16, alignItems: "start" }}>
        <div style={{ ...card, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {list.isLoading
            ? [0, 1, 2, 3].map((i) => <div key={i} className="a-skel" style={{ height: 86, borderRadius: 8 }} />)
            : rows.map((lead) => {
                const on = lead.id === selId;
                const unread = lead.status === "new";
                const c = ST[lead.status];
                return (
                  <button
                    key={lead.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => open(lead)}
                    style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 12, border: `1px solid ${on ? "#d71635" : "#eceee9"}`, borderRadius: 8, background: on ? "#fff6f6" : "#ffffff", textAlign: "start", width: "100%" }}
                  >
                    <span style={{ position: "relative", width: 36, height: 36, borderRadius: 8, background: "#f1f3f5", color: "#4a514d", display: "grid", placeItems: "center", flex: "none" }}>
                      <Icon d={KIND_ICON[lead.kind]} size={17} width={1.9} />
                      {unread ? <i style={{ position: "absolute", top: -3, insetInlineEnd: -3, display: "block", width: 10, height: 10, borderRadius: "50%", background: "#d71635", border: "2px solid #ffffff" }} /> : null}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <b style={{ fontSize: 13, fontWeight: unread ? 700 : 600, color: "#252b28", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {lead.company || lead.name || lead.email || "—"}
                        </b>
                        <small style={{ fontSize: 11, color: "#92958e", flex: "none" }}>{ago(lead.createdAt)}</small>
                      </span>
                      <small style={{ fontSize: 11.5, color: "#737870", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", unicodeBidi: "plaintext", textAlign: "start" }}>
                        {/* Forms without a message (business, partner) show what they asked instead. */}
                        {String(lead.message || Object.values(lead.data ?? {}).join(" · ")).replace(/\s+/g, " ").slice(0, 110)}
                      </small>
                      <span style={{ display: "flex", gap: 6, marginTop: 3 }}>
                        <span style={{ padding: "2px 7px", borderRadius: 4, background: "#f1f3f5", color: "#4a514d", fontSize: 10.5, fontWeight: 600 }}>{tx(`k_${lead.kind}`)}</span>
                        <span style={{ padding: "2px 8px", borderRadius: 999, background: c[0], color: c[1], fontSize: 10.5, fontWeight: 650 }}>{tx(`s_${lead.status}`)}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
          {!list.isLoading && rows.length === 0 ? <p style={{ padding: "30px 12px", textAlign: "center", color: "#737870", fontSize: 13 }}>{tx("none")}</p> : null}
        </div>

        <div style={{ ...card, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {!sel ? (
            <p style={{ padding: "40px 10px", textAlign: "center", color: "#737870", fontSize: 13 }}>{tx("select")}</p>
          ) : (
            <Detail
              key={sel.id}
              lead={sel}
              note={note}
              setNote={setNote}
              mayWrite={mayWrite}
              mayQuote={mayQuote}
              busy={busy}
              loc={loc}
              onStatus={(status) => void patch(sel, { status })}
              onNote={() => {
                if ((sel.note ?? "") === note) return;
                void patch(sel, { note: note.trim() ? note : null }).then((ok) => ok && toast(tx("noteSaved")));
              }}
              onReply={() => {
                if (mayWrite && sel.status !== "replied") void patch(sel, { status: "replied" });
              }}
              onQuote={() => void createQuote(sel)}
              onOpenQuote={() => sel.quote && router.push(`/${locale}${ADMIN_PATHS.quotes}?id=${sel.quote.id}`)}
              onClose={() => {
                void patch(sel, { status: "closed" });
                setSelId(null);
                window.history.replaceState(null, "", window.location.pathname);
              }}
              onReopen={() => void patch(sel, { status: "read" })}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function Detail({
  lead,
  note,
  setNote,
  mayWrite,
  mayQuote,
  busy,
  loc,
  onStatus,
  onNote,
  onReply,
  onQuote,
  onOpenQuote,
  onClose,
  onReopen,
}: {
  lead: Lead;
  note: string;
  setNote: (value: string) => void;
  mayWrite: boolean;
  mayQuote: boolean;
  busy: boolean;
  loc: string;
  onStatus: (status: Status) => void;
  onNote: () => void;
  onReply: () => void;
  onQuote: () => void;
  onOpenQuote: () => void;
  onClose: () => void;
  onReopen: () => void;
}) {
  const tx = useText(TEXT);
  const data = lead.data ?? {};
  // The business form asks for a company and no person, so the sender's name
  // is the company itself and is not repeated.
  const person = lead.name && lead.name !== lead.company && lead.name !== lead.email ? lead.name : "";
  const title = lead.company ? `${lead.company}${person ? ` · ${person}` : ""}` : person || lead.email || "";

  const facts: { k: string; v: string; href?: string }[] = [];
  if (lead.company) facts.push({ k: tx("f_company"), v: lead.company });
  if (person && (lead.firstName || lead.lastName)) {
    facts.push({ k: tx("f_firstName"), v: lead.firstName || "—" }, { k: tx("f_lastName"), v: lead.lastName || "—" });
  } else if (person) facts.push({ k: tx("f_name"), v: person });
  if (lead.email) facts.push({ k: tx("f_email"), v: lead.email, href: `mailto:${lead.email}` });
  if (lead.phone) facts.push({ k: tx("f_phone"), v: lead.phone, href: `tel:${lead.phone.replace(/\s+/g, "")}` });
  const known = FIELD_ORDER.filter((key) => data[key]);
  const extra = Object.keys(data).filter((key) => data[key] && !(FIELD_ORDER as readonly string[]).includes(key));
  for (const key of known) facts.push({ k: tx(FIELD_LABEL[key]!), v: data[key]! });
  for (const key of extra) facts.push({ k: key.charAt(0).toUpperCase() + key.slice(1).replace(/([a-z])([A-Z])/g, "$1 $2"), v: data[key]! });

  const subject = encodeURIComponent(`m.on · ${tx(`k_${lead.kind}`)}`);
  const body = encodeURIComponent(`Guten Tag ${person},\n\n\n\n—\n> ${String(lead.message ?? "").split("\n").join("\n> ")}`);
  const btn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, minHeight: 40, padding: "0 14px", whiteSpace: "nowrap", flex: "none", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 600, textDecoration: "none" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ padding: "3px 9px", borderRadius: 4, background: "#fff6f6", color: "#b7122b", fontSize: 11, fontWeight: 650 }}>{tx(`k_${lead.kind}`)}</span>
        <small style={{ fontSize: 11.5, color: "#737870" }}>
          {new Date(lead.createdAt).toLocaleString(loc, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </small>
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 650, letterSpacing: "var(--a-ls-h2)", lineHeight: 1.25, unicodeBidi: "plaintext", textAlign: "start" }}>{title}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "12px 18px" }}>
        {facts.map((f) => (
          <div key={f.k} style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <small style={{ fontSize: 11, color: "#92958e" }}>{f.k}</small>
            {f.href ? (
              <a href={f.href} dir="ltr" style={{ fontSize: 13, fontWeight: 600, color: "#d71635", textDecoration: "underline", overflowWrap: "anywhere", unicodeBidi: "isolate", textAlign: "start" }}>
                {f.v}
              </a>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 600, color: "#252b28", overflowWrap: "anywhere", unicodeBidi: "plaintext" }}>{f.v}</span>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <small style={{ fontSize: 11, color: "#92958e" }}>{tx("msg")}</small>
        <p style={{ padding: "14px 16px", borderRadius: 8, background: "#f6f7f4", fontSize: 13.5, lineHeight: 1.6, color: "#252b28", whiteSpace: "pre-wrap", textWrap: "pretty", unicodeBidi: "plaintext" }}>{lead.message || "—"}</p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {lead.email ? (
          <a href={`mailto:${lead.email}?subject=${subject}&body=${body}`} onClick={onReply} className={css.red} style={{ ...btn, padding: "0 16px", border: "1px solid #d71635", background: "#d71635", color: "#ffffff" }}>
            <Icon d="M4 5h16v14H4zM4 7l8 6 8-6" size={15} width={2} />
            {tx("reply")}
          </a>
        ) : null}
        {lead.phone ? (
          <a href={`tel:${lead.phone.replace(/\s+/g, "")}`} className={css.line} style={btn}>
            <Icon d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" size={15} width={2} />
            {tx("call")}
          </a>
        ) : null}
        {!lead.quote && lead.kind !== "job" && mayQuote ? (
          <button type="button" className={css.line} style={btn} disabled={busy} onClick={onQuote}>
            <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 12v6M9 15h6" size={15} width={2} />
            {tx("toQuote")}
          </button>
        ) : null}
        {lead.quote ? (
          <button type="button" className={css.line} style={btn} onClick={onOpenQuote}>
            {tx("openQuote")} · <bdi>{lead.quote.number}</bdi>
          </button>
        ) : null}
      </div>
      <div style={{ height: 1, background: "#eceee9" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <small style={{ fontSize: 11.5, color: "#737870" }}>{tx("status")}</small>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUSES.map((status) => {
            const on = lead.status === status;
            const c = ST[status];
            return (
              <button
                key={status}
                type="button"
                aria-pressed={on}
                disabled={!mayWrite}
                onClick={() => !on && onStatus(status)}
                style={{ minHeight: 34, padding: "0 12px", border: `1px solid ${on ? c[1] : "#e3e5de"}`, borderRadius: 999, background: on ? c[0] : "#ffffff", color: on ? c[1] : "#4a514d", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
              >
                {tx(`s_${status}`)}
              </button>
            );
          })}
        </div>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "#737870" }}>
        {tx("note")}
        <textarea
          value={note}
          readOnly={!mayWrite}
          onChange={(event) => setNote(event.target.value)}
          onBlur={onNote}
          placeholder={tx("notePh")}
          rows={3}
          style={{ unicodeBidi: "plaintext", padding: "10px 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, color: "#252b28", resize: "vertical", fontFamily: "inherit" }}
        />
      </label>
      {mayWrite ? (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className={css.quiet} onClick={lead.status === "closed" ? onReopen : onClose} style={{ minHeight: 36, padding: "0 4px", border: 0, background: "transparent", color: "#4a514d", fontSize: 12, fontWeight: 600 }}>
            {lead.status === "closed" ? tx("reopen") : tx("closeMsg")}
          </button>
        </div>
      ) : null}
    </>
  );
}

function Icon({ d, size, width }: { d: string; size: number; width: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
