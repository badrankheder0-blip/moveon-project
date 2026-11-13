import { db, schema } from "@mon/db";
import { desc, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedQuery } from "../../middleware/validate.js";

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
 * Read-only, like the prototype's screen: there is nothing here to edit that
 * does not belong to an order or to the person's own account.
 */
export const customersRouter: Router = Router();

customersRouter.use(requireAuth);

const listQuery = z.object({
  q: z.string().trim().max(120).optional(),
});

interface CustomerRow {
  email: string;
  name: string;
  phone: string;
  company: string;
  type: "private" | "business";
  orders: number;
  bookedValue: string;
  lastOrderAt: string | null;
  hasAccount: boolean;
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
          phone: users.phone,
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
      const account = accountByEmail.get(row.email);
      return {
        email: row.email,
        name: row.name || account?.fullName || "",
        phone: row.phone || account?.phone || "",
        company: row.company ?? "",
        type: row.type,
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
        email,
        name: account.fullName,
        phone: account.phone ?? "",
        company: "",
        type: "private",
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
