import { env } from "@mon/config";
import { toLocale, type Locale } from "@mon/core";
import { db, schema } from "@mon/db";
import type { Localized } from "@mon/db/schema";
import { and, count, desc, eq, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";

import { logger } from "../../lib/logger.js";
import { sendFreeformMail } from "../messages/freeform-mail.js";

const { notifications, notificationReads, users, employees } = schema;

/**
 * Announcements: who they reach, how many of them read them, and the email
 * that goes with them.
 *
 * Recipients of an "individual" notification are user ids, and employees
 * (who sign in to the crew page with a PIN and have no user account) are
 * written `employee:<id>` in the same list.
 */

export const AUDIENCES = ["customers", "employees", "everyone", "individual"] as const;
export const KINDS = ["info", "important", "offer"] as const;
export const NOTIFY_CHANNELS = ["inapp", "email", "sms", "whatsapp"] as const;

export type NotificationRow = typeof notifications.$inferSelect;

const EMPLOYEE = "employee:";
export const isEmployeeKey = (key: string) => key.startsWith(EMPLOYEE);
export const employeeKey = (id: string) => `${EMPLOYEE}${id}`;

/** A localized text in the reader's language, else German, else any. */
export function pickText(text: Localized | null | undefined, locale: Locale): string {
  if (!text) return "";
  return (text[locale] || text.de || text.en || Object.values(text).find((v) => v?.trim()) || "").trim();
}

/** When a notification became (or becomes) visible in the app. */
export const visibleAt = (n: Pick<NotificationRow, "sentAt" | "scheduledAt" | "createdAt">) => n.sentAt ?? n.scheduledAt ?? n.createdAt;

// ── Reach and reads ──────────────────────────────────────────────────────

/**
 * How many people each notification was for, and how many have read it.
 *
 * A broadcast to customers counts the customer accounts that existed when it
 * went out — the people who could have seen it — so the read rate does not
 * sink every time someone signs up.
 */
export async function reachOf(list: NotificationRow[]): Promise<Map<string, { total: number; reads: number }>> {
  const out = new Map<string, { total: number; reads: number }>();
  if (!list.length) return out;

  const [customers, [staff], reads] = await Promise.all([
    db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(and(eq(users.role, "customer"), eq(users.status, "active"))),
    db.select({ n: count() }).from(employees).where(eq(employees.isActive, true)),
    db
      .select({ id: notificationReads.notificationId, n: count() })
      .from(notificationReads)
      .where(inArray(notificationReads.notificationId, list.map((n) => n.id)))
      .groupBy(notificationReads.notificationId),
  ]);

  const joined = customers.map((c) => c.createdAt.getTime()).sort((a, b) => a - b);
  const customersAt = (at: Date) => {
    // Customers whose account existed at `at`: a binary search over the sorted times.
    let lo = 0;
    let hi = joined.length;
    const t = at.getTime();
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (joined[mid]! <= t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const crew = staff?.n ?? 0;

  for (const n of list) {
    const at = visibleAt(n);
    const total =
      n.audience === "customers"
        ? customersAt(at)
        : n.audience === "employees"
          ? crew
          : n.audience === "everyone"
            ? customersAt(at) + crew
            : n.recipients.length;
    out.set(n.id, { total, reads: reads.find((r) => r.id === n.id)?.n ?? 0 });
  }
  return out;
}

/** Display names for the people an individual notification went to. */
export async function recipientNames(keys: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const userIds = keys.filter((k) => !isEmployeeKey(k));
  const employeeIds = keys.filter(isEmployeeKey).map((k) => k.slice(EMPLOYEE.length));
  const [u, e] = await Promise.all([
    userIds.length ? db.select({ id: users.id, name: users.fullName, email: users.email }).from(users).where(inArray(users.id, userIds)) : [],
    employeeIds.length ? db.select({ id: employees.id, name: employees.fullName }).from(employees).where(inArray(employees.id, employeeIds)) : [],
  ]);
  for (const row of u) names.set(row.id, row.name || row.email);
  for (const row of e) names.set(employeeKey(row.id), row.name);
  return names;
}

// ── Email ────────────────────────────────────────────────────────────────

interface Reader {
  email: string;
  locale: Locale;
}

async function emailReaders(n: NotificationRow): Promise<Reader[]> {
  const customers = n.audience === "customers" || n.audience === "everyone";
  const crew = n.audience === "employees" || n.audience === "everyone";
  const userIds = n.audience === "individual" ? n.recipients.filter((k) => !isEmployeeKey(k)) : [];
  const employeeIds = n.audience === "individual" ? n.recipients.filter(isEmployeeKey).map((k) => k.slice(EMPLOYEE.length)) : [];

  const [u, e] = await Promise.all([
    customers || userIds.length
      ? db
          .select({ email: users.email, locale: users.locale })
          .from(users)
          .where(and(eq(users.status, "active"), customers ? eq(users.role, "customer") : inArray(users.id, userIds)))
      : [],
    crew || employeeIds.length
      ? db
          .select({ email: employees.email })
          .from(employees)
          .where(and(eq(employees.isActive, true), isNotNull(employees.email), crew ? undefined : inArray(employees.id, employeeIds)))
      : [],
  ]);

  const seen = new Set<string>();
  const readers: Reader[] = [];
  for (const r of [...u.map((x) => ({ email: x.email, locale: toLocale(x.locale) })), ...e.map((x) => ({ email: x.email ?? "", locale: "de" as Locale }))]) {
    const key = r.email.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    readers.push(r);
  }
  return readers;
}

/**
 * Sends the email side of a notification that has gone out. In-app needs
 * nothing sent: the account reads it from the table. SMS and WhatsApp wait
 * for a provider. Runs after the response; failures are logged per address.
 */
export async function deliver(n: NotificationRow): Promise<void> {
  if (!n.channels.includes("email")) return;
  const readers = await emailReaders(n);
  let failed = 0;

  // A link on the site ("/de/konto") is made absolute for the email; an
  // in-app anchor ("#…") means nothing outside the app and is left out.
  const raw = n.buttonUrl?.trim() ?? "";
  const url = raw.startsWith("/") ? `${env.WEB_ORIGIN.replace(/\/+$/, "")}${raw}` : raw;

  for (const reader of readers) {
    const button = pickText(n.buttonText, reader.locale);
    try {
      await sendFreeformMail({
        to: reader.email,
        subject: pickText(n.title, reader.locale),
        body: pickText(n.body, reader.locale),
        locale: reader.locale,
        button: button && /^https?:\/\//i.test(url) ? { label: button, url } : null,
        tag: "notification",
      });
    } catch (error) {
      failed += 1;
      logger.error({ err: error, notificationId: n.id, to: reader.email }, "Notification email could not be sent");
    }
  }

  logger.info({ notificationId: n.id, recipients: readers.length, failed }, "Notification emails delivered");
}

/**
 * Marks every scheduled notification whose time has come as sent and sends
 * its email. The update claims each row atomically (`sent_at is null`), so
 * two runs at once never send one twice. Returns how many went out.
 */
export async function dispatchDueNotifications(now: Date = new Date()): Promise<number> {
  const due = await db
    .update(notifications)
    .set({ sentAt: sql`coalesce(${notifications.scheduledAt}, ${now.toISOString()}::timestamptz)` })
    .where(and(isNull(notifications.sentAt), lte(notifications.scheduledAt, now)))
    .returning();

  for (const n of due) {
    void deliver(n).catch((error) => logger.error({ err: error, notificationId: n.id }, "Notification delivery failed"));
  }
  return due.length;
}

// ── Who sees what ────────────────────────────────────────────────────────

/**
 * The notifications a signed-in account sees: those addressed to it, and the
 * broadcasts for its side (customers, or the staff for a staff account) that
 * went out after it existed. A scheduled one appears at its time even before
 * the scheduler has marked it sent.
 */
export function visibleTo(user: { id: string; role: string; createdAt: Date }, now: Date) {
  const shownAt = sql`coalesce(${notifications.sentAt}, ${notifications.scheduledAt}, ${notifications.createdAt})`;
  const broadcast = user.role === "customer" ? ["customers", "everyone"] : ["employees", "everyone"];
  return and(
    sql`${shownAt} <= ${now.toISOString()}::timestamptz`,
    or(
      and(eq(notifications.audience, "individual"), sql`${notifications.recipients} @> ${JSON.stringify([user.id])}::jsonb`),
      and(inArray(notifications.audience, broadcast), sql`${shownAt} >= ${user.createdAt.toISOString()}::timestamptz`),
    ),
  );
}

/**
 * For the crew page: what an employee (signed in with their PIN) should see —
 * broadcasts to the employees or to everyone, and notifications sent to them
 * by name. Reads cannot be recorded for employees (`notification_reads` keys
 * on user accounts), so the crew page tracks "read" on its own side.
 */
export async function notificationsForEmployee(employeeId: string, locale: Locale = "de", now: Date = new Date()) {
  const shownAt = sql`coalesce(${notifications.sentAt}, ${notifications.scheduledAt}, ${notifications.createdAt})`;
  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        sql`${shownAt} <= ${now.toISOString()}::timestamptz`,
        or(
          inArray(notifications.audience, ["employees", "everyone"]),
          and(eq(notifications.audience, "individual"), sql`${notifications.recipients} @> ${JSON.stringify([employeeKey(employeeId)])}::jsonb`),
        ),
      ),
    )
    .orderBy(desc(shownAt))
    .limit(50);

  return rows.map((n) => ({
    id: n.id,
    kind: n.kind,
    title: pickText(n.title, locale),
    body: pickText(n.body, locale),
    buttonText: pickText(n.buttonText, locale) || null,
    buttonUrl: n.buttonUrl,
    at: visibleAt(n),
  }));
}
