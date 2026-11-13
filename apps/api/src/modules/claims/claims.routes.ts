import { IMAGE_UPLOAD_MAX_BYTES, can, checkMediaUpload } from "@mon/core";
import { db, schema } from "@mon/db";
import { and, desc, eq, ilike, ne, or, type SQL } from "drizzle-orm";
import { Router, type RequestHandler } from "express";
import multer from "multer";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { storeUpload, uploadsEnabled, uploadsUnavailable } from "../../lib/upload-storage.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { uploadRateLimit } from "../../middleware/rate-limit.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";

const { damageClaims, orders, users } = schema;

/**
 * Damage cases, from first report to solution.
 *
 * reported → checking → insurer → resolved · rejected
 *
 * Staff open and work cases from the dashboard; a signed-in customer reports
 * damage on one of their own orders from their account, which opens a case
 * with the source "customer". The crew page reports with the source "crew"
 * through the same staff endpoint.
 */
export const claimsRouter: Router = Router();

claimsRouter.use(requireAuth);

export const CLAIM_STATUSES = ["reported", "checking", "insurer", "resolved", "rejected"] as const;
export const CLAIM_SOURCES = ["customer", "crew", "team"] as const;
export const CLAIM_SOLUTIONS = ["none", "repair", "compensation", "replacement"] as const;

interface ClaimNote {
  at: string;
  text: string;
  by?: string;
}

/**
 * The notes timeline.
 *
 * `damage_claims.notes` is a text column, and the prototype keeps a dated list
 * of notes; the list is stored there as JSON. Anything that is not such a list
 * (a note written before this screen existed) reads as one note from the day
 * the case was opened, so nothing already written is lost.
 */
function readNotes(raw: string | null, createdAt: Date): ClaimNote[] {
  if (!raw?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((n): n is { at: unknown; text: unknown; by?: unknown } => !!n && typeof n === "object")
        .map((n) => ({
          at: typeof n.at === "string" ? n.at : createdAt.toISOString(),
          text: typeof n.text === "string" ? n.text : "",
          ...(typeof n.by === "string" ? { by: n.by } : {}),
        }))
        .filter((n) => n.text);
    }
  } catch {
    // Plain text, handled below.
  }
  return [{ at: createdAt.toISOString(), text: raw }];
}

/** "1.240,50", "1240.5", 1240.5 → "1240.50"; empty → null. */
function money(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  let text = String(value).trim().replace(/\s|€/g, "");
  if (!text) return null;
  // A German amount with thousands dots and a decimal comma.
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) text = text.replace(/\./g, "");
  const n = Number.parseFloat(text.replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n >= 1e8) throw AppError.badRequest("Enter a valid amount.");
  return n.toFixed(2);
}

const amount = z.union([z.number(), z.string().max(30)]).nullable().optional();

/** A photo is a link: an uploaded file's URL or one pasted from elsewhere. */
const photo = z
  .string()
  .trim()
  .max(2000)
  .refine((u) => /^https?:\/\/\S+$/i.test(u) || /^\/[^\s/]\S*$/.test(u), "Expected an image URL.");

const claimColumns = {
  id: damageClaims.id,
  orderId: damageClaims.orderId,
  orderReference: orders.reference,
  customerName: orders.contactName,
  customerEmail: orders.contactEmail,
  source: damageClaims.source,
  status: damageClaims.status,
  item: damageClaims.item,
  description: damageClaims.description,
  photos: damageClaims.photos,
  claimedAmount: damageClaims.claimedAmount,
  approvedAmount: damageClaims.approvedAmount,
  solution: damageClaims.solution,
  notes: damageClaims.notes,
  reportedBy: damageClaims.reportedBy,
  reporterName: users.fullName,
  createdAt: damageClaims.createdAt,
  updatedAt: damageClaims.updatedAt,
};

function selectClaims() {
  return db
    .select(claimColumns)
    .from(damageClaims)
    .leftJoin(orders, eq(orders.id, damageClaims.orderId))
    .leftJoin(users, eq(users.id, damageClaims.reportedBy));
}

type ClaimRow = Awaited<ReturnType<typeof selectClaims>>[number];

function present(row: ClaimRow) {
  return { ...row, photos: row.photos ?? [], notes: readNotes(row.notes, row.createdAt) };
}

async function loadClaim(id: string) {
  const [row] = await selectClaims().where(eq(damageClaims.id, id)).limit(1);
  if (!row) throw AppError.notFound("Damage case");
  return present(row);
}

// ── Staff: the list ──────────────────────────────────────────────────────

const listQuery = z.object({
  status: z.enum(CLAIM_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
});

claimsRouter.get(
  "/",
  requirePermission("complaints.read"),
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { status, q } = validatedQuery<z.infer<typeof listQuery>>(req);
    const where: SQL[] = [];
    if (status) where.push(eq(damageClaims.status, status));
    if (q) {
      const term = `%${q}%`;
      where.push(or(ilike(damageClaims.item, term), ilike(orders.reference, term), ilike(orders.contactName, term))!);
    }

    const rows = await selectClaims()
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(damageClaims.createdAt))
      .limit(500);

    res.json({ claims: rows.map(present) });
  }),
);

/**
 * Orders a case can be linked to, searched by reference or name. The newest
 * ones that were not called off when nothing is typed, as the prototype's
 * picker offers them.
 */
claimsRouter.get(
  "/orders",
  requirePermission("complaints.read"),
  validate({ query: z.object({ q: z.string().trim().max(100).optional() }) }),
  asyncHandler(async (req, res) => {
    const { q } = validatedQuery<{ q?: string }>(req);
    const term = q ? `%${q}%` : null;

    const rows = await db
      .select({
        id: orders.id,
        reference: orders.reference,
        contactName: orders.contactName,
        status: orders.status,
        serviceType: orders.serviceType,
        scheduledDate: orders.scheduledDate,
      })
      .from(orders)
      .where(
        term
          ? or(ilike(orders.reference, term), ilike(orders.contactName, term), ilike(orders.contactEmail, term))
          : ne(orders.status, "cancelled"),
      )
      .orderBy(desc(orders.createdAt))
      .limit(40);

    res.json({ orders: rows });
  }),
);

// ── Customers: their own reports ────────────────────────────────────────

/**
 * The caller's own damage reports: cases on their orders, or reported by
 * them. The office's notes stay out of it; the decision does not.
 */
claimsRouter.get(
  "/mine",
  asyncHandler(async (req, res) => {
    const me = req.user!.id;
    const rows = await db
      .select({
        id: damageClaims.id,
        orderId: damageClaims.orderId,
        orderReference: orders.reference,
        status: damageClaims.status,
        item: damageClaims.item,
        description: damageClaims.description,
        photos: damageClaims.photos,
        claimedAmount: damageClaims.claimedAmount,
        approvedAmount: damageClaims.approvedAmount,
        solution: damageClaims.solution,
        createdAt: damageClaims.createdAt,
        updatedAt: damageClaims.updatedAt,
      })
      .from(damageClaims)
      .leftJoin(orders, eq(orders.id, damageClaims.orderId))
      .where(or(eq(orders.userId, me), eq(damageClaims.reportedBy, me)))
      .orderBy(desc(damageClaims.createdAt))
      .limit(100);

    res.json({ claims: rows });
  }),
);

// ── Customers: photos for a report ──────────────────────────────────────

/**
 * Whether a report can carry photos here. Asked first, so the account offers
 * "Add photo" only where storage is configured rather than a button that can
 * only fail.
 */
claimsRouter.get("/photos", (_req, res) => {
  res.json({ enabled: uploadsEnabled, maxBytes: IMAGE_UPLOAD_MAX_BYTES });
});

/** One photo, in memory, capped at the photo limit; nothing else in the form. */
const parsePhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: IMAGE_UPLOAD_MAX_BYTES, files: 1, fields: 0, parts: 1 },
}).single("file");

const receivePhoto: RequestHandler = (req, res, next) => {
  parsePhoto(req, res, (error: unknown) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      return next(
        error.code === "LIMIT_FILE_SIZE"
          ? new AppError("PAYLOAD_TOO_LARGE", 413, `The photo is larger than ${Math.round(IMAGE_UPLOAD_MAX_BYTES / (1024 * 1024))} MB.`)
          : AppError.badRequest('Send exactly one photo, in a form field named "file".'),
      );
    }
    next(AppError.badRequest("The upload could not be read."));
  });
};

/**
 * Stores a photo for a damage report and returns its URL, which the report
 * (POST /) then carries in `photos`. Any signed-in account may upload: the
 * report itself is what checks the order is theirs. Photos only, decided by
 * the bytes; the same per-user limit as the dashboard's uploads.
 */
claimsRouter.post(
  "/photos",
  uploadRateLimit,
  (_req, _res, next) => next(uploadsEnabled ? undefined : uploadsUnavailable()),
  receivePhoto,
  asyncHandler(async (req, res) => {
    if (!req.file) throw AppError.badRequest('Send the photo in a form field named "file".');

    const checked = checkMediaUpload(req.file.buffer, "image");
    if (!checked.ok) {
      throw checked.reason === "too_large"
        ? new AppError("PAYLOAD_TOO_LARGE", 413, `The photo is larger than ${Math.round(IMAGE_UPLOAD_MAX_BYTES / (1024 * 1024))} MB.`)
        : checked.reason === "empty"
          ? AppError.badRequest("The file is empty.")
          : new AppError("UNSUPPORTED_MEDIA_TYPE", 415, "Only JPEG, PNG, WebP and AVIF photos can be uploaded.");
    }

    const { key, url } = await storeUpload(req.file.buffer, checked.format);

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "claim.photo_uploaded",
      entityType: "upload",
      entityId: key,
      changes: { contentType: checked.format.contentType, bytes: req.file.size },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.status(201).json({ url });
  }),
);

const idParam = z.object({ id: z.string().uuid() });

claimsRouter.get(
  "/:id",
  requirePermission("complaints.read"),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json({ claim: await loadClaim(validatedParams<{ id: string }>(req).id) });
  }),
);

// ── Opening a case ───────────────────────────────────────────────────────

/**
 * Opens a damage case. The route below uses it for staff and customers; the
 * crew page (whose people sign in with a PIN, not as users) can call it with
 * `source: "crew"` and a system actor naming the employee. The order, when
 * given, must already have been checked by the caller.
 */
export async function openClaim(input: {
  orderId: string | null;
  source: (typeof CLAIM_SOURCES)[number];
  status?: (typeof CLAIM_STATUSES)[number] | undefined;
  item: string;
  description?: string | null | undefined;
  photos?: string[] | undefined;
  claimedAmount?: string | number | null | undefined;
  approvedAmount?: string | number | null | undefined;
  solution?: (typeof CLAIM_SOLUTIONS)[number] | undefined;
  reportedBy?: string | null | undefined;
  actor: { id?: string | undefined; email?: string | undefined; isSystem?: boolean };
  ipAddress?: string | undefined;
  requestId?: string | undefined;
}): Promise<string> {
  const now = new Date();
  const description = input.description?.trim() || null;
  const notes: ClaimNote[] = description ? [{ at: now.toISOString(), text: description }] : [];

  const [created] = await db
    .insert(damageClaims)
    .values({
      orderId: input.orderId,
      source: input.source,
      status: input.status ?? "reported",
      item: input.item.trim(),
      description,
      photos: input.photos ?? [],
      claimedAmount: money(input.claimedAmount),
      approvedAmount: money(input.approvedAmount),
      solution: input.solution ?? "none",
      notes: notes.length ? JSON.stringify(notes) : null,
      reportedBy: input.reportedBy ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: damageClaims.id });

  await recordAudit({
    actor: input.actor,
    action: "claim.created",
    entityType: "damage_claim",
    entityId: created!.id,
    changes: { orderId: input.orderId, item: input.item, source: input.source },
    ipAddress: input.ipAddress,
    requestId: input.requestId,
  });

  return created!.id;
}
const createBody = z.object({
  orderId: z.string().uuid().nullable().optional(),
  item: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  photos: z.array(photo).max(12).optional(),
  claimedAmount: amount,
  // Staff only; a customer's report always starts as "reported" from "customer".
  source: z.enum(CLAIM_SOURCES).optional(),
  status: z.enum(CLAIM_STATUSES).optional(),
  solution: z.enum(CLAIM_SOLUTIONS).optional(),
  approvedAmount: amount,
});

/**
 * One endpoint for both sides. Staff who may work cases open one for any
 * order (or none); anyone else is a customer reporting damage on an order of
 * their own, which is checked here, server-side.
 */
claimsRouter.post(
  "/",
  validate({ body: createBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createBody>;
    const me = req.user!;
    const staff = !!req.verifiedRole && can(req.verifiedRole, "complaints.write");

    if (!staff) {
      if (!body.orderId) throw AppError.badRequest("Choose the order the damage happened on.");
      const [order] = await db.select({ userId: orders.userId }).from(orders).where(eq(orders.id, body.orderId)).limit(1);
      if (!order || order.userId !== me.id) throw AppError.notFound("Order");
    } else if (body.orderId) {
      const [order] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, body.orderId)).limit(1);
      if (!order) throw AppError.notFound("Order");
    }

    const id = await openClaim({
      orderId: body.orderId ?? null,
      source: staff ? (body.source ?? "team") : "customer",
      status: staff ? body.status : "reported",
      item: body.item,
      description: body.description,
      photos: body.photos,
      claimedAmount: body.claimedAmount,
      approvedAmount: staff ? body.approvedAmount : null,
      solution: staff ? body.solution : "none",
      reportedBy: me.id,
      actor: { id: me.id, email: me.email },
      ipAddress: req.ip,
      requestId: req.requestId,
    });
    const claim = await loadClaim(id);
    // A customer gets their report back without the office's side of it.
    res.status(201).json({ claim: staff ? claim : { ...claim, notes: [], reporterName: null } });
  }),
);

// ── Working a case ───────────────────────────────────────────────────────

const patchBody = z
  .object({
    orderId: z.string().uuid().nullable(),
    source: z.enum(CLAIM_SOURCES),
    status: z.enum(CLAIM_STATUSES),
    item: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000),
    photos: z.array(photo).max(12),
    claimedAmount: amount,
    approvedAmount: amount,
    solution: z.enum(CLAIM_SOLUTIONS),
    /** Appends a dated note to the timeline. */
    addNote: z.string().trim().min(1).max(2000),
  })
  .partial();

claimsRouter.patch(
  "/:id",
  requirePermission("complaints.write"),
  validate({ params: idParam, body: patchBody }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;
    const body = req.body as z.infer<typeof patchBody>;

    const [before] = await db.select().from(damageClaims).where(eq(damageClaims.id, id)).limit(1);
    if (!before) throw AppError.notFound("Damage case");

    if (body.orderId) {
      const [order] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, body.orderId)).limit(1);
      if (!order) throw AppError.notFound("Order");
    }

    const patch: Partial<typeof damageClaims.$inferInsert> = { updatedAt: new Date() };
    if (body.orderId !== undefined) patch.orderId = body.orderId;
    if (body.source !== undefined) patch.source = body.source;
    if (body.status !== undefined) patch.status = body.status;
    if (body.item !== undefined) patch.item = body.item;
    if (body.description !== undefined) patch.description = body.description || null;
    if (body.photos !== undefined) patch.photos = body.photos;
    if (body.claimedAmount !== undefined) patch.claimedAmount = money(body.claimedAmount);
    if (body.approvedAmount !== undefined) patch.approvedAmount = money(body.approvedAmount);
    if (body.solution !== undefined) patch.solution = body.solution;

    // Before/after of what actually changed, for the audit trail.
    const changes: Record<string, unknown> = {};
    for (const field of ["orderId", "source", "status", "item", "description", "photos", "claimedAmount", "approvedAmount", "solution"] as const) {
      if (!(field in patch)) continue;
      const from = before[field];
      const to = patch[field];
      if (JSON.stringify(from) !== JSON.stringify(to)) changes[field] = { from, to };
    }

    if (body.addNote) {
      const notes = readNotes(before.notes, before.createdAt);
      notes.push({ at: new Date().toISOString(), text: body.addNote, by: req.user!.email });
      patch.notes = JSON.stringify(notes);
      changes.note = body.addNote;
    }

    await db.update(damageClaims).set(patch).where(eq(damageClaims.id, id));

    if (Object.keys(changes).length) {
      await recordAudit({
        actor: { id: req.user!.id, email: req.user!.email },
        action: "claim.updated",
        entityType: "damage_claim",
        entityId: id,
        changes,
        ipAddress: req.ip,
        requestId: req.requestId,
      });
    }

    res.json({ claim: await loadClaim(id) });
  }),
);

claimsRouter.delete(
  "/:id",
  requirePermission("complaints.write"),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;
    const [gone] = await db.delete(damageClaims).where(eq(damageClaims.id, id)).returning({ id: damageClaims.id, item: damageClaims.item });
    if (!gone) throw AppError.notFound("Damage case");

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "claim.deleted",
      entityType: "damage_claim",
      entityId: id,
      changes: { item: gone.item },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json({ ok: true });
  }),
);
