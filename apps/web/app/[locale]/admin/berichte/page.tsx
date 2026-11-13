"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type CSSProperties } from "react";

import { AdminShell } from "@/app/components/admin/AdminShell";
import { SERVICE_TEXT, STATUS_TEXT, cityOf, dateTag, dayKey, money, type OrderStatus } from "@/lib/admin/format";
import { defineText, useText } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Reports, as the admin prototype draws them: revenue, orders, average order
 * and the completion and cancellation rates for 30 days, 90 days or 12
 * months; revenue by month and by service, top cities, how much of the next
 * two weeks each crew and vehicle is booked, orders by status, and the
 * period's orders as CSV.
 *
 * Computed here from the orders `/api/admin/reports` returns, with the
 * prototype's formulas (rpVals).
 */

const TEXT = defineText({
  title: { de: "Berichte", en: "Reports", ar: "التقارير", tr: "Raporlar" },
  sub: {
    de: "So läuft das Geschäft: Umsatz, Aufträge und wie gut Teams und Fahrzeuge ausgelastet sind.",
    en: "How the business is doing: revenue, orders and how well crews and vehicles are used.",
    ar: "كيف يسير العمل: الإيرادات والطلبات واستغلال الفرق والسيارات.",
    tr: "İşler nasıl gidiyor: ciro, siparişler ve ekiplerle araçların ne kadar kullanıldığı.",
  },
  p30: { de: "30 Tage", en: "30 days", ar: "30 يوماً", tr: "30 gün" },
  p90: { de: "90 Tage", en: "90 days", ar: "90 يوماً", tr: "90 gün" },
  p365: { de: "12 Monate", en: "12 months", ar: "12 شهراً", tr: "12 ay" },
  export: { de: "CSV exportieren", en: "Export CSV", ar: "تصدير CSV", tr: "CSV dışa aktar" },
  revenue: { de: "Umsatz", en: "Revenue", ar: "الإيرادات", tr: "Ciro" },
  orders: { de: "Aufträge", en: "Orders", ar: "الطلبات", tr: "Siparişler" },
  aov: { de: "Durchschnittlicher Auftrag", en: "Average order", ar: "متوسط الطلب", tr: "Ortalama sipariş" },
  done: { de: "Erledigungsquote", en: "Completion rate", ar: "نسبة الإنجاز", tr: "Tamamlanma oranı" },
  cancel: { de: "Stornoquote", en: "Cancellation rate", ar: "نسبة الإلغاء", tr: "İptal oranı" },
  byMonth: { de: "UMSATZ NACH MONAT", en: "REVENUE BY MONTH", ar: "الإيرادات حسب الشهر", tr: "AYLARA GÖRE CİRO" },
  bySvc: { de: "UMSATZ NACH LEISTUNG", en: "REVENUE BY SERVICE", ar: "الإيرادات حسب الخدمة", tr: "HİZMETE GÖRE CİRO" },
  byCity: { de: "TOP-STÄDTE", en: "TOP CITIES", ar: "أكثر المدن", tr: "EN ÇOK ŞEHİRLER" },
  util: { de: "TEAM-AUSLASTUNG · NÄCHSTE 14 TAGE", en: "CREW USE · NEXT 14 DAYS", ar: "استغلال الفرق · 14 يوماً قادمة", tr: "EKİP KULLANIMI · ÖNÜMÜZDEKİ 14 GÜN" },
  veh: { de: "FAHRZEUG-AUSLASTUNG · NÄCHSTE 14 TAGE", en: "VEHICLE USE · NEXT 14 DAYS", ar: "استغلال السيارات · 14 يوماً قادمة", tr: "ARAÇ KULLANIMI · ÖNÜMÜZDEKİ 14 GÜN" },
  status: { de: "AUFTRÄGE NACH STATUS", en: "ORDERS BY STATUS", ar: "الطلبات حسب الحالة", tr: "DURUMA GÖRE SİPARİŞLER" },
  loadFailed: { de: "Die Berichte konnten nicht geladen werden.", en: "The reports could not be loaded.", ar: "تعذّر تحميل التقارير.", tr: "Raporlar yüklenemedi." },
  csvRef: { de: "Auftrag", en: "Ref", ar: "الطلب", tr: "Sipariş" },
  csvCreated: { de: "Erstellt", en: "Created", ar: "أُنشئ", tr: "Oluşturuldu" },
  csvCustomer: { de: "Kunde", en: "Customer", ar: "الزبون", tr: "Müşteri" },
  csvCompany: { de: "Firma", en: "Company", ar: "الشركة", tr: "Şirket" },
  csvServices: { de: "Leistungen", en: "Services", ar: "الخدمات", tr: "Hizmetler" },
  csvStatus: { de: "Status", en: "Status", ar: "الحالة", tr: "Durum" },
  csvTotal: { de: "Gesamt EUR", en: "Total EUR", ar: "الإجمالي EUR", tr: "Toplam EUR" },
});

interface ReportOrder {
  id: string;
  reference: string;
  status: OrderStatus;
  serviceType: string;
  totalGross: string;
  contactName: string;
  company: string | null;
  originAddress: string;
  destinationAddress: string | null;
  scheduledDate: string | null;
  scheduledSecondDate: string | null;
  estimatedHours: string | null;
  teamId: string | null;
  vehicleId: string | null;
  createdAt: string;
}

interface Report {
  orders: ReportOrder[];
  teams: { id: string; name: string; area: string | null }[];
  vehicles: { id: string; name: string; plate: string | null }[];
}

type Period = 30 | 90 | 365;
const DAY = 864e5;
/** Ten working days of eight hours: what one crew or one vehicle has in two weeks. */
const CAPACITY_HOURS = 10 * 8;
/** A working day, for splitting a two-day job's hours. */
const DAY_HOURS = 8;
/** The prototype's job lengths when an order has no estimate of its own. */
const DEFAULT_HOURS: Record<string, number> = { moving: 6, cleaning: 4, disposal: 2, renovation: 6 };
const SERVICE_CHART: Record<string, string> = { moving: "#d71635", renovation: "#c28a00", cleaning: "#3f705a", disposal: "#4a514d" };
const STATUS_CHART: Record<OrderStatus, string> = { quoted: "#c28a00", confirmed: "#3f705a", completed: "#4a514d", cancelled: "#d71635" };
const DOWNLOAD = "M12 3v12M7 10l5 5 5-5M5 21h14";

const card: CSSProperties = { background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, padding: "16px 18px", display: "flex", flexDirection: "column", boxShadow: "0 12px 36px #202a2308" };
const eyebrow: CSSProperties = { fontSize: 10.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#737870" };
const figure: CSSProperties = { color: "#4a514d", fontVariantNumeric: "tabular-nums" };

/** "€19k", "€6.0k", "€250": the chart labels. */
const kEuro = (v: number) => (v >= 1000 ? `€${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `€${Math.round(v)}`);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const hoursText = (h: number) => `${Math.round(h * 10) / 10} h`;

export default function ReportsPage() {
  return (
    <AdminShell view="reports">
      <Reports />
    </AdminShell>
  );
}

function Reports() {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const sx = useText(SERVICE_TEXT);
  const st = useText(STATUS_TEXT);
  const loc = dateTag(locale);
  const [period, setPeriod] = useState<Period>(90);

  const data = useQuery({
    queryKey: ["admin", "reports", period],
    queryFn: () => sdk.http.get<Report>(`/api/admin/reports?days=${period}`),
    refetchInterval: 60_000,
  });

  const serviceName = (key: string) => (key in SERVICE_TEXT ? sx(key as keyof typeof SERVICE_TEXT) : key);

  const view = useMemo(() => {
    const serviceName = (key: string) => (key in SERVICE_TEXT ? sx(key as keyof typeof SERVICE_TEXT) : key);
    const all = (data.data?.orders ?? []).map((o) => ({ ...o, total: Number.parseFloat(o.totalGross) || 0, created: new Date(o.createdAt).getTime() }));
    const now = Date.now();
    const inP = all.filter((o) => now - o.created <= period * DAY);
    const live = inP.filter((o) => o.status !== "cancelled");
    const rev = live.reduce((n, o) => n + o.total, 0);
    const N = inP.length || 1;

    const kpis = [
      { label: tx("revenue"), value: money(rev) },
      { label: tx("orders"), value: String(inP.length) },
      { label: tx("aov"), value: money(live.length ? rev / live.length : 0) },
      { label: tx("done"), value: pct(inP.filter((o) => o.status === "completed").length / N) },
      { label: tx("cancel"), value: pct(inP.filter((o) => o.status === "cancelled").length / N) },
    ];

    // Revenue by the month an order was placed, over every order loaded.
    const NM = period >= 365 ? 12 : 6;
    const today = new Date();
    const monthKeys = Array.from({ length: NM }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (NM - 1 - i), 1);
      return { key: dayKey(d).slice(0, 7), label: d.toLocaleDateString(loc, { month: "short" }) };
    });
    const monthValues = monthKeys.map((m) => all.filter((o) => o.status !== "cancelled" && dayKey(new Date(o.created)).slice(0, 7) === m.key).reduce((n, o) => n + o.total, 0));
    const monthMax = Math.max(1, ...monthValues);
    const months = monthKeys.map((m, i) => ({
      label: m.label,
      value: kEuro(monthValues[i]!),
      h: `${Math.max(2, Math.round((monthValues[i]! / monthMax) * 100))}%`,
      colour: i === NM - 1 ? "#d71635" : "#252b28",
    }));

    const services: Record<string, number> = {};
    live.forEach((o) => {
      services[o.serviceType] = (services[o.serviceType] ?? 0) + o.total;
    });
    const svcMax = Math.max(1, ...Object.values(services));
    const svcSum = Object.values(services).reduce((a, b) => a + b, 0) || 1;
    const bySvc = Object.entries(services)
      .sort((a, b) => b[1] - a[1])
      .map(([key, v]) => ({ key, label: serviceName(key), value: money(v), p: pct(v / svcSum), w: `${Math.round((v / svcMax) * 100)}%`, colour: SERVICE_CHART[key] ?? "#92958e" }));

    // Where the work ends up: the new home of a move, the address of the rest.
    const cities: Record<string, { n: number; v: number }> = {};
    live.forEach((o) => {
      const city = cityOf(o.destinationAddress || o.originAddress);
      if (!city) return;
      cities[city] ??= { n: 0, v: 0 };
      cities[city]!.n += 1;
      cities[city]!.v += o.total;
    });
    const cityMax = Math.max(1, ...Object.values(cities).map((c) => c.n));
    const byCity = Object.entries(cities)
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, 6)
      .map(([label, c]) => ({ label, n: c.n, value: kEuro(c.v), w: `${Math.round((c.n / cityMax) * 100)}%` }));

    // Jobs of the next 14 days, today included; a two-day job counts on both days.
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const k0 = dayKey(t0);
    const k14 = dayKey(new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() + 13));
    const jobs: { o: (typeof all)[number]; hours: number }[] = [];
    all.forEach((o) => {
      if (o.status === "cancelled") return;
      const total = Number.parseFloat(o.estimatedHours ?? "") || DEFAULT_HOURS[o.serviceType] || 6;
      const first = o.scheduledSecondDate ? Math.min(total, DAY_HOURS) : total;
      if (o.scheduledDate && o.scheduledDate >= k0 && o.scheduledDate <= k14) jobs.push({ o, hours: first });
      if (o.scheduledSecondDate && o.scheduledSecondDate >= k0 && o.scheduledSecondDate <= k14) jobs.push({ o, hours: Math.max(total - first, 0) });
    });
    const use = <T extends { id: string }>(items: T[], label: (item: T) => string, match: (job: (typeof jobs)[number], item: T) => boolean) =>
      items.map((item) => {
        const h = jobs.filter((job) => match(job, item)).reduce((n, job) => n + job.hours, 0);
        const p = Math.min(1, h / CAPACITY_HOURS);
        return { id: item.id, label: label(item), h: hoursText(h), p: pct(p), w: `${Math.max(2, Math.round(p * 100))}%`, colour: p > 0.85 ? "#d71635" : "#252b28" };
      });
    const util = use(data.data?.teams ?? [], (t) => [t.name, t.area].filter(Boolean).join(" · "), (job, t) => job.o.teamId === t.id);
    // Vehicles drive moves and clearances; cleaning and renovation crews come without one.
    const veh = use(data.data?.vehicles ?? [], (v) => v.name, (job, v) => (job.o.serviceType === "moving" || job.o.serviceType === "disposal") && job.o.vehicleId === v.id);

    const status = (["quoted", "confirmed", "completed", "cancelled"] as OrderStatus[]).map((key) => {
      const n = inP.filter((o) => o.status === key).length;
      return { key, label: st(key), n, w: `${Math.round((n / N) * 100)}%`, colour: STATUS_CHART[key] };
    });

    return { kpis, months, bySvc, byCity, util, veh, status, inP };
  }, [data.data, period, loc, tx, sx, st]);

  const exportCsv = () => {
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = [tx("csvRef"), tx("csvCreated"), tx("csvCustomer"), tx("csvCompany"), tx("csvServices"), tx("csvStatus"), tx("csvTotal")].map(q).join(";");
    const rows = view.inP.map((o) =>
      [o.reference, dayKey(new Date(o.created)), o.contactName, o.company ?? "", serviceName(o.serviceType), st(o.status), o.total.toFixed(2).replace(".", ",")].map(q).join(";"),
    );
    const blob = new Blob([`﻿${[head, ...rows].join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mon-report-${period}d-${dayKey(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 500);
  };

  const meter = (row: { id: string; label: string; h: string; p: string; w: string; colour: string }) => (
    <div key={row.id} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5 }}>
        <span style={{ fontWeight: 600 }}>{row.label}</span>
        <span dir="ltr" style={figure}>
          {row.h} · {row.p}
        </span>
      </div>
      <span style={{ height: 6, borderRadius: 6, background: "#eef0ea", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: row.w, background: row.colour, borderRadius: 6 }} />
      </span>
    </div>
  );

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 640 }}>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "var(--a-ls-h1)", lineHeight: 1.2 }}>{tx("title")}</h1>
          <p style={{ color: "#737870", fontSize: 13, marginTop: 6 }}>{tx("sub")}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", padding: 3, border: "1px solid #cfd3cb", borderRadius: 8, background: "#ffffff" }}>
            {([30, 90, 365] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
                style={{ whiteSpace: "nowrap", minHeight: 32, padding: "0 13px", border: 0, borderRadius: 6, background: period === p ? "#252b28" : "transparent", color: period === p ? "#ffffff" : "#4a514d", fontSize: 12, fontWeight: 600 }}
              >
                {tx(`p${p}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data.data}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 40, padding: "0 14px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 600 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={DOWNLOAD} />
            </svg>
            {tx("export")}
          </button>
        </div>
      </div>

      {data.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
        {view.kpis.map((k) => (
          <div key={k.label} style={{ ...card, gap: 6 }}>
            <small style={{ fontSize: 11.5, color: "#737870" }}>{k.label}</small>
            <b style={{ fontSize: 22, fontWeight: 650, letterSpacing: "var(--a-ls-h2)", fontVariantNumeric: "tabular-nums" }}>
              <span dir="ltr">{data.isLoading ? "—" : k.value}</span>
            </b>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 16, alignItems: "stretch" }}>
        <div style={{ ...card, gap: 14 }}>
          <b style={eyebrow}>{tx("byMonth")}</b>
          <div style={{ height: 190, display: "flex", alignItems: "flex-end", gap: 8 }}>
            {view.months.map((m, i) => (
              <div key={i} style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 5 }}>
                <small style={{ fontSize: 10.5, fontWeight: 600, color: "#4a514d", whiteSpace: "nowrap" }}>{m.value}</small>
                <span style={{ width: "100%", maxWidth: 38, height: m.h, borderRadius: "5px 5px 2px 2px", background: m.colour }} />
                <small style={{ fontSize: 10.5, color: "#92958e" }}>{m.label}</small>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, gap: 12 }}>
          <b style={eyebrow}>{tx("bySvc")}</b>
          {view.bySvc.map((b) => (
            <div key={b.key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: b.colour }} />
                  {b.label}
                </span>
                <span dir="ltr" style={figure}>
                  {b.value} · {b.p}
                </span>
              </div>
              <span style={{ height: 6, borderRadius: 6, background: "#eef0ea", overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: b.w, background: b.colour, borderRadius: 6 }} />
              </span>
            </div>
          ))}
          {view.bySvc.length === 0 ? <small style={{ color: "#92958e", fontSize: 12 }}>—</small> : null}
        </div>

        <div style={{ ...card, gap: 12 }}>
          <b style={eyebrow}>{tx("util")}</b>
          {view.util.map(meter)}
          {view.util.length === 0 ? <small style={{ color: "#92958e", fontSize: 12 }}>—</small> : null}
          <b style={{ ...eyebrow, marginTop: 6 }}>{tx("veh")}</b>
          {view.veh.map(meter)}
          {view.veh.length === 0 ? <small style={{ color: "#92958e", fontSize: 12 }}>—</small> : null}
        </div>

        <div style={{ ...card, gap: 12 }}>
          <b style={eyebrow}>{tx("byCity")}</b>
          {view.byCity.map((c) => (
            <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
              <span style={{ flex: "0 0 96px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label}</span>
              <span style={{ flex: 1, height: 6, borderRadius: 6, background: "#eef0ea", overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: c.w, background: "#252b28", borderRadius: 6 }} />
              </span>
              <span dir="ltr" style={{ ...figure, flex: "0 0 74px", textAlign: "end" }}>
                {c.n} · {c.value}
              </span>
            </div>
          ))}
          {view.byCity.length === 0 ? <small style={{ color: "#92958e", fontSize: 12 }}>—</small> : null}
          <b style={{ ...eyebrow, marginTop: 6 }}>{tx("status")}</b>
          <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden", background: "#eef0ea" }}>
            {view.status.map((s) => (
              <span key={s.key} style={{ width: s.w, background: s.colour }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px 16px", flexWrap: "wrap" }}>
            {view.status.map((s) => (
              <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.colour }} />
                {s.label} <b style={{ fontWeight: 650 }}>{s.n}</b>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
