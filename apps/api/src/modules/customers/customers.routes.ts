import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, generateTemporaryPassword, hashPassword } from "@mon/auth";
import { LOCALES } from "@mon/core";
import { db, schema } from "@mon/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import { joinName, splitName } from "../../lib/names.js";
import { recordAudit } from "../audit/audit.service.js";
import { revokeAllSessions } from "../auth/auth.service.js";
import { companyNameSchema, profileAddressSchema, taxNumberSchema } from "../users/profile-fields.js";

const { orders, users } = schema;

/**
 * Customers: everyone who has booked, grouped by email (admin prototype: User
 * management > Customers).
 *
 * There is no customers table to read. A customer is whoever booked, and the
 * same person books under one address with or without an account — so orders
 * are grouped by their contact email, lower-cased, exactly as the prototype
 * groups them. Customer accounts that have not booked yet are added after,
 * so someone who registered and is still deciding is not invisible.
 *
 * The list itself is read-only. A customer's account opens from it, where
 * the office (`customers.write`) can correct their details, set a new
 * password, switch the account off, or make an account for someone new — see
 * "Customer accounts" below.
 */
export const customersRouter: Router = Router();

customersRouter.use(requireAuth);

const listQuery = z.object({
  q: z.string().trim().max(120).optional(),
});

interface CustomerRow {
  /** The customer account behind the row, when there is one: opens its profile. */
  userId: string | null;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  type: "private" | "business";
  orders: number;
  bookedValue: string;
  lastOrderAt: string | null;
  hasAccount: boolean;
}

/** First and last name as stored, or the whole name split for older rows. */
function halves(row: { name: string | null; firstName: string | null; lastName: string | null }) {
  if (row.firstName || row.lastName) return { firstName: row.firstName ?? "", lastName: row.lastName ?? "" };
  const parts = splitName(row.name);
  return { firstName: parts.first, lastName: parts.last };
}

customersRouter.get(
  "/",
  requirePermission("customers.read"),
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { q } = validatedQuery<z.infer<typeof listQuery>>(req);
    const key = sql<string>`lower(${orders.contactEmail})`;

    // One row per address. Name, phone, type and company are taken from the
    // latest order, since that is what the person last told us.
    const [booked, accounts] = await Promise.all([
      db
        .select({
          email: key,
          name: sql<string>`(array_agg(${orders.contactName} order by ${orders.createdAt} desc))[1]`,
          firstName: sql<string | null>`(array_agg(${orders.contactFirstName} order by ${orders.createdAt} desc))[1]`,
          lastName: sql<string | null>`(array_agg(${orders.contactLastName} order by ${orders.createdAt} desc))[1]`,
          phone: sql<string>`(array_agg(${orders.contactPhone} order by ${orders.createdAt} desc))[1]`,
          type: sql<"private" | "business">`(array_agg(${orders.customerType} order by ${orders.createdAt} desc))[1]`,
          // The booking flow keeps a business's name with the answers.
          company: sql<string | null>`(array_agg(${orders.answers}->'company'->>'value' order by ${orders.createdAt} desc) filter (where ${orders.answers}->'company'->>'value' <> ''))[1]`,
          orders: sql<number>`count(*)::int`,
          // What they have booked and not cancelled, as the prototype sums it.
          bookedValue: sql<string>`coalesce(sum(${orders.totalGross}) filter (where ${orders.status} <> 'cancelled'), 0)::text`,
          lastOrderAt: sql<Date>`max(${orders.createdAt})`,
          userIds: sql<string[]>`array_agg(distinct ${orders.userId})`,
        })
        .from(orders)
        .groupBy(key)
        .orderBy(desc(sql`max(${orders.createdAt})`)),
      db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          customerType: users.customerType,
          companyName: users.companyName,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.role, "customer"))
        .orderBy(desc(users.createdAt)),
    ]);

    const accountByEmail = new Map(accounts.map((account) => [account.email.toLowerCase(), account]));
    const bookedUsers = new Set(booked.flatMap((row) => row.userIds ?? []));
    const bookedEmails = new Set(booked.map((row) => row.email));

    const rows: CustomerRow[] = booked.map((row) => {
      // By address only: an order booked for someone else (a parent, a tenant)
      // must not open the booker's account from that person's row.
      const account = accountByEmail.get(row.email);
      return {
        userId: account?.id ?? null,
        email: row.email,
        name: row.name || account?.fullName || "",
        ...halves(row.name ? row : account ? { name: account.fullName, firstName: account.firstName, lastName: account.lastName } : row),
        phone: row.phone || account?.phone || "",
        // The booking's answers first; the account's profile fills the gap.
        company: row.company ?? (account?.customerType === "business" ? (account.companyName ?? "") : ""),
        type: account?.customerType === "business" ? "business" : row.type,
        orders: row.orders,
        bookedValue: row.bookedValue,
        lastOrderAt: row.lastOrderAt ? new Date(row.lastOrderAt).toISOString() : null,
        hasAccount: Boolean(account),
      };
    });

    // Accounts that have not booked yet — under any address. Someone whose
    // orders carry a different contact email has already been counted there.
    for (const account of accounts) {
      const email = account.email.toLowerCase();
      if (bookedEmails.has(email) || bookedUsers.has(account.id)) continue;
      rows.push({
        userId: account.id,
        email,
        name: account.fullName,
        ...halves({ name: account.fullName, firstName: account.firstName, lastName: account.lastName }),
        phone: account.phone ?? "",
        company: account.customerType === "business" ? (account.companyName ?? "") : "",
        type: account.customerType,
        orders: 0,
        bookedValue: "0",
        lastOrderAt: null,
        hasAccount: true,
      });
    }

    const term = q?.toLowerCase();
    const customers = term
      ? rows.filter((row) => [row.name, row.email, row.phone, row.company].join(" ").toLowerCase().includes(term))
      : rows;

    res.json({ customers, total: rows.length });
  }),
);

// ── Customer accounts ───────────────────────────────────────────────────
//
// The office opens a customer's account from the list: reads it with
// `customers.read`, and with `customers.write` corrects it, sets a new
// password, switches it off, or makes an account for someone new (a phone
// booking, a walk-in). Only customer accounts: staff accounts are managed
// under Admin users, where `canManageAccount` bounds who may touch whom.

/** What the office sees of a customer account. Never the hash. */
const accountColumns = {
  id: users.id,
  email: users.email,
  fullName: users.fullName,
  firstName: users.firstName,
  lastName: users.lastName,
  phone: users.phone,
  locale: users.locale,
  avatar: users.avatar,
  profileAddress: users.profileAddress,
  customerType: users.customerType,
  companyName: users.companyName,
  taxNumber: users.taxNumber,
  status: users.status,
  emailVerifiedAt: users.emailVerifiedAt,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
};

type AccountRow = { fullName: string; firstName: string | null; lastName: string | null } & Record<string, unknown>;

/** First and last name as stored, or split from the whole name on older accounts. */
function presentAccount<T extends AccountRow>(row: T) {
  const split = row.firstName === null && row.lastName === null ? splitName(row.fullName) : null;
  return { ...row, firstName: split ? split.first : (row.firstName ?? ""), lastName: split ? split.last : (row.lastName ?? "") };
}

const accountParams = z.object({ id: z.string().uuid() });

/**
 * The whole profile, sent on every save as the dialog edits it. A company
 * needs its name and tax number; a private account keeps neither.
 */
const accountBody = z
  .object({
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    email: z.string().trim().toLowerCase().email("A valid email address is required."),
    phone: z.string().trim().min(5).max(40).nullable().optional(),
    locale: z.enum(LOCALES).optional(),
    customerType: z.enum(["private", "business"]).default("private"),
    companyName: companyNameSchema.nullable().optional(),
    taxNumber: taxNumberSchema.nullable().optional(),
    profileAddress: profileAddressSchema.nullable().optional(),
    /** Optional. On a new account one is generated and returned once when absent. */
    password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH).optional(),
    /** Edit only: "blocked" switches the account off and ends its sessions. */
    status: z.enum(["active", "blocked"]).optional(),
  })
  .refine((body) => body.customerType === "private" || (body.companyName && body.taxNumber), {
    message: "A company account needs its name and tax number.",
    path: ["companyName"],
  });

type AccountBody = z.infer<typeof accountBody>;

/** The columns a save writes, from the body. */
function accountValues(body: AccountBody) {
  const business = body.customerType === "business";
  const address = body.profileAddress;
  const filled = address ? Object.values(address).filter(Boolean).length : 0;
  if (filled > 0 && filled < 4) {
    throw AppError.unprocessable("Fill in all four address fields, or leave them all empty.");
  }
  return {
    firstName: body.firstName,
    lastName: body.lastName,
    fullName: joinName(body.firstName, body.lastName),
    email: body.email,
    phone: body.phone ?? null,
    ...(body.locale ? { locale: body.locale } : {}),
    customerType: body.customerType,
    companyName: business ? (body.companyName ?? null) : null,
    taxNumber: business ? (body.taxNumber ?? null) : null,
    profileAddress: filled === 4 ? address! : null,
  };
}

/** The unique index on the address, as the office reads it. */
function emailTaken(error: unknown): boolean {
  return (error as { code?: string }).code === "23505";
}

customersRouter.get(
  "/accounts/:id",
  requirePermission("customers.read"),
  validate({ params: accountParams }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<z.infer<typeof accountParams>>(req);
    const [row] = await db
      .select(accountColumns)
      .from(users)
      .where(and(eq(users.id, id), eq(users.role, "customer")))
      .limit(1);

    if (!row) throw AppError.notFound("Customer");

    res.json(presentAccount(row));
  }),
);

customersRouter.post(
  "/accounts",
  requirePermission("customers.write"),
  validate({ body: accountBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as AccountBody;
    const generated = body.password === undefined;
    const password = body.password ?? generateTemporaryPassword();

    const values = accountValues(body);
    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(users)
      .values({
        ...values,
        passwordHash,
        role: "customer",
        // The office typed the address for the customer; a confirmation
        // link on top would only keep the account shut until they find it.
        emailVerifiedAt: new Date(),
      })
      .returning(accountColumns)
      .catch((error: unknown) => {
        if (emailTaken(error)) throw AppError.conflict("CONFLICT", "An account with this email address already exists.");
        throw error;
      });

    if (!created) throw AppError.internal("The account could not be created.");

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "customer.created",
      entityType: "user",
      entityId: created.id,
      changes: { role: { from: null, to: "customer" }, email: created.email },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.status(201).json({
      customer: presentAccount(created),
      // Only when this endpoint made it up: one the office typed stays out of the response.
      ...(generated ? { temporaryPassword: password } : {}),
    });
  }),
);

customersRouter.patch(
  "/accounts/:id",
  requirePermission("customers.write"),
  validate({ params: accountParams, body: accountBody }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<z.infer<typeof accountParams>>(req);
    const body = req.body as AccountBody;

    const [before] = await db
      .select({ id: users.id, role: users.role, email: users.email, status: users.status })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    // A staff account is not a customer's: it is changed under Admin users.
    if (!before || before.role !== "customer") throw AppError.notFound("Customer");

    const values = accountValues(body);
    const passwordHash = body.password ? await hashPassword(body.password) : undefined;
    const [updated] = await db
      .update(users)
      .set({
        ...values,
        ...(body.status ? { status: body.status } : {}),
        ...(passwordHash ? { passwordHash } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning(accountColumns)
      .catch((error: unknown) => {
        if (emailTaken(error)) throw AppError.conflict("CONFLICT", "Another account already uses this email address.");
        throw error;
      });

    if (!updated) throw AppError.notFound("Customer");

    // A new password or a switched-off account ends the sessions the old state allowed.
    const blocked = body.status === "blocked" && before.status !== "blocked";
    if (body.password || blocked) await revokeAllSessions(id);

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "customer.updated",
      entityType: "user",
      entityId: id,
      changes: {
        ...(body.email !== before.email ? { email: { from: before.email, to: body.email } } : {}),
        ...(body.status && body.status !== before.status ? { status: { from: before.status, to: body.status } } : {}),
        // That it happened, never what it was.
        ...(body.password ? { password: "reset" } : {}),
      },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json(presentAccount(updated));
  }),
);
