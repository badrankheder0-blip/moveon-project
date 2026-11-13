import { db, schema } from "@mon/db";
import { and, asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { optionalAuth, requireAuth } from "../../middleware/require-auth.js";
import { hasPermission, requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";

const { catalogItems } = schema;
export const catalogRouter: Router = Router();

const listQuery = z.object({
  kind: z.enum(["furniture", "cleaning", "special"]).optional(),
  category: z.string().trim().max(80).optional(),
  /** Honoured only for callers with `catalog.write`; ignored for everyone else. */
  includeInactive: z.coerce.boolean().default(false),
});

/**
 * Public: the calculator needs the catalog before anyone signs in.
 *
 * `optionalAuth` is not a guard — anonymous callers still get the full active
 * catalogue. It exists only so the handler can tell whether the caller holds
 * `catalog.write`, because `includeInactive` must never be honoured for the
 * public: a retired item is a business decision the calculator should not see.
 */
catalogRouter.get(
  "/",
  optionalAuth,
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const query = validatedQuery<z.infer<typeof listQuery>>(req);

    const mayManageCatalog =
      req.user !== undefined && (await hasPermission(req.user.id, "catalog.write"));

    const filters = [];

    // Asking for inactive items without the capability is not an error; it is
    // simply ignored, so a stale admin tab degrades to the public view instead
    // of failing.
    if (!(query.includeInactive && mayManageCatalog)) {
      filters.push(eq(catalogItems.isActive, true));
    }

    if (query.kind) filters.push(eq(catalogItems.kind, query.kind));
    if (query.category) filters.push(eq(catalogItems.category, query.category));

    const rows = await db
      .select({
        id: catalogItems.id,
        kind: catalogItems.kind,
        category: catalogItems.category,
        name: catalogItems.name,
        price: catalogItems.price,
        disposalPrice: catalogItems.disposalPrice,
        assemblyPrice: catalogItems.assemblyPrice,
        disassemblyPrice: catalogItems.disassemblyPrice,
        // Not a price: the planner sums it into the cargo volume it shows and
        // the crew it suggests. The quote itself still comes from the server.
        volumeM3: catalogItems.volumeM3,
        code: catalogItems.code,
        isActive: catalogItems.isActive,
      })
      .from(catalogItems)
      .where(and(...filters))
      .orderBy(asc(catalogItems.category), asc(catalogItems.sortOrder));

    // The public shape is unchanged; `isActive` only means something to a
    // caller who can see inactive rows in the first place.
    const items = mayManageCatalog
      ? rows
      : rows.map(({ isActive: _isActive, ...item }) => item);

    res.json({ items });
  }),
);

const money = z.string().regex(/^\d+(\.\d{1,2})?$/, "Expected a decimal amount, e.g. 45.00");

const itemBody = z.object({
  kind: z.enum(["furniture", "cleaning", "special"]),
  category: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  price: money.default("0"),
  disposalPrice: money.default("0"),
  assemblyPrice: money.default("0"),
  disassemblyPrice: money.default("0"),
  volumeM3: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),

  /**
   * The slug a quote records a special item by, and what its breakdown line is
   * built from — so it must outlive any renaming, and nothing else may carry
   * one. Lower case, because it ends up in `specialItems` keys.
   */
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{0,39}$/, "Use lower-case letters, digits or hyphens.").optional(),
});

/**
 * A code belongs to a special item and to nothing else.
 *
 * Checked on the whole body for a create, and on a patch only when it says
 * enough to judge — a patch that renames an item must not be refused for not
 * repeating its kind.
 */
function codeMatchesKind(value: { kind?: "furniture" | "cleaning" | "special" | undefined; code?: string | undefined }): boolean {
  // A patch that does not mention the kind cannot be judged here; it is left
  // to the row it is changing.
  if (value.kind === undefined) return true;
  return value.kind === "special" || !value.code;
}

const createBody = itemBody
  .refine((value) => value.kind !== "special" || Boolean(value.code), { message: "A special item needs a code.", path: ["code"] })
  .refine(codeMatchesKind, { message: "Only a special item has a code.", path: ["code"] });

const patchBody = itemBody.partial().refine(codeMatchesKind, { message: "Only a special item has a code.", path: ["code"] });

catalogRouter.post(
  "/",
  requireAuth,
  requirePermission("catalog.write"),
  validate({ body: createBody }),
  asyncHandler(async (req, res) => {
    const [created] = await db.insert(catalogItems).values(req.body).returning();

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "catalog.created",
      entityType: "catalog_item",
      entityId: created!.id,
      requestId: req.requestId,
    });

    res.status(201).json(created);
  }),
);

catalogRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("catalog.write"),
  validate({ params: z.object({ id: z.string().uuid() }), body: patchBody }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;

    const [updated] = await db
      .update(catalogItems)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(catalogItems.id, id))
      .returning();

    if (!updated) throw AppError.notFound("Catalog item");

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "catalog.updated",
      entityType: "catalog_item",
      entityId: id,
      changes: req.body,
      requestId: req.requestId,
    });

    res.json(updated);
  }),
);

/**
 * Deactivates rather than deletes. A hard delete would orphan the item ids
 * stored inside historical quotes and orders, making old invoices
 * unreproducible.
 */
catalogRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("catalog.write"),
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;

    const [updated] = await db
      .update(catalogItems)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(catalogItems.id, id))
      .returning();

    if (!updated) throw AppError.notFound("Catalog item");

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "catalog.deactivated",
      entityType: "catalog_item",
      entityId: id,
      requestId: req.requestId,
    });

    res.status(204).send();
  }),
);
