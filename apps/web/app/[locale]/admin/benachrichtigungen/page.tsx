"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { dateTag } from "@/lib/admin/format";
import { defineText, useText } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

/**
 * The notification centre, as the admin prototype draws it: a composer on
 * the left (broadcast to customers, employees or everyone, or pick people by
 * name; type; title and message per language; button; channels; now or
 * scheduled) and on the right a phone-style preview and the history with
 * read rates. Notifications are operational, so sending is immediate.
 */

const TEXT = defineText({
  title: { de: "Benachrichtigungen", en: "Notification centre", ar: "مركز الإشعارات", tr: "Bildirim merkezi" },
  sub: {
    de: "Senden Sie eine Benachrichtigung an alle oder an eine Person. Sie erscheint im Kundenkonto auf der Website und in der Crew-App.",
    en: "Send a notification to everyone or to one person. It appears in the customer account on the website and in the crew app.",
    ar: "أرسل إشعاراً للجميع أو لشخص واحد. يظهر في حساب الزبون على الموقع وفي صفحة العمال.",
    tr: "Herkese veya tek bir kişiye bildirim gönderin. Web sitesindeki müşteri hesabında ve ekip uygulamasında görünür.",
  },
  k_sent: { de: "Gesendet in den letzten 30 Tagen", en: "Sent in the last 30 days", ar: "مرسلة آخر 30 يوماً", tr: "Son 30 günde gönderilen" },
  k_sched: { de: "Geplant", en: "Scheduled", ar: "مجدولة", tr: "Planlanan" },
  k_read: { de: "Lesequote", en: "Read rate", ar: "نسبة القراءة", tr: "Okunma oranı" },
  to: { de: "EMPFÄNGER", en: "SEND TO", ar: "إلى", tr: "ALICILAR" },
  modeAll: { de: "An alle", en: "Broadcast", ar: "للكل", tr: "Toplu" },
  modeOne: { de: "Einzeln", en: "Individual", ar: "فردي", tr: "Bireysel" },
  aud_customers: { de: "Alle Kunden", en: "All customers", ar: "كل الزبائن", tr: "Tüm müşteriler" },
  aud_employees: { de: "Alle Mitarbeiter", en: "All employees", ar: "كل الموظفين", tr: "Tüm çalışanlar" },
  aud_everyone: { de: "Alle", en: "Everyone", ar: "الجميع", tr: "Herkes" },
  people: { de: "Personen", en: "people", ar: "شخص", tr: "kişi" },
  search: { de: "Nach Name, E-Mail oder Telefon suchen", en: "Search by name, email or phone", ar: "ابحث بالاسم أو البريد أو الهاتف", tr: "İsim, e-posta veya telefonla ara" },
  noMatch: { de: "Niemand passt zu Ihrer Suche.", en: "No one matches your search.", ar: "لا يوجد أحد يطابق البحث.", tr: "Aramanızla eşleşen kimse yok." },
  customer: { de: "Kunde", en: "Customer", ar: "زبون", tr: "Müşteri" },
  employee: { de: "Mitarbeiter", en: "Employee", ar: "موظف", tr: "Çalışan" },
  pickHint: { de: "Wählen Sie mindestens eine Person.", en: "Pick at least one person.", ar: "اختر شخصاً واحداً على الأقل.", tr: "En az bir kişi seçin." },
  type: { de: "ART", en: "TYPE", ar: "النوع", tr: "TÜR" },
  ty_info: { de: "Info", en: "Info", ar: "معلومة", tr: "Bilgi" },
  ty_important: { de: "Wichtig", en: "Important", ar: "مهم", tr: "Önemli" },
  ty_offer: { de: "Angebot", en: "Offer", ar: "عرض", tr: "Teklif" },
  content: { de: "NACHRICHT", en: "MESSAGE", ar: "الرسالة", tr: "MESAJ" },
  langHint: {
    de: "Jede Person sieht ihre eigene Sprache. Leere Sprachen fallen auf Deutsch zurück.",
    en: "Each person sees their own language. Empty languages fall back to German.",
    ar: "يرى كل شخص لغته. اللغة الفارغة تظهر بالألمانية.",
    tr: "Herkes kendi dilini görür. Boş diller Almancaya döner.",
  },
  titleF: { de: "Titel", en: "Title", ar: "العنوان", tr: "Başlık" },
  bodyF: { de: "Nachricht", en: "Message", ar: "نص الرسالة", tr: "Mesaj" },
  cta: { de: "Button-Text (optional)", en: "Button text (optional)", ar: "نص الزر (اختياري)", tr: "Buton metni (isteğe bağlı)" },
  href: { de: "Button-Link", en: "Button link", ar: "رابط الزر", tr: "Buton bağlantısı" },
  channels: { de: "KANÄLE", en: "CHANNELS", ar: "القنوات", tr: "KANALLAR" },
  ch_inapp: { de: "In der App", en: "In-app", ar: "داخل التطبيق", tr: "Uygulama içi" },
  ch_email: { de: "E-Mail", en: "Email", ar: "بريد", tr: "E-posta" },
  ch_sms: { de: "SMS", en: "SMS", ar: "SMS", tr: "SMS" },
  ch_whatsapp: { de: "WhatsApp", en: "WhatsApp", ar: "WhatsApp", tr: "WhatsApp" },
  chNote: {
    de: "In-App-Benachrichtigungen erscheinen sofort, E-Mails gehen direkt raus. SMS und WhatsApp werden verschickt, sobald ein Anbieter angebunden ist.",
    en: "In-app notifications appear right away and emails go out at once. SMS and WhatsApp go out once a sending provider is connected.",
    ar: "إشعارات التطبيق تظهر فوراً والبريد يُرسل مباشرة. الرسائل النصية وواتساب تُرسل بعد ربط مزوّد إرسال.",
    tr: "Uygulama içi bildirimler hemen görünür, e-postalar hemen gider. SMS ve WhatsApp bir gönderim sağlayıcısı bağlandığında gönderilir.",
  },
  when: { de: "WANN", en: "WHEN", ar: "متى", tr: "NE ZAMAN" },
  now: { de: "Jetzt", en: "Now", ar: "الآن", tr: "Şimdi" },
  later: { de: "Planen", en: "Schedule", ar: "جدولة", tr: "Planla" },
  sendBtn: { de: "An {n} senden", en: "Send to {n}", ar: "إرسال إلى {n}", tr: "{n} kişiye gönder" },
  scheduleBtn: { de: "Für {n} planen", en: "Schedule for {n}", ar: "جدولة لـ {n}", tr: "{n} kişi için planla" },
  errTitle: { de: "Schreiben Sie einen Titel und eine Nachricht.", en: "Write a title and a message.", ar: "اكتب عنواناً ونص الرسالة.", tr: "Bir başlık ve mesaj yazın." },
  errCh: { de: "Wählen Sie mindestens einen Kanal.", en: "Choose at least one channel.", ar: "اختر قناة واحدة على الأقل.", tr: "En az bir kanal seçin." },
  errAt: { de: "Wählen Sie ein Datum und eine Uhrzeit in der Zukunft.", en: "Pick a date and time in the future.", ar: "اختر تاريخاً ووقتاً في المستقبل.", tr: "Gelecekte bir tarih ve saat seçin." },
  errHref: { de: "Der Link muss mit https://, / oder # beginnen.", en: "The link must start with https://, / or #.", ar: "يجب أن يبدأ الرابط بـ https:// أو / أو #.", tr: "Bağlantı https://, / veya # ile başlamalı." },
  sentT: { de: "Benachrichtigung gesendet.", en: "Notification sent.", ar: "تم إرسال الإشعار.", tr: "Bildirim gönderildi." },
  schedT: { de: "Benachrichtigung geplant.", en: "Notification scheduled.", ar: "تمت جدولة الإشعار.", tr: "Bildirim planlandı." },
  sendFailed: { de: "Die Benachrichtigung konnte nicht gesendet werden.", en: "The notification could not be sent.", ar: "تعذّر إرسال الإشعار.", tr: "Bildirim gönderilemedi." },
  preview: { de: "VORSCHAU", en: "PREVIEW", ar: "معاينة", tr: "ÖNİZLEME" },
  history: { de: "VERLAUF", en: "HISTORY", ar: "السجل", tr: "GEÇMİŞ" },
  all: { de: "Alle", en: "All", ar: "الكل", tr: "Tümü" },
  sentF: { de: "Gesendet", en: "Sent", ar: "مرسلة", tr: "Gönderildi" },
  schedF: { de: "Geplant", en: "Scheduled", ar: "مجدولة", tr: "Planlandı" },
  read: { de: "gelesen", en: "read", ar: "قرأوه", tr: "okundu" },
  sendNow: { de: "Jetzt senden", en: "Send now", ar: "أرسل الآن", tr: "Şimdi gönder" },
  del: { de: "Löschen", en: "Delete", ar: "حذف", tr: "Sil" },
  delQ: {
    de: "Diese Benachrichtigung löschen? Sie verschwindet bei allen.",
    en: "Delete this notification? It disappears for everyone.",
    ar: "حذف هذا الإشعار؟ سيختفي عند الجميع.",
    tr: "Bu bildirim silinsin mi? Herkes için kaybolur.",
  },
  none: { de: "Noch keine Benachrichtigungen.", en: "No notifications yet.", ar: "لا توجد إشعارات بعد.", tr: "Henüz bildirim yok." },
  nowShort: { de: "Jetzt", en: "Now", ar: "الآن", tr: "Şimdi" },
  failed: { de: "Das hat nicht geklappt.", en: "That did not work.", ar: "لم ينجح ذلك.", tr: "Bu işe yaramadı." },
  loadFailed: { de: "Die Benachrichtigungen konnten nicht geladen werden.", en: "The notifications could not be loaded.", ar: "تعذّر تحميل الإشعارات.", tr: "Bildirimler yüklenemedi." },
});

type Audience = "customers" | "employees" | "everyone";
type Kind = "info" | "important" | "offer";
type Channel = "inapp" | "email" | "sms" | "whatsapp";
type Localized = Partial<Record<Locale, string>>;

interface Person {
  key: string;
  kind: "customer" | "employee";
  name: string;
  sub: string;
}

interface Notification {
  id: string;
  audience: Audience | "individual";
  recipients: string[];
  recipientNames: string[];
  kind: Kind;
  title: Localized;
  body: Localized;
  buttonText: Localized;
  buttonUrl: string | null;
  channels: Channel[];
  scheduledAt: string | null;
  sentAt: string | null;
  at: string;
  total: number;
  reads: number;
}

interface Compose {
  mode: "all" | "one";
  aud: Audience;
  to: string[];
  L: Locale;
  title: Localized;
  body: Localized;
  cta: Localized;
  href: string;
  type: Kind;
  ch: Record<Channel, boolean>;
  when: "now" | "later";
  at: string;
  err: string;
}

const fresh = (keep?: Partial<Compose>): Compose => ({
  mode: "all",
  aud: "customers",
  to: [],
  L: "de",
  title: {},
  body: {},
  cta: {},
  href: "",
  type: "info",
  ch: { inapp: true, email: false, sms: false, whatsapp: false },
  when: "now",
  at: "",
  err: "",
  ...keep,
});

const META: Record<Kind, { d: string; bg: string; fg: string }> = {
  info: { d: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01", bg: "#eef3fb", fg: "#2d5a8c" },
  important: { d: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01", bg: "#fff1f3", fg: "#d71635" },
  offer: { d: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01", bg: "#fbf4e4", fg: "#9a6f00" },
};
const AUD_ICON: Record<Audience, string> = {
  customers: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  employees: "M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  everyone: "M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1zM16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14",
};
const CHANNELS: Channel[] = ["inapp", "email", "sms", "whatsapp"];
const LANGS: [Locale, string][] = [["de", "DE"], ["en", "EN"], ["tr", "TR"], ["ar", "ع"]];

const card: CSSProperties = { background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, boxShadow: "0 12px 36px #202a2308" };
const eyebrow: CSSProperties = { fontSize: 10.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#737870" };
const label: CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "#737870", minWidth: 0 };
const input: CSSProperties = { height: 40, padding: "0 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, color: "#252b28", minWidth: 0 };

const nz = (v: string | undefined) => (v ?? "").trim();
const has = (o: Localized) => Object.values(o).some((v) => nz(v));
const firstText = (o: Localized, l: Locale) => nz(o[l]) || nz(o.de) || nz(o.en) || Object.values(o).map(nz).find(Boolean) || "";
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "·";

/** "2026-10-25T18:30" for a datetime-local input, in local time. */
const localInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function NotificationsPage() {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const toast = useToast();
  const client = useQueryClient();
  const rtl = LOCALE_META[locale].dir === "rtl";
  const loc = dateTag(locale);

  const [C, setC] = useState<Compose>(() => fresh());
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [picked, setPicked] = useState<Record<string, Person>>({});
  const [flt, setFlt] = useState<"all" | "sent" | "sched">("all");
  const set = (patch: Partial<Compose>) => setC((c) => ({ ...c, err: "", ...patch }));

  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const list = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: () => sdk.http.get<{ notifications: Notification[] }>("/api/notifications"),
    refetchInterval: 30_000,
  });
  const people = useQuery({
    queryKey: ["admin", "notifications", "people", term],
    queryFn: () => sdk.http.get<{ people: Person[]; counts: { customers: number; employees: number } }>("/api/notifications/people", term ? { q: term } : undefined),
    placeholderData: (prev) => prev,
  });

  const counts = people.data?.counts ?? { customers: 0, employees: 0 };
  const audN = (a: Audience) => (a === "customers" ? counts.customers : a === "employees" ? counts.employees : counts.customers + counts.employees);
  const cnt = C.mode === "one" ? C.to.length : audN(C.aud);
  const peopleN = `${cnt} ${tx("people")}`;

  const refresh = () => client.invalidateQueries({ queryKey: ["admin", "notifications"] });

  const send = useMutation({
    mutationFn: (body: Record<string, unknown>) => sdk.http.post<{ notification: Notification }>("/api/notifications", body),
    onSuccess: () => {
      toast(C.when === "later" ? tx("schedT") : tx("sentT"));
      setC(fresh({ mode: C.mode, aud: C.aud }));
      setPicked({});
      void refresh();
    },
    onError: () => toast(tx("sendFailed")),
  });
  const sendNow = useMutation({
    mutationFn: (id: string) => sdk.http.post(`/api/notifications/${id}/send`, {}),
    onSuccess: () => {
      toast(tx("sentT"));
      void refresh();
    },
    onError: () => toast(tx("failed")),
  });
  const remove = useMutation({
    mutationFn: (id: string) => sdk.http.delete(`/api/notifications/${id}`),
    onSuccess: () => void refresh(),
    onError: () => toast(tx("failed")),
  });

  const onSend = () => {
    const href = C.href.trim();
    const err = !(has(C.title) && has(C.body))
      ? tx("errTitle")
      : C.mode === "one" && !C.to.length
        ? tx("pickHint")
        : !Object.values(C.ch).some(Boolean)
          ? tx("errCh")
          : C.when === "later" && !(C.at && new Date(C.at).getTime() > Date.now())
            ? tx("errAt")
            : href && !/^(https?:\/\/|\/|#)\S*$/i.test(href)
              ? tx("errHref")
              : "";
    if (err) return set({ err });
    send.mutate({
      audience: C.mode === "one" ? "individual" : C.aud,
      recipients: C.mode === "one" ? C.to : undefined,
      kind: C.type,
      title: C.title,
      body: C.body,
      buttonText: has(C.cta) ? C.cta : undefined,
      buttonUrl: href || undefined,
      channels: CHANNELS.filter((c) => C.ch[c]),
      scheduledAt: C.when === "later" ? new Date(C.at).toISOString() : undefined,
    });
  };

  const toggle = (p: Person) => {
    setPicked((m) => ({ ...m, [p.key]: p }));
    set({ to: C.to.includes(p.key) ? C.to.filter((k) => k !== p.key) : [...C.to, p.key] });
  };

  const history = useMemo(() => {
    const all = list.data?.notifications ?? [];
    const now = Date.now();
    const sent = all.filter((n) => n.sentAt);
    const sched = all.filter((n) => !n.sentAt);
    const m30 = sent.filter((n) => now - new Date(n.sentAt!).getTime() < 30 * 864e5);
    const reads = sent.reduce((a, n) => a + Math.min(n.reads, n.total || n.reads), 0);
    const total = sent.reduce((a, n) => a + n.total, 0);
    const kpis = [
      { l: tx("k_sent"), v: String(m30.length) },
      { l: tx("k_sched"), v: String(sched.length) },
      { l: tx("k_read"), v: total ? `${Math.round((reads / total) * 100)}%` : "—" },
    ];
    const tabs = [
      { k: "all" as const, l: tx("all"), n: all.length },
      { k: "sent" as const, l: tx("sentF"), n: sent.length },
      { k: "sched" as const, l: tx("schedF"), n: sched.length },
    ];
    const rows = all.filter((n) => flt === "all" || (flt === "sched" ? !n.sentAt : !!n.sentAt)).sort((a, b) => b.at.localeCompare(a.at));
    return { kpis, tabs, rows };
  }, [list.data, flt, tx]);

  const pvTitle = firstText(C.title, C.L);
  const pvBody = firstText(C.body, C.L);
  const pvCta = firstText(C.cta, C.L);
  const mt = META[C.type];
  const dirF = C.L === "ar" ? "rtl" : "ltr";
  const res = [...(people.data?.people ?? [])].sort((a, b) => Number(C.to.includes(b.key)) - Number(C.to.includes(a.key)));
  const fdt = (iso: string) => new Date(iso).toLocaleString(loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const audLabel = (n: Notification) =>
    n.audience === "individual" ? `${n.recipientNames[0] ?? "—"}${n.recipientNames.length > 1 ? ` +${n.recipientNames.length - 1}` : ""}` : tx(`aud_${n.audience}`);
  const segBtn = (on: boolean): CSSProperties => ({ minHeight: 34, border: 0, borderRadius: 6, background: on ? "#252b28" : "transparent", color: on ? "#ffffff" : "#4a514d", fontSize: 13, fontWeight: 600 });

  return (
    <AdminShell view="notify">
      <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ maxWidth: 640 }}>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: rtl ? 0 : "-0.9px", lineHeight: 1.2 }}>{tx("title")}</h1>
          <p style={{ color: "#737870", fontSize: 13, marginTop: 6, textWrap: "pretty" } as CSSProperties}>{tx("sub")}</p>
        </div>

        {list.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 12 }}>
          {history.kpis.map((k) => (
            <div key={k.l} style={{ ...card, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
              <small style={{ fontSize: 11.5, color: "#737870" }}>{k.l}</small>
              <b style={{ fontSize: 24, fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>{list.isLoading ? "—" : k.v}</b>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: 16, alignItems: "start" }}>
          {/* Composer */}
          <div style={{ ...card, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <b style={eyebrow}>{tx("to")}</b>
              <div role="group" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(0, 1fr))", padding: 3, border: "1px solid #cfd3cb", borderRadius: 8 }}>
                {(["all", "one"] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={C.mode === m} onClick={() => set({ mode: m })} style={segBtn(C.mode === m)}>
                    {tx(m === "all" ? "modeAll" : "modeOne")}
                  </button>
                ))}
              </div>
            </div>

            {C.mode === "all" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
                {(["customers", "employees", "everyone"] as const).map((a) => {
                  const on = C.aud === a;
                  return (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set({ aud: a })}
                      style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, padding: 12, border: `1.5px solid ${on ? "#d71635" : "#e3e5de"}`, borderRadius: 8, background: on ? "#fff6f6" : "#ffffff", textAlign: "start", color: "#252b28" }}
                    >
                      <span style={{ width: 30, height: 30, borderRadius: 8, background: on ? "#d71635" : "#f1f3f5", color: on ? "#ffffff" : "#4a514d", display: "grid", placeItems: "center" }}>
                        <Icon d={AUD_ICON[a]} />
                      </span>
                      <b style={{ fontSize: 13, fontWeight: 600 }}>{tx(`aud_${a}`)}</b>
                      <small style={{ fontSize: 11.5, color: "#737870" }}>
                        {audN(a)} {tx("people")}
                      </small>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {C.to.length ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {C.to.map((k) => (
                      <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4, minHeight: 30, paddingInlineStart: 10, paddingInlineEnd: 4, borderRadius: 999, background: "#fff6f6", border: "1px solid #f3c9cf", color: "#b7122b", fontSize: 12, fontWeight: 600 }}>
                        {picked[k]?.name ?? k}
                        <button type="button" aria-label="×" onClick={() => set({ to: C.to.filter((x) => x !== k) })} style={{ width: 22, height: 22, border: 0, borderRadius: "50%", background: "transparent", color: "#b7122b", fontSize: 15, lineHeight: 1, padding: 0 }}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <input value={q} onChange={(event) => setQ(event.target.value)} placeholder={tx("search")} style={input} />
                <div style={{ display: "flex", flexDirection: "column", border: "1px solid #eef0ea", borderRadius: 8, maxHeight: 264, overflow: "auto" }}>
                  {res.map((p) => {
                    const on = C.to.includes(p.key);
                    const cust = p.kind === "customer";
                    return (
                      <button
                        key={p.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(p)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: 0, borderBottom: "1px solid #eef0ea", background: on ? "#fffafa" : "#ffffff", textAlign: "start", width: "100%", color: "#252b28", flex: "none" }}
                      >
                        <span style={{ width: 30, height: 30, borderRadius: "50%", background: cust ? "#fff1f3" : "#eef3fb", color: cust ? "#b7122b" : "#2d5a8c", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flex: "none" }}>{initials(p.name)}</span>
                        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                          <b style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</b>
                          <small style={{ fontSize: 11.5, color: "#737870", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <bdi>{p.sub}</bdi>
                          </small>
                        </span>
                        <span style={{ padding: "2px 8px", borderRadius: 4, background: "#f1f3f5", color: "#4a514d", fontSize: 10.5, fontWeight: 600, flex: "none" }}>{tx(cust ? "customer" : "employee")}</span>
                        <span style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${on ? "#d71635" : "#cfd3cb"}`, background: on ? "#d71635" : "#ffffff", color: "#ffffff", display: "grid", placeItems: "center", flex: "none" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: on ? 1 : 0 }} aria-hidden="true">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </span>
                      </button>
                    );
                  })}
                  {people.data && !res.length ? <p style={{ padding: 18, textAlign: "center", fontSize: 12.5, color: "#92958e" }}>{tx("noMatch")}</p> : null}
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <b style={eyebrow}>{tx("type")}</b>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["info", "important", "offer"] as const).map((k) => {
                  const on = C.type === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set({ type: k })}
                      style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 32, padding: "0 12px", border: `1px solid ${on ? "#252b28" : "#cfd3cb"}`, borderRadius: 999, background: on ? "#f6f7f3" : "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 600 }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: META[k].fg }} />
                      {tx(`ty_${k}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <b style={eyebrow}>{tx("content")}</b>
                <div role="group" style={{ display: "inline-flex", padding: 3, border: "1px solid #cfd3cb", borderRadius: 8 }}>
                  {LANGS.map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      lang={k}
                      aria-pressed={C.L === k}
                      onClick={() => set({ L: k })}
                      style={{ minWidth: 36, minHeight: 28, padding: "0 8px", border: 0, borderRadius: 6, background: C.L === k ? "#252b28" : "transparent", color: C.L === k ? "#ffffff" : nz(C.title[k]) || nz(C.body[k]) ? "#252b28" : "#92958e", fontSize: 12, fontWeight: 600 }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <label style={label}>
                {tx("titleF")}
                <input dir={dirF} value={C.title[C.L] ?? ""} onChange={(event) => set({ title: { ...C.title, [C.L]: event.target.value } })} style={input} />
              </label>
              <label style={label}>
                {tx("bodyF")}
                <textarea
                  dir={dirF}
                  value={C.body[C.L] ?? ""}
                  rows={4}
                  onChange={(event) => set({ body: { ...C.body, [C.L]: event.target.value } })}
                  style={{ padding: "10px 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, lineHeight: 1.5, color: "#252b28", resize: "vertical", fontFamily: "inherit" }}
                />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                <label style={label}>
                  {tx("cta")}
                  <input dir={dirF} value={C.cta[C.L] ?? ""} onChange={(event) => set({ cta: { ...C.cta, [C.L]: event.target.value } })} style={input} />
                </label>
                <label style={label}>
                  {tx("href")}
                  <input dir="ltr" value={C.href} placeholder="/de/konto" onChange={(event) => set({ href: event.target.value })} style={input} />
                </label>
              </div>
              <small style={{ fontSize: 11.5, color: "#92958e" }}>{tx("langHint")}</small>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <b style={eyebrow}>{tx("channels")}</b>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {CHANNELS.map((c) => {
                  const on = C.ch[c];
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set({ ch: { ...C.ch, [c]: !on } })}
                      style={{ minHeight: 32, padding: "0 12px", border: `1px solid ${on ? "#d71635" : "#cfd3cb"}`, borderRadius: 999, background: on ? "#fff6f6" : "#ffffff", color: on ? "#b7122b" : "#4a514d", fontSize: 12, fontWeight: 600 }}
                    >
                      {tx(`ch_${c}`)}
                    </button>
                  );
                })}
              </div>
              <small style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 11.5, color: "#737870", lineHeight: 1.5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flex: "none", marginTop: 2 }} aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8h.01M11 12h1v5h1" />
                </svg>
                {tx("chNote")}
              </small>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <b style={eyebrow}>{tx("when")}</b>
              <div role="group" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(0, 1fr))", padding: 3, border: "1px solid #cfd3cb", borderRadius: 8 }}>
                {(["now", "later"] as const).map((w) => (
                  <button key={w} type="button" aria-pressed={C.when === w} onClick={() => set({ when: w })} style={segBtn(C.when === w)}>
                    {tx(w)}
                  </button>
                ))}
              </div>
              {C.when === "later" ? <input type="datetime-local" value={C.at} min={localInput(new Date())} onChange={(event) => set({ at: event.target.value })} style={input} /> : null}
            </div>

            {C.err ? (
              <small role="alert" style={{ fontSize: 12.5, fontWeight: 600, color: "#b7122b" }}>
                {C.err}
              </small>
            ) : null}
            <button
              type="button"
              disabled={send.isPending}
              onClick={onSend}
              style={{ minHeight: 44, border: 0, borderRadius: 8, background: "#d71635", color: "#ffffff", fontSize: 14, fontWeight: 650, boxShadow: "0 8px 20px #d7163540", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: rtl ? "scaleX(-1)" : undefined }} aria-hidden="true">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
              </svg>
              {(C.when === "later" ? tx("scheduleBtn") : tx("sendBtn")).replace("{n}", peopleN)}
            </button>
          </div>

          {/* Preview and history */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <div style={{ ...card, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <b style={eyebrow}>{tx("preview")}</b>
                <small style={{ fontSize: 11.5, color: "#737870" }}>
                  {rtl ? "←" : "→"} {peopleN}
                </small>
              </div>
              <div style={{ padding: "18px 14px", borderRadius: 12, background: "#f6f7f3", display: "flex", justifyContent: "center" }}>
                <div style={{ width: "100%", maxWidth: 380, display: "flex", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: 14, background: "#ffffff", border: "1px solid #eef0ea", boxShadow: "0 10px 28px #202a2314" }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: mt.bg, color: mt.fg, display: "grid", placeItems: "center", flex: "none" }}>
                    <Icon d={mt.d} size={18} />
                  </span>
                  <span dir={dirF} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3, textAlign: "start" }}>
                    <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <small style={{ fontSize: 11, color: "#737870", fontWeight: 600 }}>m.on · {tx(`ty_${C.type}`)}</small>
                      <small style={{ fontSize: 11, color: "#92958e" }}>{tx("nowShort")}</small>
                    </span>
                    <b style={{ fontSize: 14, fontWeight: 650, lineHeight: 1.3, color: pvTitle ? "#252b28" : "#b4b8b0", overflowWrap: "anywhere" }}>{pvTitle || tx("titleF")}</b>
                    <span style={{ fontSize: 13, color: pvBody ? "#4a514d" : "#b4b8b0", lineHeight: 1.5, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{pvBody || tx("bodyF")}</span>
                    {pvCta ? <span style={{ alignSelf: "flex-start", marginTop: 6, padding: "6px 12px", borderRadius: 8, background: "#d71635", color: "#ffffff", fontSize: 12, fontWeight: 600 }}>{pvCta}</span> : null}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ ...card, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", paddingBottom: 8 }}>
                <b style={eyebrow}>{tx("history")}</b>
                <div style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
                  {history.tabs.map((tab) => {
                    const on = flt === tab.k;
                    return (
                      <button
                        key={tab.k}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setFlt(tab.k)}
                        style={{ minHeight: 28, padding: "0 10px", border: `1px solid ${on ? "#252b28" : "#e3e5de"}`, borderRadius: 999, background: on ? "#252b28" : "#ffffff", color: on ? "#ffffff" : "#4a514d", fontSize: 11.5, fontWeight: 600 }}
                      >
                        {tab.l} · {tab.n}
                      </button>
                    );
                  })}
                </div>
              </div>
              {history.rows.map((n) => {
                const m = META[n.kind] ?? META.info;
                const scheduled = !n.sentAt;
                const read = Math.min(n.reads, n.total || n.reads);
                return (
                  <div key={n.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderTop: "1px solid #eef0ea" }}>
                    <span style={{ width: 32, height: 32, borderRadius: 8, background: m.bg, color: m.fg, display: "grid", placeItems: "center", flex: "none" }}>
                      <Icon d={m.d} size={15} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                        <b dir="auto" style={{ fontSize: 13, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "start" }}>{firstText(n.title, locale)}</b>
                        <small style={{ fontSize: 11, color: "#92958e", whiteSpace: "nowrap" }}>{fdt(n.at)}</small>
                      </span>
                      <small dir="auto" style={{ fontSize: 12, color: "#4a514d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "start" }}>{firstText(n.body, locale)}</small>
                      <span style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ padding: "1px 7px", borderRadius: 4, background: scheduled ? "#fbf4e4" : "#edf5ed", color: scheduled ? "#5c4a00" : "#3f705a", fontSize: 10.5, fontWeight: 650 }}>{tx(scheduled ? "schedF" : "sentF")}</span>
                        <span style={{ padding: "1px 7px", borderRadius: 4, background: "#f1f3f5", color: "#252b28", fontSize: 10.5, fontWeight: 600 }}>{audLabel(n)}</span>
                        {CHANNELS.filter((c) => n.channels.includes(c)).map((c) => (
                          <span key={c} style={{ padding: "1px 7px", borderRadius: 4, background: "#f1f3f5", color: "#4a514d", fontSize: 10.5, fontWeight: 600 }}>
                            {tx(`ch_${c}`)}
                          </span>
                        ))}
                      </span>
                      {!scheduled ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span dir={rtl ? "rtl" : "ltr"} style={{ flex: 1, height: 4, borderRadius: 4, background: "#eef0ea", overflow: "hidden" }}>
                            <span style={{ display: "block", height: "100%", width: `${n.total ? Math.min(100, Math.round((read / n.total) * 100)) : 0}%`, background: "#3f705a" }} />
                          </span>
                          <small style={{ fontSize: 11, color: "#737870", whiteSpace: "nowrap" }}>
                            <bdi>
                              {read} / {n.total}
                            </bdi>{" "}
                            {tx("read")}
                          </small>
                        </span>
                      ) : null}
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flex: "none" }}>
                      {scheduled ? (
                        <button
                          type="button"
                          disabled={sendNow.isPending}
                          onClick={() => sendNow.mutate(n.id)}
                          style={{ minHeight: 28, padding: "0 10px", border: "1px solid #d71635", borderRadius: 6, background: "#ffffff", color: "#b7122b", fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap" }}
                        >
                          {tx("sendNow")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="a-icon-btn"
                        aria-label={tx("del")}
                        title={tx("del")}
                        onClick={() => window.confirm(tx("delQ")) && remove.mutate(n.id)}
                        style={{ width: 28, height: 28, borderRadius: 6, color: "#92958e" }}
                      >
                        <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={13} />
                      </button>
                    </span>
                  </div>
                );
              })}
              {!list.isLoading && !history.rows.length ? <p style={{ padding: "24px 8px", textAlign: "center", fontSize: 12.5, color: "#92958e", borderTop: "1px solid #eef0ea" }}>{tx("none")}</p> : null}
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
