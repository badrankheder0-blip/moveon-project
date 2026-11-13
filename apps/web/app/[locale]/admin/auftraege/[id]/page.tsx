"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { BookingInfo } from "@/app/components/admin/orders/BookingInfo";
import { teamLabel, useFleet, vehicleLabel } from "@/app/components/admin/orders/fleet";
import styles from "@/app/components/admin/orders/orders.module.css";
import { PRICE_TEXT, PricePanel, usePriceLabels, type LineSave } from "@/app/components/admin/orders/PricePanel";
import { orderPrintHtml } from "@/app/components/admin/orders/print";
import type { Invoice, OrderDetail } from "@/app/components/admin/orders/types";
import { SERVICE_COLOURS, SERVICE_TEXT, STATUS_TEXT, ORDER_STATUSES, dateTag, money, type OrderStatus } from "@/lib/admin/format";
import { ADMIN_PATHS } from "@/lib/admin/nav";
import { defineText, useText } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";
import { LOCALE_META } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { useSiteSettings } from "@/lib/site/useSiteSettings";

/**
 * One order, as a full page (the prototype's order detail): the customer's
 * date-change request, who and what, the status, the PDF and the quote
 * email; every booking answer with what is missing; and in the sidebar the
 * team and vehicle, the price lines, the invoice and the internal notes.
 * Everything saves as soon as it changes.
 */

const TEXT = defineText({
  backOrders: { de: "Alle Aufträge", en: "All orders", ar: "كل الطلبات", tr: "Tüm siparişler" },
  order: { de: "AUFTRAG", en: "ORDER", ar: "طلب", tr: "SİPARİŞ" },
  private: { de: "Privatkunde", en: "Private customer", ar: "زبون فرد", tr: "Bireysel müşteri" },
  business: { de: "Geschäftskunde", en: "Business", ar: "شركة", tr: "Kurumsal" },
  status: { de: "Status", en: "Status", ar: "الحالة", tr: "Durum" },
  pdf: { de: "PDF herunterladen", en: "Download PDF", ar: "تحميل PDF", tr: "PDF indir" },
  sendQuote: { de: "Angebot senden", en: "Send quote", ar: "إرسال العرض", tr: "Teklif gönder" },
  assign: { de: "Team & Fahrzeug", en: "Team & vehicle", ar: "الفريق والسيارة", tr: "Ekip ve araç" },
  team: { de: "Team", en: "Team", ar: "الفريق", tr: "Ekip" },
  vehicle: { de: "Fahrzeug", en: "Vehicle", ar: "السيارة", tr: "Araç" },
  unassigned: { de: "Nicht zugewiesen", en: "Not assigned", ar: "غير معيّن", tr: "Atanmadı" },
  notes: { de: "Interne Notizen", en: "Internal notes", ar: "ملاحظات داخلية", tr: "Dahili notlar" },
  notesPh: { de: "Nur Ihr Team sieht diese Notizen.", en: "Only your team sees these notes.", ar: "تظهر لفريقك فقط.", tr: "Bu notları yalnızca ekibiniz görür." },
  rqTitle: { de: "Der Kunde wünscht einen neuen Termin", en: "The customer asked for a new date", ar: "طلب الزبون موعداً جديداً", tr: "Müşteri yeni bir tarih istedi" },
  rqText: { de: "Neuer Termin: {d}", en: "New date: {d}", ar: "الموعد الجديد: {d}", tr: "Yeni tarih: {d}" },
  rqOk: { de: "Annehmen", en: "Approve", ar: "موافقة", tr: "Onayla" },
  rqNo: { de: "Ablehnen", en: "Decline", ar: "رفض", tr: "Reddet" },
  rqOkNote: { de: "Termin auf Wunsch des Kunden auf {d} verschoben", en: "Date moved to {d} at the customer’s request", ar: "نُقل الموعد إلى {d} بطلب من الزبون", tr: "Tarih müşterinin isteğiyle {d} olarak değiştirildi" },
  rqOkT: {
    de: "Neuer Termin angenommen. Der Kunde sieht ihn in seinem Konto.",
    en: "New date approved. The customer sees it in their account.",
    ar: "تمت الموافقة على الموعد الجديد، والزبون يراه في حسابه.",
    tr: "Yeni tarih onaylandı. Müşteri bunu hesabında görür.",
  },
  rqNoT: {
    de: "Anfrage abgelehnt. Der Kunde sieht das in seinem Konto.",
    en: "Request declined. The customer sees it in their account.",
    ar: "تم رفض الطلب، والزبون يرى ذلك في حسابه.",
    tr: "Talep reddedildi. Müşteri bunu hesabında görür.",
  },
  quoteToast: { de: "Das Angebot wurde an den Kunden gesendet.", en: "The quote was emailed to the customer.", ar: "أُرسل العرض إلى الزبون بالبريد.", tr: "Teklif müşteriye e-postayla gönderildi." },
  quoteFailed: { de: "Das Angebot konnte nicht gesendet werden.", en: "The quote could not be sent.", ar: "تعذّر إرسال العرض.", tr: "Teklif gönderilemedi." },
  statusToast: {
    de: "Status geändert. Der Kunde sieht ihn in seinem Konto.",
    en: "Status changed. The customer sees it in their account.",
    ar: "تم تغيير الحالة، والزبون يراها في حسابه.",
    tr: "Durum değişti. Müşteri bunu hesabında görür.",
  },
  cancelAsk: {
    de: "Diesen Auftrag stornieren? Der Kunde wird per E-Mail informiert.",
    en: "Cancel this order? The customer is told by email.",
    ar: "إلغاء هذا الطلب؟ سيتم إبلاغ الزبون بالبريد.",
    tr: "Bu sipariş iptal edilsin mi? Müşteriye e-postayla bildirilir.",
  },
  saveFailed: { de: "Speichern fehlgeschlagen. Bitte erneut versuchen.", en: "Could not save. Please try again.", ar: "تعذّر الحفظ. حاول مرة أخرى.", tr: "Kaydedilemedi. Lütfen tekrar deneyin." },
  popup: {
    de: "Erlauben Sie Pop-ups, um das PDF herunterzuladen.",
    en: "Allow pop-ups to download the PDF.",
    ar: "اسمح بالنوافذ المنبثقة لتحميل ملف PDF.",
    tr: "PDF'i indirmek için açılır pencerelere izin verin.",
  },
  notFound: { de: "Dieser Auftrag wurde nicht gefunden.", en: "This order could not be found.", ar: "لم يُعثر على هذا الطلب.", tr: "Bu sipariş bulunamadı." },
  // The invoice card
  invoice: { de: "Rechnung", en: "Invoice", ar: "الفاتورة", tr: "Fatura" },
  noInvoice: { de: "Noch keine Rechnung.", en: "No invoice yet.", ar: "لا توجد فاتورة بعد.", tr: "Henüz fatura yok." },
  createInvoice: { de: "Rechnung erstellen", en: "Create invoice", ar: "إنشاء فاتورة", tr: "Fatura oluştur" },
  invoiceCreated: { de: "Rechnung {n} erstellt.", en: "Invoice {n} created.", ar: "تم إنشاء الفاتورة {n}.", tr: "{n} numaralı fatura oluşturuldu." },
  invoiceFailed: { de: "Die Rechnung konnte nicht erstellt werden.", en: "The invoice could not be created.", ar: "تعذّر إنشاء الفاتورة.", tr: "Fatura oluşturulamadı." },
  invoiceOpen: { de: "In Rechnungen öffnen", en: "Open in Invoices", ar: "فتح في الفواتير", tr: "Faturalarda aç" },
  invoiceDue: { de: "fällig {d}", en: "due {d}", ar: "الاستحقاق {d}", tr: "vade {d}" },
  iv_draft: { de: "Entwurf", en: "Draft", ar: "مسودة", tr: "Taslak" },
  iv_sent: { de: "Versendet", en: "Sent", ar: "مرسلة", tr: "Gönderildi" },
  iv_overdue: { de: "Überfällig", en: "Overdue", ar: "متأخرة", tr: "Gecikmiş" },
  iv_paid: { de: "Bezahlt", en: "Paid", ar: "مدفوعة", tr: "Ödendi" },
  // The printed page
  pQuote: { de: "Angebot {r}", en: "Quote {r}", ar: "عرض سعر {r}", tr: "Teklif {r}" },
  pCustomer: { de: "Kunde", en: "Customer", ar: "الزبون", tr: "Müşteri" },
  pSchedule: { de: "Termine", en: "Schedule", ar: "المواعيد", tr: "Takvim" },
  pAddresses: { de: "Adressen", en: "Addresses", ar: "العناوين", tr: "Adresler" },
  pNet: { de: "Netto", en: "Net", ar: "الصافي", tr: "Net" },
  pVat: { de: "MwSt.", en: "VAT", ar: "الضريبة", tr: "KDV" },
  aFrom: { de: "Auszug", en: "Pickup", ar: "عنوان الاستلام", tr: "Alış" },
  aTo: { de: "Einzug", en: "Delivery", ar: "عنوان التسليم", tr: "Teslim" },
  aService: { de: "Einsatzadresse", en: "Service address", ar: "عنوان الخدمة", tr: "Hizmet adresi" },
  secondDay: { de: "zweiter Tag", en: "second day", ar: "اليوم الثاني", tr: "ikinci gün" },
});

/** The status select's colours, per status (the prototype's `stv`). */
const STATUS_STYLE: Record<OrderStatus, { bg: string; fg: string; border: string }> = {
  quoted: { bg: "#fbf4e4", fg: "#5c4a00", border: "#ecd9a0" },
  confirmed: { bg: "#edf5ed", fg: "#3f705a", border: "#c9dfcd" },
  completed: { bg: "#f5f5f0", fg: "#252b28", border: "#e3e5de" },
  cancelled: { bg: "#fff6f6", fg: "#b7122b", border: "#f1c9cf" },
};

/** Which statuses each can move to — the API's state machine, so the select offers nothing it refuses. */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  quoted: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const INVOICE_PILL: Record<string, { bg: string; fg: string }> = {
  draft: { bg: "#f5f5f0", fg: "#4a514d" },
  sent: { bg: "#eef3fb", fg: "#2d5a8c" },
  overdue: { bg: "#fff1f3", fg: "#b7122b" },
  paid: { bg: "#edf5ed", fg: "#3f705a" },
};

const card = { background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 12, boxShadow: "0 12px 36px #202a2308" } as const;
const selectStyle = { height: 41, padding: "0 10px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 13 } as const;

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { sdk } = useApi();

  const detail = useQuery({
    queryKey: ["admin", "orders", "detail", id],
    queryFn: () => sdk.http.get<OrderDetail>(`/api/orders/${id}`),
    refetchInterval: 30_000,
  });

  return (
    <AdminShell view="orders" {...(detail.data ? { crumb: detail.data.reference } : {})}>
      <Detail id={id} detail={detail} />
    </AdminShell>
  );
}

function Detail({ id, detail }: { id: string; detail: UseQueryResult<OrderDetail> }) {
  const { sdk, can } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const px = useText(PRICE_TEXT);
  const sx = useText(SERVICE_TEXT);
  const st = useText(STATUS_TEXT);
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fleet = useFleet();
  const site = useSiteSettings();
  const priceLabels = usePriceLabels();
  const rtl = LOCALE_META[locale].dir === "rtl";
  const loc = dateTag(locale);
  const listHref = `/${locale}${ADMIN_PATHS.orders}`;

  const order = detail.data;
  const canWrite = can("orders.write");
  const canAssign = can("orders.assign");
  const canCancel = can("orders.cancel");

  // Esc goes back to the list, as it closes the order in the prototype.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== "Escape" || target?.closest("input, textarea, select")) return;
      router.push(listHref);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router, listHref]);

  const put = (next: OrderDetail) => {
    queryClient.setQueryData(["admin", "orders", "detail", id], next);
    void queryClient.invalidateQueries({ queryKey: ["admin", "orders", "list"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "orders", "calendar"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "counts"] });
  };
  const failed = (error: unknown) => toast(error instanceof ApiError && error.status !== 500 ? error.message : tx("saveFailed"));

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => sdk.http.patch<OrderDetail>(`/api/orders/${id}`, body),
    onSuccess: put,
    onError: failed,
  });

  const changeStatus = useMutation({
    mutationFn: (status: OrderStatus) => sdk.http.patch(`/api/orders/${id}/status`, { status }),
    onSuccess: async () => {
      toast(tx("statusToast"));
      await detail.refetch();
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders", "list"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "counts"] });
    },
    onError: failed,
  });

  const sendQuote = useMutation({
    mutationFn: () => sdk.http.post<OrderDetail>(`/api/orders/${id}/send-quote`, {}),
    onSuccess: (next) => {
      put(next);
      toast(tx("quoteToast"));
    },
    onError: (error) => toast(error instanceof ApiError && error.status < 500 ? error.message : tx("quoteFailed")),
  });

  const decide = useMutation({
    mutationFn: ({ requestId, approve, note }: { requestId: string; approve: boolean; note?: string }) =>
      sdk.http.post<OrderDetail>(`/api/orders/${id}/date-change/${requestId}/${approve ? "approve" : "decline"}`, note ? { note } : {}),
    onSuccess: (next, vars) => {
      put(next);
      toast(tx(vars.approve ? "rqOkT" : "rqNoT"));
    },
    onError: failed,
  });

  // The invoice belongs to the invoices screen; this card only reads and creates it.
  const invoices = useQuery({
    queryKey: ["admin", "orders", "invoice", id],
    queryFn: () =>
      sdk.http
        .get<{ invoices: Invoice[] }>("/api/invoices", { orderId: id })
        .then((r) => r.invoices ?? [])
        .catch(() => [] as Invoice[]),
    enabled: !!order,
  });
  const createInvoice = useMutation({
    mutationFn: () => sdk.http.post<{ invoice: Invoice }>("/api/invoices", { orderId: id }),
    onSuccess: (r) => {
      toast(tx("invoiceCreated", { n: r.invoice?.number ?? "" }));
      void invoices.refetch();
    },
    onError: (error) => toast(error instanceof ApiError && error.status < 500 && error.status !== 404 ? error.message : tx("invoiceFailed")),
  });

  const [notes, setNotes] = useState("");
  // The last price save, so "Send quote" waits for lines typed a moment ago.
  const lastSave = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => setNotes(order?.internalNotes ?? ""), [order?.internalNotes]);

  if (detail.isLoading) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="a-skel" style={{ height: 20, width: 120 }} />
        <div className="a-skel" style={{ height: 70 }} />
        <div className="a-skel" style={{ height: 420 }} />
      </section>
    );
  }

  if (!order) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <BackLink label={tx("backOrders")} rtl={rtl} onClick={() => router.push(listHref)} />
        <div className="a-note is-error">{tx("notFound")}</div>
      </section>
    );
  }

  const serviceName = (key: string) => (key in SERVICE_TEXT ? sx(key as keyof typeof SERVICE_TEXT) : key);
  const longDate = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" });
  const created = new Date(order.createdAt).toLocaleString(loc, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const sStyle = STATUS_STYLE[order.status];
  const company = order.answers?.company?.value;
  const request = order.status !== "cancelled" ? order.dateRequests.find((r) => r.status === "requested") : undefined;
  const teams = fleet.data?.teams ?? [];
  const vehicles = fleet.data?.vehicles ?? [];
  // A team or vehicle that is no longer in the active list still shows as assigned.
  const teamOptions = order.team && !teams.some((t) => t.id === order.team!.id) ? [...teams, order.team] : teams;
  const vehicleOptions = order.vehicle && !vehicles.some((v) => v.id === order.vehicle!.id) ? [...vehicles, order.vehicle] : vehicles;

  const saveLines = (lines: LineSave[]) => (lastSave.current = patch.mutateAsync({ lines }).catch(() => undefined));

  const onStatus = (next: OrderStatus) => {
    if (next === order.status) return;
    if (next === "cancelled" && !window.confirm(tx("cancelAsk"))) return;
    changeStatus.mutate(next);
  };

  const printOrder = () => {
    const vat = Number.parseFloat(order.vatRate) || 0;
    const total = Number.parseFloat(order.totalGross) || 0;
    const net = Number.parseFloat(order.netAmount) || total / (1 + vat / 100);
    const time = order.scheduledTime?.slice(0, 5);
    const ok = (() => {
      const win = window.open("", "_blank");
      if (!win) return false;
      win.document.write(
        orderPrintHtml({
          dir: rtl ? "rtl" : "ltr",
          lang: locale,
          logo: new URL(site.logo, window.location.href).href,
          title: tx("pQuote", { r: order.reference }),
          date: new Date().toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric" }),
          labels: { customer: tx("pCustomer"), schedule: tx("pSchedule"), addresses: tx("pAddresses"), price: px("price"), subtotal: px("subtotal"), discount: px("discount"), net: tx("pNet"), vat: tx("pVat"), total: px("total") },
          customer: [order.contactName, company ?? "", order.contactEmail, order.contactPhone].filter(Boolean),
          schedule: [
            order.scheduledDate ? `${serviceName(order.serviceType)} · ${longDate(order.scheduledDate)}${time ? ` · ${time}` : ""}` : "",
            order.scheduledSecondDate ? `${serviceName(order.serviceType)} · ${longDate(order.scheduledSecondDate)} (${tx("secondDay")})` : "",
          ].filter(Boolean),
          addresses: [
            { label: order.destinationAddress ? tx("aFrom") : tx("aService"), text: order.originAddress },
            ...(order.destinationAddress ? [{ label: tx("aTo"), text: order.destinationAddress }] : []),
          ],
          lines: order.price.lines.map((line) => ({ label: priceLabels.label(line), rate: priceLabels.rate(line), amount: money(line.gross) })),
          subtotal: money(order.price.subtotalGross),
          discount: order.price.discount ? { code: order.price.discount.code, amount: money(order.price.discount.gross) } : null,
          net: money(net),
          vatRate: String(Number.isInteger(vat) ? vat : vat.toFixed(2)),
          vat: money(total - net),
          total: money(total),
        }),
      );
      win.document.close();
      return true;
    })();
    if (!ok) toast(tx("popup"));
  };

  const invoice = invoices.data?.[0];
  const chip = { display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, background: "#ffffff", border: "1px solid #e3e5de", fontSize: 11.5, whiteSpace: "nowrap", color: "#252b28", textDecoration: "none" } as const;

  return (
    <section data-screen-label="Order" className={styles.detailWrap} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <BackLink label={tx("backOrders")} rtl={rtl} onClick={() => router.push(listHref)} />

      {request ? (
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "14px 16px", border: "1px solid #f0d78a", borderRadius: 10, background: "#fbf4e4" }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: "#ffcb08", color: "#252b28", display: "grid", placeItems: "center", flex: "none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 5h16v15H4zM4 10h16M9 3v4M15 3v4M9 15l2 2 4-4" />
            </svg>
          </span>
          <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 3 }}>
            <b style={{ fontSize: 13.5, fontWeight: 650, color: "#3d3200" }}>{tx("rqTitle")}</b>
            <span style={{ fontSize: 13, color: "#5c4a00" }}>{tx("rqText", { d: [longDate(request.requestedDate), request.requestedTime].filter(Boolean).join(rtl ? "، " : ", ") })}</span>
            {request.reason ? <small style={{ fontSize: 12, color: "#5c4a00", unicodeBidi: "plaintext", textAlign: "start" }}>“{request.reason}”</small> : null}
          </div>
          {canWrite ? (
            <div style={{ display: "flex", gap: 8, flex: "none" }}>
              <button
                type="button"
                className={styles.approve}
                disabled={decide.isPending}
                onClick={() => decide.mutate({ requestId: request.id, approve: true, note: tx("rqOkNote", { d: longDate(request.requestedDate) }) })}
                style={{ minHeight: 38, padding: "0 16px", border: "1px solid #3f705a", borderRadius: 6, background: "#3f705a", color: "#ffffff", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
              >
                {tx("rqOk")}
              </button>
              <button
                type="button"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ requestId: request.id, approve: false })}
                style={{ minHeight: 38, padding: "0 14px", border: "1px solid #cfb460", borderRadius: 6, background: "#ffffff", color: "#5c4a00", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
              >
                {tx("rqNo")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 9 }}>
          <span style={{ fontSize: 10.5, fontWeight: 650, letterSpacing: rtl ? 0 : "1.5px", color: "#737870" }}>
            {tx("order")} · <bdi dir="ltr">{order.reference}</bdi> · <bdi>{created}</bdi>
          </span>
          <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: rtl ? 0 : "-0.9px", lineHeight: 1.15 }}>{order.contactName || "—"}</h1>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ ...chip, fontWeight: 600 }}>
              <i style={{ display: "block", width: 7, height: 7, borderRadius: 2, background: SERVICE_COLOURS[order.serviceType] ?? "#92958e" }} />
              {serviceName(order.serviceType)}
            </span>
            <span style={{ padding: "5px 10px", borderRadius: 999, background: "#f1f1ea", fontSize: 11.5, fontWeight: 550, whiteSpace: "nowrap" }}>
              {order.customerType === "business" ? `${tx("business")}${company ? ` · ${company}` : ""}` : tx("private")}
            </span>
            <a href={`mailto:${order.contactEmail}`} style={{ ...chip, maxWidth: "100%", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d71635" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6" />
              </svg>
              {order.contactEmail || "—"}
            </a>
            <a href={`tel:${order.contactPhone.replace(/\s+/g, "")}`} style={chip}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d71635" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
              </svg>
              <span dir="ltr">{order.contactPhone || "—"}</span>
            </a>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={order.status}
            aria-label={tx("status")}
            disabled={!canWrite || changeStatus.isPending || NEXT[order.status].length === 0}
            onChange={(e) => onStatus(e.target.value as OrderStatus)}
            style={{ height: 41, whiteSpace: "nowrap", padding: "0 12px", border: `1px solid ${sStyle.border}`, borderRadius: 8, background: sStyle.bg, color: sStyle.fg, fontSize: 12.5, fontWeight: 650, opacity: 1 }}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s} disabled={s !== order.status && (!NEXT[order.status].includes(s) || (s === "cancelled" && !canCancel))}>
                {st(s)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={styles.lineBtn}
            onClick={printOrder}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", minHeight: 41, padding: "0 15px", border: "1px solid #d71635", borderRadius: 8, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 550 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 18v-6M9 15l3 3 3-3" />
            </svg>
            {tx("pdf")}
          </button>
          {canWrite ? (
            <button
              type="button"
              className={styles.redBtn}
              disabled={order.price.lines.length === 0 || sendQuote.isPending || order.status === "cancelled" || order.status === "completed"}
              onClick={() => void lastSave.current.then(() => sendQuote.mutate())}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", minHeight: 41, padding: "0 16px", border: "1px solid #d71635", borderRadius: 8, background: "#d71635", color: "#ffffff", fontSize: 12, fontWeight: 600 }}
            >
              {sendQuote.isPending ? <span className="a-spin" /> : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
                </svg>
              )}
              {tx("sendQuote")}
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.detailGrid}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          <BookingInfo order={order} editable={canWrite} onSave={(answers) => patch.mutate({ answers })} />
        </div>

        <div className={styles.detailAside}>
          <div style={{ ...card, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 650 }}>{tx("assign")}</h3>
            <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "#737870" }}>
              {tx("team")}
              <select value={order.teamId ?? ""} disabled={!canAssign} onChange={(e) => patch.mutate({ teamId: e.target.value || null })} style={selectStyle}>
                <option value="">{tx("unassigned")}</option>
                {teamOptions.map((team) => (
                  <option key={team.id} value={team.id}>
                    {teamLabel(team)}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "#737870" }}>
              {tx("vehicle")}
              <select value={order.vehicleId ?? ""} disabled={!canAssign} onChange={(e) => patch.mutate({ vehicleId: e.target.value || null })} style={selectStyle}>
                <option value="">{tx("unassigned")}</option>
                {vehicleOptions.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicleLabel(vehicle)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <PricePanel order={order} editable={canWrite} onSave={saveLines} />

          <div style={{ ...card, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 650 }}>{tx("invoice")}</h3>
              {invoice ? (
                <span style={{ padding: "3px 9px", borderRadius: 999, background: (INVOICE_PILL[invoice.status] ?? INVOICE_PILL.draft!).bg, color: (INVOICE_PILL[invoice.status] ?? INVOICE_PILL.draft!).fg, fontSize: 10.5, fontWeight: 650 }}>
                  {invoice.status in INVOICE_PILL ? tx(`iv_${invoice.status}` as "iv_draft") : invoice.status}
                </span>
              ) : null}
            </div>
            {invoice ? (
              <>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <b style={{ font: "600 13px ui-monospace,Menlo,monospace" }}>
                    <bdi dir="ltr">{invoice.number}</bdi>
                  </b>
                  <span style={{ fontSize: 12, color: "#737870" }}>
                    {invoice.totalGross ? <span dir="ltr">{money(invoice.totalGross)}</span> : null}
                    {invoice.dueDate ? ` · ${tx("invoiceDue", { d: new Date(`${invoice.dueDate}T12:00:00`).toLocaleDateString(loc, { day: "numeric", month: "short" }) })}` : ""}
                  </span>
                </div>
                <button type="button" className="a-link-btn" style={{ alignSelf: "flex-start" }} onClick={() => router.push(`/${locale}${ADMIN_PATHS.invoices}`)}>
                  {tx("invoiceOpen")}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "#737870" }}>{tx("noInvoice")}</p>
                {(canWrite || can("payments.write")) && order.status !== "cancelled" ? (
                  <button
                    type="button"
                    className={styles.lineBtn}
                    disabled={createInvoice.isPending}
                    onClick={() => createInvoice.mutate()}
                    style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 7, minHeight: 36, padding: "0 13px", border: "1px solid #d71635", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 550 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 2h9l5 5v15H6zM14 2v6h6M9 13h7M9 17h5" />
                    </svg>
                    {tx("createInvoice")}
                  </button>
                ) : null}
              </>
            )}
          </div>

          <div style={{ ...card, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 650 }}>{tx("notes")}</h3>
            <textarea
              value={notes}
              disabled={!canWrite}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== (order.internalNotes ?? "") && patch.mutate({ internalNotes: notes })}
              placeholder={tx("notesPh")}
              rows={4}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, resize: "vertical", lineHeight: 1.5 }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function BackLink({ label, rtl, onClick }: { label: string; rtl: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 0", border: 0, background: "transparent", color: "#d71635", fontSize: 12, fontWeight: 600 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={rtl ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6"} />
      </svg>
      {label}
    </button>
  );
}
