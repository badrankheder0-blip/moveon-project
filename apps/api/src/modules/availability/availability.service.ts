import { env } from "@mon/config";
import {
  addDays,
  capacityFor,
  classifyRange,
  compare,
  firstDayOfMonth,
  lastDayOfMonth,
  publicHolidaysBetween,
  toCalendarDate,
  weekday,
  type AvailabilityRules,
  type AvailabilitySnapshot,
  type CalendarDate,
  type DayAvailability,
} from "@mon/core";
import { db, schema } from "@mon/db";
import { and, between, eq, ne, sql } from "drizzle-orm";

import { AppError } from "../../lib/errors.js";

const { orders, blockedDays, capacityConfig, dayCapacities } = schema;

/**
 * Availability and capacity.
 *
 * The split here is deliberate:
 *
 *  - `getMonthAvailability` is **advisory**. It answers "what should the
 *    calendar look like?" and may be stale the moment it is returned.
 *
 *  - `reserveCapacity` is **authoritative**. It runs inside a transaction that
 *    locks the day, re-counts committed capacity, and either succeeds or
 *    raises `409 SLOT_TAKEN`.
 *
 * The legacy app had only the advisory half, in the browser. Two customers
 * looking at the last slot both saw "free" and both inserted successfully.
 *
 * Closed on both halves, without anything seeded: the closed weekday
 * (Sunday), every NRW public holiday (computed per year in @mon/core) and
 * the days blocked in the admin calendar. A day can also carry its own limit
 * (`day_capacities`) in place of the default per-day capacity.
 */

export async function getRules(): Promise<AvailabilityRules> {
  const [config] = await db
    .select()
    .from(capacityConfig)
    .where(eq(capacityConfig.id, "default"))
    .limit(1);

  if (!config) {
    throw AppError.internal("Capacity configuration is missing. Run `pnpm seed`.");
  }

  return {
    maxCapacityPerDay: config.maxCapacityPerDay,
    closedWeekday: config.closedWeekday,
    bookingHorizonDays: config.bookingHorizonDays,
    minLeadTimeHours: config.minLeadTimeHours,
    timeZone: env.BUSINESS_TIMEZONE,
  };
}

/**
 * Loads committed capacity and blocked days for a date range.
 *
 * Cancelled orders do not consume capacity. A job spanning two days consumes
 * capacity on both, which is why the second date is counted too.
 */
async function loadSnapshot(from: CalendarDate, to: CalendarDate): Promise<AvailabilitySnapshot> {
  const [primary, secondary, blocked, limits] = await Promise.all([
    db
      .select({
        day: orders.scheduledDate,
        used: sql<number>`sum(${orders.capacityUnits})::int`,
      })
      .from(orders)
      .where(and(between(orders.scheduledDate, from, to), ne(orders.status, "cancelled")))
      .groupBy(orders.scheduledDate),

    db
      .select({
        day: orders.scheduledSecondDate,
        used: sql<number>`sum(${orders.capacityUnits})::int`,
      })
      .from(orders)
      .where(and(between(orders.scheduledSecondDate, from, to), ne(orders.status, "cancelled")))
      .groupBy(orders.scheduledSecondDate),

    db
      .select()
      .from(blockedDays)
      .where(between(blockedDays.day, from, to)),

    db
      .select({ day: dayCapacities.day, maxCapacity: dayCapacities.maxCapacity })
      .from(dayCapacities)
      .where(between(dayCapacities.day, from, to)),
  ]);

  const bookedCapacity = new Map<CalendarDate, number>();

  for (const row of [...primary, ...secondary]) {
    if (!row.day) continue;
    const day = toCalendarDate(row.day);
    bookedCapacity.set(day, (bookedCapacity.get(day) ?? 0) + Number(row.used ?? 0));
  }

  const closed = new Map<CalendarDate, { reason: string; isPublicHoliday: boolean }>(
    blocked.map((row) => [toCalendarDate(row.day), { reason: row.reason, isPublicHoliday: row.isPublicHoliday }]),
  );
  // Holidays come from the calendar itself, so a year nobody seeded is closed too.
  for (const [day, holiday] of publicHolidaysBetween(from, to)) {
    if (!closed.has(day)) closed.set(day, { reason: holiday.name, isPublicHoliday: true });
  }

  return {
    bookedCapacity,
    blockedDays: closed,
    capacityOverrides: new Map(limits.map((row) => [toCalendarDate(row.day), row.maxCapacity])),
  };
}

/** Calendar for one month, for rendering the date picker. */
export async function getMonthAvailability(
  year: number,
  month: number,
  requiredCapacity = 1,
): Promise<DayAvailability[]> {
  const from = firstDayOfMonth(year, month);
  const to = lastDayOfMonth(year, month);

  const [rules, snapshot] = await Promise.all([getRules(), loadSnapshot(from, to)]);

  return classifyRange(from, to, rules, snapshot, requiredCapacity);
}

/**
 * Re-checks capacity for specific days under a row lock, inside the caller's
 * transaction. Throws `409 SLOT_TAKEN` if the day filled up in the meantime.
 *
 * `pg_advisory_xact_lock` serialises concurrent bookings for the same day
 * without locking the whole orders table: the lock is keyed on the date, so
 * bookings for different days still run in parallel. It is released
 * automatically when the transaction ends, including on rollback.
 */
export async function assertCapacityAvailable(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  days: readonly CalendarDate[],
  requiredCapacity: number,
): Promise<void> {
  const rules = await getRules();

  // Lock in a stable order so two concurrent bookings for overlapping days
  // cannot deadlock by taking the same locks in opposite order.
  const ordered = [...new Set(days)].sort();

  for (const day of ordered) {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${day}))`);
  }

  for (const day of ordered) {
    // Closed days first, so the customer hears why rather than "full".
    const holiday = publicHolidaysBetween(day, day).get(day);
    if (weekday(day) === rules.closedWeekday || holiday) {
      throw AppError.conflict("SLOT_TAKEN", "That date is not available.", {
        day,
        reason: holiday ? holiday.name : "closed",
      });
    }

    const [row] = await tx
      .select({ used: sql<number>`coalesce(sum(${orders.capacityUnits}), 0)::int` })
      .from(orders)
      .where(
        and(
          sql`(${orders.scheduledDate} = ${day} OR ${orders.scheduledSecondDate} = ${day})`,
          ne(orders.status, "cancelled"),
        ),
      );

    const used = Number(row?.used ?? 0);

    const [own] = await tx
      .select({ maxCapacity: dayCapacities.maxCapacity })
      .from(dayCapacities)
      .where(eq(dayCapacities.day, day))
      .limit(1);
    const limit = own?.maxCapacity ?? rules.maxCapacityPerDay;

    if (used + requiredCapacity > limit) {
      throw AppError.conflict(
        "SLOT_TAKEN",
        "That date was just booked by someone else. Please choose another day.",
        { day, remaining: Math.max(0, limit - used) },
      );
    }

    // A day blocked after the customer opened the calendar must also fail.
    const [blocked] = await tx
      .select()
      .from(blockedDays)
      .where(eq(blockedDays.day, day))
      .limit(1);

    if (blocked) {
      throw AppError.conflict("SLOT_TAKEN", "That date is not available.", {
        day,
        reason: blocked.reason,
      });
    }
  }
}

/** Admin: block or unblock a day. */
export async function setDayBlocked(
  day: CalendarDate,
  reason: string,
  createdBy: string,
): Promise<void> {
  await db
    .insert(blockedDays)
    .values({ day, reason, isPublicHoliday: false, createdBy })
    .onConflictDoUpdate({ target: blockedDays.day, set: { reason } });
}

/** One day as the admin calendar shows it. */
export interface AdminDay {
  date: CalendarDate;
  /** Capacity units booked (cancelled orders left out; a second day counts too). */
  used: number;
  /** What the day takes: its own limit or the default. */
  maxCapacity: number;
  /** The day's own limit, or null when the default applies. */
  ownLimit: number | null;
  /** Blocked in the admin calendar, with the reason given. */
  blocked: { reason: string } | null;
  /** The NRW holiday on this day, by its German name. */
  holiday: string | null;
  /** The closed weekday (Sunday). */
  closed: boolean;
}

/**
 * The admin calendar's view of a range: bookings against each day's limit,
 * and why a day is shut. Unlike the customer's calendar it ignores lead time
 * and the booking horizon: the office plans past both.
 */
export async function getAdminRange(
  from: CalendarDate,
  to: CalendarDate,
): Promise<{ defaultCapacity: number; closedWeekday: number; days: AdminDay[] }> {
  const [rules, snapshot, manual] = await Promise.all([
    getRules(),
    loadSnapshot(from, to),
    db
      .select({ day: blockedDays.day, reason: blockedDays.reason })
      .from(blockedDays)
      .where(and(between(blockedDays.day, from, to), eq(blockedDays.isPublicHoliday, false))),
  ]);
  const manualByDay = new Map(manual.map((row) => [toCalendarDate(row.day), row.reason]));

  const days: AdminDay[] = [];
  for (let cursor = from; compare(cursor, to) <= 0; cursor = addDays(cursor, 1)) {
    const entry = snapshot.blockedDays.get(cursor);
    const reason = manualByDay.get(cursor);
    days.push({
      date: cursor,
      used: snapshot.bookedCapacity.get(cursor) ?? 0,
      maxCapacity: capacityFor(cursor, rules, snapshot),
      ownLimit: snapshot.capacityOverrides?.get(cursor) ?? null,
      blocked: reason !== undefined ? { reason } : null,
      holiday: entry?.isPublicHoliday ? entry.reason : null,
      closed: weekday(cursor) === rules.closedWeekday,
    });
  }

  return { defaultCapacity: rules.maxCapacityPerDay, closedWeekday: rules.closedWeekday, days };
}

/** Admin: a day's own limit, or null to go back to the default. */
export async function setDayCapacity(day: CalendarDate, maxCapacity: number | null, updatedBy: string): Promise<void> {
  if (maxCapacity === null) {
    await db.delete(dayCapacities).where(eq(dayCapacities.day, day));
    return;
  }
  await db
    .insert(dayCapacities)
    .values({ day, maxCapacity, updatedBy })
    .onConflictDoUpdate({ target: dayCapacities.day, set: { maxCapacity, updatedBy, updatedAt: new Date() } });
}

/** Admin: how many jobs a day takes when it has no limit of its own. */
export async function setDefaultCapacity(maxCapacityPerDay: number): Promise<void> {
  const [updated] = await db
    .update(capacityConfig)
    .set({ maxCapacityPerDay, updatedAt: new Date() })
    .where(eq(capacityConfig.id, "default"))
    .returning({ id: capacityConfig.id });

  if (!updated) throw AppError.internal("Capacity configuration is missing. Run `pnpm seed`.");
}

export async function unblockDay(day: CalendarDate): Promise<void> {
  // Public holidays are generated, not manual, so they are not removable here.
  await db
    .delete(blockedDays)
    .where(and(eq(blockedDays.day, day), eq(blockedDays.isPublicHoliday, false)));
}
