import { db, schema } from "@mon/db";
import { and, asc, count, eq, inArray, isNotNull } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams } from "../../middleware/validate.js";
import { diffFields, recordAudit } from "../audit/audit.service.js";

const { teams, vehicles, orders, auditLogs } = schema;

/**
 * Teams and vehicles: the choices an order is assigned to (Settings > Teams, Vehicles).
 *
 * Reading them is for anyone who works with orders — the order detail, the
 * calendar, the live map and the reports all offer or show them. Changing
 * them is configuration. Unlike the rest of Settings they save at once:
 * a team is something orders point at, and an assignment made today cannot
 * wait for a "Save & publish" to name a team that exists.
 *
 * Deleting one leaves its orders unassigned (the foreign keys are
 * `on delete set null`), which the order screens show as "Not assigned".
 */
export const fleetRouter: Router = Router();

fleetRouter.use(requireAuth);

/** "Busy" for the badge beside a team: work that is booked and not finished. */
const OPEN_STATUSES = ["quoted", "confirmed"] as const;

/**
 * The prototype's starting crews and fleet, created once for a company that
 * has none. "Once" is remembered in the audit log rather than inferred from
 * empty tables, so an office that deletes every team is not handed the
 * defaults back on the next page load.
 */
async function ensureDefaults(kind: "team" | "vehicle"): Promise<void> {
  const table = kind === "team" ? teams : vehicles;
  const [rows] = await db.select({ n: count() }).from(table);
  if ((rows?.n ?? 0) > 0) return;

  const [history] = await db.select({ n: count() }).from(auditLogs).where(eq(auditLogs.entityType, kind));
  if ((history?.n ?? 0) > 0) return;

  if (kind === "team") {
    await db.insert(teams).values([
      { name: "Team A", area: "Köln", colour: "#d71635", sortOrder: 1 },
      { name: "Team B", area: "Düsseldorf", colour: "#3d5a99", sortOrder: 2 },
      { name: "Team C", area: "Ruhrgebiet", colour: "#3f705a", sortOrder: 3 },
    ]);
  } else {
    await db.insert(vehicles).values([
      { name: "Moving Van", capacityM3: "7.5", sortOrder: 1 },
      { name: "Small Truck", capacityM3: "19", sortOrder: 2 },
      { name: "Large Truck", capacityM3: "40", sortOrder: 3 },
    ]);
  }

  await recordAudit({ actor: { isSystem: true }, action: `fleet.${kind}_defaults_created`, entityType: kind });
}

const idParams = z.object({ id: z.string().uuid() });

// ── Teams ─────────────────────────────────────────────────────────────

const COLOUR = /^#[0-9a-fA-F]{6}$/;

const teamBody = z.object({
  name: z.string().trim().min(1).max(80),
  area: z.string().trim().max(80).nullable().optional(),
  colour: z.string().regex(COLOUR, "Expected a colour such as #d71635.").optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

function teamOut(row: typeof teams.$inferSelect, activeJobs = 0) {
  return { id: row.id, name: row.name, area: row.area, colour: row.colour, isActive: row.isActive, sortOrder: row.sortOrder, activeJobs };
}

fleetRouter.get(
  "/teams",
  requirePermission("orders.read"),
  asyncHandler(async (_req, res) => {
    await ensureDefaults("team");

    const [rows, busy] = await Promise.all([
      db.select().from(teams).orderBy(asc(teams.sortOrder), asc(teams.createdAt)),
      db
        .select({ teamId: orders.teamId, n: count() })
        .from(orders)
        .where(and(isNotNull(orders.teamId), inArray(orders.status, [...OPEN_STATUSES])))
        .groupBy(orders.teamId),
    ]);
    const jobs = new Map(busy.map((row) => [row.teamId, row.n]));

    res.json({ teams: rows.map((row) => teamOut(row, jobs.get(row.id) ?? 0)) });
  }),
);

fleetRouter.post(
  "/teams",
  requirePermission("settings.write"),
  validate({ body: teamBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof teamBody>;
    const sortOrder = body.sortOrder ?? (await nextSortOrder("team"));

    const [created] = await db
      .insert(teams)
      .values({ name: body.name, area: body.area ?? null, colour: body.colour ?? "#d71635", isActive: body.isActive ?? true, sortOrder })
      .returning();

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "fleet.team_created",
      entityType: "team",
      entityId: created!.id,
      changes: { name: created!.name, area: created!.area },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.status(201).json({ team: teamOut(created!) });
  }),
);

fleetRouter.patch(
  "/teams/:id",
  requirePermission("settings.write"),
  validate({ params: idParams, body: teamBody.partial() }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<{ id: string }>(req);
    const body = req.body as Partial<z.infer<typeof teamBody>>;

    const [before] = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
    if (!before) throw AppError.notFound("Team");

    const [updated] = await db.update(teams).set({ ...body, updatedAt: new Date() }).where(eq(teams.id, id)).returning();

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "fleet.team_updated",
      entityType: "team",
      entityId: id,
      changes: diffFields(before as Record<string, unknown>, body as Record<string, unknown>),
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json({ team: teamOut(updated!) });
  }),
);

fleetRouter.delete(
  "/teams/:id",
  requirePermission("settings.write"),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<{ id: string }>(req);

    const [deleted] = await db.delete(teams).where(eq(teams.id, id)).returning();
    if (!deleted) throw AppError.notFound("Team");

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "fleet.team_deleted",
      entityType: "team",
      entityId: id,
      changes: { name: deleted.name },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json({ ok: true });
  }),
);

// ── Vehicles ──────────────────────────────────────────────────────────

const vehicleBody = z.object({
  name: z.string().trim().min(1).max(80),
  plate: z.string().trim().max(20).nullable().optional(),
  // A number or a decimal string; the column is numeric(6,1) and must be > 0.
  capacityM3: z.coerce.number().positive().max(99_999).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

function vehicleOut(row: typeof vehicles.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    plate: row.plate,
    capacityM3: row.capacityM3 === null ? null : Number(row.capacityM3),
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

/** The body's fields as columns: the capacity as the numeric column's string. */
function vehicleColumns(body: Partial<z.infer<typeof vehicleBody>>) {
  const { capacityM3, plate, ...rest } = body;
  return {
    ...rest,
    ...(plate !== undefined ? { plate: plate || null } : {}),
    ...(capacityM3 !== undefined ? { capacityM3: capacityM3 === null ? null : String(Math.round(capacityM3 * 10) / 10) } : {}),
  };
}

fleetRouter.get(
  "/vehicles",
  requirePermission("orders.read"),
  asyncHandler(async (_req, res) => {
    await ensureDefaults("vehicle");

    const rows = await db.select().from(vehicles).orderBy(asc(vehicles.sortOrder), asc(vehicles.createdAt));
    res.json({ vehicles: rows.map(vehicleOut) });
  }),
);

fleetRouter.post(
  "/vehicles",
  requirePermission("settings.write"),
  validate({ body: vehicleBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof vehicleBody>;
    const sortOrder = body.sortOrder ?? (await nextSortOrder("vehicle"));

    const [created] = await db
      .insert(vehicles)
      .values({ isActive: true, ...vehicleColumns(body), name: body.name, sortOrder })
      .returning();

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "fleet.vehicle_created",
      entityType: "vehicle",
      entityId: created!.id,
      changes: { name: created!.name, plate: created!.plate, capacityM3: created!.capacityM3 },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.status(201).json({ vehicle: vehicleOut(created!) });
  }),
);

fleetRouter.patch(
  "/vehicles/:id",
  requirePermission("settings.write"),
  validate({ params: idParams, body: vehicleBody.partial() }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<{ id: string }>(req);
    const columns = vehicleColumns(req.body as Partial<z.infer<typeof vehicleBody>>);

    const [before] = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
    if (!before) throw AppError.notFound("Vehicle");

    const [updated] = await db.update(vehicles).set({ ...columns, updatedAt: new Date() }).where(eq(vehicles.id, id)).returning();

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "fleet.vehicle_updated",
      entityType: "vehicle",
      entityId: id,
      changes: diffFields(before as Record<string, unknown>, columns as Record<string, unknown>),
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json({ vehicle: vehicleOut(updated!) });
  }),
);

fleetRouter.delete(
  "/vehicles/:id",
  requirePermission("settings.write"),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<{ id: string }>(req);

    const [deleted] = await db.delete(vehicles).where(eq(vehicles.id, id)).returning();
    if (!deleted) throw AppError.notFound("Vehicle");

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "fleet.vehicle_deleted",
      entityType: "vehicle",
      entityId: id,
      changes: { name: deleted.name },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json({ ok: true });
  }),
);

/** New rows go to the end of the list. */
async function nextSortOrder(kind: "team" | "vehicle"): Promise<number> {
  const table = kind === "team" ? teams : vehicles;
  const rows = await db.select({ sortOrder: table.sortOrder }).from(table);
  return rows.reduce((max, row) => Math.max(max, row.sortOrder), 0) + 1;
}
