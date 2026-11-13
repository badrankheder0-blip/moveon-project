import { env } from "@mon/config";
import { fromInstant, toCalendarDate, toInstant } from "@mon/core";
import { db, schema } from "@mon/db";
import { desc, eq, isNotNull, sql } from "drizzle-orm";

import { AppError } from "../../lib/errors.js";

const { discountCodes, orders } = schema;

/** Any Drizzle executor: the pool, or an open transaction. */
type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

/** The audience as stored: trimmed, lower-case, unique, no blanks. */
export function normaliseAudience(emails: readonly string[]): string[] {
  return [...new Set(emails.map(normaliseEmail).filter(Boolean))];
}

/**
 * Whether a booking under `email` may use a code limited to `audience`.
 * An empty audience is everyone's.
 */
export function audienceAllows(audience: readonly string[] | null | undefined, email: string | null | undefined): boolean {
  const list = normaliseAudience(audience ?? []);
  if (list.length === 0) return true;
  return Boolean(email && list.includes(normaliseEmail(email)));
}

/**
 * Refuses a code the office limited to other customers.
 *
 * Kept apart from the quote's own checks (active, dates, uses) because the
 * email is not always known when a price is shown: an anonymous visitor gets
 * an estimate, and the booking — which always carries the contact email — is
 * where a restricted code is finally enforced.
 */
export async function assertDiscountAudience(executor: Executor, code: string, email: string | null | undefined): Promise<void> {
  const [row] = await executor
    .select({ audience: discountCodes.audience })
    .from(discountCodes)
    .where(eq(discountCodes.code, code.trim().toUpperCase()))
    .limit(1);

  if (row && !audienceAllows(row.audience, email)) {
    throw AppError.unprocessable("This discount code is not valid for this email address.");
  }
}

/** "Valid until 31 Dec" means through the end of that day, office time. */
export function endOfDay(date: string): Date {
  return new Date(toInstant(toCalendarDate(date), "23:59", env.BUSINESS_TIMEZONE).getTime() + 59_999);
}

export function calendarDateOf(instant: Date | null): string | null {
  return instant ? fromInstant(instant, env.BUSINESS_TIMEZONE) : null;
}

/** Every code, with how many orders used it — the prototype's "Used" column. */
export async function listCodesWithUses() {
  const [codes, uses] = await Promise.all([
    db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt)),
    db
      .select({ code: sql<string>`upper(${orders.discountCode})`, n: sql<number>`count(*)::int` })
      .from(orders)
      .where(isNotNull(orders.discountCode))
      .groupBy(sql`upper(${orders.discountCode})`),
  ]);

  const byCode = new Map(uses.map((row) => [row.code, Number(row.n)]));

  return codes.map((row) => ({
    ...row,
    validUntilDate: calendarDateOf(row.validUntil),
    uses: Math.max(byCode.get(row.code) ?? 0, row.usedCount),
  }));
}

/** Whether a code has ever been redeemed: such a code is switched off, not deleted. */
export async function codeWasUsed(executor: Executor, code: string): Promise<boolean> {
  const [row] = await executor.select({ usedCount: discountCodes.usedCount }).from(discountCodes).where(eq(discountCodes.code, code)).limit(1);
  if (row && row.usedCount > 0) return true;
  const [order] = await executor
    .select({ id: orders.id })
    .from(orders)
    .where(sql`upper(${orders.discountCode}) = ${code}`)
    .limit(1);
  return Boolean(order);
}
