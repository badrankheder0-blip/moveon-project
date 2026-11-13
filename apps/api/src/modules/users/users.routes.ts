import {
  ADMIN_PAGES,
  ROLES,
  canManageAccount,
  usesPagePermissions,
  type AdminPage,
  type Role,
} from "@mon/core";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  generateTemporaryPassword,
  hashPassword,
} from "@mon/auth";
import { db, schema } from "@mon/db";
import { and, asc, desc, eq, ilike, ne, or, type SQL } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { pagesFor } from "../../lib/account-state.js";
import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";
import { revokeAllSessions } from "../auth/auth.service.js";

const { users } = schema;

export const usersRouter: Router = Router();

usersRouter.use(requireAuth);

/** The caller's own profile. Any authenticated user may read and edit this. */
usersRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        role: users.role,
        locale: users.locale,
        createdAt: users.createdAt,
        savedAddresses: users.savedAddresses,
      })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    if (!user) {
      throw AppError.notFound("User");
    }

    res.json({ ...user, savedAddresses: user.savedAddresses ?? [] });
  }),
);

/**
 * One entry of the account's address book. The whole list is replaced on
 * each save, as the account edits it; at most one is the default.
 */
const savedAddress = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().max(60).default(""),
  street: z.string().trim().min(1).max(160),
  zip: z.string().trim().min(1).max(12),
  city: z.string().trim().min(1).max(80),
  floor: z.string().trim().regex(/^(-?\d{1,2}|10\+)$/).default("0"),
  lift: z.enum(["yes", "no"]).default("no"),
  isDefault: z.boolean().default(false),
});

/**
 * Self-service profile edit.
 *
 * Note what is absent: `role` and `status`. In the legacy app the browser
 * wrote directly to `profiles`, so whether a customer could make themselves an
 * admin came down to how one RLS policy was phrased. Here those fields simply
 * have no path in from a self-edit.
 */
usersRouter.patch(
  "/me",
  validate({
    body: z.object({
      fullName: z.string().trim().min(2).max(120).optional(),
      phone: z.string().trim().min(5).max(40).nullable().optional(),
      locale: z.enum(["de", "en", "ar", "tr"]).optional(),
      savedAddresses: z
        .array(savedAddress)
        .max(10)
        .refine((list) => new Set(list.map((entry) => entry.id)).size === list.length, "Each address needs its own id.")
        .optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const body = req.body as {
      fullName?: string;
      phone?: string | null;
      locale?: "de" | "en" | "ar" | "tr";
      savedAddresses?: z.infer<typeof savedAddress>[];
    };

    // Exactly one default once there is any address: the first, unless one is marked.
    const savedAddresses = body.savedAddresses?.map((entry, index, list) => ({
      ...entry,
      isDefault: list.some((other) => other.isDefault) ? entry.id === list.find((other) => other.isDefault)!.id : index === 0,
    }));

    const [updated] = await db
      .update(users)
      .set({ ...body, ...(savedAddresses ? { savedAddresses } : {}), updatedAt: new Date() })
      .where(eq(users.id, req.user!.id))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        locale: users.locale,
        savedAddresses: users.savedAddresses,
      });

    res.json({ ...updated, savedAddresses: updated?.savedAddresses ?? [] });
  }),
);

// ── Administration ──────────────────────────────────────────────────────
//
// The admin prototype's three access levels sit on the role enum: the Owner
// is `super_admin` (exactly one, made first, never removed or demoted), Full
// access is `admin`, and Selected pages is `operator` with the ticked pages in
// `page_permissions`. Who may manage whom is `canManageAccount` in @mon/core.

const listQuery = z.object({
  search: z.string().trim().max(120).optional(),
  // Filtering by role reads the shared role list, so adding a role does not
  // leave this filter silently rejecting it.
  role: z.enum(ROLES).optional(),
  status: z.enum(["active", "blocked"]).optional(),
  /** Staff accounts only — the Admin users screen; customers live under Customers. */
  staff: z
    .enum(["1", "0", "true", "false"])
    .transform((value) => value === "1" || value === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(25),
});

/** What the administration screens see of an account. Never the hash. */
const managedColumns = {
  id: users.id,
  email: users.email,
  fullName: users.fullName,
  phone: users.phone,
  role: users.role,
  status: users.status,
  pagePermissions: users.pagePermissions,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
};

usersRouter.get(
  "/",
  requirePermission("users.read"),
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const query = validatedQuery<z.infer<typeof listQuery>>(req);
    const filters: SQL[] = [];

    if (query.role) filters.push(eq(users.role, query.role));
    if (query.status) filters.push(eq(users.status, query.status));
    if (query.staff) filters.push(ne(users.role, "customer"));

    if (query.search) {
      const term = `%${query.search}%`;
      filters.push(or(ilike(users.email, term), ilike(users.fullName, term))!);
    }

    const rows = await db
      .select(managedColumns)
      .from(users)
      .where(filters.length > 0 ? and(...filters) : undefined)
      // The owner first, then by when each account was made, as the
      // prototype lists them.
      .orderBy(desc(eq(users.role, "super_admin")), asc(users.createdAt))
      .limit(query.limit);

    res.json({ items: rows.map(present) });
  }),
);

type ManagedRow = { role: Role; pagePermissions: unknown } & Record<string, unknown>;

/** The stored page list as it applies to the account's role. */
function present<T extends ManagedRow>(row: T): T & { pagePermissions: AdminPage[] | null } {
  return { ...row, pagePermissions: pagesFor(row.role, row.pagePermissions) };
}

/**
 * The pages a member is given: at least one, each a page the dashboard
 * offers. Admin users is not among them, so it cannot be ticked in.
 */
const pageList = z.array(z.enum(ADMIN_PAGES as [AdminPage, ...AdminPage[]])).min(1, "Choose at least one page.").max(ADMIN_PAGES.length);

/** Removes duplicates and keeps the dashboard's order, so equal lists compare equal. */
function normalisePages(pages: readonly AdminPage[]): AdminPage[] {
  return ADMIN_PAGES.filter((page) => pages.includes(page));
}

/**
 * Creating an account on someone else's behalf.
 *
 * `users.write` gets you through the door — adding a customer (a walk-in, a
 * phone booking) or a colleague is ordinary back-office work for anyone with
 * full access. What kind of account you may hand out is the second question,
 * answered by `canManageAccount`: members and customers for full access, a
 * full admin only for the owner, and never a second owner. Without that rule
 * `users.write` would be a way to mint a peer and act through them.
 *
 * The password is returned exactly once, in this response. That is not ideal
 * — an invitation link the new user redeems themselves would be better, and
 * is noted as missing rather than faked — but it is honest about where the
 * secret is.
 */
const createUserBody = z.object({
  email: z.string().trim().toLowerCase().email("A valid email address is required."),
  fullName: z.string().trim().min(2, "Please provide a name.").max(120),
  role: z.enum(ROLES),
  phone: z.string().trim().min(5).max(40).optional(),
  locale: z.enum(["de", "en", "ar", "tr"]).default("de"),
  /**
   * Optional. When absent one is generated and returned once. The admin
   * screen suggests one in the field (the prototype's Generate button), so
   * the person creating the account can read it before saving.
   */
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH).optional(),
  /** For a "Selected pages" member: the pages they may open. */
  pagePermissions: pageList.nullable().optional(),
});

usersRouter.post(
  "/",
  requirePermission("users.write"),
  validate({ body: createUserBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createUserBody>;
    // Already re-read from the database by `requirePermission`, so a demotion
    // cannot be outrun by an access token minted before it.
    const actorRole = req.user!.role;

    if (!canManageAccount(actorRole, body.role)) {
      // Different causes, one refusal — but the message says which, because
      // the next step differs for the person reading it.
      throw AppError.forbidden(
        body.role === "super_admin"
          ? "There is exactly one owner account, and it already exists."
          : body.role === "admin"
            ? "Only the owner can create a full-access account."
            : "Creating accounts requires the users.write capability.",
      );
    }

    // Pages mean something only for a member; anyone else opens what the role
    // opens, so a list sent with them is dropped rather than stored to mislead.
    const pagePermissions =
      usesPagePermissions(body.role) && body.pagePermissions ? normalisePages(body.pagePermissions) : null;

    const generated = body.password === undefined;
    const password = body.password ?? generateTemporaryPassword();

    const [created] = await db
      .insert(users)
      .values({
        email: body.email,
        passwordHash: await hashPassword(password),
        fullName: body.fullName,
        phone: body.phone ?? null,
        role: body.role,
        pagePermissions,
        locale: body.locale,
        // Somebody with `users.write` vouched for this address by typing it.
        // Mailing a confirmation link to prove an address an administrator
        // already asserted would be theatre, and it would leave the account
        // unusable until the new colleague happened to check their inbox.
        emailVerifiedAt: new Date(),
      })
      .returning(managedColumns);

    if (!created) {
      throw AppError.internal("The account could not be created.");
    }

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "user.created",
      entityType: "user",
      entityId: created.id,
      // The role and pages are the part worth being able to answer questions
      // about later — "who gave this person the pricing page, and when". The
      // password is not recorded in any form.
      changes: {
        role: { from: null, to: created.role },
        ...(pagePermissions ? { pagePermissions: { from: null, to: pagePermissions } } : {}),
        email: created.email,
      },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.status(201).json({
      user: present(created),
      // Only when this endpoint invented it. Echoing a password the caller
      // supplied would put it in a response body for no reason.
      ...(generated ? { temporaryPassword: password } : {}),
    });
  }),
);

/**
 * Editing an account — server-side, capability-checked, and audited.
 *
 * `users.write` gets you through the door; `canManageAccount` then bounds
 * whom you may touch and what you may turn them into, on both sides of a role
 * change. Without the bound on the current role, `users.write` alone would let
 * an admin block or demote the owner — taking the one role that can grant
 * roles out of play, which is escalation by subtraction.
 *
 * Your own account is the exception in one direction only: you may correct
 * your own name and address, but not your role, pages or status (locking
 * yourself out has no way back in) nor your password (that asks for the
 * current one, at /api/auth/change-password, so a stolen session cannot
 * quietly take the account over).
 *
 * Switching someone off, changing their role or setting a new password ends
 * their live sessions. Changing a member's pages does not need to: every
 * request re-reads them, so the change applies to the next click.
 */
const updateUserBody = z
  .object({
    fullName: z.string().trim().min(2, "Please provide a name.").max(120).optional(),
    email: z.string().trim().toLowerCase().email("A valid email address is required.").optional(),
    role: z.enum(ROLES).optional(),
    status: z.enum(["active", "blocked"]).optional(),
    pagePermissions: pageList.nullable().optional(),
    password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH).optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), "Nothing to change.");

usersRouter.patch(
  "/:id",
  requirePermission("users.write"),
  validate({ params: z.object({ id: z.string().uuid() }), body: updateUserBody }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;
    const body = req.body as z.infer<typeof updateUserBody>;
    // `requirePermission` has already replaced this with the role the database
    // holds right now, so a demotion cannot be outrun by an old token.
    const actorRole = req.user!.role;
    const self = id === req.user!.id;

    if (
      self &&
      (body.role !== undefined || body.status !== undefined || body.pagePermissions !== undefined)
    ) {
      throw AppError.unprocessable("You cannot change your own access or switch yourself off.");
    }

    if (self && body.password !== undefined) {
      throw AppError.unprocessable("Change your own password from your account, with your current password.");
    }

    const [before] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!before) {
      throw AppError.notFound("User");
    }

    if (!self && !canManageAccount(actorRole, before.role)) {
      throw AppError.forbidden(
        before.role === "super_admin"
          ? "The owner account can only be changed by the owner."
          : "Only the owner can change a full-access account.",
      );
    }

    if (body.role !== undefined && body.role !== before.role && !canManageAccount(actorRole, body.role)) {
      throw AppError.forbidden(
        body.role === "super_admin"
          ? "There is exactly one owner account."
          : "Only the owner can give full access.",
      );
    }

    const role = body.role ?? before.role;

    // A member's pages: the new list when one was sent, otherwise whatever
    // they had. Anyone who is not a member has none — so promoting a member
    // to full access clears their list instead of leaving it to resurface.
    const pagePermissions = !usesPagePermissions(role)
      ? null
      : body.pagePermissions !== undefined
        ? body.pagePermissions && normalisePages(body.pagePermissions)
        : pagesFor(role, before.pagePermissions);

    const [updated] = await db
      .update(users)
      .set({
        ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.password !== undefined ? { passwordHash: await hashPassword(body.password) } : {}),
        pagePermissions,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning(managedColumns);

    if (!updated) {
      throw AppError.notFound("User");
    }

    if (
      (body.status === "blocked" && before.status !== "blocked") ||
      (body.role !== undefined && body.role !== before.role) ||
      body.password !== undefined
    ) {
      await revokeAllSessions(id);
    }

    const pagesBefore = pagesFor(before.role, before.pagePermissions);
    const pagesChanged = JSON.stringify(pagesBefore) !== JSON.stringify(pagePermissions);

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "user.updated",
      entityType: "user",
      entityId: id,
      changes: {
        ...(body.role !== undefined && body.role !== before.role ? { role: { from: before.role, to: body.role } } : {}),
        ...(body.status !== undefined && body.status !== before.status
          ? { status: { from: before.status, to: body.status } }
          : {}),
        ...(pagesChanged ? { pagePermissions: { from: pagesBefore, to: pagePermissions } } : {}),
        ...(body.email !== undefined && body.email !== before.email ? { email: { from: before.email, to: body.email } } : {}),
        ...(body.fullName !== undefined && body.fullName !== before.fullName
          ? { fullName: { from: before.fullName, to: body.fullName } }
          : {}),
        // That it happened, never what it was.
        ...(body.password !== undefined ? { password: "reset" } : {}),
      },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json(present(updated));
  }),
);

/**
 * Deleting an account, for one made by mistake.
 *
 * Under the same bound as editing, and never for yourself or the owner. An
 * account that has booked keeps its orders pointing at it, so the database
 * refuses the delete; the answer then is to switch it off, which keeps the
 * history and stops the sign-in just the same.
 */
usersRouter.delete(
  "/:id",
  requirePermission("users.write"),
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;

    if (id === req.user!.id) {
      throw AppError.unprocessable("You cannot delete your own account.");
    }

    const [before] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!before) {
      throw AppError.notFound("User");
    }

    if (!canManageAccount(req.user!.role, before.role)) {
      throw AppError.forbidden(
        before.role === "super_admin"
          ? "The owner account cannot be deleted."
          : "Only the owner can delete a full-access account.",
      );
    }

    try {
      await db.delete(users).where(eq(users.id, id));
    } catch (error) {
      if ((error as { code?: string }).code === "23503") {
        throw AppError.conflict(
          "CONFLICT",
          "This account has orders or other records attached. Switch it off instead.",
        );
      }
      throw error;
    }

    // The rows went with the account; the open sockets did not.
    await revokeAllSessions(id);

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "user.deleted",
      entityType: "user",
      entityId: id,
      changes: { email: before.email, role: before.role },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.status(204).send();
  }),
);

/** Read-only audit trail, for investigating what happened and when. */
usersRouter.get(
  "/audit/log",
  requirePermission("audit.read"),
  validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }) }),
  asyncHandler(async (req, res) => {
    const { limit } = validatedQuery<{ limit: number }>(req);

    const entries = await db
      .select()
      .from(schema.auditLogs)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit);

    res.json({ entries });
  }),
);
