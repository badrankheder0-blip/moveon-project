"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import styles from "@/app/components/admin/orders/orders.module.css";
import { SERVICE_TEXT, STATUS_DOT, dateTag, dayKey, type OrderStatus } from "@/lib/admin/format";
import { ADMIN_PATHS } from "@/lib/admin/nav";
import { defineText, useText } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { LOCALE_META } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

import { DayDialog, availabilityKey, type AdminDay, type AdminRange } from "./DayDialog";

/**
 * Calendar: every scheduled job by date, as the admin prototype draws it —
 * a Monday-first month grid on wide screens, an agenda on phones. Each day of
 * an order is its own job (a long move fills two); cancelled orders are left
 * out. Clicking a job opens the order (its team, or "No team", is in the
 * chip's tooltip).
 *
 * Each day also shows what it can still take (booked of its limit) and why
 * it is shut: a day blocked by the office, an NRW public holiday or Sunday —
 * the last two automatically. Clicking a day opens a small window to block
 * it or give it its own limit (DayDialog); the header sets the default.
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
  blocked: { de: "Gesperrt", en: "Blocked", ar: "مغلق", tr: "Kapalı" },
  sunday: { de: "Geschlossen", en: "Closed", ar: "مغلق", tr: "Kapalı" },
  perDay: { de: "Kunden pro Tag", en: "Customers per day", ar: "زبائن في اليوم", tr: "Günlük müşteri" },
  fewer: { de: "Weniger", en: "Fewer", ar: "أقل", tr: "Daha az" },
  moreCap: { de: "Mehr", en: "More", ar: "أكثر", tr: "Daha fazla" },
  openDay: { de: "Tag öffnen: {d}", en: "Open day: {d}", ar: "فتح اليوم: {d}", tr: "Günü aç: {d}" },
  pickDay: { de: "Tag wählen", en: "Pick a day", ar: "اختر يوماً", tr: "Gün seç" },
  capSaved: { de: "Standard gespeichert.", en: "Default saved.", ar: "تم حفظ الافتراضي.", tr: "Varsayılan kaydedildi." },
  capFailed: { de: "Speichern fehlgeschlagen.", en: "Saving failed.", ar: "تعذّر الحفظ.", tr: "Kaydedilemedi." },
});

/** A shut day's background: light diagonal stripes, so it reads as closed at a glance. */
const SHUT_BG = "repeating-linear-gradient(135deg,#f6f6f2 0 6px,#efefe9 6px 12px)";

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
  const { sdk, can } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const toast = useToast();
  const queryClient = useQueryClient();
  const canEdit = can("availability.write");
  /** The day whose window is open. */
  const [openDay, setOpenDay] = useState<string | null>(null);
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

  const availability = useQuery({
    queryKey: [...availabilityKey, from, to],
    queryFn: () => sdk.http.get<AdminRange>("/api/availability/admin", { from, to }),
    refetchInterval: 60_000,
  });
  const dayInfo = useMemo(() => new Map<string, AdminDay>((availability.data?.days ?? []).map((d) => [d.date, d])), [availability.data]);
  const defaultCapacity = availability.data?.defaultCapacity;

  const setDefault = useMutation({
    mutationFn: (maxCapacityPerDay: number) => sdk.http.patch<{ maxCapacityPerDay: number }>("/api/availability/config", { maxCapacityPerDay }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: availabilityKey });
      toast(tx("capSaved"));
    },
    onError: () => toast(tx("capFailed")),
  });

  /** Why a day is shut, in a few words, or null when it is open. */
  const shutLabel = (info: AdminDay | undefined): string | null =>
    !info ? null : info.holiday ? info.holiday : info.closed ? tx("sunday") : info.blocked ? (info.blocked.reason === "Gesperrt" ? tx("blocked") : `${tx("blocked")} · ${info.blocked.reason}`) : null;

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
  // Phones list the days with jobs, and the days shut by the office or a holiday (not every Sunday).
  const agenda = grid.filter((d) => {
    const info = dayInfo.get(dayKey(d));
    return inMonth(d) && ((byDate[dayKey(d)] ?? []).length > 0 || Boolean(info?.blocked || info?.holiday));
  });
  const stepBtn = { width: 30, height: 30, display: "grid", placeItems: "center", border: "1px solid #e3e5de", borderRadius: 6, background: "#ffffff", color: "#252b28", padding: 0, fontSize: 16, fontWeight: 600, lineHeight: 1 } as const;
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
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {defaultCapacity !== undefined ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 38, padding: "0 6px 0 12px", border: "1px solid #e3e5de", borderRadius: 6, background: "#ffffff" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#4a514d" }}>{tx("perDay")}</span>
              {canEdit ? (
                <button type="button" aria-label={tx("fewer")} title={tx("fewer")} disabled={setDefault.isPending || defaultCapacity <= 0} onClick={() => setDefault.mutate(defaultCapacity - 1)} style={stepBtn}>
                  −
                </button>
              ) : null}
              <b style={{ minWidth: 18, textAlign: "center", fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{defaultCapacity}</b>
              {canEdit ? (
                <button type="button" aria-label={tx("moreCap")} title={tx("moreCap")} disabled={setDefault.isPending || defaultCapacity >= 50} onClick={() => setDefault.mutate(defaultCapacity + 1)} style={stepBtn}>
                  +
                </button>
              ) : null}
            </div>
          ) : null}
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
        </div>

        {jobs.isError || availability.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}

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
              const info = dayInfo.get(key);
              const shut = shutLabel(info);
              const full = Boolean(info && !shut && info.used >= info.maxCapacity);
              const dateLabel = day.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" });
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-label={tx("openDay", { d: dateLabel })}
                  onClick={() => setOpenDay(key)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setOpenDay(key);
                    }
                  }}
                  className={styles.dayCell}
                  style={{ minHeight: 116, padding: 8, borderTop: "1px solid #eef0ea", borderInlineEnd: "1px solid #eef0ea", background: shut ? SHUT_BG : month ? "#ffffff" : "#fafaf7", opacity: month ? 1 : 0.75, display: "flex", flexDirection: "column", gap: 4, minWidth: 0, cursor: "pointer" }}
                >
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                    <span style={{ width: 24, height: 24, display: "grid", placeItems: "center", borderRadius: "50%", background: today ? "#d71635" : "transparent", color: today ? "#ffffff" : month ? "#252b28" : "#c4c7bf", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {day.getDate()}
                    </span>
                    {info && month && !shut ? (
                      <span
                        title={`${info.used}/${info.maxCapacity}`}
                        style={{ padding: "1px 6px", borderRadius: 999, background: full ? "#fff1f3" : info.ownLimit !== null ? "#eef3fb" : "#f5f5f0", color: full ? "#b7122b" : info.ownLimit !== null ? "#2d5a8c" : "#737870", fontSize: 10, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
                      >
                        {info.used}/{info.maxCapacity}
                      </span>
                    ) : null}
                  </span>
                  {shut ? (
                    <small style={{ fontSize: 10.5, fontWeight: 650, color: info?.blocked && !info.holiday && !info.closed ? "#b7122b" : "#737870", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={shut}>
                      {shut}
                    </small>
                  ) : null}
                  {items.slice(0, 3).map((entry, i) => {
                    const chip = chipOf(entry);
                    return (
                      <button
                        key={`${entry.job.id}-${i}`}
                        type="button"
                        className={styles.chip}
                        title={chip.title}
                        onClick={(event) => {
                          event.stopPropagation();
                          open(entry.job.id);
                        }}
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
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px", background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#4a514d" }}>
            {tx("pickDay")}
            <input
              type="date"
              value=""
              onChange={(event) => {
                if (event.target.value) setOpenDay(event.target.value);
              }}
              style={{ height: 38, padding: "0 10px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, color: "#252b28" }}
            />
          </label>
          {agenda.map((day) => (
            <div key={dayKey(day)} style={{ background: dayInfo.get(dayKey(day))?.blocked || dayInfo.get(dayKey(day))?.holiday ? SHUT_BG : "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                onClick={() => setOpenDay(dayKey(day))}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: 0, border: 0, background: "transparent", color: "#252b28", textAlign: "start" }}
              >
                <b style={{ fontSize: 13, fontWeight: 650 }}>{day.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" })}</b>
                <small style={{ fontSize: 11.5, fontWeight: 650, color: "#737870" }}>
                  {shutLabel(dayInfo.get(dayKey(day))) ?? (dayInfo.get(dayKey(day)) ? `${dayInfo.get(dayKey(day))!.used}/${dayInfo.get(dayKey(day))!.maxCapacity}` : "")}
                </small>
              </button>
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
      {openDay ? <DayDialog key={openDay} date={openDay} canEdit={canEdit} onClose={() => setOpenDay(null)} /> : null}
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
