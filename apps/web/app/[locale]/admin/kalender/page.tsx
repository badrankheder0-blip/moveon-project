"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AdminShell } from "@/app/components/admin/AdminShell";
import styles from "@/app/components/admin/orders/orders.module.css";
import { SERVICE_TEXT, STATUS_DOT, dateTag, dayKey, type OrderStatus } from "@/lib/admin/format";
import { ADMIN_PATHS } from "@/lib/admin/nav";
import { defineText, useText } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { LOCALE_META } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Calendar: every scheduled job by date, as the admin prototype draws it —
 * a Monday-first month grid on wide screens, an agenda on phones. Each day of
 * an order is its own job (a long move fills two); cancelled orders are left
 * out. Clicking a job opens the order (its team, or "No team", is in the
 * chip's tooltip).
 */

const TEXT = defineText({
  title: { de: "Kalender", en: "Calendar", ar: "تقويم الحجوزات", tr: "Takvim" },
  sub: {
    de: "Jeder geplante Einsatz nach Datum. Klicken Sie auf einen Einsatz, um den Auftrag zu öffnen.",
    en: "Every scheduled job by date. Click a job to open the order.",
    ar: "كل المواعيد حسب التاريخ. اضغط على أي موعد لفتح الطلب.",
    tr: "Tarihe göre planlanmış her iş. Siparişi açmak için bir işe tıklayın.",
  },
  today: { de: "Heute", en: "Today", ar: "اليوم", tr: "Bugün" },
  prevMonth: { de: "Vorheriger Monat", en: "Previous month", ar: "الشهر السابق", tr: "Önceki ay" },
  nextMonth: { de: "Nächster Monat", en: "Next month", ar: "الشهر التالي", tr: "Sonraki ay" },
  more: { de: "+{n} weitere", en: "+{n} more", ar: "+{n} أخرى", tr: "+{n} daha" },
  noJobs: { de: "Keine Einsätze in diesem Monat.", en: "No jobs this month.", ar: "لا توجد مواعيد هذا الشهر.", tr: "Bu ay iş yok." },
  noTeam: { de: "Kein Team", en: "No team", ar: "بدون فريق", tr: "Ekip yok" },
  secondDay: { de: "Tag 2", en: "Day 2", ar: "اليوم 2", tr: "2. gün" },
  loadFailed: { de: "Der Kalender konnte nicht geladen werden.", en: "The calendar could not be loaded.", ar: "تعذّر تحميل التقويم.", tr: "Takvim yüklenemedi." },
});

interface Job {
  id: string;
  reference: string;
  status: OrderStatus;
  serviceType: string;
  contactName: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  scheduledSecondDate: string | null;
  teamId: string | null;
  teamName: string | null;
  teamArea: string | null;
}

/** The job chip colours: the status pill's background and text. */
const CHIP: Record<OrderStatus, { bg: string; fg: string }> = {
  quoted: { bg: "#fbf4e4", fg: "#5c4a00" },
  confirmed: { bg: "#edf5ed", fg: "#3f705a" },
  completed: { bg: "#f5f5f0", fg: "#252b28" },
  cancelled: { bg: "#fff6f6", fg: "#b7122b" },
};

export default function CalendarPage() {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const sx = useText(SERVICE_TEXT);
  const router = useRouter();
  const rtl = LOCALE_META[locale].dir === "rtl";
  const loc = dateTag(locale);

  const now = new Date();
  const [cal, setCal] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const grid = useMemo(() => {
    const first = new Date(cal.y, cal.m, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(cal.y, cal.m, 1 - offset);
    const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    // Five rows when the sixth would be all next month.
    return days.slice(35).every((d) => d.getMonth() !== cal.m) ? days.slice(0, 35) : days;
  }, [cal]);

  const from = dayKey(grid[0]!);
  const to = dayKey(grid[grid.length - 1]!);
  const jobs = useQuery({
    queryKey: ["admin", "orders", "calendar", from, to],
    queryFn: () => sdk.http.get<{ jobs: Job[] }>("/api/orders/calendar", { from, to }),
    refetchInterval: 60_000,
  });

  const serviceName = (key: string) => (key in SERVICE_TEXT ? sx(key as keyof typeof SERVICE_TEXT) : key);
  const byDate = useMemo(() => {
    const out: Record<string, { job: Job; time: string; second: boolean }[]> = {};
    for (const job of jobs.data?.jobs ?? []) {
      if (job.status === "cancelled") continue;
      if (job.scheduledDate) (out[job.scheduledDate] ??= []).push({ job, time: job.scheduledTime?.slice(0, 5) ?? "", second: false });
      if (job.scheduledSecondDate) (out[job.scheduledSecondDate] ??= []).push({ job, time: "", second: true });
    }
    for (const list of Object.values(out)) list.sort((a, b) => a.time.localeCompare(b.time));
    return out;
  }, [jobs.data]);

  const todayKey = dayKey(now);
  const monthTitle = new Date(cal.y, cal.m, 1).toLocaleDateString(loc, { month: "long", year: "numeric" });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2026, 9, 19 + i).toLocaleDateString(loc, { weekday: "short" }));
  const open = (id: string) => router.push(`/${locale}${ADMIN_PATHS.orders}/${id}`);
  const shift = (delta: number) => setCal((c) => ({ y: new Date(c.y, c.m + delta, 1).getFullYear(), m: new Date(c.y, c.m + delta, 1).getMonth() }));

  const chipOf = (entry: { job: Job; time: string; second: boolean }) => {
    const colours = CHIP[entry.job.status];
    const team = [entry.job.teamName, entry.job.teamArea].filter(Boolean).join(" · ");
    return {
      label: `${serviceName(entry.job.serviceType)} · ${entry.job.contactName.trim().split(/\s+/)[0] ?? ""}`,
      title: [entry.job.reference, entry.second ? tx("secondDay") : entry.time, team || tx("noTeam")].filter(Boolean).join(" · "),
      bg: colours.bg,
      fg: colours.fg,
      dot: STATUS_DOT[entry.job.status],
    };
  };

  const inMonth = (d: Date) => d.getMonth() === cal.m;
  const agenda = grid.filter((d) => inMonth(d) && (byDate[dayKey(d)] ?? []).length > 0);
  const navBtn = { width: 38, height: 38, display: "grid", placeItems: "center", border: "1px solid #e3e5de", borderRadius: 6, background: "#ffffff", color: "#252b28", padding: 0 } as const;

  return (
    <AdminShell view="calendar">
      <section data-screen-label="Calendar" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: rtl ? 0 : "-0.9px", lineHeight: 1.2 }}>{tx("title")}</h1>
          <p style={{ color: "#737870", fontSize: 13, marginTop: 6 }}>{tx("sub")}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 19, fontWeight: 600, letterSpacing: rtl ? 0 : "-0.3px" }}>{monthTitle}</h2>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className={styles.navBtn} aria-label={tx("prevMonth")} title={tx("prevMonth")} onClick={() => shift(-1)} style={navBtn}>
              <Chevron d={rtl ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6"} />
            </button>
            <button type="button" className={styles.navBtn} onClick={() => setCal({ y: now.getFullYear(), m: now.getMonth() })} style={{ minHeight: 38, padding: "0 14px", border: "1px solid #e3e5de", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 600 }}>
              {tx("today")}
            </button>
            <button type="button" className={styles.navBtn} aria-label={tx("nextMonth")} title={tx("nextMonth")} onClick={() => shift(1)} style={navBtn}>
              <Chevron d={rtl ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
            </button>
          </div>
        </div>

        {jobs.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}

        <div className={styles.wideOnly} style={{ flexDirection: "column", background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, overflow: "hidden", boxShadow: "0 12px 36px #202a2308" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", background: "#fafaf7" }}>
            {weekdays.map((label) => (
              <span key={label} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 650, color: "#737870" }}>
                {label}
              </span>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))" }}>
            {grid.map((day) => {
              const key = dayKey(day);
              const items = byDate[key] ?? [];
              const month = inMonth(day);
              const today = key === todayKey;
              return (
                <div key={key} style={{ minHeight: 116, padding: 8, borderTop: "1px solid #eef0ea", borderInlineEnd: "1px solid #eef0ea", background: month ? "#ffffff" : "#fafaf7", display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <span style={{ alignSelf: "flex-start", width: 24, height: 24, display: "grid", placeItems: "center", borderRadius: "50%", background: today ? "#d71635" : "transparent", color: today ? "#ffffff" : month ? "#252b28" : "#c4c7bf", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {day.getDate()}
                  </span>
                  {items.slice(0, 3).map((entry, i) => {
                    const chip = chipOf(entry);
                    return (
                      <button
                        key={`${entry.job.id}-${i}`}
                        type="button"
                        className={styles.chip}
                        title={chip.title}
                        onClick={() => open(entry.job.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          width: "100%",
                          minWidth: 0,
                          padding: "3px 6px",
                          border: 0,
                          borderRadius: 4,
                          background: chip.bg,
                          color: chip.fg,
                          fontSize: 11,
                          fontWeight: 600,
                          textAlign: "start",
                        }}
                      >
                        <i style={{ display: "block", width: 5, height: 5, borderRadius: "50%", background: chip.dot, flex: "none" }} />
                        <span style={{ minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{chip.label}</span>
                      </button>
                    );
                  })}
                  {items.length > 3 ? <small style={{ fontSize: 10.5, color: "#737870", padding: "0 6px" }}>{tx("more", { n: items.length - 3 })}</small> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.narrowOnly} style={{ flexDirection: "column", gap: 10 }}>
          {agenda.map((day) => (
            <div key={dayKey(day)} style={{ background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <b style={{ fontSize: 13, fontWeight: 650 }}>{day.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" })}</b>
              {(byDate[dayKey(day)] ?? []).map((entry, i) => {
                const chip = chipOf(entry);
                return (
                  <button
                    key={`${entry.job.id}-${i}`}
                    type="button"
                    onClick={() => open(entry.job.id)}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", minHeight: 44, padding: "8px 10px", border: 0, borderRadius: 6, background: chip.bg, color: chip.fg, fontSize: 13, fontWeight: 600, textAlign: "start" }}
                  >
                    <i style={{ display: "block", width: 6, height: 6, borderRadius: "50%", background: chip.dot, flex: "none" }} />
                    <span style={{ flex: 1 }}>{chip.label}</span>
                    <small style={{ fontSize: 11.5, fontWeight: 500 }}>{entry.second ? tx("secondDay") : entry.time}</small>
                  </button>
                );
              })}
            </div>
          ))}
          {agenda.length === 0 && !jobs.isLoading ? <p style={{ padding: "30px 10px", textAlign: "center", color: "#737870", fontSize: 13 }}>{tx("noJobs")}</p> : null}
        </div>

      </section>
    </AdminShell>
  );
}

function Chevron({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
