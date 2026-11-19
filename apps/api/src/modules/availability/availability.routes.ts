import { toCalendarDate, type CalendarDate } from "@mon/core";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { feedRoom, publishToMany } from "../../realtime/gateway.js";
import { recordAudit } from "../audit/audit.service.js";

import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import * as availabilityService from "./availability.service.js";

export const availabilityRouter: Router = Router();

const monthQuery = z.object({
  year: z.coerce.number().int().min(2024).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  capacity: z.coerce.number().int().min(1).max(4).default(1),
});

/**
 * Public: the calendar must render before a visitor has an account.
 * This is advisory only — the authoritative check happens at booking time.
 */
availabilityRouter.get(
  "/",
  validate({ query: monthQuery }),
  asyncHandler(async (req, res) => {
    const { year, month, capacity } = validatedQuery<z.infer<typeof monthQuery>>(req);
    const days = await availabilityService.getMonthAvailability(year, month, capacity);

    res.json({ year, month, days });
  }),
);

const dayBody = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(1).max(200),
});

/**
 * Blocking a day removes capacity from the calendar, which is dispatch work
 * rather than administration — operators own the schedule. Naming the
 * capability keeps this route out of the way when the set of roles changes.
 */
availabilityRouter.post(
  "/blocked",
  requireAuth,
  requirePermission("availability.write"),
  validate({ body: dayBody }),
  asyncHandler(async (req, res) => {
    await availabilityService.setDayBlocked(
      req.body.day as never,
      req.body.reason,
      req.user!.id,
    );
    res.status(204).send();
  }),
);

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const rangeQuery = z.object({ from: isoDay, to: isoDay });

/** The highest limit a day can be given: far above any real crew, low enough to catch a typo. */
const MAX_DAY_CAPACITY = 50;

/**
 * Tells open calendars that a month changed: the booking calendar of anyone
 * looking at it (`month:YYYY-MM`) and the office's screens.
 */
async function announce(day: CalendarDate | null): Promise<void> {
  const rooms: string[] = [feedRoom("orders.read")];
  if (day) rooms.push(`month:${day.slice(0, 7)}`);
  await publishToMany(rooms, "availability.changed", { day });
}

/**
 * The admin calendar's days: bookings against each day's limit, and whether
 * it is blocked, a holiday or the closed weekday. At most about six weeks,
 * the size of a month grid.
 */
availabilityRouter.get(
  "/admin",
  requireAuth,
  requirePermission("orders.read"),
  validate({ query: rangeQuery }),
  asyncHandler(async (req, res) => {
    const { from, to } = validatedQuery<z.infer<typeof rangeQuery>>(req);
    const start = toCalendarDate(from);
    const end = toCalendarDate(to);
    if (start > end || Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`) > 62 * 86_400_000) {
      throw AppError.unprocessable("Ask for at most 62 days, from before to.");
    }
    res.json(await availabilityService.getAdminRange(start, end));
  }),
);

const dayUpdateBody = z.object({
  blocked: z.boolean(),
  reason: z.string().trim().max(200).optional(),
  /** The day's own limit, or null for the default. */
  maxCapacity: z.number().int().min(0).max(MAX_DAY_CAPACITY).nullable(),
});

/**
 * One day from the admin calendar's window: blocked or open, and its own
 * limit. Public holidays and the closed weekday stay closed whatever is sent.
 */
availabilityRouter.patch(
  "/days/:day",
  requireAuth,
  requirePermission("availability.write"),
  validate({ params: z.object({ day: isoDay }), body: dayUpdateBody }),
  asyncHandler(async (req, res) => {
    const day = toCalendarDate(validatedParams<{ day: string }>(req).day);
    const body = req.body as z.infer<typeof dayUpdateBody>;

    if (body.blocked) {
      await availabilityService.setDayBlocked(day, body.reason || "Gesperrt", req.user!.id);
    } else {
      await availabilityService.unblockDay(day);
    }
    await availabilityService.setDayCapacity(day, body.maxCapacity, req.user!.id);

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "calendar.day_updated",
      entityType: "day",
      entityId: day,
      changes: { blocked: body.blocked, ...(body.blocked ? { reason: body.reason || "Gesperrt" } : {}), maxCapacity: body.maxCapacity },
      ipAddress: req.ip,
      requestId: req.requestId,
    });
    await announce(day);

    const [updated] = (await availabilityService.getAdminRange(day, day)).days;
    res.json(updated);
  }),
);

/** How many jobs a day takes when it has no limit of its own. */
availabilityRouter.patch(
  "/config",
  requireAuth,
  requirePermission("availability.write"),
  validate({ body: z.object({ maxCapacityPerDay: z.number().int().min(0).max(MAX_DAY_CAPACITY) }) }),
  asyncHandler(async (req, res) => {
    const { maxCapacityPerDay } = req.body as { maxCapacityPerDay: number };
    await availabilityService.setDefaultCapacity(maxCapacityPerDay);

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "calendar.default_capacity",
      entityType: "capacity_config",
      entityId: "default",
      changes: { maxCapacityPerDay },
      ipAddress: req.ip,
      requestId: req.requestId,
    });
    await announce(null);

    res.json({ maxCapacityPerDay });
  }),
);

availabilityRouter.delete(
  "/blocked/:day",
  requireAuth,
  requirePermission("availability.write"),
  validate({ params: z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }) }),
  asyncHandler(async (req, res) => {
    await availabilityService.unblockDay(validatedParams<{ day: string }>(req).day as never);
    res.status(204).send();
  }),
);
