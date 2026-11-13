"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import styles from "@/app/components/admin/orders/orders.module.css";
import { csvNumber, downloadCsv, listPrintHtml } from "@/app/components/admin/orders/print";
import type { OrderPage, OrderRow } from "@/app/components/admin/orders/types";
import { ORDER_STATUSES, SERVICE_TEXT, STATUS_DOT, STATUS_TEXT, dateTag, dayKey, money, type OrderStatus } from "@/lib/admin/format";
import { ADMIN_PATHS } from "@/lib/admin/nav";
import { defineText, useText } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { LOCALE_META } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { useSiteSettings } from "@/lib/site/useSiteSettings";

/**
 * Orders: every booking, newest first, as the admin prototype lists them —
 * status tabs with their counts, a search over name, email, phone, company
 * and reference, the table, and the two downloads (Excel and a printable
 * list). `?q=` (the header search) and `?status=` (the overview's links)
 * arrive pre-filled.
 */

const TEXT = defineText({
  title: { de: "Aufträge", en: "Orders", ar: "الطلبات", tr: "Siparişler" },
  sub: {
    de: "Jede Buchung von der Website, die neueste zuerst.",
    en: "Every booking placed on the site, newest first.",
    ar: "كل الحجوزات التي وصلت من الموقع، الأحدث أولاً.",
    tr: "Siteden gelen her rezervasyon, en yenisi önce.",
  },
  exportXls: { de: "Nach Excel exportieren", en: "Export to Excel", ar: "تصدير إلى Excel", tr: "Excel'e aktar" },
  pdf: { de: "PDF herunterladen", en: "Download PDF", ar: "تحميل PDF", tr: "PDF indir" },
  all: { de: "Alle", en: "All", ar: "الكل", tr: "Tümü" },
  search: {
    de: "Name, E-Mail, Telefon oder Auftragsnummer suchen",
    en: "Search name, email, phone or order number",
    ar: "ابحث بالاسم أو البريد أو الهاتف أو رقم الطلب",
    tr: "Ad, e-posta, telefon veya sipariş numarası ara",
  },
  col_customer: { de: "Kunde", en: "Customer", ar: "الزبون", tr: "Müşteri" },
  col_services: { de: "Leistungen", en: "Services", ar: "الخدمات", tr: "Hizmetler" },
  col_date: { de: "Einsatztermin", en: "Job date", ar: "موعد التنفيذ", tr: "İş tarihi" },
  col_team: { de: "Team", en: "Team", ar: "الفريق", tr: "Ekip" },
  col_total: { de: "Summe", en: "Total", ar: "المجموع", tr: "Toplam" },
  col_status: { de: "Status", en: "Status", ar: "الحالة", tr: "Durum" },
  col_order: { de: "Auftrag", en: "Order", ar: "الطلب", tr: "Sipariş" },
  placed: { de: "Eingegangen", en: "Placed", ar: "تاريخ الطلب", tr: "Oluşturuldu" },
  company: { de: "Firma", en: "Business", ar: "شركة", tr: "Firma" },
  email: { de: "E-Mail", en: "Email", ar: "البريد الإلكتروني", tr: "E-posta" },
  phone: { de: "Telefon", en: "Phone", ar: "الهاتف", tr: "Telefon" },
  vehicle: { de: "Fahrzeug", en: "Vehicle", ar: "السيارة", tr: "Araç" },
  subtotal: { de: "Zwischensumme", en: "Subtotal", ar: "المجموع الفرعي", tr: "Ara toplam" },
  discount: { de: "Rabatt", en: "Discount", ar: "الخصم", tr: "İndirim" },
  noOrders: { de: "Keine Aufträge passen zu diesen Filtern.", en: "No orders match these filters.", ar: "لا توجد طلبات مطابقة.", tr: "Bu filtrelere uyan sipariş yok." },
  quoteSent: { de: "Angebot gesendet", en: "Quote sent", ar: "أُرسل العرض", tr: "Teklif gönderildi" },
  noDate: { de: "Kein Termin", en: "No date", ar: "بدون موعد", tr: "Tarih yok" },
  unassigned: { de: "Nicht zugewiesen", en: "Not assigned", ar: "غير معيّن", tr: "Atanmadı" },
  toQuote: { de: "Zu bepreisen", en: "To quote", ar: "بانتظار التسعير", tr: "Fiyatlanacak" },
  loadMore: { de: "Weitere Aufträge laden", en: "Load more orders", ar: "تحميل المزيد من الطلبات", tr: "Daha fazla sipariş yükle" },
  popup: {
    de: "Erlauben Sie Pop-ups, um das PDF herunterzuladen.",
    en: "Allow pop-ups to download the PDF.",
    ar: "اسمح بالنوافذ المنبثقة لتحميل ملف PDF.",
    tr: "PDF'i indirmek için açılır pencerelere izin verin.",
  },
  loadFailed: { de: "Die Aufträge konnten nicht geladen werden.", en: "The orders could not be loaded.", ar: "تعذّر تحميل الطلبات.", tr: "Siparişler yüklenemedi." },
  exportFailed: { de: "Der Export ist fehlgeschlagen.", en: "The export failed.", ar: "فشل التصدير.", tr: "Dışa aktarma başarısız oldu." },
  printed: { de: "{n} Aufträge · Stand {d}", en: "{n} orders · as of {d}", ar: "{n} طلبات · حتى {d}", tr: "{n} sipariş · {d} itibarıyla" },
  searchFor: { de: "Suche: „{q}“", en: "Search: “{q}”", ar: "البحث: «{q}»", tr: "Arama: “{q}”" },
});

const PAGE = 100;
const DOWNLOAD = "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3";
const FILE = "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 18v-6M9 15l3 3 3-3";

/** The status pill colours of the orders table (radius 4, as the prototype draws them here). */
const PILL: Record<OrderStatus, { bg: string; fg: string }> = {
  quoted: { bg: "#fbf4e4", fg: "#5c4a00" },
  confirmed: { bg: "#edf5ed", fg: "#3f705a" },
  completed: { bg: "#f5f5f0", fg: "#252b28" },
  cancelled: { bg: "#fff6f6", fg: "#b7122b" },
};

/** `?status=` as the overview and older links write it. */
function statusFrom(value: string | null): OrderStatus | "all" {
  const map: Record<string, OrderStatus> = { new: "quoted", quoted: "quoted", confirmed: "confirmed", done: "completed", completed: "completed", cancelled: "cancelled" };
  return (value && map[value]) || "all";
}

export default function OrdersPage() {
  return (
    <AdminShell view="orders">
      <Suspense fallback={null}>
        <Orders />
      </Suspense>
    </AdminShell>
  );
}

function Orders() {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const sx = useText(SERVICE_TEXT);
  const st = useText(STATUS_TEXT);
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const site = useSiteSettings();
  const rtl = LOCALE_META[locale].dir === "rtl";
  const loc = dateTag(locale);

  const [status, setStatus] = useState<OrderStatus | "all">(() => statusFrom(params.get("status")));
  const [q, setQ] = useState(() => params.get("q") ?? "");
  const [search, setSearch] = useState(q.trim());
  const [exporting, setExporting] = useState(false);

  // What this page last wrote into the address, so its own updates are not
  // read back as new input while someone is still typing.
  const written = useRef(`${params.get("q") ?? ""}|${params.get("status") ?? ""}`);

  // The header search lands here with a new ?q= while the page is open.
  useEffect(() => {
    // Not while a row's page is opening: its address has no filters.
    if (pathname !== `/${locale}${ADMIN_PATHS.orders}`) return;
    const next = params.get("q") ?? "";
    const nextStatus = params.get("status") ?? "";
    if (`${next}|${nextStatus}` === written.current) return;
    written.current = `${next}|${nextStatus}`;
    setQ(next);
    setSearch(next.trim());
    setStatus(statusFrom(nextStatus));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(q.trim()), 250);
    return () => clearTimeout(timer);
  }, [q]);

  // The filters live in the address, so back and a shared link keep them.
  // Only a change of filter writes it: re-running on any other render (the
  // router object changes while a row's page is opening) would pull the
  // browser back to the list.
  const synced = useRef(`${search}|${status}`);
  useEffect(() => {
    const key = `${search}|${status}`;
    if (key === synced.current) return;
    synced.current = key;
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (status !== "all") query.set("status", status);
    written.current = `${search}|${status !== "all" ? status : ""}`;
    const list = `/${locale}${ADMIN_PATHS.orders}`;
    if (window.location.pathname !== list) return;
    const target = `${list}${query.size ? `?${query}` : ""}`;
    if (target !== `${window.location.pathname}${window.location.search}`) router.replace(target, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  const fetchPage = (cursor?: string) =>
    sdk.http.get<OrderPage>("/api/orders", {
      limit: PAGE,
      ...(status !== "all" ? { status } : {}),
      ...(search ? { search } : {}),
      ...(cursor ? { cursor } : {}),
    });

  const list = useInfiniteQuery({
    queryKey: ["admin", "orders", "list", status, search],
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval: 30_000,
  });

  const rows = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);
  const counts = list.data?.pages[0]?.counts;

  const serviceName = (key: string) => (key in SERVICE_TEXT ? sx(key as keyof typeof SERVICE_TEXT) : key);
  const jobDate = (o: OrderRow) => [o.scheduledDate, o.scheduledSecondDate].filter((d): d is string => !!d).sort()[0] ?? "";
  const shortDate = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "short" });
  const teamOf = (o: OrderRow) => [o.teamName, o.teamArea].filter(Boolean).join(" · ");
  const total = (o: OrderRow) => Number.parseFloat(o.totalGross) || 0;

  /** Every order behind the current filters, page by page, for the downloads. */
  const everything = async () => {
    const out: OrderRow[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 100; i += 1) {
      const page = await fetchPage(cursor);
      out.push(...page.items);
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    return out;
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const all = await everything();
      const head = [tx("col_order"), tx("placed"), tx("col_status"), tx("col_customer"), tx("company"), tx("email"), tx("phone"), tx("col_services"), tx("col_date"), tx("col_team"), tx("vehicle"), tx("subtotal"), tx("discount"), tx("col_total")];
      const body = all.map((o) => {
        const discount = Number.parseFloat(o.discountGross) || 0;
        return [
          o.reference,
          new Date(o.createdAt).toISOString().slice(0, 16).replace("T", " "),
          st(o.status),
          o.contactName,
          o.company ?? "",
          o.contactEmail,
          o.contactPhone,
          serviceName(o.serviceType),
          jobDate(o),
          teamOf(o),
          o.vehicleName ?? "",
          csvNumber(total(o) + discount),
          discount ? csvNumber(discount) : "",
          csvNumber(total(o)),
        ];
      });
      downloadCsv(`mon-orders-${dayKey(new Date())}.csv`, [head, ...body]);
    } catch {
      toast(tx("exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    // Opened before the data arrives: a window opened after an await counts
    // as a pop-up the browser may block.
    const win = window.open("", "_blank");
    if (!win) {
      toast(tx("popup"));
      return;
    }
    setExporting(true);
    try {
      const all = await everything();
      const html = listPrintHtml({
        dir: rtl ? "rtl" : "ltr",
        lang: locale,
        logo: new URL(site.logo, window.location.href).href,
        title: `${tx("title")}${status !== "all" ? ` · ${st(status)}` : ""}`,
        sub: [tx("printed", { n: all.length, d: new Date().toLocaleString(loc, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) }), search ? tx("searchFor", { q: search }) : ""].filter(Boolean).join(" · "),
        head: [tx("col_order"), tx("placed"), tx("col_customer"), tx("col_services"), tx("col_date"), tx("col_team"), tx("col_total"), tx("col_status")],
        numeric: [6],
        rows: all.map((o) => [
          o.reference,
          new Date(o.createdAt).toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" }),
          [o.contactName, o.company].filter(Boolean).join(" · "),
          serviceName(o.serviceType),
          jobDate(o) ? shortDate(jobDate(o)) : tx("noDate"),
          teamOf(o) || tx("unassigned"),
          total(o) > 0 ? money(total(o)) : tx("toQuote"),
          st(o.status),
        ]),
      });
      win.document.write(html);
      win.document.close();
    } catch {
      win.close();
      toast(tx("exportFailed"));
    } finally {
      setExporting(false);
    }
  };
  const tabs: (OrderStatus | "all")[] = ["all", ...ORDER_STATUSES];
  const outlined = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: 41,
    padding: "0 15px",
    border: "1px solid #d71635",
    borderRadius: 6,
    background: "#ffffff",
    color: "#252b28",
    fontSize: 12,
    fontWeight: 550,
  } as const;

  return (
    <section data-screen-label="Orders" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: rtl ? 0 : "-0.9px", lineHeight: 1.2 }}>{tx("title")}</h1>
          <p style={{ color: "#737870", fontSize: 13, marginTop: 6 }}>{tx("sub")}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className={styles.lineBtn} style={outlined} disabled={exporting} onClick={() => void exportPdf()}>
            <Icon d={FILE} />
            {tx("pdf")}
          </button>
          <button type="button" className={styles.lineBtn} style={outlined} disabled={exporting} onClick={() => void exportExcel()}>
            <Icon d={DOWNLOAD} />
            {tx("exportXls")}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tabs.map((id) => {
            const on = status === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => setStatus(id)}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 36, padding: "0 12px", border: `1px solid ${on ? "#d71635" : "#e3e5de"}`, borderRadius: 6, background: "#ffffff", color: on ? "#252b28" : "#737870", fontSize: 12, fontWeight: on ? 650 : 500 }}
              >
                <i style={{ display: "block", width: 6, height: 6, borderRadius: "50%", background: id === "all" ? "#d6d9d1" : STATUS_DOT[id] }} />
                {id === "all" ? tx("all") : st(id)}
                <span style={{ fontSize: 11, color: "#92958e", fontVariantNumeric: "tabular-nums" }}>{counts ? counts[id] : ""}</span>
              </button>
            );
          })}
        </div>
        <label style={{ flex: "1 1 260px", display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#737870" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tx("search")}
            aria-label={tx("search")}
            type="search"
            style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", fontSize: 13, boxShadow: "none" }}
          />
        </label>
      </div>

      {list.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}

      <div style={{ background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, overflow: "hidden", boxShadow: "0 12px 36px #202a2308" }}>
        <div className={styles.wideOnly} style={{ gap: 20, padding: "11px 20px", background: "#fafaf7", borderBottom: "1px solid #e3e5de", fontSize: 10.5, fontWeight: 650, letterSpacing: rtl ? 0 : "1.5px", color: "#737870" }}>
          <span style={{ flex: "1 1 220px" }}>{tx("col_customer")}</span>
          <span style={{ flex: "1 1 150px" }}>{tx("col_services")}</span>
          <span style={{ flex: "0 0 118px" }}>{tx("col_date")}</span>
          <span style={{ flex: "0 0 132px" }}>{tx("col_team")}</span>
          <span style={{ flex: "0 0 98px", textAlign: "end" }}>{tx("col_total")}</span>
          <span style={{ flex: "0 0 104px" }}>{tx("col_status")}</span>
        </div>

        {list.isLoading
          ? Array.from({ length: 6 }, (_, i) => (
              <div key={i} style={{ padding: "15px 20px", borderBottom: "1px solid #eef0ea" }}>
                <div className="a-skel" style={{ height: 36 }} />
              </div>
            ))
          : null}

        {rows.map((o) => {
          const pill = PILL[o.status];
          const day = jobDate(o);
          const team = teamOf(o);
          return (
            <button
              key={o.id}
              type="button"
              className={styles.row}
              onClick={() => router.push(`/${locale}${ADMIN_PATHS.orders}/${o.id}`)}
              style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 20px", width: "100%", padding: "15px 20px", border: 0, borderBottom: "1px solid #eef0ea", background: "#ffffff", textAlign: "start", color: "#252b28" }}
            >
              <span style={{ flex: "1 1 220px", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <b style={{ fontSize: 13.5, fontWeight: 600, textDecoration: o.status === "cancelled" ? "line-through" : "none" }}>{o.contactName || "—"}</b>
                <small style={{ fontSize: 11.5, color: "#737870" }}>
                  <bdi dir="ltr">{o.reference}</bdi>
                  {o.company ? ` · ${o.company}` : ""}
                  {o.quoteSentAt ? ` · ${tx("quoteSent")}` : ""}
                </small>
              </span>
              <span style={{ flex: "1 1 150px", display: "flex", flexWrap: "wrap", gap: 4 }}>
                <span style={{ padding: "3px 7px", borderRadius: 4, background: "#f5f5f0", fontSize: 11, fontWeight: 550 }}>{serviceName(o.serviceType)}</span>
              </span>
              <span style={{ flex: "0 0 118px", fontSize: 12.5 }}>{day ? shortDate(day) : tx("noDate")}</span>
              <span style={{ flex: "0 0 132px", fontSize: 12.5, color: team ? "#252b28" : "#92958e" }}>{team || tx("unassigned")}</span>
              <span style={{ flex: "0 0 98px", textAlign: "end", fontSize: 13.5, fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>
                <span dir="ltr">{total(o) > 0 ? money(total(o)) : tx("toQuote")}</span>
              </span>
              <span style={{ flex: "0 0 104px", display: "flex" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 9px", borderRadius: 4, background: pill.bg, color: pill.fg, fontSize: 11, fontWeight: 650, whiteSpace: "nowrap" }}>
                  <i style={{ display: "block", width: 6, height: 6, borderRadius: "50%", background: STATUS_DOT[o.status] }} />
                  {st(o.status)}
                </span>
              </span>
            </button>
          );
        })}

        {list.hasNextPage ? (
          <button
            type="button"
            className={styles.loadMore}
            disabled={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
            style={{ display: "block", width: "100%", padding: "14px 20px", border: 0, background: "#ffffff", color: "#737870", fontSize: 12.5, fontWeight: 600 }}
          >
            {tx("loadMore")}
          </button>
        ) : null}

        {!list.isLoading && rows.length === 0 ? <p style={{ padding: "44px 20px", textAlign: "center", color: "#737870", fontSize: 13 }}>{tx("noOrders")}</p> : null}
      </div>
    </section>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
