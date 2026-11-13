import type { Locale } from "@/lib/i18n/config";

import { defineText } from "./text";

/**
 * How the admin prototype writes money, dates, services and statuses, shared
 * by every dashboard screen.
 */

/** "€1,234.56" — the dashboard always groups the English way, as the prototype does. */
export function money(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number.parseFloat(value) : value ?? 0;
  return `€${(Number.isFinite(n) ? n : 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "€27.4k" above ten thousand, "€940" below: chart axes and the donut's centre. */
export function moneyShort(value: number): string {
  return value >= 10000 ? `€${(value / 1000).toFixed(1).replace(/\.0$/, "")}k` : `€${Math.round(value).toLocaleString("en-US")}`;
}

/** "1.234,56 €" — printed German documents (Angebot, Rechnung). */
export function euroDe(value: number | string): string {
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  return `${(Number.isFinite(n) ? n : 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

/** The Intl tag the dashboard formats dates with (Arabic with Latin digits). */
export function dateTag(locale: Locale): string {
  return { de: "de-DE", en: "en-GB", tr: "tr-TR", ar: "ar-u-nu-latn" }[locale];
}

export function formatDate(value: string | Date | null | undefined, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return "";
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(dateTag(locale), options ?? { day: "numeric", month: "short", year: "numeric" });
}

/** "2026-10-25" in local time, the way `date` columns read. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ── Services ──────────────────────────────────────────────────────────────

export type ServiceKey = "moving" | "cleaning" | "renovation" | "disposal";

/** The prototype's service colours: M red, C yellow, P green, D ink. */
export const SERVICE_COLOURS: Record<string, string> = {
  moving: "#d71635",
  cleaning: "#ffcb08",
  renovation: "#3f705a",
  disposal: "#252b28",
};

export const SERVICE_TEXT = defineText({
  moving: { de: "Umzug", en: "Moving", ar: "نقل الأثاث", tr: "Taşınma" },
  cleaning: { de: "Reinigung", en: "Cleaning", ar: "التنظيف", tr: "Temizlik" },
  renovation: { de: "Renovierung", en: "Renovation", ar: "الترميم", tr: "Tadilat" },
  disposal: { de: "Entrümpelung", en: "Junk Removal", ar: "إزالة الأغراض القديمة", tr: "Eşya tasfiyesi" },
});

// ── Order statuses ────────────────────────────────────────────────────────

/**
 * The prototype's four statuses over this system's enum: an order arrives
 * "quoted" (the prototype's New) and ends "completed" (its Done).
 */
export type OrderStatus = "quoted" | "confirmed" | "completed" | "cancelled";

export const ORDER_STATUSES: OrderStatus[] = ["quoted", "confirmed", "completed", "cancelled"];

export const STATUS_DOT: Record<OrderStatus, string> = {
  quoted: "#ffcb08",
  confirmed: "#3f705a",
  completed: "#252b28",
  cancelled: "#d71635",
};

/** The pill classes in admin.css for each status. */
export const STATUS_PILL: Record<OrderStatus, string> = {
  quoted: "is-new",
  confirmed: "is-ok",
  completed: "is-grey",
  cancelled: "is-red",
};

export const STATUS_TEXT = defineText({
  quoted: { de: "Neu", en: "New", ar: "جديد", tr: "Yeni" },
  confirmed: { de: "Bestätigt", en: "Confirmed", ar: "مؤكد", tr: "Onaylandı" },
  completed: { de: "Erledigt", en: "Completed", ar: "منفّذ", tr: "Tamamlandı" },
  cancelled: { de: "Storniert", en: "Cancelled", ar: "ملغى", tr: "İptal edildi" },
});

/** The city of an address: what follows the five-digit postcode. */
export function cityOf(address: string | null | undefined): string {
  const match = String(address ?? "").match(/\b\d{5}\s+([^,]+)/);
  return match?.[1]?.trim() ?? "";
}

/** Two letters for an avatar. */
export function initialsOf(name: string | null | undefined): string {
  return (
    String(name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}
