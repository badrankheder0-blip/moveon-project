"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState, type CSSProperties } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { STATUS_TEXT, dateTag, dayKey, formatDate, money, type OrderStatus } from "@/lib/admin/format";
import { ADMIN_PATHS } from "@/lib/admin/nav";
import { defineText, useText } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

import { INVOICE_COLOURS, type Invoice } from "./invoice-types";
import styles from "./page.module.css";

/**
 * Invoices & payments, as the admin prototype draws it: what is unpaid,
 * overdue and paid this month, the invoices with their row actions (PDF,
 * send, reminder, mark as paid and undo), the orders ready to invoice and the
 * invoice details from Settings, plus the accountant's DATEV export.
 *
 * Unlike the prototype, an invoice is issued by the API as a snapshot with
 * the year's next number, and sending and reminding email the customer.
 */

const TEXT = defineText({
  title: { de: "Rechnungen & Zahlungen", en: "Invoices & payments", ar: "الفواتير والمدفوعات", tr: "Faturalar ve ödemeler" },
  sub: {
    de: "Erstellen Sie deutsche Rechnungen aus Ihren Aufträgen, behalten Sie Zahlungen im Blick und versenden Sie Erinnerungen.",
    en: "Create German invoices from your orders, track payments and send reminders.",
    ar: "أنشئ فواتير ألمانية من طلباتك، وتابع الدفعات، وأرسل التذكيرات.",
    tr: "Siparişlerinizden Almanca faturalar oluşturun, ödemeleri takip edin ve hatırlatmalar gönderin.",
  },
  datev: { de: "Export für Steuerberater (DATEV)", en: "Export for accountant (DATEV)", ar: "تصدير للمحاسب (DATEV)", tr: "Muhasebeci için dışa aktar (DATEV)" },
  datevMonth: { de: "Monat für den DATEV-Export", en: "Month for the DATEV export", ar: "شهر تصدير DATEV", tr: "DATEV dışa aktarma ayı" },
  exported: { de: "DATEV-Datei für {month} heruntergeladen", en: "DATEV file for {month} downloaded", ar: "تم تنزيل ملف DATEV لشهر {month}", tr: "{month} için DATEV dosyası indirildi" },
  exportFailed: { de: "Der DATEV-Export ist fehlgeschlagen.", en: "The DATEV export failed.", ar: "فشل تصدير DATEV.", tr: "DATEV dışa aktarımı başarısız oldu." },
  kUnpaid: { de: "Offen", en: "Unpaid", ar: "غير مدفوع", tr: "Ödenmemiş" },
  kOverdue: { de: "Überfällig", en: "Overdue", ar: "متأخر", tr: "Gecikmiş" },
  kPaidMonth: { de: "Bezahlt diesen Monat", en: "Paid this month", ar: "مدفوع هذا الشهر", tr: "Bu ay ödenen" },
  kReady: { de: "Bereit zur Abrechnung", en: "Ready to invoice", ar: "جاهزة للفوترة", tr: "Faturalanmaya hazır" },
  all: { de: "Alle", en: "All", ar: "الكل", tr: "Tümü" },
  st_draft: { de: "Entwurf", en: "Draft", ar: "مسودة", tr: "Taslak" },
  st_sent: { de: "Versendet", en: "Sent", ar: "مرسلة", tr: "Gönderildi" },
  st_overdue: { de: "Überfällig", en: "Overdue", ar: "متأخرة", tr: "Gecikmiş" },
  st_paid: { de: "Bezahlt", en: "Paid", ar: "مدفوعة", tr: "Ödendi" },
  st_cancelled: { de: "Storniert", en: "Cancelled", ar: "ملغاة", tr: "İptal edildi" },
  colNo: { de: "Rechnung", en: "Invoice", ar: "الفاتورة", tr: "Fatura" },
  colCustomer: { de: "Kunde", en: "Customer", ar: "الزبون", tr: "Müşteri" },
  colDate: { de: "Datum", en: "Date", ar: "التاريخ", tr: "Tarih" },
  colDue: { de: "Fällig", en: "Due", ar: "الاستحقاق", tr: "Vade" },
  colAmount: { de: "Betrag", en: "Amount", ar: "المبلغ", tr: "Tutar" },
  pdf: { de: "PDF", en: "PDF", ar: "PDF", tr: "PDF" },
  send: { de: "Senden", en: "Send", ar: "إرسال", tr: "Gönder" },
  remind: { de: "Erinnerung", en: "Reminder", ar: "تذكير", tr: "Hatırlatma" },
  markPaid: { de: "Als bezahlt markieren", en: "Mark as paid", ar: "تسجيل كمدفوعة", tr: "Ödendi olarak işaretle" },
  unpay: { de: "Zahlung zurücknehmen", en: "Undo payment", ar: "إلغاء الدفع", tr: "Ödemeyi geri al" },
  reminders: { de: "{n} Erinnerung(en)", en: "{n} reminder(s)", ar: "{n} تذكير", tr: "{n} hatırlatma" },
  none: { de: "Keine Rechnungen in dieser Ansicht.", en: "No invoices in this view.", ar: "لا توجد فواتير هنا.", tr: "Bu görünümde fatura yok." },
  readyTitle: { de: "BEREIT ZUR ABRECHNUNG", en: "READY TO INVOICE", ar: "جاهزة للفوترة", tr: "FATURALANMAYA HAZIR" },
  readySub: {
    de: "Erledigte oder bestätigte Aufträge ohne Rechnung.",
    en: "Completed or confirmed orders without an invoice.",
    ar: "طلبات منجزة أو مؤكدة بدون فاتورة.",
    tr: "Faturası olmayan tamamlanmış veya onaylanmış siparişler.",
  },
  create: { de: "Rechnung erstellen", en: "Create invoice", ar: "إنشاء فاتورة", tr: "Fatura oluştur" },
  details: { de: "RECHNUNGSDATEN", en: "INVOICE DETAILS", ar: "بيانات الفاتورة", tr: "FATURA BİLGİLERİ" },
  iban: { de: "IBAN", en: "IBAN", ar: "IBAN", tr: "IBAN" },
  vatId: { de: "USt-IdNr.", en: "VAT ID", ar: "رقم ضريبة القيمة المضافة", tr: "KDV kimlik numarası" },
  taxNumber: { de: "Steuernummer", en: "Tax number", ar: "الرقم الضريبي", tr: "Vergi numarası" },
  terms: { de: "Zahlungsziel (Tage)", en: "Payment term (days)", ar: "مهلة الدفع (أيام)", tr: "Ödeme süresi (gün)" },
  fromSettings: {
    de: "Diese Angaben werden unter Einstellungen angelegt. Felder, die dort noch fehlen, können hier nicht gespeichert werden.",
    en: "These details are set up in Settings. A field Settings does not have yet cannot be saved here.",
    ar: "تُضبط هذه البيانات من الإعدادات. لا يمكن حفظ حقل غير موجود في الإعدادات بعد.",
    tr: "Bu bilgiler Ayarlar'da tanımlanır. Ayarlar'da henüz olmayan bir alan burada kaydedilemez.",
  },
  needTax: {
    de: "Eine Rechnung braucht die Steuernummer oder die USt-IdNr.",
    en: "An invoice needs the tax number or the VAT ID.",
    ar: "تحتاج الفاتورة إلى الرقم الضريبي أو رقم ضريبة القيمة المضافة.",
    tr: "Bir faturada vergi numarası veya KDV kimlik numarası bulunmalıdır.",
  },
  saved: { de: "Gespeichert", en: "Saved", ar: "تم الحفظ", tr: "Kaydedildi" },
  badTerm: { de: "Bitte eine Zahl von 0 bis 365 eingeben.", en: "Enter a number from 0 to 365.", ar: "أدخل رقماً من 0 إلى 365.", tr: "0 ile 365 arasında bir sayı girin." },
  created: { de: "Rechnung {number} erstellt", en: "Invoice {number} created", ar: "تم إنشاء الفاتورة {number}", tr: "{number} numaralı fatura oluşturuldu" },
  sentTo: { de: "Rechnung an {email} gesendet", en: "Invoice sent to {email}", ar: "أُرسلت الفاتورة إلى {email}", tr: "Fatura {email} adresine gönderildi" },
  remindedTo: { de: "Erinnerung an {email} gesendet", en: "Reminder sent to {email}", ar: "أُرسل التذكير إلى {email}", tr: "Hatırlatma {email} adresine gönderildi" },
  outbox: {
    de: "Testmodus: Die E-Mail an {email} liegt im Postausgang und wurde nicht zugestellt.",
    en: "Test mode: the email to {email} is in the outbox and was not delivered.",
    ar: "وضع التجربة: الرسالة إلى {email} محفوظة في صندوق الصادر ولم تُسلَّم.",
    tr: "Test modu: {email} adresine e-posta giden kutusunda, teslim edilmedi.",
  },
  paidToast: { de: "Als bezahlt markiert", en: "Marked as paid", ar: "تم تسجيل الدفع", tr: "Ödendi olarak işaretlendi" },
  unpaidToast: { de: "Zahlung zurückgenommen", en: "Payment undone", ar: "تم إلغاء الدفع", tr: "Ödeme geri alındı" },
  exists: { de: "Für diesen Auftrag gibt es schon eine Rechnung.", en: "This order already has an invoice.", ar: "يوجد لهذا الطلب فاتورة بالفعل.", tr: "Bu siparişin zaten bir faturası var." },
  cantCreate: { de: "Für diesen Auftrag kann keine Rechnung erstellt werden.", en: "This order cannot be invoiced.", ar: "لا يمكن إصدار فاتورة لهذا الطلب.", tr: "Bu sipariş faturalanamaz." },
  mailFailed: { de: "Die E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.", en: "The email could not be sent. Please try again later.", ar: "تعذّر إرسال الرسالة. حاول لاحقاً.", tr: "E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin." },
  failed: { de: "Das hat nicht geklappt. Bitte erneut versuchen.", en: "That didn’t work. Please try again.", ar: "لم تنجح العملية. حاول مرة أخرى.", tr: "Bu işe yaramadı. Lütfen tekrar deneyin." },
  loadFailed: { de: "Die Rechnungen konnten nicht geladen werden.", en: "The invoices could not be loaded.", ar: "تعذّر تحميل الفواتير.", tr: "Faturalar yüklenemedi." },
  popup: { de: "Bitte Pop-ups für diese Seite erlauben.", en: "Please allow pop-ups for this site.", ar: "يرجى السماح بالنوافذ المنبثقة لهذا الموقع.", tr: "Lütfen bu site için açılır pencerelere izin verin." },
});

interface ReadyOrder {
  id: string;
  reference: string;
  status: OrderStatus;
  contactName: string;
  company: string | null;
  totalGross: string;
}

interface InvoiceSettings {
  iban: string;
  vatId: string;
  taxNumber: string;
  paymentTermDays: number;
  keys: { iban: string; vatId: string; taxNumber: string; paymentTermDays: string };
  present: string[];
}

type Filter = "all" | "draft" | "sent" | "overdue" | "paid";

/** A failure whose message is already the words to show. */
class Notice extends Error {}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const DOWNLOAD = "M12 3v12M7 10l5 5 5-5M5 21h14";

const card: CSSProperties = { background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, boxShadow: "0 12px 36px #202a2308" };
const eyebrow: CSSProperties = { fontSize: 10.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#737870" };
const rowBtn: CSSProperties = { minHeight: 32, padding: "0 11px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 11.5, fontWeight: 600 };
const outlineBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, flex: "none", whiteSpace: "nowrap", minHeight: 40, padding: "0 14px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 600 };

export default function InvoicesPage() {
  return (
    <AdminShell view="invoices">
      <Invoices />
    </AdminShell>
  );
}

function Invoices() {
  const { sdk, can } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const st = useText(STATUS_TEXT);
  const toast = useToast();
  const router = useRouter();
  const client = useQueryClient();
  const loc = dateTag(locale);
  const canWrite = can("payments.write");

  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 18 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return { key: dayKey(d).slice(0, 7), label: d.toLocaleDateString(loc, { month: "long", year: "numeric" }) };
    });
  }, [loc]);
  const [month, setMonth] = useState(() => dayKey(new Date()).slice(0, 7));

  const list = useQuery({
    queryKey: ["invoices", "list"],
    queryFn: () => sdk.http.get<{ invoices: Invoice[] }>("/api/invoices"),
    refetchInterval: 30_000,
  });
  const ready = useQuery({
    queryKey: ["invoices", "ready"],
    queryFn: () => sdk.http.get<{ orders: ReadyOrder[] }>("/api/invoices/ready"),
    refetchInterval: 30_000,
  });
  const settings = useQuery({
    queryKey: ["invoices", "settings"],
    queryFn: () => sdk.http.get<InvoiceSettings>("/api/invoices/settings"),
  });

  const refresh = () => client.invalidateQueries({ queryKey: ["invoices"] });

  const failure = (error: unknown) => {
    if (error instanceof Notice) return error.message;
    if (error instanceof ApiError) {
      if (error.code === "CONFLICT") return tx("exists");
      if (error.code === "SERVICE_UNAVAILABLE") return tx("mailFailed");
    }
    return tx("failed");
  };

  /** Runs one row's action with that row's buttons disabled until it answers. */
  const act = useMutation({
    mutationFn: async ({ id, run }: { id: string; run: () => Promise<string> }) => {
      setBusy(id);
      try {
        return await run();
      } finally {
        setBusy(null);
      }
    },
    onSuccess: (message) => {
      toast(message);
      void refresh();
    },
    onError: (error) => {
      toast(failure(error));
      void refresh();
    },
  });

  type MailAnswer = { invoice: Invoice; mail: { to: string; delivered: boolean; driver: string } };
  const mailToast = (answer: MailAnswer, key: "sentTo" | "remindedTo") =>
    answer.mail.driver === "log" ? tx("outbox", { email: answer.mail.to }) : tx(key, { email: answer.mail.to });

  const createInvoice = (orderId: string) =>
    act.mutate({
      id: orderId,
      run: async () => {
        try {
          const { invoice } = await sdk.http.post<{ invoice: Invoice }>("/api/invoices", { orderId });
          return tx("created", { number: invoice.number });
        } catch (error) {
          if (error instanceof ApiError && error.code === "UNPROCESSABLE") throw new Notice(tx("cantCreate"));
          throw error;
        }
      },
    });
  const send = (inv: Invoice) =>
    act.mutate({ id: inv.id, run: async () => mailToast(await sdk.http.post<MailAnswer>(`/api/invoices/${inv.id}/send`), "sentTo") });
  const remind = (inv: Invoice) =>
    act.mutate({ id: inv.id, run: async () => mailToast(await sdk.http.post<MailAnswer>(`/api/invoices/${inv.id}/remind`), "remindedTo") });
  const pay = (inv: Invoice, paid: boolean) =>
    act.mutate({
      id: inv.id,
      run: async () => {
        await sdk.http.patch(`/api/invoices/${inv.id}`, { paid });
        return tx(paid ? "paidToast" : "unpaidToast");
      },
    });

  const openPdf = (inv: Invoice) => {
    const win = window.open(`/${locale}${ADMIN_PATHS.invoices}/${inv.id}/druck?print=1`, "_blank");
    if (!win) toast(tx("popup"));
  };
  const openOrder = (orderId: string) => router.push(`/${locale}${ADMIN_PATHS.orders}/${orderId}`);

  const exportDatev = async () => {
    try {
      const path = `/api/invoices/export/datev?month=${month}`;
      const get = (token: string) =>
        fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include" });
      let response = await get(sdk.http.getAccessToken());
      if (response.status === 401) {
        const renewed = await sdk.http.renewAccessToken();
        if (renewed) response = await get(renewed);
      }
      if (!response.ok) throw new Error(String(response.status));
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `EXTF_Buchungsstapel_${month}.csv`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        link.remove();
      }, 500);
      toast(tx("exported", { month: months.find((m) => m.key === month)?.label ?? month }));
    } catch {
      toast(tx("exportFailed"));
    }
  };

  const view = useMemo(() => {
    const all = list.data?.invoices ?? [];
    const live = all.filter((inv) => inv.status !== "cancelled");
    const sum = (items: Invoice[]) => items.reduce((n, inv) => n + (Number.parseFloat(inv.totalGross) || 0), 0);
    const thisMonth = dayKey(new Date()).slice(0, 7);
    const readyOrders = ready.data?.orders ?? [];

    const kpis = [
      { label: tx("kUnpaid"), value: money(sum(live.filter((inv) => inv.status !== "paid"))), fg: "#252b28" },
      { label: tx("kOverdue"), value: money(sum(live.filter((inv) => inv.status === "overdue"))), fg: "#b7122b" },
      { label: tx("kPaidMonth"), value: money(sum(live.filter((inv) => inv.status === "paid" && inv.paidAt && dayKey(new Date(inv.paidAt)).slice(0, 7) === thisMonth))), fg: "#3f705a" },
      { label: tx("kReady"), value: String(readyOrders.length), fg: "#252b28" },
    ];

    const tabs = (["all", "draft", "sent", "overdue", "paid"] as Filter[]).map((key) => ({
      key,
      label: key === "all" ? tx("all") : tx(`st_${key}`),
      n: key === "all" ? all.length : all.filter((inv) => inv.status === key).length,
    }));

    const rows = all
      .filter((inv) => filter === "all" || inv.status === filter)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { kpis, tabs, rows, ready: readyOrders.slice(0, 8) };
  }, [list.data, ready.data, filter, tx]);

  const data = settings.data;
  const mayEdit = canWrite && can("theme.write");
  const fields: { key: keyof InvoiceSettings["keys"]; label: string; value: string; ph: string }[] = data
    ? [
        { key: "iban", label: tx("iban"), value: data.iban, ph: "DE89 3704 0044 0532 0130 00" },
        { key: "vatId", label: tx("vatId"), value: data.vatId, ph: "DE123456789" },
        { key: "taxNumber", label: tx("taxNumber"), value: data.taxNumber, ph: "103/815/08150" },
        { key: "paymentTermDays", label: tx("terms"), value: String(data.paymentTermDays), ph: "14" },
      ]
    : [];
  const editable = (key: keyof InvoiceSettings["keys"]) => Boolean(data && mayEdit && data.present.includes(data.keys[key]));
  const missingSome = Boolean(data && fields.some((f) => !data.present.includes(data.keys[f.key])));

  const saveField = async (key: keyof InvoiceSettings["keys"], raw: string) => {
    if (!data || !editable(key)) return;
    const value = raw.trim();
    const current = key === "paymentTermDays" ? String(data.paymentTermDays) : data[key];
    if (value === current) return;
    if (key === "paymentTermDays" && (!/^\d{1,3}$/.test(value) || Number(value) > 365)) {
      toast(tx("badTerm"));
      return;
    }
    try {
      await sdk.http.patch(`/api/site/settings/${encodeURIComponent(data.keys[key])}`, { value });
      toast(tx("saved"));
      void client.invalidateQueries({ queryKey: ["invoices", "settings"] });
    } catch {
      toast(tx("failed"));
    }
  };

  const statusLabel = (inv: Invoice) =>
    tx(`st_${inv.status}`) + (inv.remindersSent && inv.status !== "paid" && inv.status !== "cancelled" ? ` · ${tx("reminders", { n: inv.remindersSent })}` : "");

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 640 }}>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "var(--a-ls-h1)", lineHeight: 1.2 }}>{tx("title")}</h1>
          <p style={{ color: "#737870", fontSize: 13, marginTop: 6 }}>{tx("sub")}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select aria-label={tx("datevMonth")} value={month} onChange={(event) => setMonth(event.target.value)} className={styles.outline} style={{ ...outlineBtn, padding: "0 10px" }}>
            {months.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={exportDatev} className={styles.outline} style={outlineBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={DOWNLOAD} />
            </svg>
            {tx("datev")}
          </button>
        </div>
      </div>

      {list.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        {view.kpis.map((k) => (
          <div key={k.label} style={{ ...card, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
            <small style={{ fontSize: 11.5, color: "#737870" }}>{k.label}</small>
            <b style={{ fontSize: 24, fontWeight: 650, letterSpacing: "var(--a-ls-h2)", color: k.fg, fontVariantNumeric: "tabular-nums" }}>
              <span dir="ltr">{list.isLoading ? "—" : k.value}</span>
            </b>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 16, alignItems: "start" }}>
        <div style={{ gridColumn: "1/-1", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {view.tabs.map((tab) => {
            const on = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(tab.key)}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", minHeight: 34, padding: "0 13px", border: `1px solid ${on ? "#252b28" : "#e3e5de"}`, borderRadius: 999, background: on ? "#252b28" : "#ffffff", color: on ? "#ffffff" : "#4a514d", fontSize: 12, fontWeight: 600 }}
              >
                {tab.label}
                <span style={{ fontSize: 11, opacity: 0.7 }}>{tab.n}</span>
              </button>
            );
          })}
        </div>

        <div style={{ ...card, gridColumn: "1/-1", overflow: "hidden" }}>
          <div className={styles.head} style={{ gap: 14, padding: "11px 20px", background: "#fafaf7", borderBottom: "1px solid #e3e5de", ...eyebrow }}>
            <span style={{ flex: "0 0 120px" }}>{tx("colNo")}</span>
            <span style={{ flex: "1 1 180px" }}>{tx("colCustomer")}</span>
            <span style={{ flex: "0 0 100px" }}>{tx("colDate")}</span>
            <span style={{ flex: "0 0 100px" }}>{tx("colDue")}</span>
            <span style={{ flex: "0 0 100px", textAlign: "end" }}>{tx("colAmount")}</span>
            <span style={{ flex: "0 0 140px" }} />
          </div>

          {list.isLoading
            ? [0, 1, 2, 3].map((i) => (
                <div key={i} style={{ padding: "16px 20px", borderBottom: "1px solid #eef0ea" }}>
                  <div className="a-skel" style={{ width: `${60 - i * 8}%` }} />
                </div>
              ))
            : null}

          {view.rows.map((inv) => {
            const [bg, fg] = INVOICE_COLOURS[inv.status];
            const disabled = busy === inv.id || !canWrite;
            return (
              <div key={inv.id} className={styles.row} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 14px", padding: "12px 20px", borderBottom: "1px solid #eef0ea" }}>
                <b dir="ltr" style={{ flex: "0 0 120px", fontSize: 12.5, fontWeight: 650, fontVariantNumeric: "tabular-nums", textAlign: "start", textDecoration: inv.status === "cancelled" ? "line-through" : undefined }}>
                  {inv.number}
                </b>
                <button
                  type="button"
                  onClick={() => openOrder(inv.orderId)}
                  style={{ flex: "1 1 180px", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", border: 0, background: "transparent", padding: 0, textAlign: "start" }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#252b28" }}>{inv.customer.company || inv.customer.name || "—"}</span>
                  <small dir="ltr" style={{ fontSize: 11.5, color: "#737870" }}>
                    {inv.orderReference ?? ""}
                  </small>
                </button>
                <span style={{ flex: "0 0 100px", fontSize: 12.5, color: "#4a514d" }}>{formatDate(inv.issueDate, locale)}</span>
                <span style={{ flex: "0 0 100px", fontSize: 12.5, fontWeight: 550, color: inv.status === "overdue" ? "#b7122b" : "#4a514d" }}>{formatDate(inv.dueDate, locale)}</span>
                <span style={{ flex: "0 0 100px", textAlign: "end", fontSize: 13, fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>
                  <span dir="ltr">{money(inv.totalGross)}</span>
                </span>
                <span style={{ flex: "0 0 140px" }}>
                  <span style={{ display: "inline-block", padding: "4px 9px", borderRadius: 999, background: bg, color: fg, fontSize: 11, fontWeight: 650, whiteSpace: "nowrap" }}>{statusLabel(inv)}</span>
                </span>
                <span style={{ flex: "1 1 220px", display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => openPdf(inv)} style={rowBtn}>
                    {tx("pdf")}
                  </button>
                  {canWrite && inv.status === "draft" ? (
                    <button type="button" disabled={disabled} onClick={() => send(inv)} style={rowBtn}>
                      {tx("send")}
                    </button>
                  ) : null}
                  {canWrite && (inv.status === "sent" || inv.status === "overdue") ? (
                    <button type="button" disabled={disabled} onClick={() => remind(inv)} style={rowBtn}>
                      {tx("remind")}
                    </button>
                  ) : null}
                  {canWrite && inv.status !== "paid" && inv.status !== "cancelled" ? (
                    <button type="button" disabled={disabled} onClick={() => pay(inv, true)} className={styles.pay} style={{ ...rowBtn, border: "1px solid #d71635", background: "#d71635", color: "#ffffff" }}>
                      {tx("markPaid")}
                    </button>
                  ) : null}
                  {canWrite && inv.status === "paid" ? (
                    <button type="button" disabled={disabled} onClick={() => pay(inv, false)} style={{ ...rowBtn, border: 0, background: "transparent", color: "#737870" }}>
                      {tx("unpay")}
                    </button>
                  ) : null}
                </span>
              </div>
            );
          })}

          {!list.isLoading && view.rows.length === 0 ? <p style={{ padding: "40px 20px", textAlign: "center", color: "#737870", fontSize: 13 }}>{tx("none")}</p> : null}
        </div>

        {view.ready.length > 0 ? (
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #eef0ea" }}>
              <b style={eyebrow}>{tx("readyTitle")}</b>
              <p style={{ fontSize: 12, color: "#737870", marginTop: 3 }}>{tx("readySub")}</p>
            </div>
            {view.ready.map((order) => (
              <div key={order.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: "1px solid #eef0ea" }}>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{order.company || order.contactName || "—"}</span>
                  <small style={{ fontSize: 11.5, color: "#737870" }}>
                    <bdi dir="ltr">{order.reference}</bdi> · {st(order.status)}
                  </small>
                </span>
                <b style={{ fontSize: 13, fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>
                  <span dir="ltr">{money(order.totalGross)}</span>
                </b>
                {canWrite ? (
                  <button
                    type="button"
                    disabled={busy === order.id}
                    onClick={() => createInvoice(order.id)}
                    className={styles.create}
                    style={{ minHeight: 32, padding: "0 11px", border: "1px solid #d71635", borderRadius: 6, background: "#ffffff", color: "#b7122b", fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap" }}
                  >
                    {tx("create")}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ ...card, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <b style={eyebrow}>{tx("details")}</b>
          {settings.isLoading ? <div className="a-skel" style={{ height: 40 }} /> : null}
          {fields.map((field) => (
            <label key={field.key} style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "#737870" }}>
              {field.label}
              <input
                key={`${field.key}:${field.value}`}
                dir="ltr"
                defaultValue={field.value}
                placeholder={field.ph}
                readOnly={!editable(field.key)}
                inputMode={field.key === "paymentTermDays" ? "numeric" : undefined}
                onBlur={(event) => void saveField(field.key, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") (event.target as HTMLInputElement).blur();
                }}
                className={styles.field}
                style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, color: "#252b28", textAlign: "start" }}
              />
            </label>
          ))}
          {data && !data.vatId && !data.taxNumber ? <p style={{ fontSize: 11.5, color: "#b7122b" }}>{tx("needTax")}</p> : null}
          {missingSome ? <p style={{ fontSize: 11.5, color: "#92958e", lineHeight: 1.45 }}>{tx("fromSettings")}</p> : null}
        </div>
      </div>
    </section>
  );
}
