import { env } from "@mon/config";
import { toLocale, type Locale } from "@mon/core";
import { db, schema } from "@mon/db";
import type { Localized } from "@mon/db/schema";
import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";

import { logger } from "../../lib/logger.js";
import { dispatchDueNotifications } from "../notifications/notifications.service.js";
import { sendFreeformMail } from "./freeform-mail.js";
import { TEMPLATE_DEFAULTS, TEMPLATE_KEYS, type Channel, type TemplateKey } from "./messages.defaults.js";

const { messageTemplates, messageLog, orders, invoices, reviews } = schema;

export interface Template {
  key: TemplateKey;
  isEnabled: boolean;
  channels: Channel[];
  subject: Localized;
  body: Localized;
  updatedAt: Date | null;
}

const isKey = (key: string): key is TemplateKey => (TEMPLATE_KEYS as readonly string[]).includes(key);

/**
 * The six templates, in the order the screen lists them. The rows are
 * written the first time anyone asks and none exist yet, so a fresh database
 * starts with the prototype's texts rather than six empty messages.
 */
export async function getTemplates(): Promise<Template[]> {
  let rows = await db.select().from(messageTemplates);
  const missing = TEMPLATE_KEYS.filter((key) => !rows.some((row) => row.key === key));

  if (missing.length) {
    await db
      .insert(messageTemplates)
      .values(missing.map((key) => ({ key, ...TEMPLATE_DEFAULTS[key] })))
      .onConflictDoNothing();
    rows = await db.select().from(messageTemplates);
  }

  return TEMPLATE_KEYS.map((key) => {
    const row = rows.find((r) => r.key === key);
    const fallback = TEMPLATE_DEFAULTS[key];
    return {
      key,
      isEnabled: row?.isEnabled ?? fallback.isEnabled,
      channels: ((row?.channels ?? fallback.channels) as string[]).filter((c): c is Channel => c === "email" || c === "sms" || c === "whatsapp"),
      subject: row?.subject ?? fallback.subject,
      body: row?.body ?? fallback.body,
      updatedAt: row?.updatedAt ?? null,
    };
  });
}

// ── Rendering ────────────────────────────────────────────────────────────

const SERVICE_NAMES: Record<string, Record<Locale, string>> = {
  moving: { de: "Umzug", en: "Moving", tr: "Taşınma", ar: "نقل الأثاث" },
  cleaning: { de: "Reinigung", en: "Cleaning", tr: "Temizlik", ar: "التنظيف" },
  renovation: { de: "Renovierung", en: "Renovation", tr: "Tadilat", ar: "الترميم" },
  disposal: { de: "Entrümpelung", en: "Junk removal", tr: "Eşya tasfiyesi", ar: "إزالة الأغراض القديمة" },
};

const INTL: Record<Locale, string> = { de: "de-DE", en: "en-GB", tr: "tr-TR", ar: "ar-u-nu-latn" };

/** A localized text in the reader's language, else German, else any. */
export function pick(text: Localized | null | undefined, locale: Locale): string {
  if (!text) return "";
  return (text[locale] || text.de || text.en || Object.values(text).find((v) => v?.trim()) || "").trim();
}

export function fillVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? vars[name]! : match));
}

function formatMoney(value: string | number, locale: Locale): string {
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  return new Intl.NumberFormat(INTL[locale], { style: "currency", currency: "EUR" }).format(Number.isFinite(n) ? n : 0);
}

function formatDay(day: string | null | undefined, locale: Locale, long: boolean): string {
  if (!day) return "";
  const date = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString(INTL[locale], long ? { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" } : { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

const web = (path: string) => `${env.WEB_ORIGIN.replace(/\/+$/, "")}${path}`;

/** The values a template's {variables} are filled with, for one order. */
async function variablesFor(key: TemplateKey, orderId: string, locale: Locale, invoiceId?: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;

  const [invoice] = await db
    .select({ number: invoices.number, dueDate: invoices.dueDate, totalGross: invoices.totalGross })
    .from(invoices)
    .where(invoiceId ? and(eq(invoices.id, invoiceId), eq(invoices.orderId, orderId)) : eq(invoices.orderId, orderId))
    .orderBy(desc(invoices.createdAt))
    .limit(1);

  const usesInvoice = key === "invoice_sent" || key === "payment_reminder";
  const vars: Record<string, string> = {
    name: order.contactName,
    ref: order.reference,
    service: SERVICE_NAMES[order.serviceType]?.[locale] ?? order.serviceType,
    date: formatDay(order.scheduledDate, locale, true),
    time: order.scheduledTime ? order.scheduledTime.slice(0, 5) : "",
    total: formatMoney(usesInvoice && invoice ? invoice.totalGross : order.totalGross, locale),
    invoice: invoice?.number ?? "",
    due: formatDay(invoice?.dueDate, locale, false),
    // The booking in the customer's account; a review is left on its page.
    link: web(`/${locale}/konto/auftraege/${order.id}${key === "review_request" ? "#review" : ""}`),
  };

  return { order, vars };
}

/** Sample values for "Send test" and the editor's preview. */
export function sampleVariables(locale: Locale): Record<string, string> {
  const day = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  const due = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  return {
    name: "Lena",
    ref: "MON-2026-48213",
    service: SERVICE_NAMES.moving![locale],
    date: formatDay(day, locale, true),
    time: "09:00",
    total: formatMoney(1240, locale),
    invoice: "RE-2026-0042",
    due: formatDay(due, locale, false),
    link: web(`/${locale}/konto`),
  };
}

// ── Sending ──────────────────────────────────────────────────────────────

export interface SendResult {
  sent: number;
  failed: number;
  skipped?: "disabled" | "no-order" | "already-sent" | "no-email-channel" | "error";
}

/**
 * Renders one automatic message for one order, sends it on every channel
 * that can send today and writes each attempt to the sent log.
 *
 * Only email has a provider; SMS and WhatsApp are kept on the template so the
 * office can choose them now, and are skipped (not logged) until one is
 * connected. Never throws: a confirmation email that bounces must not undo
 * the confirmation, so the caller can `void sendTemplate(...)`.
 *
 * `onlyOnce` makes it idempotent per order — what the scheduled messages use
 * so a job that runs every few minutes reminds each customer once.
 */
export async function sendTemplate(
  key: TemplateKey,
  orderId: string,
  options: { invoiceId?: string; onlyOnce?: boolean } = {},
): Promise<SendResult> {
  try {
    if (options.onlyOnce) {
      const [done] = await db
        .select({ id: messageLog.id })
        .from(messageLog)
        .where(and(eq(messageLog.templateKey, key), eq(messageLog.orderId, orderId), inArray(messageLog.status, ["sent", "failed"])))
        .limit(1);
      if (done) return { sent: 0, failed: 0, skipped: "already-sent" };
    }

    const template = (await getTemplates()).find((t) => t.key === key)!;
    if (!template.isEnabled) return { sent: 0, failed: 0, skipped: "disabled" };
    if (!template.channels.includes("email")) return { sent: 0, failed: 0, skipped: "no-email-channel" };

    const [row] = await db.select({ locale: orders.locale }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!row) return { sent: 0, failed: 0, skipped: "no-order" };
    const locale = toLocale(row.locale);
    const data = await variablesFor(key, orderId, locale, options.invoiceId);
    if (!data) return { sent: 0, failed: 0, skipped: "no-order" };

    const subject = fillVariables(pick(template.subject, locale), data.vars);
    const body = fillVariables(pick(template.body, locale), data.vars);

    try {
      await sendFreeformMail({ to: data.order.contactEmail, subject, body, locale, tag: `message:${key}` });
      await db.insert(messageLog).values({ templateKey: key, orderId, channel: "email", recipient: data.order.contactEmail, status: "sent" });
      return { sent: 1, failed: 0 };
    } catch (error) {
      logger.error({ err: error, template: key, orderId }, "Customer message could not be sent");
      await db.insert(messageLog).values({
        templateKey: key,
        orderId,
        channel: "email",
        recipient: data.order.contactEmail,
        status: "failed",
        error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
      });
      return { sent: 0, failed: 1 };
    }
  } catch (error) {
    logger.error({ err: error, template: key, orderId }, "Customer message failed before sending");
    return { sent: 0, failed: 0, skipped: "error" };
  }
}

/**
 * "Send test": the template as it stands on screen (drafts included), filled
 * with sample values, to the person pressing the button. Logged as "test".
 */
export async function sendTestMessage(input: {
  key: TemplateKey;
  to: string;
  locale: Locale;
  subject: Localized;
  body: Localized;
}): Promise<void> {
  const vars = sampleVariables(input.locale);
  const subject = `[Test] ${fillVariables(pick(input.subject, input.locale), vars)}`;
  const body = fillVariables(pick(input.body, input.locale), vars);

  try {
    await sendFreeformMail({ to: input.to, subject, body, locale: input.locale, tag: `message-test:${input.key}` });
    await db.insert(messageLog).values({ templateKey: input.key, channel: "email", recipient: input.to, status: "test" });
  } catch (error) {
    await db.insert(messageLog).values({
      templateKey: input.key,
      channel: "email",
      recipient: input.to,
      status: "failed",
      error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
    });
    throw error;
  }
}

// ── The time-based messages ──────────────────────────────────────────────

const ZONE = "Europe/Berlin";

/** "2026-10-25" and the hour, on the office's clock. */
function berlinClock(now: Date): { day: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

export interface ScheduledRun {
  reminder: number;
  reviewRequest: number;
  paymentReminder: number;
  notifications: number;
}

/**
 * The three messages that go out on a clock rather than on an event, plus any
 * scheduled notification that has come due. Safe to run as often as wanted
 * (every 15 minutes is plenty): each message goes to each order once.
 *
 *  - reminder: from 18:00 Berlin time, for confirmed jobs scheduled tomorrow;
 *  - review request: a day after an order was completed, unless the customer
 *    has already reviewed it (orders completed more than two weeks ago are
 *    left alone, so switching the message on does not mail old customers);
 *  - payment reminder: seven days after an unpaid invoice fell due (looking
 *    back sixty days for the same reason). It also counts the reminder on the
 *    invoice, as the Invoices screen's own "Reminder" does.
 */
export async function runScheduledMessages(now: Date = new Date()): Promise<ScheduledRun> {
  const result: ScheduledRun = { reminder: 0, reviewRequest: 0, paymentReminder: 0, notifications: 0 };
  const clock = berlinClock(now);

  if (clock.hour >= 18) {
    const tomorrow = addDays(clock.day, 1);
    const due = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.status, "confirmed"), eq(orders.scheduledDate, tomorrow)));
    for (const order of due) {
      if ((await sendTemplate("reminder", order.id, { onlyOnce: true })).sent) result.reminder += 1;
    }
  }

  const completed = await db
    .select({ id: orders.id })
    .from(orders)
    .leftJoin(reviews, eq(reviews.orderId, orders.id))
    .where(
      and(
        eq(orders.status, "completed"),
        lte(orders.completedAt, new Date(now.getTime() - 864e5)),
        gte(orders.completedAt, new Date(now.getTime() - 14 * 864e5)),
        isNull(reviews.id),
      ),
    );
  for (const order of completed) {
    if ((await sendTemplate("review_request", order.id, { onlyOnce: true })).sent) result.reviewRequest += 1;
  }

  const overdue = await db
    .select({ id: invoices.id, orderId: invoices.orderId })
    .from(invoices)
    .where(
      and(
        isNull(invoices.paidAt),
        inArray(invoices.status, ["sent", "overdue"]),
        lte(invoices.dueDate, addDays(clock.day, -7)),
        gte(invoices.dueDate, addDays(clock.day, -60)),
      ),
    );
  for (const invoice of overdue) {
    const sent = await sendTemplate("payment_reminder", invoice.orderId, { invoiceId: invoice.id, onlyOnce: true });
    if (sent.sent) {
      result.paymentReminder += 1;
      await db
        .update(invoices)
        .set({ remindersSent: sql`${invoices.remindersSent} + 1`, lastReminderAt: now, updatedAt: now })
        .where(eq(invoices.id, invoice.id));
    }
  }

  result.notifications = await dispatchDueNotifications(now);
  return result;
}

export { isKey };
