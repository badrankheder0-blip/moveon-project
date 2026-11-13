"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AdminShell } from "@/app/components/admin/AdminShell";
import {
  SERVICE_COLOURS,
  SERVICE_TEXT,
  STATUS_DOT,
  STATUS_TEXT,
  ORDER_STATUSES,
  cityOf,
  dateTag,
  dayKey,
  money,
  moneyShort,
  type OrderStatus,
} from "@/lib/admin/format";
import { ADMIN_PATHS } from "@/lib/admin/nav";
import { defineText, useText } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { LOCALE_META } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Overview: how the business is doing today and what needs attention, as
 * the admin prototype's start page shows it — KPI cards with sparklines, the
 * performance chart, the service mix and the order pipeline, the next seven
 * days, the latest bookings, top areas, busiest days and team workload.
 *
 * Every figure is computed here from the orders `/api/admin/overview`
 * returns, with the prototype's own formulas.
 */

const TEXT = defineText({
  gm: { de: "Guten Morgen.", en: "Good morning.", ar: "صباح الخير.", tr: "Günaydın." },
  ga: { de: "Guten Tag.", en: "Good afternoon.", ar: "مساء الخير.", tr: "İyi günler." },
  ge: { de: "Guten Abend.", en: "Good evening.", ar: "مساء الخير.", tr: "İyi akşamlar." },
  ovSub: { de: "So läuft Ihr Geschäft.", en: "Here’s how your business is doing.", ar: "هذه نظرة سريعة على أداء عملك.", tr: "İşletmeniz şöyle gidiyor." },
  per_7d: { de: "7 Tage", en: "7 days", ar: "7 أيام", tr: "7 gün" },
  per_30d: { de: "30 Tage", en: "30 days", ar: "30 يوماً", tr: "30 gün" },
  per_90d: { de: "90 Tage", en: "90 days", ar: "90 يوماً", tr: "90 gün" },
  per_12m: { de: "12 Monate", en: "12 months", ar: "12 شهراً", tr: "12 ay" },
  k_rev: { de: "Gebuchter Umsatz", en: "Booked revenue", ar: "قيمة الحجوزات", tr: "Rezerve ciro" },
  k_orders: { de: "Aufträge", en: "Orders", ar: "الطلبات", tr: "Siparişler" },
  k_aov: { de: "Durchschnittlicher Auftrag", en: "Average order", ar: "متوسط الطلب", tr: "Ortalama sipariş" },
  k_conv: { de: "Bestätigungsquote", en: "Confirmed rate", ar: "نسبة التأكيد", tr: "Onay oranı" },
  vsPrev: { de: "ggü. dem Vorzeitraum", en: "vs the previous period", ar: "مقارنة بالفترة السابقة", tr: "önceki döneme göre" },
  // The change badge when the previous period had nothing to compare with.
  dNew: { de: "Neu", en: "New", ar: "جديد", tr: "Yeni" },
  cancelledN: { de: "{n} storniert", en: "{n} cancelled", ar: "{n} ملغاة", tr: "{n} iptal" },
  pricedN: { de: "Aus {n} bepreisten Aufträgen", en: "Across {n} priced orders", ar: "من {n} طلبات مسعّرة", tr: "{n} fiyatlı siparişten" },
  convSub: { de: "Bestätigt oder erledigt", en: "Confirmed or completed", ar: "مؤكدة أو منفّذة", tr: "Onaylı veya tamamlanmış" },
  perfTitle: { de: "Entwicklung", en: "Performance", ar: "الأداء", tr: "Performans" },
  m_rev: { de: "Umsatz", en: "Revenue", ar: "الإيرادات", tr: "Ciro" },
  m_cnt: { de: "Aufträge", en: "Orders", ar: "الطلبات", tr: "Siparişler" },
  ordersShort: { de: "Aufträge", en: "orders", ar: "طلبات", tr: "sipariş" },
  mixTitle: { de: "Leistungsmix", en: "Service mix", ar: "توزيع الخدمات", tr: "Hizmet dağılımı" },
  mixSub: { de: "Anteil am gebuchten Umsatz", en: "Share of booked revenue", ar: "حصة كل خدمة من قيمة الحجوزات", tr: "Rezerve cirodaki pay" },
  revenueShort: { de: "gebucht", en: "booked", ar: "محجوز", tr: "rezerve" },
  pipeTitle: { de: "Auftragsstatus", en: "Order pipeline", ar: "مسار الطلبات", tr: "Sipariş akışı" },
  upTitle: { de: "Nächste 7 Tage", en: "Next 7 days", ar: "الأيام السبعة القادمة", tr: "Önümüzdeki 7 gün" },
  viewCal: { de: "Kalender öffnen", en: "Open calendar", ar: "فتح التقويم", tr: "Takvimi aç" },
  upEmpty: { de: "Keine Einsätze in den nächsten 7 Tagen.", en: "No jobs in the next 7 days.", ar: "لا توجد مواعيد في الأيام السبعة القادمة.", tr: "Önümüzdeki 7 günde iş yok." },
  moreJobs: { de: "+{n} weitere diese Woche", en: "+{n} more this week", ar: "+{n} أخرى هذا الأسبوع", tr: "Bu hafta +{n} iş daha" },
  recentTitle: { de: "Neueste Buchungen", en: "Latest bookings", ar: "آخر الحجوزات", tr: "Son rezervasyonlar" },
  viewAll: { de: "Alle ansehen", en: "View all", ar: "عرض الكل", tr: "Tümünü gör" },
  toQuote: { de: "Zu bepreisen", en: "To quote", ar: "بانتظار التسعير", tr: "Fiyatlanacak" },
  justNow: { de: "Gerade eben", en: "Just now", ar: "الآن", tr: "Az önce" },
  ago_m: { de: "vor {n} Min.", en: "{n} min ago", ar: "قبل {n} د", tr: "{n} dk önce" },
  ago_h: { de: "vor {n} Std.", en: "{n} h ago", ar: "قبل {n} س", tr: "{n} sa önce" },
  ago_d: { de: "vor {n} T.", en: "{n} d ago", ar: "قبل {n} يوم", tr: "{n} gün önce" },
  areasTitle: { de: "Top-Gebiete", en: "Top areas", ar: "أكثر المناطق طلباً", tr: "En çok bölgeler" },
  daysTitle: { de: "Stärkste Tage", en: "Busiest days", ar: "أكثر الأيام انشغالاً", tr: "En yoğun günler" },
  teamsTitle: { de: "Team-Auslastung", en: "Team workload", ar: "ضغط العمل على الفرق", tr: "Ekip iş yükü" },
  teamsSub: { de: "Einsätze in den nächsten 14 Tagen", en: "Jobs in the next 14 days", ar: "المواعيد خلال الأيام الـ14 القادمة", tr: "Önümüzdeki 14 gündeki işler" },
  jobsN: { de: "{n} Einsätze", en: "{n} jobs", ar: "{n} مواعيد", tr: "{n} iş" },
  unassigned: { de: "Nicht zugewiesen", en: "Not assigned", ar: "غير معيّن", tr: "Atanmadı" },
  noData: { de: "Noch keine Buchungen in diesem Zeitraum.", en: "No bookings in this period yet.", ar: "لا توجد حجوزات في هذه الفترة بعد.", tr: "Bu dönemde henüz rezervasyon yok." },
  attnNew: { de: "{n} neue Aufträge zu prüfen", en: "{n} new orders to review", ar: "{n} طلبات جديدة بانتظار المراجعة", tr: "İncelenecek {n} yeni sipariş" },
  attnTeam: { de: "{n} Einsätze diese Woche ohne Team", en: "{n} jobs this week without a team", ar: "{n} مواعيد هذا الأسبوع بدون فريق", tr: "Bu hafta ekipsiz {n} iş" },
  attnRq: { de: "{n} Terminänderungen warten", en: "{n} date change requests waiting", ar: "{n} طلبات تغيير موعد بانتظار الرد", tr: "Bekleyen {n} tarih değişikliği talebi" },
  loadFailed: { de: "Die Übersicht konnte nicht geladen werden.", en: "The overview could not be loaded.", ar: "تعذّر تحميل النظرة العامة.", tr: "Genel bakış yüklenemedi." },
});

interface OverviewOrder {
  id: string;
  reference: string;
  status: OrderStatus;
  serviceType: string;
  totalGross: string;
  contactName: string;
  originAddress: string;
  destinationAddress: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  scheduledSecondDate: string | null;
  teamId: string | null;
  createdAt: string;
}

interface Overview {
  orders: OverviewOrder[];
  teams: { id: string; name: string; area: string | null }[];
  dateRequests: { count: number; firstOrderId: string | null };
}

type Period = "7d" | "30d" | "90d" | "12m";
const PERIOD_DAYS: Record<Period, number> = { "7d": 7, "30d": 30, "90d": 91, "12m": 366 };
const DAY = 864e5;
const UP = "M7 17 17 7M9 7h8v8";
const DOWN = "M7 7l10 10M17 9v8H9";

export default function OverviewPage() {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const sx = useText(SERVICE_TEXT);
  const st = useText(STATUS_TEXT);
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("30d");
  const [metric, setMetric] = useState<"rev" | "cnt">("rev");
  const [hover, setHover] = useState<number | null>(null);

  const rtl = LOCALE_META[locale].dir === "rtl";
  const loc = dateTag(locale);
  const next = rtl ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6";
  const href = (path: string) => `/${locale}${path}`;
  const openOrder = (id: string) => router.push(href(`${ADMIN_PATHS.orders}/${id}`));

  const data = useQuery({
    queryKey: ["admin", "overview", period],
    queryFn: () => sdk.http.get<Overview>(`/api/admin/overview?days=${PERIOD_DAYS[period]}`),
    refetchInterval: 30_000,
  });
  const counts = useQuery({
    queryKey: ["admin", "counts"],
    queryFn: () => sdk.http.get<{ newOrders: number; unreadInbox: number }>("/api/admin/counts"),
    refetchInterval: 30_000,
  });

  const view = useMemo(() => {
    const orders = (data.data?.orders ?? []).map((o) => ({ ...o, total: Number.parseFloat(o.totalGross) || 0, created: new Date(o.createdAt).getTime() }));
    const now = new Date();
    const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // The chart's buckets: days, weeks or months, as the prototype cuts them.
    const buckets: { a: Date; b: Date; label: string; full: string }[] = [];
    if (period === "12m") {
      for (let i = 11; i >= 0; i -= 1) {
        const a = new Date(t0.getFullYear(), t0.getMonth() - i, 1);
        const b = new Date(t0.getFullYear(), t0.getMonth() - i + 1, 1);
        buckets.push({ a, b, label: a.toLocaleDateString(loc, { month: "short" }), full: a.toLocaleDateString(loc, { month: "long", year: "numeric" }) });
      }
    } else if (period === "90d") {
      for (let i = 12; i >= 0; i -= 1) {
        const b = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() + 1 - i * 7);
        const a = new Date(b.getFullYear(), b.getMonth(), b.getDate() - 7);
        const last = new Date(b.getFullYear(), b.getMonth(), b.getDate() - 1);
        buckets.push({
          a,
          b,
          label: a.toLocaleDateString(loc, { day: "numeric", month: "short" }),
          full: `${a.toLocaleDateString(loc, { day: "numeric", month: "short" })} – ${last.toLocaleDateString(loc, { day: "numeric", month: "short" })}`,
        });
      }
    } else {
      const n = period === "7d" ? 7 : 30;
      for (let i = n - 1; i >= 0; i -= 1) {
        const a = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() - i);
        const b = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() - i + 1);
        buckets.push({ a, b, label: n === 7 ? a.toLocaleDateString(loc, { weekday: "short" }) : String(a.getDate()), full: a.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" }) });
      }
    }

    const pA = +buckets[0]!.a;
    const pB = +buckets[buckets.length - 1]!.b;
    const span = pB - pA;
    type O = (typeof orders)[number];
    const inRange = (o: O, a: number, b: number) => o.created >= a && o.created < b;
    const cur = orders.filter((o) => inRange(o, pA, pB));
    const prev = orders.filter((o) => inRange(o, pA - span, pA));
    const live = (list: O[]) => list.filter((o) => o.status !== "cancelled");
    const rev = (list: O[]) => live(list).reduce((sum, o) => sum + o.total, 0);
    const priced = (list: O[]) => live(list).filter((o) => o.total > 0);
    const aov = (list: O[]) => (priced(list).length ? rev(list) / priced(list).length : 0);
    const conv = (list: O[]) => {
      const decided = list.filter((o) => o.status !== "quoted");
      return decided.length ? list.filter((o) => o.status === "confirmed" || o.status === "completed").length / decided.length : 0;
    };
    const delta = (c: number, p: number) => (p ? ((c - p) / p) * 100 : null);
    const series = (f: (list: O[]) => number) => buckets.map((b) => f(orders.filter((o) => inRange(o, +b.a, +b.b))));
    const spark = (values: number[]) => {
      const max = Math.max(...values, 0) || 1;
      return values.map((v, i) => `${(values.length === 1 ? 50 : (i / (values.length - 1)) * 100).toFixed(2)},${(27 - (v / max) * 22).toFixed(2)}`).join(" ");
    };
    const pct = (d: number | null) => (d == null ? "" : `${d >= 0 ? "+" : "−"}${Math.abs(Math.round(d))}%`);

    const kpi = (label: string, value: string, d: number | null, sub: string, values: number[], hero: boolean, now = 1) => ({
      fresh: d == null && now > 0,
      label, value, sub, hero, d, delta: pct(d), up: d == null || d >= 0, spark: spark(values),
    });
    const kpis = [
      kpi(tx("k_rev"), money(rev(cur)), delta(rev(cur), rev(prev)), tx("vsPrev"), series(rev), true, rev(cur)),
      kpi(tx("k_orders"), String(cur.length), delta(cur.length, prev.length), tx("cancelledN", { n: cur.filter((o) => o.status === "cancelled").length }), series((l) => l.length), false, cur.length),
      kpi(tx("k_aov"), money(aov(cur)), delta(aov(cur), aov(prev)), tx("pricedN", { n: priced(cur).length }), series(aov), false, aov(cur)),
      kpi(tx("k_conv"), `${Math.round(conv(cur) * 100)}%`, delta(conv(cur), conv(prev)), tx("convSub"), series(conv), false, conv(cur)),
    ];

    const counting = metric === "cnt";
    const values = counting ? series((l) => l.length) : series(rev);
    const top = Math.max(...values, 0);
    const niceMax = (() => {
      const v = top || (counting ? 4 : 400);
      const power = Math.pow(10, Math.floor(Math.log10(v)));
      for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * power) return m * power;
      return 10 * power;
    })();
    const labelStep = Math.ceil(buckets.length / 8);
    const bars = buckets.map((b, i) => ({
      value: values[i] ?? 0,
      h: `${(((values[i] ?? 0) / niceMax) * 100).toFixed(2)}%`,
      label: i % labelStep === 0 || i === buckets.length - 1 ? b.label : "",
      tip: counting ? `${values[i]} ${tx("ordersShort")}` : money(values[i] ?? 0),
      full: b.full,
    }));
    const ticks = [1, 0.5, 0].map((f) => ({ label: counting ? String(Math.round(niceMax * f)) : moneyShort(niceMax * f), top: `${(1 - f) * 100}%` }));
    const perfDelta = counting ? delta(cur.length, prev.length) : delta(rev(cur), rev(prev));

    // Service mix: share of booked revenue per service.
    const mixMap: Record<string, number> = {};
    live(cur).forEach((o) => {
      if (o.total > 0) mixMap[o.serviceType] = (mixMap[o.serviceType] ?? 0) + o.total;
    });
    const mixSum = Object.values(mixMap).reduce((a, b) => a + b, 0);
    const circ = 2 * Math.PI * 52;
    let acc = 0;
    const mix = Object.entries(mixMap)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => {
        const len = mixSum ? (value / mixSum) * circ : 0;
        const row = { key, value, pct: `${Math.round((value / mixSum) * 100)}%`, colour: SERVICE_COLOURS[key] ?? "#92958e", dash: `${Math.max(len - 1.5, 0.01).toFixed(2)} ${circ.toFixed(2)}`, off: (-acc).toFixed(2) };
        acc += len;
        return row;
      });

    const pipeN = cur.length || 1;
    const pipe = ORDER_STATUSES.map((status) => {
      const n = cur.filter((o) => o.status === status).length;
      return { status, n, w: `${((n / pipeN) * 100).toFixed(2)}%` };
    });

    // Jobs: every scheduled day of every live order.
    const k0 = dayKey(t0);
    const k7 = dayKey(new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() + 6));
    const k14 = dayKey(new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() + 13));
    const jobs: { o: O; date: string; time: string }[] = [];
    orders.forEach((o) => {
      if (o.status === "cancelled") return;
      if (o.scheduledDate) jobs.push({ o, date: o.scheduledDate, time: o.scheduledTime?.slice(0, 5) ?? "" });
      if (o.scheduledSecondDate) jobs.push({ o, date: o.scheduledSecondDate, time: "" });
    });
    const week = jobs.filter((j) => j.date >= k0 && j.date <= k7).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const teamName = (id: string | null) => {
      const team = data.data?.teams.find((t) => t.id === id);
      return team ? [team.name, team.area].filter(Boolean).join(" · ") : "";
    };

    const sorted = [...orders].sort((a, b) => b.created - a.created);
    const cityCount: Record<string, number> = {};
    live(cur).forEach((o) => {
      const city = cityOf(o.originAddress);
      if (city) cityCount[city] = (cityCount[city] ?? 0) + 1;
    });
    const cities = Object.entries(cityCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const cityMax = cities[0]?.[1] ?? 1;

    const weekdayCount = [0, 0, 0, 0, 0, 0, 0];
    jobs.forEach((j) => {
      weekdayCount[(new Date(`${j.date}T00:00:00`).getDay() + 6) % 7]! += 1;
    });
    const weekdayMax = Math.max(...weekdayCount, 1);
    const monday = new Date(2024, 0, 1);
    const weekBars = weekdayCount.map((n, i) => ({
      n,
      label: new Date(monday.getTime() + i * DAY).toLocaleDateString(loc, { weekday: "short" }),
      h: `${((n / weekdayMax) * 100).toFixed(1)}%`,
      op: n === weekdayMax ? "1" : "0.28",
    }));

    const soon = jobs.filter((j) => j.date >= k0 && j.date <= k14);
    const teamRows = (data.data?.teams ?? [])
      .map((t) => ({ label: [t.name, t.area].filter(Boolean).join(" · "), n: soon.filter((j) => j.o.teamId === t.id).length, warn: false }))
      .concat([{ label: tx("unassigned"), n: soon.filter((j) => !j.o.teamId).length, warn: true }]);
    const teamMax = Math.max(...teamRows.map((r) => r.n), 1);

    return {
      kpis, bars, ticks, perfDelta, perfTotal: counting ? String(cur.length) : money(rev(cur)), pct,
      mix, mixSum, pipe, week, teamName, recent: sorted.slice(0, 6), cities, cityMax, weekBars,
      teamRows, teamMax, unassignedWeek: week.filter((j) => !j.o.teamId).length, k0, barGap: buckets.length > 14 ? "4px" : "10px",
    };
  }, [data.data, period, metric, loc, tx]);

  const ago = (iso: string) => {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (minutes < 1) return tx("justNow");
    if (minutes < 60) return tx("ago_m", { n: minutes });
    if (minutes < 1440) return tx("ago_h", { n: Math.round(minutes / 60) });
    return tx("ago_d", { n: Math.round(minutes / 1440) });
  };

  const now = new Date();
  const hour = now.getHours();
  const newCount = counts.data?.newOrders ?? 0;
  const requests = data.data?.dateRequests;
  const attention = [
    requests?.count && requests.firstOrderId ? { key: "rq", label: tx("attnRq", { n: requests.count }), dot: "#ffcb08", go: () => openOrder(requests.firstOrderId!) } : null,
    newCount ? { key: "new", label: tx("attnNew", { n: newCount }), dot: "#ffcb08", go: () => router.push(`${href(ADMIN_PATHS.orders)}?status=quoted`) } : null,
    view.unassignedWeek ? { key: "team", label: tx("attnTeam", { n: view.unassignedWeek }), dot: "#d71635", go: () => router.push(href(ADMIN_PATHS.calendar)) } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <AdminShell view="overview">
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="a-page-head" style={{ paddingBottom: 8 }}>
          <div style={{ minWidth: 0 }}>
            <span className="a-eyebrow" style={{ textTransform: "none" }}>
              <i />
              {now.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
            <h1 style={{ fontSize: "clamp(32px, 4vw, 46px)", fontWeight: 600, letterSpacing: rtl ? 0 : "-2px", lineHeight: 1.1, marginTop: 12 }}>
              {hour < 12 ? tx("gm") : hour < 18 ? tx("ga") : tx("ge")}
              <span style={{ display: "block", color: "#a3a69e" }}>{tx("ovSub")}</span>
            </h1>
          </div>
          <div className="a-seg">
            {(["7d", "30d", "90d", "12m"] as Period[]).map((p) => (
              <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}>
                {tx(`per_${p}`)}
              </button>
            ))}
          </div>
        </div>

        {data.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}

        {attention.length ? (
          <div className="a-attn">
            {attention.map((item) => (
              <button key={item.key} type="button" onClick={item.go}>
                <i style={{ background: item.dot }} />
                {item.label}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d71635" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={next} />
                </svg>
              </button>
            ))}
          </div>
        ) : null}

        <div className="a-kpis">
          {view.kpis.map((k) => (
            <div key={k.label} className={`a-kpi${k.hero ? " is-red" : ""}`}>
              <div className="a-kpi-top">
                <span>{k.label}</span>
                {k.d != null ? (
                  <span className={`a-delta ${k.up ? "is-up" : "is-down"}`}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={k.up ? UP : DOWN} />
                    </svg>
                    <span dir="ltr">{k.delta}</span>
                  </span>
                ) : (
                  // Nothing in the previous period to compare with: "New" when
                  // there is something now, a dash when there is nothing at all.
                  <span className="a-delta is-flat">{k.fresh ? tx("dNew") : "—"}</span>
                )}
              </div>
              <b>
                <span dir="ltr">{k.value}</span>
              </b>
              <small>{k.sub}</small>
              <svg className="a-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
                <polygon points={`${k.spark} 100,30 0,30`} fill={k.hero ? "rgba(255,255,255,.14)" : "rgba(215,22,53,.07)"} />
                <polyline points={k.spark} fill="none" stroke={k.hero ? "#ffcb08" : "#d71635"} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            </div>
          ))}
        </div>

        <div className="a-grid a-ov-main">
          <div className="a-card" style={{ padding: "20px 22px 16px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <span className="a-card-label">{tx("perfTitle")}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                  <b className="a-num" style={{ fontSize: 26, fontWeight: 650, letterSpacing: "-1px" }}>
                    <span dir="ltr">{view.perfTotal}</span>
                  </b>
                  {view.perfDelta != null ? (
                    <span className={`a-delta ${view.perfDelta < 0 ? "is-down" : "is-up"}`} style={{ padding: "3px 8px" }}>
                      <span dir="ltr">{view.pct(view.perfDelta)}</span>
                    </span>
                  ) : (
                    <span className="a-delta is-flat" style={{ padding: "3px 8px" }}>
                      {view.perfTotal && !/^(0|€0[.,]00)$/.test(view.perfTotal) ? tx("dNew") : "—"}
                    </span>
                  )}
                </div>
              </div>
              <div className="a-seg is-sm" style={{ background: "transparent" }}>
                {(["rev", "cnt"] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={metric === m} onClick={() => setMetric(m)}>
                    {tx(m === "rev" ? "m_rev" : "m_cnt")}
                  </button>
                ))}
              </div>
            </div>
            <div dir="ltr" style={{ position: "relative", height: 220, marginTop: 24, marginLeft: 48 }}>
              {view.ticks.map((tick) => (
                <div key={tick.top} style={{ position: "absolute", left: 0, right: 0, top: tick.top, borderTop: "1px dashed #e3e5de" }}>
                  <span className="a-num" style={{ position: "absolute", right: "100%", top: -8, paddingRight: 8, fontSize: 10.5, color: "#92958e", whiteSpace: "nowrap" }}>
                    {tick.label}
                  </span>
                </div>
              ))}
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: view.barGap }}>
                {view.bars.map((bar, i) => (
                  <div
                    key={i}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    style={{ position: "relative", flex: 1, minWidth: 0, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
                  >
                    <div
                      style={{
                        width: "100%",
                        maxWidth: 34,
                        height: bar.h,
                        minHeight: bar.value > 0 ? 3 : 0,
                        background: hover === i ? "#b7122b" : "#d71635",
                        opacity: hover == null || hover === i ? 1 : 0.4,
                        borderRadius: "4px 4px 1px 1px",
                        transition: "opacity .15s, background .15s",
                      }}
                    />
                    {hover === i ? (
                      <div style={{ position: "absolute", bottom: `calc(${bar.h} + 10px)`, left: "50%", transform: "translateX(-50%)", zIndex: 5, padding: "7px 10px", borderRadius: 7, background: "#252b28", color: "#ffffff", whiteSpace: "nowrap", boxShadow: "0 8px 24px #00000030", pointerEvents: "none", textAlign: "center" }}>
                        <b style={{ display: "block", fontSize: 13, fontWeight: 650 }}>{bar.tip}</b>
                        <small style={{ fontSize: 10.5, color: "#d6d9d1" }}>{bar.full}</small>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            <div dir="ltr" style={{ display: "flex", gap: view.barGap, marginLeft: 48, marginTop: 8 }}>
              {view.bars.map((bar, i) => (
                <span key={i} style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: 10.5, color: "#92958e", whiteSpace: "nowrap" }}>
                  {bar.label}
                </span>
              ))}
            </div>
          </div>

          <div className="a-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <span className="a-card-label">{tx("mixTitle")}</span>
              <p className="a-card-sub">{tx("mixSub")}</p>
            </div>
            {view.mix.length ? (
              <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                <div style={{ position: "relative", width: 146, height: 146, flex: "none" }}>
                  <svg viewBox="0 0 120 120" width="100%" height="100%" style={{ display: "block", transform: "rotate(-90deg)" }} aria-hidden="true">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f1ea" strokeWidth="14" />
                    {view.mix.map((m) => (
                      <circle key={m.key} cx="60" cy="60" r="52" fill="none" stroke={m.colour} strokeWidth="14" strokeDasharray={m.dash} strokeDashoffset={m.off} />
                    ))}
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
                    <span>
                      <b style={{ display: "block", fontSize: 19, fontWeight: 650, letterSpacing: "-.6px" }}>
                        <span dir="ltr">{moneyShort(view.mixSum)}</span>
                      </b>
                      <small style={{ fontSize: 10.5, color: "#737870" }}>{tx("revenueShort")}</small>
                    </span>
                  </div>
                </div>
                <div style={{ flex: "1 1 130px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {view.mix.map((m) => (
                    <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5 }}>
                      <i style={{ display: "block", width: 10, height: 10, borderRadius: 3, background: m.colour, flex: "none" }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        {m.key in SERVICE_TEXT ? sx(m.key as keyof typeof SERVICE_TEXT) : m.key}
                        <small style={{ display: "block", fontSize: 11, color: "#92958e" }}>
                          <span dir="ltr">{money(m.value)}</span>
                        </small>
                      </span>
                      <b className="a-num" style={{ fontWeight: 650 }}>
                        {m.pct}
                      </b>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: "#737870" }}>{tx("noData")}</p>
            )}
            <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid #eef0ea", display: "flex", flexDirection: "column", gap: 10 }}>
              <span className="a-card-label">{tx("pipeTitle")}</span>
              <div dir="ltr" style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", background: "#f1f1ea" }}>
                {view.pipe.map((p) => (
                  <div key={p.status} style={{ width: p.w, height: "100%", background: STATUS_DOT[p.status], boxShadow: "inset -2px 0 0 #ffffff" }} />
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                {view.pipe.map((p) => (
                  <span key={p.status} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                    <i style={{ display: "block", width: 7, height: 7, borderRadius: "50%", background: STATUS_DOT[p.status], flex: "none" }} />
                    <span style={{ flex: 1 }}>{st(p.status)}</span>
                    <b className="a-num" style={{ fontWeight: 650 }}>
                      {p.n}
                    </b>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="a-grid a-ov-split">
          <div className="a-card is-tight">
            <div className="a-card-head">
              <h2>{tx("upTitle")}</h2>
              <button type="button" className="a-link-btn" onClick={() => router.push(href(ADMIN_PATHS.calendar))}>
                {tx("viewCal")}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={next} />
                </svg>
              </button>
            </div>
            {view.week.slice(0, 6).map((job, i) => {
              const day = new Date(`${job.date}T00:00:00`);
              const today = job.date === view.k0;
              const team = view.teamName(job.o.teamId);
              return (
                <button key={`${job.o.id}-${job.date}-${i}`} type="button" className="a-row-btn" style={{ gap: 14, padding: "11px 2px" }} onClick={() => openOrder(job.o.id)}>
                  <span style={{ width: 46, height: 50, borderRadius: 8, background: today ? "#d71635" : "#f5f5f0", color: today ? "#ffffff" : "#252b28", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: "none" }}>
                    <small style={{ fontSize: 10, fontWeight: 600, opacity: 0.85 }}>{day.toLocaleDateString(loc, { weekday: "short" })}</small>
                    <b style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>{day.getDate()}</b>
                  </span>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      <i style={{ display: "block", width: 8, height: 8, borderRadius: 2, background: SERVICE_COLOURS[job.o.serviceType] ?? "#92958e", flex: "none" }} />
                      <b style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {job.o.serviceType in SERVICE_TEXT ? sx(job.o.serviceType as keyof typeof SERVICE_TEXT) : job.o.serviceType} · {job.o.contactName}
                      </b>
                    </span>
                    <small style={{ fontSize: 11.5, color: "#737870" }}>{job.time || day.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" })}</small>
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: team ? "#737870" : "#b7122b", whiteSpace: "nowrap" }}>{team || tx("unassigned")}</span>
                </button>
              );
            })}
            {view.week.length > 6 ? <p style={{ padding: "10px 2px 6px", borderTop: "1px solid #eef0ea", fontSize: 12, color: "#737870" }}>{tx("moreJobs", { n: view.week.length - 6 })}</p> : null}
            {view.week.length === 0 ? <p className="a-empty">{tx("upEmpty")}</p> : null}
          </div>

          <div className="a-card is-tight">
            <div className="a-card-head">
              <h2>{tx("recentTitle")}</h2>
              <button type="button" className="a-link-btn" onClick={() => router.push(href(ADMIN_PATHS.orders))}>
                {tx("viewAll")}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={next} />
                </svg>
              </button>
            </div>
            {view.recent.map((o) => (
              <button key={o.id} type="button" className="a-row-btn" onClick={() => openOrder(o.id)}>
                <span style={{ position: "relative", width: 34, height: 34, borderRadius: "50%", background: "#fff6f6", color: "#d71635", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, flex: "none" }}>
                  {o.contactName.trim().charAt(0).toUpperCase() || "?"}
                  <i style={{ position: "absolute", bottom: -1, insetInlineEnd: -1, display: "block", width: 11, height: 11, borderRadius: "50%", background: STATUS_DOT[o.status], border: "2px solid #ffffff" }} />
                </span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <b style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.contactName}</b>
                  <small style={{ fontSize: 11.5, color: "#737870", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {o.serviceType in SERVICE_TEXT ? sx(o.serviceType as keyof typeof SERVICE_TEXT) : o.serviceType} · {ago(o.createdAt)}
                  </small>
                </span>
                <b className="a-num" style={{ fontSize: 13, fontWeight: 650, whiteSpace: "nowrap" }}>
                  <span dir="ltr">{o.total > 0 ? money(o.total) : tx("toQuote")}</span>
                </b>
              </button>
            ))}
            {view.recent.length === 0 ? <p className="a-empty">{tx("noData")}</p> : null}
          </div>
        </div>

        <div className="a-grid-auto">
          <div className="a-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h2>{tx("areasTitle")}</h2>
            {view.cities.map(([city, n], i) => (
              <div key={city} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span>{city}</span>
                  <b className="a-num" style={{ fontWeight: 650 }}>
                    {n}
                  </b>
                </div>
                <div className="a-bar" dir="ltr">
                  <div style={{ width: `${((n / view.cityMax) * 100).toFixed(1)}%`, background: i === 0 ? "#d71635" : "#252b28" }} />
                </div>
              </div>
            ))}
            {view.cities.length === 0 ? <p style={{ fontSize: 12.5, color: "#737870" }}>{tx("noData")}</p> : null}
          </div>
          <div className="a-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2>{tx("daysTitle")}</h2>
            <div dir="ltr" style={{ display: "flex", alignItems: "stretch", gap: 8, height: 150 }}>
              {view.weekBars.map((w, i) => (
                <div key={i} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <small style={{ fontSize: 10.5, fontWeight: 650, color: "#737870" }}>{w.n}</small>
                  <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                    <div style={{ width: "100%", maxWidth: 30, height: w.h, minHeight: 3, borderRadius: "4px 4px 1px 1px", background: "#d71635", opacity: w.op }} />
                  </div>
                  <small style={{ fontSize: 10.5, color: "#92958e", whiteSpace: "nowrap" }}>{w.label}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="a-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <h2>{tx("teamsTitle")}</h2>
              <p className="a-card-sub" style={{ marginTop: 2 }}>
                {tx("teamsSub")}
              </p>
            </div>
            {view.teamRows.map((row) => (
              <div key={row.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5 }}>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</span>
                  <b style={{ fontWeight: 650, whiteSpace: "nowrap" }}>{tx("jobsN", { n: row.n })}</b>
                </div>
                <div className="a-bar" dir="ltr">
                  <div style={{ width: `${((row.n / view.teamMax) * 100).toFixed(1)}%`, background: row.warn ? "#ffcb08" : "#252b28" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
