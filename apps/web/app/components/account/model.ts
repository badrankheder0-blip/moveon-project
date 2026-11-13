import type { OrderStatus, OrderSummary, ServiceType } from "@mon/client";

import type { Locale } from "@/lib/i18n/config";
import type { OrderDetail } from "@/lib/live/useLiveData";

import type { AcKey } from "./text";

/**
 * What the account screens compute from the API's rows: the prototype's
 * statuses, tabs, tracker and formats, applied to real orders.
 *
 * The prototype's booking statuses are new · confirmed · done · cancelled; the
 * API's are quoted · confirmed · completed · cancelled. A `quoted` order is one
 * the customer has sent and the office has not confirmed, which the prototype
 * calls "Received".
 */

// ── Icons (the prototype's paths) ─────────────────────────────────────────

export const IC = {
  truck: "M1 6h13v10H1zM14 9h4l3 3v4h-7M5.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  box: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  spark: "M12 2l1.8 5.6L19.5 9l-5.7 1.6L12 16l-1.8-5.4L4.5 9l5.7-1.4zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",
  euro: "M18 6.5A7 7 0 1 0 18 17.5M4 10h10M4 14h10",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  pin: "M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  calendar: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
  doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
  chat: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  bell: "M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z",
  calCheck: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4M9 15.5l2 2 4-4",
  homeCheck: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 14.5l2 2 4-4",
  check: "M5 12l5 5L20 7",
  plus: "M12 5v14M5 12h14",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  chevron: "M9 6l6 6-6 6",
  back: "M15 6l-6 6 6 6",
  arrow: "M5 12h14M13 6l6 6-6 6",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  shield: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6zM12 8v5M12 16h.01",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  close: "M6 6l12 12M18 6L6 18",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  mail: "M3 5h18v14H3zM3.5 6.5 12 13l8.5-6.5",
  lock: "M4 10h16v11H4zM8 10V7a4 4 0 0 1 8 0v3",
  phone:
    "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z",
  key: "M15 7a4 4 0 1 1-3.5 6L4 20.5V22H2v-3l7.5-7.5A4 4 0 0 1 15 7zM16 8h.01",
} as const;

export const RED = "#d71635";

// ── Services ──────────────────────────────────────────────────────────────

export const SERVICE: Record<ServiceType, { name: AcKey; icon: string }> = {
  moving: { name: "svcMoving", icon: IC.truck },
  disposal: { name: "svcDisposal", icon: IC.trash },
  cleaning: { name: "svcCleaning", icon: IC.spark },
};

export function serviceOf(type: string): { name: AcKey; icon: string } {
  return SERVICE[type as ServiceType] ?? SERVICE.moving;
}

// ── Formats (as the prototype writes them) ────────────────────────────────

/** The prototype's date locale: Latin digits in Arabic. */
export function dateLocale(locale: Locale): string {
  return locale === "ar" ? "ar-u-nu-latn" : locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-GB";
}

/**
 * Money. English and Arabic as the prototype writes it ("€1,328.80", Latin
 * digits); German and Turkish the way those readers write euros.
 */
export function money(value: string | number | null | undefined, locale: Locale): string {
  const n = typeof value === "number" ? value : Number.parseFloat(value ?? "0");
  const v = Number.isFinite(n) ? n : 0;
  if (locale === "ar" || locale === "en") {
    const abs = Math.abs(v).toLocaleString(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${v < 0 ? "−" : ""}€${abs}`;
  }
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "de-DE", { style: "currency", currency: "EUR" }).format(v);
}

/** A calendar day ("2026-10-31") or an instant, as a date. Days never shift. */
export function day(value: string | null | undefined, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return "";
  const opts: Intl.DateTimeFormatOptions = options ?? { day: "numeric", month: "long", year: "numeric" };
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(Date.UTC(y!, m! - 1, d!, 12)).toLocaleDateString(dateLocale(locale), { ...opts, timeZone: "UTC" });
  }
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? value : at.toLocaleDateString(dateLocale(locale), { ...opts, timeZone: "Europe/Berlin" });
}

/** "Saturday, 31 October 2026". */
export const longDay = (value: string | null | undefined, locale: Locale) =>
  day(value, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** A notification's time: "24 Oct, 12:30". */
export function when(value: string, locale: Locale): string {
  const tag = ({ de: "de-DE", en: "en-GB", tr: "tr-TR", ar: "ar-u-nu-latn" } as const)[locale];
  return new Date(value).toLocaleString(tag, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
}

/** The two-hour arrival window a start time stands for: "08:00:00" → "08:00 – 10:00". */
export function windowOf(start: string | null | undefined): string {
  if (!start) return "";
  const match = start.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return start;
  const hour = Number(match[1]);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hour)}:${match[2]} – ${pad(Math.min(hour + 2, 24))}:${match[2]}`;
}

/** The time windows a new date can be asked for, as the prototype offers them. */
export const TIME_WINDOWS = ["08:00 – 10:00", "10:00 – 12:00", "12:00 – 14:00", "14:00 – 16:00", "16:00 – 18:00"];

export function todayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "·"
  );
}

// ── Statuses and tabs ─────────────────────────────────────────────────────

export interface Pill {
  label: AcKey;
  bg: string;
  color: string;
}

const STATUS: Record<OrderStatus, Pill> = {
  quoted: { label: "stNew", bg: "#f1f3f5", color: "#4a514d" },
  confirmed: { label: "stConfirmed", bg: "#e9f5ee", color: "#2f6b4c" },
  completed: { label: "stDone", bg: "#f1f3f5", color: "#3d4440" },
  cancelled: { label: "stCancelled", bg: "#fff1f3", color: "#b7122b" },
};

export const statusPill = (status: OrderStatus): Pill => STATUS[status] ?? STATUS.quoted;

export type Tab = "up" | "past" | "can";

type Dated = Pick<OrderSummary, "status" | "scheduledDate"> & { scheduledSecondDate?: string | null };

/** Upcoming, past or cancelled, as the prototype's tabs sort them. */
export function tabOf(order: Dated, today = todayIso()): Tab {
  if (order.status === "cancelled") return "can";
  const last = order.scheduledSecondDate ?? order.scheduledDate;
  if (order.status === "completed" || (last && last < today)) return "past";
  return "up";
}

// ── The tracker ───────────────────────────────────────────────────────────

export interface Step {
  label: AcKey;
  sub: string;
  icon: string;
  done: boolean;
  current: boolean;
  /** The line to the next step is red: this one and the next are both done. */
  lineOn: boolean;
}

/** The detail the tracker reads. The list rows carry less, so most are optional. */
export type Trackable = Pick<OrderSummary, "status" | "createdAt" | "scheduledDate"> & {
  quoteSentAt?: string | null;
  confirmedAt?: string | null;
  team?: { name: string } | null;
};

/**
 * Received → Quote sent → Confirmed → Crew assigned → Service day → Completed.
 * The current step is the first one not done; a cancelled booking has none.
 */
export function trackOf(order: Trackable, locale: Locale, pending: string, today = todayIso()): Step[] {
  const s = order.status;
  const confirmed = s === "confirmed" || s === "completed";
  const date = order.scheduledDate;
  const raw: [AcKey, string, boolean, string][] = [
    ["trReceived", day(order.createdAt, locale), true, IC.inbox],
    ["trQuote", order.quoteSentAt ? day(order.quoteSentAt, locale) : confirmed ? "" : pending, Boolean(order.quoteSentAt) || confirmed, IC.euro],
    ["trConfirmed", order.confirmedAt ? day(order.confirmedAt, locale) : "", confirmed, IC.calCheck],
    ["trCrew", order.team?.name ?? "", Boolean(order.team) || s === "completed", IC.users],
    ["trDay", date ? day(date, locale) : "", s === "completed" || (confirmed && Boolean(date) && date! <= today), IC.truck],
    ["trDone", "", s === "completed", IC.homeCheck],
  ];
  const cancelled = s === "cancelled";
  const current = cancelled ? -1 : raw.findIndex((step) => !step[2]);
  return raw.map(([label, sub, isDone, icon], i) => {
    const done = !cancelled && isDone;
    const next = raw[i + 1];
    return { label, sub, icon, done, current: i === current, lineOn: done && Boolean(next?.[2]) && !cancelled };
  });
}

/** Where the little truck parks: on the current step, else on the last one done. */
export function truckIndex(steps: Step[]): number {
  const current = steps.findIndex((step) => step.current);
  return current >= 0 ? current : steps.filter((step) => step.done).length - 1;
}

// ── Prices ────────────────────────────────────────────────────────────────

/** `price` as `GET /api/orders/:id` adds it: gross lines that add up to the total. */
export interface PriceView {
  vatRate: string;
  lines: { key: string; params: Record<string, string | number>; net: string; gross: string }[];
  discount: { code: string; gross: string } | null;
  subtotalGross: string;
  totalGross: string;
  netAmount: string;
  vatAmount: string;
}

export interface DateRequest {
  id: string;
  requestedDate: string;
  requestedTime: string | null;
  reason: string | null;
  status: "requested" | "approved" | "declined";
  createdAt: string;
  decidedAt: string | null;
}

/** The order as the detail endpoint returns it to its customer. */
export interface AccountOrder extends OrderDetail {
  team: { id: string; name: string } | null;
  dateRequests?: DateRequest[];
  quoteSentAt?: string | null;
  price?: PriceView;
  answers?: Record<string, { value: string; byTeam?: boolean }> | null;
}

/**
 * The lines to show, gross. The server's `price` is used when present; an
 * older API without it falls back to the stored breakdown, whose lines are
 * VAT-inclusive for orders priced since pricing v2 and net before that —
 * told apart by which total they add up to.
 */
export function priceLines(order: AccountOrder): {
  lines: { key: string; params: Record<string, unknown>; gross: number }[];
  discount: { code: string; gross: number } | null;
  /** False only for an old order whose stored lines are net (no `price` view). */
  includesVat: boolean;
} {
  if (order.price) {
    return {
      lines: order.price.lines.map((line) => ({ key: line.key, params: line.params, gross: Number.parseFloat(line.gross) || 0 })),
      discount: order.price.discount ? { code: order.price.discount.code, gross: Number.parseFloat(order.price.discount.gross) || 0 } : null,
      includesVat: true,
    };
  }
  const all = order.priceBreakdown?.lines ?? [];
  const total = Number.parseFloat(order.totalGross) || 0;
  const net = Number.parseFloat(order.priceBreakdown?.netAmount ?? order.netAmount) || 0;
  const sum = all.reduce((acc, line) => acc + (Number.parseFloat(line.amount) || 0), 0);
  const includesVat = Math.abs(sum - total) <= Math.abs(sum - net);
  const discountLine = all.find((line) => line.key === "line.discount_code");
  return {
    lines: all.filter((line) => line.key !== "line.discount_code").map((line) => ({ key: line.key, params: line.params ?? {}, gross: Number.parseFloat(line.amount) || 0 })),
    discount: discountLine ? { code: String(discountLine.params?.code ?? order.discountCode ?? ""), gross: Math.abs(Number.parseFloat(discountLine.amount) || 0) } : null,
    includesVat,
  };
}

// ── Notifications ─────────────────────────────────────────────────────────

export interface MyNotification {
  id: string;
  kind: "info" | "important" | "offer";
  title: string;
  body: string;
  buttonText: string | null;
  buttonUrl: string | null;
  at: string;
  readAt: string | null;
}

export const NOTE_LOOK: Record<MyNotification["kind"], { d: string; bg: string; fg: string }> = {
  info: { d: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01", bg: "#eef3fb", fg: "#2d5a8c" },
  important: { d: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01", bg: "#fff1f3", fg: "#d71635" },
  offer: { d: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01", bg: "#fbf4e4", fg: "#9a6f00" },
};

/**
 * A notification's button link, made to work on this site: site paths get the
 * reader's language when they have none, and the prototype's `#/account…`
 * anchors map onto the account's routes.
 */
export function notificationHref(raw: string | null, locale: Locale): string | null {
  const url = raw?.trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("#/")) {
    const path = url.slice(1);
    const map: [RegExp, string][] = [
      [/^\/account\/orders\/(.+)$/, "/konto/auftraege"],
      [/^\/account\/orders$/, "/konto/auftraege"],
      [/^\/account\/invoices$/, "/konto/rechnungen"],
      [/^\/account\/notifications$/, "/konto/benachrichtigungen"],
      [/^\/account\/addresses$/, "/konto/adressen"],
      [/^\/account\/profile$/, "/konto/profil"],
      [/^\/account\/?$/, "/konto"],
    ];
    for (const [re, to] of map) if (re.test(path)) return `/${locale}${to}`;
    return `/${locale}${path === "/" ? "" : path}`;
  }
  if (url.startsWith("/")) return /^\/(de|en|ar|tr)(\/|$)/.test(url) ? url : `/${locale}${url}`;
  return null;
}

// ── Invoices and claims ───────────────────────────────────────────────────

export interface MyInvoice {
  id: string;
  number: string;
  orderId: string;
  orderReference: string;
  status: "sent" | "overdue" | "paid";
  issueDate: string | null;
  dueDate: string | null;
  totalGross: string;
  paidAt: string | null;
}

export function invoicePill(status: MyInvoice["status"]): Pill {
  if (status === "paid") return { label: "paid", bg: "#e9f5ee", color: "#2f6b4c" };
  if (status === "overdue") return { label: "stOverdue", bg: "#fff1f3", color: "#b7122b" };
  return { label: "open", bg: "#f1f3f5", color: "#4a514d" };
}

export interface MyClaim {
  id: string;
  orderId: string | null;
  orderReference: string | null;
  status: "reported" | "checking" | "insurer" | "resolved" | "rejected";
  item: string;
  description: string | null;
  photos: string[] | null;
  createdAt: string;
}

export function claimPill(status: MyClaim["status"]): Pill {
  switch (status) {
    case "checking":
    case "insurer":
      return { label: "dmS_review", bg: "#eef3fb", color: "#2d5a8c" };
    case "resolved":
      return { label: "dmS_resolved", bg: "#e9f5ee", color: "#2f6b4c" };
    case "rejected":
      return { label: "dmS_closed", bg: "#f1f3f5", color: "#4a514d" };
    default:
      return { label: "dmS_received", bg: "#fbf4e4", color: "#5c4a00" };
  }
}

export interface MyReview {
  id: string;
  orderId: string;
  orderReference: string;
  rating: number;
  comment: string | null;
  isPublished: boolean;
  hiddenAt?: string | null;
  adminReply: string | null;
  createdAt: string;
}
