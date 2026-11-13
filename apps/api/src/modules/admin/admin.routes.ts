import { isStaffRole } from "@mon/core";
import { db, schema } from "@mon/db";
import { and, asc, count, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedQuery } from "../../middleware/validate.js";

const { orders, teams, leads, dateChangeRequests } = schema;

/**
 * What the admin dashboard's frame and overview read.
 *
 * The overview is computed in the browser from the orders of the period, as
 * the admin prototype computes it, so the cards, the chart and the lists all
 * agree to the cent; this endpoint returns exactly those orders and nothing
 * the caller may not see.
 */
export const adminRouter: Router = Router();

adminRouter.use(requireAuth);

/**
 * The sidebar's badges. Each count only for a caller who may open the screen
 * it badges, so a role without the inbox never learns how full it is.
 */
adminRouter.get(
  "/counts",
  asyncHandler(async (req, res) => {
    const role = req.verifiedRole;
    if (!role || !isStaffRole(role)) throw AppError.forbidden();
    // The capabilities resolved for this request: a member counts only what their pages open.
    const perms = req.verifiedPermissions ?? [];

    const [newOrders, unreadInbox] = await Promise.all([
      perms.includes("orders.read")
        ? db.select({ n: count() }).from(orders).where(eq(orders.status, "quoted")).then((rows) => rows[0]?.n ?? 0)
        : Promise.resolve(0),
      perms.includes("messages.read")
        ? db.select({ n: count() }).from(leads).where(eq(leads.status, "new")).then((rows) => rows[0]?.n ?? 0)
        : Promise.resolve(0),
    ]);

    res.json({ newOrders, unreadInbox });
  }),
);

const overviewQuery = z.object({
  /** How far back the period starts, in days; the previous period doubles it. */
  days: z.coerce.number().int().min(7).max(400).default(30),
});

/** "2026-10-25" for a Date, in UTC, the way `date` columns compare. */
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

adminRouter.get(
  "/overview",
  requirePermission("orders.read"),
  validate({ query: overviewQuery }),
  asyncHandler(async (req, res) => {
    const { days } = validatedQuery<z.infer<typeof overviewQuery>>(req);
    const today = new Date();
    // The period and the one before it, so every card can show its change.
    const from = new Date(today.getTime() - 2 * (days + 1) * 864e5);
    const soon = new Date(today.getTime() + 15 * 864e5);

    const rows = await db
      .select({
        id: orders.id,
        reference: orders.reference,
        status: orders.status,
        serviceType: orders.serviceType,
        totalGross: orders.totalGross,
        contactName: orders.contactName,
        originAddress: orders.originAddress,
        destinationAddress: orders.destinationAddress,
        scheduledDate: orders.scheduledDate,
        scheduledTime: orders.scheduledTime,
        scheduledSecondDate: orders.scheduledSecondDate,
        teamId: orders.teamId,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(
        or(
          gte(orders.createdAt, from),
          and(gte(orders.scheduledDate, isoDay(today)), lte(orders.scheduledDate, isoDay(soon))),
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(5000);

    const [teamRows, pending] = await Promise.all([
      db
        .select({ id: teams.id, name: teams.name, area: teams.area })
        .from(teams)
        .where(eq(teams.isActive, true))
        .orderBy(asc(teams.sortOrder), asc(teams.name)),
      db
        .select({ orderId: dateChangeRequests.orderId })
        .from(dateChangeRequests)
        .where(and(eq(dateChangeRequests.status, "requested"), isNull(dateChangeRequests.decidedAt)))
        .orderBy(asc(dateChangeRequests.createdAt)),
    ]);

    res.json({
      orders: rows,
      teams: teamRows,
      dateRequests: { count: pending.length, firstOrderId: pending[0]?.orderId ?? null },
    });
  }),
);
