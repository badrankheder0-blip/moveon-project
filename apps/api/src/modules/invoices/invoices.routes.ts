import { db, schema } from "@mon/db";
import { and, asc, desc, eq, gt, gte, ilike, inArray, lt, lte, ne, notExists, or, sql, type SQL } from "drizzle-orm";
import { Router, type Request } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requestCan, requireAnyPermission, requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";
import { buildDatev, toWindows1252 } from "./datev.js";
import { INVOICE_SETTING_KEYS, loadCompany } from "./invoice-company.js";
import { sendInvoiceMail } from "./invoice-mail.js";
import { businessToday, issueInvoice, present, type InvoiceRow } from "./invoices.service.js";

const { invoices, orders, payments } = schema;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Keeps the order's payment ledger in step with the invoice: marking it paid
 * books whatever was still open as a balance payment referenced by the
 * invoice number, and undoing the payment takes exactly that entry back out.
 * Without this the order still showed money owing after the invoice was paid.
 */
async function bookInvoicePayment(tx: Tx, invoice: InvoiceRow, paid: boolean, userId: string): Promise<void> {
  const [order] = await tx
    .select({ id: orders.id, totalGross: orders.totalGross, paidAmount: orders.paidAmount })
    .from(orders)
    .where(eq(orders.id, invoice.orderId))
    .for("update")
    .limit(1);
  if (!order) return;

  const cents = (value: string | number) => Math.round(Number(value) * 100);

  if (paid) {
    const open = Math.min(cents(invoice.totalGross), cents(order.totalGross)) - cents(order.paidAmount);
    if (open <= 0) return;
    await tx.insert(payments).values({
      orderId: order.id,
      amount: (open / 100).toFixed(2),
      kind: "balance",
      method: "bank_transfer",
      reference: invoice.number,
      note: "Invoice marked paid",
      recordedBy: userId,
    });
    await tx
      .update(orders)
      .set({ paidAmount: ((cents(order.paidAmount) + open) / 100).toFixed(2), updatedAt: new Date() })
      .where(eq(orders.id, order.id));
    return;
  }

  const booked = await tx
    .select({ id: payments.id, amount: payments.amount })
    .from(payments)
    .where(and(eq(payments.orderId, order.id), eq(payments.reference, invoice.number), eq(payments.kind, "balance")));
  if (!booked.length) return;
  const total = booked.reduce((sum, row) => sum + cents(row.amount), 0);
  await tx.delete(payments).where(inArray(payments.id, booked.map((row) => row.id)));
  await tx
    .update(orders)
    .set({ paidAmount: (Math.max(0, cents(order.paidAmount) - total) / 100).toFixed(2), updatedAt: new Date() })
    .where(eq(orders.id, order.id));
}

/**
 * Invoices (Rechnungen): issued from orders, numbered RE-YYYY-NNNN, sent, paid, reminded, exported.
 *
 * draft → sent → paid, with "overdue" read off a sent invoice's due date and
 * payment undoable; an unpaid invoice can be cancelled, which keeps its number
 * (the sequence stays gap-free) and frees the order for a new one.
 */
export const invoicesRouter: Router = Router();

invoicesRouter.use(requireAuth);

const idParam = z.object({ id: z.string().uuid() });
const actorOf = (req: Request) => ({
  actor: { id: req.user!.id, email: req.user!.email },
  ipAddress: req.ip,
  requestId: req.requestId,
});

// ── The customer's own ────────────────────────────────────────────────────

/**
 * The invoices on the signed-in customer's orders, for their account: number
 * and whether it is paid. Drafts are the office's until they are sent.
 */
invoicesRouter.get(
  "/mine",
  asyncHandler(async (req, res) => {
    const rows = await db
      .select({ invoice: invoices, reference: orders.reference })
      .from(invoices)
      .innerJoin(orders, eq(orders.id, invoices.orderId))
      .where(and(eq(orders.userId, req.user!.id), inArray(invoices.status, ["sent", "paid"])))
      .orderBy(desc(invoices.createdAt));

    const today = businessToday();
    res.json({
      invoices: rows.map(({ invoice, reference }) => {
        const full = present(invoice, { orderReference: reference }, today);
        return {
          id: full.id,
          number: full.number,
          orderId: full.orderId,
          orderReference: full.orderReference,
          status: full.status,
          issueDate: full.issueDate,
          dueDate: full.dueDate,
          totalGross: full.totalGross,
          paidAt: full.paidAt,
        };
      }),
    });
  }),
);

// ── The office ────────────────────────────────────────────────────────────

/** The invoice details card: bank and tax numbers and the payment term. */
invoicesRouter.get(
  "/settings",
  requirePermission("payments.read"),
  asyncHandler(async (_req, res) => {
    const company = await loadCompany();
    res.json({
      iban: company.iban,
      vatId: company.vatId,
      taxNumber: company.taxNumber,
      paymentTermDays: company.paymentTermDays,
      seller: company.seller,
      keys: INVOICE_SETTING_KEYS,
      present: company.present,
    });
  }),
);

/** Confirmed or completed orders, at a price, that have no live invoice yet. */
invoicesRouter.get(
  "/ready",
  requirePermission("payments.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        id: orders.id,
        reference: orders.reference,
        status: orders.status,
        contactName: orders.contactName,
        answers: orders.answers,
        totalGross: orders.totalGross,
        scheduledDate: orders.scheduledDate,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(
        and(
          inArray(orders.status, ["confirmed", "completed"]),
          gt(orders.totalGross, "0"),
          notExists(
            db
              .select({ one: sql`1` })
              .from(invoices)
              .where(and(eq(invoices.orderId, orders.id), ne(invoices.status, "cancelled"))),
          ),
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(500);

    res.json({
      orders: rows.map(({ answers, ...row }) => ({ ...row, company: answers?.company?.value?.trim() || null })),
    });
  }),
);

const datevQuery = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected a month as YYYY-MM."),
  revenueAccount: z.string().regex(/^\d{4,8}$/).optional(),
  consultant: z.string().regex(/^\d{1,7}$/).optional(),
  client: z.string().regex(/^\d{1,5}$/).optional(),
});

/** One month's invoices as a DATEV booking batch (EXTF CSV). */
invoicesRouter.get(
  "/export/datev",
  requirePermission("payments.read"),
  validate({ query: datevQuery }),
  asyncHandler(async (req, res) => {
    const query = validatedQuery<z.infer<typeof datevQuery>>(req);
    const [year, month] = query.month.split("-").map(Number) as [number, number];
    const first = `${query.month}-01`;
    const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

    const [monthRows, allRows, company] = await Promise.all([
      db
        .select()
        .from(invoices)
        .where(and(gte(invoices.issueDate, first), lte(invoices.issueDate, last), ne(invoices.status, "cancelled"))),
      // Creation order is number order, and decides the debtor accounts.
      db.select({ number: invoices.number, customer: invoices.customer }).from(invoices).orderBy(asc(invoices.createdAt)),
      loadCompany(),
    ]);

    const csv = buildDatev(monthRows, allRows, {
      month: query.month,
      company,
      revenueAccount: query.revenueAccount,
      consultant: query.consultant,
      client: query.client,
    });

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "invoice.datev_exported",
      entityType: "invoice",
      changes: { month: query.month, invoices: monthRows.length },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.setHeader("Content-Type", "text/csv; charset=windows-1252");
    res.setHeader("Content-Disposition", `attachment; filename="EXTF_Buchungsstapel_${query.month}.csv"`);
    res.send(toWindows1252(csv));
  }),
);

const listQuery = z.object({
  orderId: z.string().uuid().optional(),
  status: z.enum(["draft", "sent", "overdue", "paid", "cancelled"]).optional(),
  q: z.string().trim().max(100).optional(),
});

/**
 * Invoices, newest number first. An order's own invoices are readable to
 * anyone who may read the order (its detail page shows the invoice status);
 * the whole list is the money screen's.
 */
invoicesRouter.get(
  "/",
  requireAnyPermission("payments.read", "orders.read"),
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const query = validatedQuery<z.infer<typeof listQuery>>(req);

    if (!query.orderId && !(await requestCan(req, "payments.read"))) {
      throw AppError.insufficientRole("payments.read");
    }

    const today = businessToday();
    const conditions: SQL[] = [];

    if (query.orderId) conditions.push(eq(invoices.orderId, query.orderId));

    if (query.status === "sent") conditions.push(and(eq(invoices.status, "sent"), gte(invoices.dueDate, today))!);
    else if (query.status === "overdue") conditions.push(and(eq(invoices.status, "sent"), lt(invoices.dueDate, today))!);
    else if (query.status) conditions.push(eq(invoices.status, query.status));

    if (query.q) {
      const term = `%${query.q}%`;
      conditions.push(
        or(
          ilike(invoices.number, term),
          ilike(orders.reference, term),
          sql`${invoices.customer}->>'name' ilike ${term}`,
          sql`${invoices.customer}->>'email' ilike ${term}`,
          sql`${invoices.customer}->>'company' ilike ${term}`,
        )!,
      );
    }

    const rows = await db
      .select({ invoice: invoices, reference: orders.reference, orderStatus: orders.status })
      .from(invoices)
      .innerJoin(orders, eq(orders.id, invoices.orderId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(invoices.createdAt))
      .limit(2000);

    res.json({
      invoices: rows.map(({ invoice, reference, orderStatus }) => present(invoice, { orderReference: reference, orderStatus }, today)),
    });
  }),
);

/** Issues the invoice for an order: the next number, today's date, the term's due date. */
invoicesRouter.post(
  "/",
  requirePermission("payments.write"),
  validate({ body: z.object({ orderId: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const row = await issueInvoice(req.body.orderId as string, req.user!.id, actorOf(req));
    res.status(201).json({ invoice: present(row) });
  }),
);

/** One invoice. Its customer may read it too, once it has been sent to them. */
invoicesRouter.get(
  "/:id",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<{ id: string }>(req);
    const [found] = await db
      .select({ invoice: invoices, reference: orders.reference, orderStatus: orders.status, userId: orders.userId })
      .from(invoices)
      .innerJoin(orders, eq(orders.id, invoices.orderId))
      .where(eq(invoices.id, id))
      .limit(1);

    const staff = (await requestCan(req, "payments.read")) || (await requestCan(req, "orders.read"));
    const owner = found?.userId === req.user!.id && (found.invoice.status === "sent" || found.invoice.status === "paid");

    // 404 rather than 403, as for orders: no confirming that someone else's invoice exists.
    if (!found || (!staff && !owner)) throw AppError.notFound("Invoice");

    res.json({ invoice: present(found.invoice, { orderReference: found.reference, orderStatus: found.orderStatus }) });
  }),
);

const patchBody = z
  .object({
    /** Mark as paid, or undo the payment. */
    paid: z.boolean().optional(),
    /** "sent": handed over some other way than by email; "cancelled": voided. */
    status: z.enum(["sent", "paid", "cancelled"]).optional(),
  })
  .refine((body) => (body.paid === undefined) !== (body.status === undefined), { message: "Send either paid or status." });

invoicesRouter.patch(
  "/:id",
  requirePermission("payments.write"),
  validate({ params: idParam, body: patchBody }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<{ id: string }>(req);
    const body = req.body as z.infer<typeof patchBody>;
    const wantsPaid = body.paid === true || body.status === "paid";

    const updated = await db.transaction(async (tx) => {
      const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, id)).for("update").limit(1);
      if (!invoice) throw AppError.notFound("Invoice");

      const now = new Date();
      let patch: Partial<InvoiceRow> | null = null;
      let action = "";

      if (wantsPaid) {
        if (invoice.status === "cancelled") throw AppError.unprocessable("A cancelled invoice cannot be paid.");
        if (invoice.status !== "paid") {
          patch = { status: "paid", paidAt: now };
          action = "invoice.paid";
        }
      } else if (body.paid === false) {
        if (invoice.status === "paid") {
          patch = { status: invoice.sentAt ? "sent" : "draft", paidAt: null };
          action = "invoice.payment_undone";
        }
      } else if (body.status === "sent") {
        if (invoice.status === "cancelled") throw AppError.unprocessable("A cancelled invoice cannot be sent.");
        if (invoice.status === "draft") {
          patch = { status: "sent", sentAt: now };
          action = "invoice.marked_sent";
        }
      } else if (body.status === "cancelled") {
        if (invoice.status === "paid") throw AppError.unprocessable("Undo the payment before cancelling the invoice.");
        if (invoice.status !== "cancelled") {
          patch = { status: "cancelled" };
          action = "invoice.cancelled";
        }
      }

      if (!patch) return invoice;

      const [row] = await tx
        .update(invoices)
        .set({ ...patch, updatedAt: now })
        .where(eq(invoices.id, id))
        .returning();

      if (action === "invoice.paid" || action === "invoice.payment_undone") {
        await bookInvoicePayment(tx, invoice, action === "invoice.paid", req.user!.id);
      }

      await recordAudit(
        {
          ...actorOf(req),
          action,
          entityType: "invoice",
          entityId: id,
          changes: { number: invoice.number, status: { from: invoice.status, to: row!.status } },
        },
        tx,
      );

      return row!;
    });

    res.json({ invoice: present(updated) });
  }),
);

/** The order's language decides the email's; the invoice itself is German. */
async function orderLocale(orderId: string): Promise<string> {
  const [order] = await db.select({ locale: orders.locale }).from(orders).where(eq(orders.id, orderId)).limit(1);
  return order?.locale ?? "de";
}

const mailFailed = () =>
  new AppError("SERVICE_UNAVAILABLE", 503, "The email could not be sent. Nothing was changed; try again in a moment.");

/** Emails the invoice to the customer and marks it sent. Sending again resends it. */
invoicesRouter.post(
  "/:id/send",
  requirePermission("payments.write"),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<{ id: string }>(req);
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!invoice) throw AppError.notFound("Invoice");
    if (invoice.status === "cancelled") throw AppError.unprocessable("A cancelled invoice cannot be sent.");
    if (!invoice.customer.email) throw AppError.unprocessable("The customer has no email address.");

    // Sent before the row changes: an invoice must not read "sent" when the
    // email never left.
    const mail = await sendInvoiceMail("invoice", invoice, await orderLocale(invoice.orderId)).catch(() => {
      throw mailFailed();
    });

    const now = new Date();
    const [row] = await db
      .update(invoices)
      .set({
        sentAt: sql`coalesce(${invoices.sentAt}, ${now.toISOString()}::timestamptz)`,
        status: sql`case when ${invoices.status} = 'draft' then 'sent' else ${invoices.status} end`,
        updatedAt: now,
      })
      .where(eq(invoices.id, id))
      .returning();

    await recordAudit({
      ...actorOf(req),
      action: "invoice.sent",
      entityType: "invoice",
      entityId: id,
      changes: { number: invoice.number, to: mail.to, delivered: mail.sent.delivered },
    });

    res.json({ invoice: present(row!), mail: { to: mail.to, delivered: mail.sent.delivered, driver: mail.sent.via } });
  }),
);

/** A payment reminder for a sent (or overdue) invoice; counts the reminders. */
invoicesRouter.post(
  "/:id/remind",
  requirePermission("payments.write"),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<{ id: string }>(req);
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!invoice) throw AppError.notFound("Invoice");
    if (invoice.status !== "sent") throw AppError.unprocessable("Only a sent, unpaid invoice can be reminded.");
    if (!invoice.customer.email) throw AppError.unprocessable("The customer has no email address.");

    const mail = await sendInvoiceMail("reminder", invoice, await orderLocale(invoice.orderId)).catch(() => {
      throw mailFailed();
    });

    const now = new Date();
    const [row] = await db
      .update(invoices)
      .set({ remindersSent: sql`${invoices.remindersSent} + 1`, lastReminderAt: now, updatedAt: now })
      .where(eq(invoices.id, id))
      .returning();

    await recordAudit({
      ...actorOf(req),
      action: "invoice.reminded",
      entityType: "invoice",
      entityId: id,
      changes: { number: invoice.number, to: mail.to, reminders: row!.remindersSent },
    });

    res.json({ invoice: present(row!), mail: { to: mail.to, delivered: mail.sent.delivered, driver: mail.sent.via } });
  }),
);
