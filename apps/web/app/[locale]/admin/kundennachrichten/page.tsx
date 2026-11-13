"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { SERVICE_TEXT } from "@/lib/admin/format";
import { useDrafts } from "@/lib/admin/drafts";
import { defineText, fill, useText, type TextFn } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { LOCALE_META, LOCALES, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Customer messages, as the admin prototype's screen lays them out: the six
 * automatic messages with an on/off switch and their channels, what was sent
 * recently, and the editor — language, channels, subject, message with
 * insertable variables, a live preview and "Send test".
 *
 * Templates are website configuration: every edit is a draft (domain
 * "messages", one per template) that "Save & publish" makes live. What goes
 * out to customers is always the published text.
 */

const TEXT = defineText({
  title: { de: "Kundennachrichten", en: "Customer messages", ar: "رسائل الزبائن", tr: "Müşteri mesajları" },
  sub: {
    de: "Nachrichten, die bei jedem Schritt automatisch verschickt werden. Schalten Sie sie ein, wählen Sie die Kanäle und bearbeiten Sie den Text.",
    en: "Messages that go out automatically at each step. Turn them on, choose the channels and edit the text.",
    ar: "رسائل تُرسل تلقائياً في كل مرحلة. فعّلها، واختر القنوات، وعدّل النص.",
    tr: "Her adımda otomatik gönderilen mesajlar. Açın, kanalları seçin ve metni düzenleyin.",
  },
  note: {
    de: "E-Mails gehen über Ihren Mailserver raus. SMS und WhatsApp brauchen erst einen angebundenen Anbieter. „Test senden“ schickt die Nachricht an Ihre eigene E-Mail-Adresse.",
    en: "Emails go out through your mail server. SMS and WhatsApp need a connected provider first. “Send test” emails the message to your own address.",
    ar: "تُرسل الرسائل الإلكترونية عبر خادم البريد لديك. تحتاج الرسائل النصية وواتساب إلى ربط مزوّد أولاً. «إرسال تجربة» يرسل الرسالة إلى بريدك أنت.",
    tr: "E-postalar posta sunucunuz üzerinden gider. SMS ve WhatsApp için önce bir sağlayıcı bağlanmalıdır. “Test gönder” mesajı kendi e-posta adresinize yollar.",
  },
  t_booking_confirmed: { de: "Buchung bestätigt", en: "Booking confirmed", ar: "تأكيد الحجز", tr: "Rezervasyon onaylandı" },
  t_reminder: { de: "Erinnerung am Vortag", en: "Reminder the day before", ar: "تذكير قبل يوم", tr: "Bir gün önce hatırlatma" },
  t_crew_on_way: { de: "Team ist unterwegs", en: "Crew on the way", ar: "الفريق في الطريق", tr: "Ekip yolda" },
  t_invoice_sent: { de: "Rechnung versendet", en: "Invoice sent", ar: "إرسال الفاتورة", tr: "Fatura gönderildi" },
  t_payment_reminder: { de: "Zahlungserinnerung", en: "Payment reminder", ar: "تذكير بالدفع", tr: "Ödeme hatırlatması" },
  t_review_request: { de: "Bitte um Bewertung", en: "Review request", ar: "طلب تقييم", tr: "Değerlendirme isteği" },
  w_booking_confirmed: { de: "Direkt nach der Bestätigung der Buchung", en: "Right after the booking is confirmed", ar: "فور تأكيد الحجز", tr: "Rezervasyon onaylanır onaylanmaz" },
  w_reminder: { de: "Einen Tag vorher, um 18:00", en: "One day before, at 18:00", ar: "قبل يوم، الساعة 18:00", tr: "Bir gün önce, saat 18:00’de" },
  w_crew_on_way: { de: "Wenn das Team losfährt", en: "When the crew sets off", ar: "عند انطلاق الفريق", tr: "Ekip yola çıktığında" },
  w_invoice_sent: { de: "Wenn eine Rechnung erstellt wird", en: "When an invoice is created", ar: "عند إنشاء الفاتورة", tr: "Fatura oluşturulduğunda" },
  w_payment_reminder: { de: "7 Tage nach Fälligkeit", en: "7 days after the due date", ar: "بعد 7 أيام من الاستحقاق", tr: "Vade tarihinden 7 gün sonra" },
  w_review_request: { de: "Einen Tag nach dem Einsatz", en: "One day after the service", ar: "بعد يوم من الخدمة", tr: "Hizmetten bir gün sonra" },
  ch_email: { de: "E-Mail", en: "Email", ar: "بريد", tr: "E-posta" },
  ch_sms: { de: "SMS", en: "SMS", ar: "SMS", tr: "SMS" },
  ch_whatsapp: { de: "WhatsApp", en: "WhatsApp", ar: "WhatsApp", tr: "WhatsApp" },
  provider: { de: "Anbieter nötig", en: "provider needed", ar: "يلزم مزوّد", tr: "sağlayıcı gerekli" },
  subject: { de: "Betreff", en: "Subject", ar: "العنوان", tr: "Konu" },
  body: { de: "Nachricht", en: "Message", ar: "الرسالة", tr: "Mesaj" },
  insert: { de: "Einfügen", en: "Insert", ar: "إدراج", tr: "Ekle" },
  preview: { de: "VORSCHAU", en: "PREVIEW", ar: "معاينة", tr: "ÖNİZLEME" },
  log: { de: "ZULETZT GESENDET", en: "SENT RECENTLY", ar: "أُرسلت مؤخراً", tr: "SON GÖNDERİLENLER" },
  logEmpty: { de: "Noch nichts gesendet.", en: "Nothing sent yet.", ar: "لم يُرسل شيء بعد.", tr: "Henüz bir şey gönderilmedi." },
  lang: { de: "Sprache der Nachricht", en: "Message language", ar: "لغة الرسالة", tr: "Mesaj dili" },
  test: { de: "Test senden", en: "Send test", ar: "إرسال تجربة", tr: "Test gönder" },
  testSent: { de: "Testnachricht an {email} gesendet.", en: "Test message sent to {email}.", ar: "أُرسلت رسالة التجربة إلى {email}.", tr: "Test mesajı {email} adresine gönderildi." },
  testFailed: { de: "Die Testnachricht konnte nicht gesendet werden.", en: "The test message could not be sent.", ar: "تعذّر إرسال رسالة التجربة.", tr: "Test mesajı gönderilemedi." },
  testNoEmail: { de: "Für einen Test muss E-Mail als Kanal gewählt sein.", en: "Turn on Email to send a test.", ar: "فعّل البريد لإرسال تجربة.", tr: "Test göndermek için E-postayı açın." },
  edited: { de: "Noch nicht veröffentlicht", en: "Not published yet", ar: "لم يُنشر بعد", tr: "Henüz yayınlanmadı" },
  st_test: { de: "Test", en: "Test", ar: "تجربة", tr: "Test" },
  st_failed: { de: "Fehlgeschlagen", en: "Failed", ar: "فشل", tr: "Başarısız" },
  ago_m: { de: "{n} Min.", en: "{n} min", ar: "{n} د", tr: "{n} dk" },
  ago_h: { de: "{n} Std.", en: "{n} h", ar: "{n} س", tr: "{n} sa" },
  ago_d: { de: "{n} T.", en: "{n} d", ar: "{n} ي", tr: "{n} g" },
  saveFailed: { de: "Das konnte nicht gespeichert werden.", en: "That could not be saved.", ar: "تعذّر الحفظ.", tr: "Kaydedilemedi." },
  loadFailed: { de: "Die Vorlagen konnten nicht geladen werden.", en: "The templates could not be loaded.", ar: "تعذّر تحميل القوالب.", tr: "Şablonlar yüklenemedi." },
});

type Tx = TextFn<typeof TEXT>;
type Key = "booking_confirmed" | "reminder" | "crew_on_way" | "invoice_sent" | "payment_reminder" | "review_request";
type Channel = "email" | "sms" | "whatsapp";
type Localized = Partial<Record<Locale, string>>;

interface Template {
  key: Key;
  isEnabled: boolean;
  channels: Channel[];
  subject: Localized;
  body: Localized;
}

/** The draft's shape: everything about a template but its key. */
type TemplateValue = Omit<Template, "key">;

interface LogRow {
  id: string;
  templateKey: string;
  customerName: string | null;
  channel: string;
  recipient: string;
  status: "sent" | "failed" | "test";
  sentAt: string;
}

const CHANNELS: Channel[] = ["email", "sms", "whatsapp"];
const LANG_ORDER: Locale[] = ["de", "en", "tr", "ar"];
const VARIABLES = ["name", "ref", "service", "date", "time", "total", "invoice", "due", "link"];
const INTL: Record<Locale, string> = { de: "de-DE", en: "en-GB", tr: "tr-TR", ar: "ar-u-nu-latn" };
const card: CSSProperties = { background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, boxShadow: "0 12px 36px #202a2308" };
const label: CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "#737870" };
const eyebrow: CSSProperties = { fontSize: 10.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#737870" };

const valueOf = (t: Template): TemplateValue => ({ isEnabled: t.isEnabled, channels: t.channels, subject: t.subject, body: t.body });
const norm = (v: TemplateValue) =>
  JSON.stringify({
    e: v.isEnabled,
    c: [...v.channels].sort(),
    s: LOCALES.map((l) => (v.subject[l] ?? "").trim()),
    b: LOCALES.map((l) => (v.body[l] ?? "").trim()),
  });

export default function CustomerMessagesPage() {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const toast = useToast();
  const drafts = useDrafts("messages");
  const rtl = LOCALE_META[locale].dir === "rtl";
  const [selected, setSelected] = useState<Key>("booking_confirmed");
  const [lang, setLang] = useState<Locale>("de");

  const templates = useQuery({
    queryKey: ["admin", "message-templates"],
    queryFn: () => sdk.http.get<{ templates: Template[] }>("/api/message-templates"),
  });
  const log = useQuery({
    queryKey: ["admin", "message-templates", "log"],
    queryFn: () => sdk.http.get<{ log: LogRow[] }>("/api/message-templates/log", { limit: 6 }),
    refetchInterval: 30_000,
  });

  const list = useMemo(
    () => (templates.data?.templates ?? []).map((t) => ({ t, now: drafts.value<TemplateValue>(t.key, valueOf(t)), edited: drafts.edited(t.key) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [templates.data, drafts.drafts],
  );
  const current = list.find((x) => x.t.key === selected) ?? list[0];

  // Edits are applied to the newest value of the template, including one
  // still on its way to the server: blurring the subject and then flipping
  // the switch must not let the second draft overwrite the first.
  const pending = useRef<Partial<Record<Key, { value: TemplateValue; seq: number }>>>({});

  /** Drafts the template, or drops the draft when it is back to what is live. */
  const edit = async (t: Template, change: (v: TemplateValue) => TemplateValue) => {
    const base = pending.current[t.key]?.value ?? drafts.value<TemplateValue>(t.key, valueOf(t));
    const next = change(base);
    const seq = (pending.current[t.key]?.seq ?? 0) + 1;
    pending.current[t.key] = { value: next, seq };
    try {
      if (norm(next) === norm(valueOf(t))) await drafts.revert(t.key);
      else await drafts.set(t.key, next);
    } catch {
      toast(tx("saveFailed"));
    } finally {
      // The drafts have been re-read by now; nothing newer is waiting.
      if (pending.current[t.key]?.seq === seq) delete pending.current[t.key];
    }
  };

  const test = useMutation({
    mutationFn: (input: { key: Key; value: TemplateValue }) =>
      sdk.http.post<{ ok: boolean; to: string }>("/api/message-templates/test", { key: input.key, locale: lang, template: { subject: input.value.subject, body: input.value.body } }),
    onSuccess: (result) => {
      toast(tx("testSent", { email: result.to }));
      void log.refetch();
    },
    onError: () => toast(tx("testFailed")),
  });

  const ago = (iso: string) => {
    const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    return minutes < 60 ? tx("ago_m", { n: minutes }) : minutes < 1440 ? tx("ago_h", { n: Math.round(minutes / 60) }) : tx("ago_d", { n: Math.round(minutes / 1440) });
  };

  return (
    <AdminShell view="messages">
      <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ maxWidth: 640 }}>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: rtl ? 0 : "-0.9px", lineHeight: 1.2 }}>{tx("title")}</h1>
          <p style={{ color: "#737870", fontSize: 13, marginTop: 6, textWrap: "pretty" } as CSSProperties}>{tx("sub")}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", border: "1px solid #e3e5de", borderRadius: 10, background: "#ffffff", fontSize: 12.5, color: "#4a514d", lineHeight: 1.5 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#737870" strokeWidth="2" strokeLinecap="round" style={{ flex: "none", marginTop: 1 }} aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 12h1v5h1" />
          </svg>
          {tx("note")}
        </div>

        {templates.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 16, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <div style={{ ...card, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {templates.isLoading ? [0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="a-skel" style={{ height: 78, borderRadius: 8 }} />) : null}
              {list.map(({ t, now, edited }) => {
                const on = current?.t.key === t.key;
                return (
                  <div
                    key={t.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(t.key)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      setSelected(t.key);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: `1px solid ${on ? "#d71635" : "#eef0ea"}`, borderRadius: 8, background: on ? "#fff6f6" : "#ffffff", cursor: "pointer" }}
                  >
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3, opacity: now.isEnabled ? 1 : 0.55 }}>
                      <b style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                        {tx(`t_${t.key}`)}
                        {edited ? <i title={tx("edited")} style={{ display: "block", width: 7, height: 7, borderRadius: "50%", background: "#ffcb08" }} /> : null}
                      </b>
                      <small style={{ fontSize: 11.5, color: "#737870" }}>{tx(`w_${t.key}`)}</small>
                      <span style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
                        {CHANNELS.filter((c) => now.channels.includes(c)).map((c) => (
                          <span key={c} style={{ padding: "1px 7px", borderRadius: 4, background: "#f1f3f5", color: "#4a514d", fontSize: 10.5, fontWeight: 600 }}>
                            {tx(`ch_${c}`)}
                          </span>
                        ))}
                      </span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={now.isEnabled}
                      aria-label={tx(`t_${t.key}`)}
                      onClick={(event) => {
                        event.stopPropagation();
                        void edit(t, (v) => ({ ...v, isEnabled: !v.isEnabled }));
                      }}
                      style={{ border: 0, background: "transparent", padding: 4, flex: "none" }}
                    >
                      <span dir="ltr" style={{ width: 36, height: 21, borderRadius: 11, background: now.isEnabled ? "#d71635" : "#cfd3cb", display: "flex", justifyContent: now.isEnabled ? "flex-end" : "flex-start", padding: 2, transition: "background .2s" }}>
                        <span style={{ width: 17, height: 17, borderRadius: "50%", background: "#ffffff", boxShadow: "0 1px 2px #00000033" }} />
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ ...card, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              <b style={eyebrow}>{tx("log")}</b>
              {(log.data?.log ?? []).map((row) => (
                <div key={row.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: row.status === "sent" ? "#3f705a" : row.status === "test" ? "#92958e" : "#d71635", flex: "none" }} />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <b style={{ fontWeight: 600 }}>{logTitle(row.templateKey, tx)}</b> · {row.customerName ?? row.recipient}
                  </span>
                  <small style={{ color: "#92958e", fontSize: 11, whiteSpace: "nowrap" }}>
                    {`ch_${row.channel}` in TEXT ? tx(`ch_${row.channel}` as keyof typeof TEXT) : row.channel}
                    {row.status !== "sent" ? ` · ${tx(row.status === "test" ? "st_test" : "st_failed")}` : ""} · {ago(row.sentAt)}
                  </small>
                </div>
              ))}
              {log.data && log.data.log.length === 0 ? <p style={{ fontSize: 12.5, color: "#92958e" }}>{tx("logEmpty")}</p> : null}
            </div>
          </div>

          {current ? (
            <Editor
              key={current.t.key}
              template={current.t}
              value={current.now}
              lang={lang}
              setLang={setLang}
              tx={tx}
              testing={test.isPending}
              onEdit={(change) => void edit(current.t, change)}
              onTest={(value) => (value.channels.includes("email") ? test.mutate({ key: current.t.key, value }) : toast(tx("testNoEmail")))}
            />
          ) : (
            <div style={{ ...card, padding: "18px 20px" }}>
              <div className="a-skel" style={{ height: 320 }} />
            </div>
          )}
        </div>
      </section>
    </AdminShell>
  );
}

/** The prototype's short keys, which early log rows were written with. */
const LEGACY_KEYS: Record<string, Key> = { confirm: "booking_confirmed", remind: "reminder", onway: "crew_on_way", invoice: "invoice_sent", payrem: "payment_reminder", review: "review_request" };

function logTitle(key: string, tx: Tx): string {
  const known = LEGACY_KEYS[key] ?? key;
  return `t_${known}` in TEXT ? tx(`t_${known}` as keyof typeof TEXT) : key;
}

function sampleValues(lang: Locale, services: (key: keyof typeof SERVICE_TEXT) => string): Record<string, string> {
  const day = new Date(Date.now() + 3 * 864e5);
  const due = new Date(Date.now() + 14 * 864e5);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return {
    name: "Lena",
    ref: "MON-2026-48213",
    service: services("moving"),
    date: day.toLocaleDateString(INTL[lang], { weekday: "long", day: "numeric", month: "long" }),
    time: "09:00",
    total: new Intl.NumberFormat(INTL[lang], { style: "currency", currency: "EUR" }).format(1240),
    invoice: "RE-2026-0042",
    due: due.toLocaleDateString(INTL[lang], { day: "2-digit", month: "2-digit", year: "numeric" }),
    link: `${origin}/${lang}/konto/auftraege`,
  };
}

function Editor({
  template,
  value,
  lang,
  setLang,
  tx,
  testing,
  onEdit,
  onTest,
}: {
  template: Template;
  value: TemplateValue;
  lang: Locale;
  setLang: (l: Locale) => void;
  tx: Tx;
  testing: boolean;
  onEdit: (change: (v: TemplateValue) => TemplateValue) => void;
  onTest: (value: TemplateValue) => void;
}) {
  const [subject, setSubject] = useState(value.subject[lang] ?? "");
  const [body, setBody] = useState(value.body[lang] ?? "");
  const area = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<number | null>(null);

  // Another language, or the draft changed underneath (discard, publish).
  useEffect(() => setSubject(value.subject[lang] ?? ""), [value.subject, lang]);
  useEffect(() => setBody(value.body[lang] ?? ""), [value.body, lang]);

  // The language's own words decide the preview; the service name follows it.
  const services = (key: keyof typeof SERVICE_TEXT) => SERVICE_TEXT[key][lang];
  const vars = sampleValues(lang, services);
  const dir = LOCALE_META[lang].dir;
  const showSubject = value.channels.includes("email");

  const commit = (field: "subject" | "body", text: string) => {
    if ((value[field][lang] ?? "") === text) return;
    onEdit((v) => ({ ...v, [field]: { ...v[field], [lang]: text } }));
  };

  const insert = (name: string) => {
    const token = `{${name}}`;
    const at = caret.current;
    const next = at == null ? `${body.replace(/\s*$/, "")}${body.trim() ? " " : ""}${token}` : `${body.slice(0, at)}${token}${body.slice(at)}`;
    setBody(next);
    commit("body", next);
    caret.current = at == null ? null : at + token.length;
  };

  return (
    <div style={{ ...card, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <b style={{ fontSize: 17, fontWeight: 650 }}>{tx(`t_${template.key}`)}</b>
          <small style={{ fontSize: 12, color: "#737870" }}>{tx(`w_${template.key}`)}</small>
        </div>
        <div role="group" aria-label={tx("lang")} style={{ display: "inline-flex", flexWrap: "wrap", padding: 3, border: "1px solid #cfd3cb", borderRadius: 8 }}>
          {LANG_ORDER.map((l) => (
            <button
              key={l}
              type="button"
              lang={l}
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
              style={{ minHeight: 30, padding: "0 12px", border: 0, borderRadius: 6, background: lang === l ? "#252b28" : "transparent", color: lang === l ? "#ffffff" : "#4a514d", fontSize: 12, fontWeight: 600 }}
            >
              {LOCALE_META[l].label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {CHANNELS.map((c) => {
          const on = value.channels.includes(c);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => onEdit((v) => ({ ...v, channels: v.channels.includes(c) ? v.channels.filter((x) => x !== c) : [...v.channels, c] }))}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 32, padding: "0 12px", border: `1px solid ${on ? "#d71635" : "#cfd3cb"}`, borderRadius: 999, background: on ? "#fff6f6" : "#ffffff", color: on ? "#b7122b" : "#4a514d", fontSize: 12, fontWeight: 600 }}
            >
              {tx(`ch_${c}`)}
              {c !== "email" ? <span style={{ padding: "1px 6px", borderRadius: 999, background: on ? "#ffffff" : "#f1f3f5", color: "#737870", fontSize: 10, fontWeight: 600 }}>{tx("provider")}</span> : null}
            </button>
          );
        })}
      </div>

      {showSubject ? (
        <label style={label}>
          {tx("subject")}
          <input
            dir={dir}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            onBlur={() => commit("subject", subject)}
            style={{ height: 40, padding: "0 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, color: "#252b28" }}
          />
        </label>
      ) : null}
      <label style={label}>
        {tx("body")}
        <textarea
          ref={area}
          dir={dir}
          value={body}
          rows={7}
          onChange={(event) => setBody(event.target.value)}
          onSelect={(event) => (caret.current = event.currentTarget.selectionStart)}
          onBlur={() => commit("body", body)}
          style={{ padding: "10px 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, lineHeight: 1.5, color: "#252b28", resize: "vertical", fontFamily: "inherit" }}
        />
      </label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <small style={{ fontSize: 11.5, color: "#737870" }}>{tx("insert")}</small>
        {VARIABLES.map((v) => (
          <button
            key={v}
            type="button"
            dir="ltr"
            // Keeps the caret where it was in the message.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insert(v)}
            style={{ minHeight: 28, padding: "0 9px", border: "1px dashed #cfd3cb", borderRadius: 5, background: "#ffffff", color: "#4a514d", fontSize: 11.5, fontWeight: 600 }}
          >{`{${v}}`}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px", borderRadius: 10, background: "#f6f7f3" }}>
        <b style={eyebrow}>{tx("preview")}</b>
        {showSubject ? (
          <b dir={dir} style={{ fontSize: 13.5, fontWeight: 650, textAlign: "start" }}>
            {fill(subject, vars)}
          </b>
        ) : null}
        <p dir={dir} style={{ fontSize: 13, lineHeight: 1.55, color: "#252b28", whiteSpace: "pre-wrap", textAlign: "start", overflowWrap: "anywhere" }}>
          {fill(body, vars)}
        </p>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          className="a-btn is-line"
          disabled={testing}
          onClick={() => onTest({ ...value, subject: { ...value.subject, [lang]: subject }, body: { ...value.body, [lang]: body } })}
          style={{ minHeight: 38, borderRadius: 6, fontSize: 12, color: "#b7122b" }}
        >
          {tx("test")}
        </button>
      </div>
    </div>
  );
}
