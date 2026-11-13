import { db, schema } from "@mon/db";
import { and, asc, desc, eq, gte, lte, or } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedQuery } from "../../middleware/validate.js";

const { orders, teams, vehicles } = schema;

/**
 * Reports: revenue, orders and crew and vehicle use per period, with CSV export.
 *
 * Like the overview, the figures are computed in the browser with the admin
 * prototype's own formulas, so the cards, the charts and the CSV agree to the
 * cent. This returns the orders that feed them: those created in the period
 * or in the months the revenue chart shows, plus every job of the next two
 * weeks for crew and vehicle use, and the active teams and vehicles.
 */
export const reportsRouter: Router = Router();

reportsRouter.use(requireAuth);

const reportQuery = z.object({
  days: z.coerce.number().int().min(7).max(400).default(90),
});

/** "2026-10-25" for a Date, in UTC, the way `date` columns compare. */
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

reportsRouter.get(
  "/",
  requirePermission("payments.read"),
  validate({ query: reportQuery }),
  asyncHandler(async (req, res) => {
    const { days } = validatedQuery<z.infer<typeof reportQuery>>(req);
    const now = new Date();

    // The revenue chart shows six months (twelve for a year), counted from
    // the first of the month, which can reach further back than the period.
    const months = days >= 365 ? 12 : 6;
    const chartStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
    const periodStart = new Date(now.getTime() - (days + 1) * 864e5);
    const from = chartStart < periodStart ? chartStart : periodStart;
    // A day of slack either side: the browser cuts the 14 days in its own time zone.
    const soonFrom = new Date(now.getTime() - 864e5);
    const soonTo = new Date(now.getTime() + 15 * 864e5);

    const [rows, teamRows, vehicleRows] = await Promise.all([
      db
        .select({
          id: orders.id,
          reference: orders.reference,
          status: orders.status,
          serviceType: orders.serviceType,
          customerType: orders.customerType,
          totalGross: orders.totalGross,
          contactName: orders.contactName,
          answers: orders.answers,
          originAddress: orders.originAddress,
          destinationAddress: orders.destinationAddress,
          scheduledDate: orders.scheduledDate,
          scheduledSecondDate: orders.scheduledSecondDate,
          estimatedHours: orders.estimatedHours,
          teamId: orders.teamId,
          vehicleId: orders.vehicleId,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(
          or(
            gte(orders.createdAt, from),
            and(gte(orders.scheduledDate, isoDay(soonFrom)), lte(orders.scheduledDate, isoDay(soonTo))),
            and(gte(orders.scheduledSecondDate, isoDay(soonFrom)), lte(orders.scheduledSecondDate, isoDay(soonTo))),
          ),
        )
        .orderBy(desc(orders.createdAt))
        .limit(10000),
      db
        .select({ id: teams.id, name: teams.name, area: teams.area })
        .from(teams)
        .where(eq(teams.isActive, true))
        .orderBy(asc(teams.sortOrder), asc(teams.name)),
      db
        .select({ id: vehicles.id, name: vehicles.name, plate: vehicles.plate })
        .from(vehicles)
        .where(eq(vehicles.isActive, true))
        .orderBy(asc(vehicles.sortOrder), asc(vehicles.name)),
    ]);

    res.json({
      orders: rows.map(({ answers, ...row }) => ({ ...row, company: answers?.company?.value?.trim() || null })),
      teams: teamRows,
      vehicles: vehicleRows,
    });
  }),
);
