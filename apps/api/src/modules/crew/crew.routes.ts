import { randomInt } from "node:crypto";

import { hashPassword, verifyPassword } from "@mon/auth";
import { db, schema } from "@mon/db";
import { and, asc, desc, eq, gte, isNotNull, lte, ne, notInArray, or, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { authRateLimit } from "../../middleware/rate-limit.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams } from "../../middleware/validate.js";
import { diffFields, recordAudit } from "../audit/audit.service.js";

const { employees, teams, orders } = schema;

/**
 * Employees (the crew), and the crew page's PIN sign-in.
 *
 * The office side is Employees in the admin prototype: who is on which team,
 * what they do, whether they are available this week, and the PIN each person
 * signs in to the crew page with. Managing it is dispatch's work, so it asks
 * for `orders.assign` — the same capability that puts a team on a job — both
 * to read and to change.
 *
 * Teams themselves are Settings' (/api/fleet); this only reads them, straight
 * from the table, so the screen's team choice works whoever owns the editor.
 */
export const crewRouter: Router = Router();

const ROLES = ["team_lead", "driver", "mover", "cleaner"] as const;
const STATUSES = ["available", "holiday", "sick"] as const;

/** Monday to Friday, in `Date.getDay()` numbering (0 = Sunday). */
const WEEKDAYS = [1, 2, 3, 4, 5];

// ── PINs ──────────────────────────────────────────────────────────────────

/**
 * PINs are stored as argon2 hashes, through the same `hashPassword` every
 * password goes through. A PIN is far shorter than the password policy
 * allows, so what is hashed is the PIN behind a fixed label — the label adds
 * no secrecy, it only lets the policy check pass without a second hashing
 * path that could drift from the first.
 */
const pinSecret = (pin: string) => `mon-crew-pin:v1:${pin}`;

const pinShape = z.string().regex(/^\d{4,6}$/, "A PIN is 4 to 6 digits.");

/**
 * Whose PIN this is, if anyone's.
 *
 * The crew page signs in with the PIN alone, so it has to be unique — and a
 * hash cannot be looked up, only checked. Every active employee's hash is
 * tried in turn. For a crew of dozens that is well under a second; a
 * company with hundreds of crew would want a keyed lookup column instead.
 */
async function employeeWithPin(pin: string, exceptId?: string) {
  const candidates = await db
    .select({ id: employees.id, pinHash: employees.pinHash })
    .from(employees)
    .where(and(isNotNull(employees.pinHash), eq(employees.isActive, true), exceptId ? ne(employees.id, exceptId) : undefined));

  for (const candidate of candidates) {
    if (candidate.pinHash && (await verifyPassword(candidate.pinHash, pinSecret(pin)))) return candidate.id;
  }

  return null;
}

/** A fresh six-digit PIN nobody else has. */
async function freshPin(exceptId?: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const pin = String(randomInt(0, 1_000_000)).padStart(6, "0");
    if (!(await employeeWithPin(pin, exceptId))) return pin;
  }

  throw AppError.internal("A free PIN could not be found. Try again.");
}

// ── This week ─────────────────────────────────────────────────────────────

/** "2026-10-25" in server-local time, the way `date` columns read. */
function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Monday and Sunday of the current week. */
function thisWeek(): { from: string; to: string } {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { from: dayKey(monday), to: dayKey(sunday) };
}

/**
 * Hours of work each team has this week: every job day of its orders, at the
 * order's estimated hours or — when nobody estimated them — the prototype's
 * typical length for the service (cleaning 4 h, junk removal 2 h, 6 h
 * otherwise). An employee's week is their team's week, as the prototype
 * counts it: the crew works its jobs together.
 */
async function teamHoursThisWeek(): Promise<Map<string, number>> {
  const { from, to } = thisWeek();
  const hours = sql<string>`coalesce(${orders.estimatedHours}, case ${orders.serviceType} when 'cleaning' then 4 when 'disposal' then 2 else 6 end)`;
  const inWeek = (column: typeof orders.scheduledDate | typeof orders.scheduledSecondDate) =>
    sql<number>`case when ${column} between ${from} and ${to} then 1 else 0 end`;

  const rows = await db
    .select({
      teamId: orders.teamId,
      hours: sql<string>`sum(${hours} * (${inWeek(orders.scheduledDate)} + ${inWeek(orders.scheduledSecondDate)}))::text`,
    })
    .from(orders)
    .where(
      and(
        isNotNull(orders.teamId),
        ne(orders.status, "cancelled"),
        or(
          and(gte(orders.scheduledDate, from), lte(orders.scheduledDate, to)),
          and(gte(orders.scheduledSecondDate, from), lte(orders.scheduledSecondDate, to)),
        ),
      ),
    )
    .groupBy(orders.teamId);

  return new Map(rows.map((row) => [row.teamId!, Math.round((Number.parseFloat(row.hours) || 0) * 10) / 10]));
}

const employeeColumns = {
  id: employees.id,
  fullName: employees.fullName,
  role: employees.role,
  teamId: employees.teamId,
  phone: employees.phone,
  email: employees.email,
  licence: employees.licence,
  status: employees.status,
  workDays: employees.workDays,
  hoursWeek: employees.hoursWeek,
  pinHash: employees.pinHash,
  isActive: employees.isActive,
  createdAt: employees.createdAt,
};

type EmployeeRow = { [K in keyof typeof employeeColumns]: (typeof employees.$inferSelect)[K] };

/** What the screen sees of an employee: never the PIN's hash, only whether there is one. */
function present(row: EmployeeRow, teamHours: Map<string, number>) {
  const { pinHash, hoursWeek, ...rest } = row;
  return {
    ...rest,
    hasPin: pinHash !== null,
    // The team's booked hours when the person is on a team; the hours kept on
    // the person otherwise.
    hoursWeek: row.teamId ? (teamHours.get(row.teamId) ?? 0) : Number.parseFloat(hoursWeek) || 0,
  };
}

// ── The office ────────────────────────────────────────────────────────────

const office = Router();
office.use(requireAuth, requirePermission("orders.assign"));

office.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [rows, teamRows, teamHours] = await Promise.all([
      db.select(employeeColumns).from(employees).orderBy(asc(employees.createdAt), asc(employees.fullName)),
      db
        .select({ id: teams.id, name: teams.name, area: teams.area, isActive: teams.isActive })
        .from(teams)
        .orderBy(asc(teams.sortOrder), asc(teams.name)),
      teamHoursThisWeek(),
    ]);

    res.json({
      employees: rows.map((row) => present(row, teamHours)),
      teams: teamRows,
      week: thisWeek(),
    });
  }),
);

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value ? value : null));

const employeeFields = {
  fullName: z.string().trim().min(1, "Enter a name.").max(120),
  role: z.enum(ROLES),
  teamId: z.string().uuid().nullable(),
  phone: nullableText(40),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(160)
    .nullable()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || z.string().email().safeParse(value).success, "Enter a valid email."),
  licence: nullableText(40),
  status: z.enum(STATUSES),
  workDays: z
    .array(z.number().int().min(0).max(6))
    .max(7)
    .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
  isActive: z.boolean(),
};

const createBody = z.object(employeeFields).partial();

/**
 * A new employee, as the prototype adds one: the name the screen sends (its
 * "New employee" in the office's language), a mover on the first team,
 * available, Monday to Friday, with a PIN of their own — returned once.
 */
office.post(
  "/",
  validate({ body: createBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createBody>;

    const teamId =
      body.teamId !== undefined
        ? body.teamId
        : ((
            await db
              .select({ id: teams.id })
              .from(teams)
              .where(eq(teams.isActive, true))
              .orderBy(asc(teams.sortOrder), asc(teams.name))
              .limit(1)
          )[0]?.id ?? null);

    const pin = await freshPin();

    const [created] = await db
      .insert(employees)
      .values({
        fullName: body.fullName ?? "New employee",
        role: body.role ?? "mover",
        teamId,
        phone: body.phone ?? null,
        email: body.email ?? null,
        licence: body.licence ?? null,
        status: body.status ?? "available",
        workDays: body.workDays ?? WEEKDAYS,
        isActive: body.isActive ?? true,
        pinHash: await hashPassword(pinSecret(pin)),
      })
      .returning(employeeColumns);

    if (!created) throw AppError.internal("The employee could not be added.");

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "employee.created",
      entityType: "employee",
      entityId: created.id,
      changes: { fullName: created.fullName, role: created.role, teamId: created.teamId },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.status(201).json({ employee: present(created, await teamHoursThisWeek()), pin });
  }),
);

const updateBody = z
  .object(employeeFields)
  .partial()
  .refine((body) => Object.values(body).some((value) => value !== undefined), "Nothing to change.");

const idParams = z.object({ id: z.string().uuid() });

office.patch(
  "/:id",
  validate({ params: idParams, body: updateBody }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<{ id: string }>(req);
    const body = req.body as z.infer<typeof updateBody>;

    const [before] = await db.select(employeeColumns).from(employees).where(eq(employees.id, id)).limit(1);
    if (!before) throw AppError.notFound("Employee");

    const [updated] = await db
      .update(employees)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning(employeeColumns);

    if (!updated) throw AppError.notFound("Employee");

    const { workDays: daysAfter, ...scalarAfter } = body;
    const changes: Record<string, unknown> = diffFields(before as Record<string, unknown>, scalarAfter);
    if (daysAfter && JSON.stringify(daysAfter) !== JSON.stringify(before.workDays)) {
      changes.workDays = { from: before.workDays, to: daysAfter };
    }

    if (Object.keys(changes).length > 0) {
      await recordAudit({
        actor: { id: req.user!.id, email: req.user!.email },
        action: "employee.updated",
        entityType: "employee",
        entityId: id,
        changes,
        ipAddress: req.ip,
        requestId: req.requestId,
      });
    }

    res.json({ employee: present(updated, await teamHoursThisWeek()) });
  }),
);

/**
 * A new PIN: the one typed in, or a fresh one. Returned once, then only its
 * hash is kept — so a forgotten PIN is replaced, never looked up.
 */
office.post(
  "/:id/pin",
  validate({ params: idParams, body: z.object({ pin: pinShape.optional() }) }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<{ id: string }>(req);
    const requested = (req.body as { pin?: string }).pin;

    const [existing] = await db.select({ id: employees.id }).from(employees).where(eq(employees.id, id)).limit(1);
    if (!existing) throw AppError.notFound("Employee");

    if (requested && (await employeeWithPin(requested, id))) {
      throw AppError.conflict("CONFLICT", "Someone else already signs in with this PIN. Choose another.");
    }

    const pin = requested ?? (await freshPin(id));

    await db
      .update(employees)
      .set({ pinHash: await hashPassword(pinSecret(pin)), updatedAt: new Date() })
      .where(eq(employees.id, id));

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "employee.pin_reset",
      entityType: "employee",
      entityId: id,
      // That it happened, never what it is.
      changes: { pin: "reset" },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json({ pin });
  }),
);

office.delete(
  "/:id",
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<{ id: string }>(req);

    const [removed] = await db
      .delete(employees)
      .where(eq(employees.id, id))
      .returning({ id: employees.id, fullName: employees.fullName, role: employees.role });

    if (!removed) throw AppError.notFound("Employee");

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "employee.deleted",
      entityType: "employee",
      entityId: id,
      changes: { fullName: removed.fullName, role: removed.role },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.status(204).send();
  }),
);

crewRouter.use("/employees", office);

// ── The crew page ─────────────────────────────────────────────────────────

/**
 * The crew page's sign-in: a PIN, and back come the person and their team's
 * upcoming jobs. Minimal on purpose — the crew page itself is still to be
 * built, and this is the contract it will sign in against.
 *
 * Rate limited as strictly as the password login: a PIN is a short secret,
 * and the limiter is what keeps guessing one from being practical. No session
 * is issued yet; the page holds nothing it could not fetch again with the PIN.
 */
crewRouter.post(
  "/login",
  authRateLimit,
  validate({ body: z.object({ pin: pinShape }) }),
  asyncHandler(async (req, res) => {
    const { pin } = req.body as { pin: string };

    const id = await employeeWithPin(pin);
    if (!id) throw AppError.unauthenticated("This PIN is not valid.");

    const [person] = await db
      .select({
        id: employees.id,
        fullName: employees.fullName,
        role: employees.role,
        status: employees.status,
        teamId: employees.teamId,
        teamName: teams.name,
        teamArea: teams.area,
      })
      .from(employees)
      .leftJoin(teams, eq(teams.id, employees.teamId))
      .where(eq(employees.id, id))
      .limit(1);

    if (!person) throw AppError.unauthenticated("This PIN is not valid.");

    const today = dayKey(new Date());

    const jobs = person.teamId
      ? await db
          .select({
            id: orders.id,
            reference: orders.reference,
            serviceType: orders.serviceType,
            status: orders.status,
            scheduledDate: orders.scheduledDate,
            scheduledTime: orders.scheduledTime,
            scheduledSecondDate: orders.scheduledSecondDate,
            estimatedHours: orders.estimatedHours,
            contactName: orders.contactName,
            contactPhone: orders.contactPhone,
            originAddress: orders.originAddress,
            destinationAddress: orders.destinationAddress,
            originFloor: orders.originFloor,
            destinationFloor: orders.destinationFloor,
            vehicleId: orders.vehicleId,
            notes: orders.notes,
          })
          .from(orders)
          .where(
            and(
              eq(orders.teamId, person.teamId),
              notInArray(orders.status, ["cancelled", "completed"]),
              or(gte(orders.scheduledDate, today), gte(orders.scheduledSecondDate, today)),
            ),
          )
          .orderBy(asc(orders.scheduledDate), asc(orders.scheduledTime), desc(orders.createdAt))
          .limit(50)
      : [];

    res.json({
      employee: {
        id: person.id,
        fullName: person.fullName,
        role: person.role,
        status: person.status,
        team: person.teamId ? { id: person.teamId, name: person.teamName, area: person.teamArea } : null,
      },
      jobs,
    });
  }),
);
