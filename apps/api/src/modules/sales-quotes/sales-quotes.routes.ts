import { env } from "@mon/config";
import { toLocale } from "@mon/core";
import { db, schema } from "@mon/db";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { Router, type Request } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { mailer } from "../../lib/mailer.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";
import { sendTemplate } from "../messages/messages.service.js";
import {
  QUOTE_SOURCES,
  QUOTE_STATUSES,
  businessDay,
  companyDetails,
  createOrderFromQuote,
  defaultVatRate,
  guessService,
  nextQuoteNumber,
  quoteTotals,
  type SalesQuoteRow,
} from "./sales-quotes.service.js";
import { greetingName, joinName, nameParts } from "../../lib/names.js";

const { leads, orders, salesQuotes } = schema;

/**
 * Quotes & site visits: hand-priced quotes (Angebote) that become orders when accepted.
 *
 * request → visit → sent → accepted (creates a confirmed order) · declined,
 * and accepted or declined can be reopened. Reading needs `quotes.read`;
 * everything that changes a quote needs `orders.write`, because a quote is the
 * start of an order and its acceptance creates one.
 */
export const salesQuotesRouter: Router = Router();

salesQuotesRouter.use(requireAuth);

const READ = requirePermission("quotes.read");
const WRITE = requirePermission("orders.write");

const idParams = z.object({ id: z.string().uuid() });
type IdParams = z.infer<typeof idParams>;

/** A quote as the dashboard reads it: the row, plus the booking and the message it is linked to. */
async function loadQuotes(where?: SQL) {
  const rows = await db
    .select({ quote: salesQuotes, orderReference: orders.reference, leadKind: leads.kind })
    .from(salesQuotes)
    .leftJoin(orders, eq(orders.id, salesQuotes.orderId))
    .leftJoin(leads, eq(leads.id, salesQuotes.leadId))
    .where(where)
    .orderBy(desc(salesQuotes.createdAt))
    .limit(1000);

  return rows.map(({ quote, orderReference, leadKind }) => ({
    ...quote,
    order: quote.orderId && orderReference ? { id: quote.orderId, reference: orderReference } : null,
    lead: quote.leadId && leadKind ? { id: quote.leadId, kind: leadKind } : null,
  }));
}

async function loadQuote(id: string) {
  const [quote] = await loadQuotes(eq(salesQuotes.id, id));
  if (!quote) throw AppError.notFound("Quote");
  return quote;
}

async function rowFor(id: string): Promise<SalesQuoteRow> {
  const [row] = await db.select().from(salesQuotes).where(eq(salesQuotes.id, id)).limit(1);
  if (!row) throw AppError.notFound("Quote");
  return row;
}

function actorOf(req: Request) {
  return { id: req.user!.id, email: req.user!.email };
}

// ── Reading ───────────────────────────────────────────────────────────────

const listQuery = z.object({
  status: z.enum(QUOTE_STATUSES).optional(),
  q: z.string().trim().max(120).optional(),
});

salesQuotesRouter.get(
  "/",
  READ,
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const query = validatedQuery<z.infer<typeof listQuery>>(req);
    const conditions: SQL[] = [];
    if (query.status) conditions.push(eq(salesQuotes.status, query.status));
    if (query.q) {
      const term = `%${query.q}%`;
      conditions.push(
        or(
          ilike(salesQuotes.number, term),
          ilike(salesQuotes.customerName, term),
          ilike(salesQuotes.company, term),
          ilike(salesQuotes.customerEmail, term),
        )!,
      );
    }
    res.json({ quotes: await loadQuotes(conditions.length ? and(...conditions) : undefined) });
  }),
);

/** The company block the printed Angebot carries. */
salesQuotesRouter.get(
  "/company",
  READ,
  asyncHandler(async (_req, res) => {
    res.json({ company: await companyDetails() });
  }),
);

salesQuotesRouter.get(
  "/:id",
  READ,
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    res.json({ quote: await loadQuote(validatedParams<IdParams>(req).id) });
  }),
);

// ── Creating ──────────────────────────────────────────────────────────────

const blankToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);
const text = (max: number) => z.preprocess(blankToNull, z.string().trim().max(max).nullable().optional());
const day = z.preprocess(blankToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD.").nullable().optional());
const clock = z.preprocess(blankToNull, z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:MM.").nullable().optional());

const quoteLine = z.object({
  description: z.string().trim().max(500).default(""),
  qty: z.coerce.number().min(0).max(1_000_000),
  // Negative for a discount line ("Nachlass"); the total is checked before sending.
  unitNet: z.coerce.number().min(-10_000_000).max(10_000_000),
});

const fields = {
  customerName: z.string().trim().max(160).optional(),
  /** The halves of `customerName`; when sent, the whole name is made from them. */
  customerFirstName: z.string().trim().max(80).optional(),
  customerLastName: z.string().trim().max(80).optional(),
  customerEmail: text(254),
  customerPhone: text(40),
  company: text(160),
  address: text(300),
  service: text(60),
  needs: text(4000),
  visitDate: day,
  visitTime: clock,
  visitBy: text(120),
  visitNote: text(500),
  lines: z.array(quoteLine).max(100).optional(),
  vatRate: z.coerce.number().min(0).max(100).optional(),
  validUntil: day,
};

const createBody = z
  .object({
    /** A website message to make the quote from; its sender's details are copied. */
    leadId: z.string().uuid().optional(),
    source: z.enum(QUOTE_SOURCES).optional(),
    ...fields,
  })
  .strict();

salesQuotesRouter.post(
  "/",
  WRITE,
  validate({ body: createBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createBody>;

    let fromLead: Partial<typeof salesQuotes.$inferInsert> = {};
    if (body.leadId) {
      const [lead] = await db.select().from(leads).where(eq(leads.id, body.leadId)).limit(1);
      if (!lead) throw AppError.notFound("Message");

      // One quote per message: pressing "Create quote" twice opens the first.
      const [existing] = await db
        .select({ id: salesQuotes.id })
        .from(salesQuotes)
        .where(eq(salesQuotes.leadId, lead.id))
        .limit(1);
      if (existing) {
        res.json({ quote: await loadQuote(existing.id), existing: true });
        return;
      }

      const data = lead.data ?? {};
      fromLead = {
        source: "website",
        leadId: lead.id,
        // The business form asks for a company and no person; the lead's name
        // is then the company itself, which the quote keeps as the company.
        customerName: lead.company && lead.name === lead.company ? "" : lead.name,
        ...(lead.company && lead.name === lead.company
          ? {}
          : (() => {
              const name = nameParts({ first: lead.firstName, last: lead.lastName, full: lead.name });
              return { customerFirstName: name.first, customerLastName: name.last };
            })()),
        customerEmail: lead.email,
        customerPhone: lead.phone,
        company: lead.company,
        address: data.address ?? data.area ?? null,
        needs: lead.message,
        service: guessService(`${data.topic ?? ""} ${data.service ?? ""} ${lead.message ?? ""}`),
      };
    }

    const vatRate = body.vatRate !== undefined ? body.vatRate.toFixed(2) : await defaultVatRate();

    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(salesQuotes)
        .values({
          number: await nextQuoteNumber(tx),
          status: "request",
          source: body.source ?? "team",
          customerName: "",
          service: "moving",
          visitTime: "10:00",
          validUntil: businessDay(30),
          ...fromLead,
          ...definedFields(body),
          vatRate,
          createdBy: req.user!.id,
        })
        .returning();

      await recordAudit(
        {
          actor: actorOf(req),
          action: "sales_quote.created",
          entityType: "sales_quote",
          entityId: row!.id,
          changes: { number: row!.number, source: row!.source, leadId: row!.leadId },
          ipAddress: req.ip,
          requestId: req.requestId,
        },
        tx,
      );
      return row!;
    });

    // Turning a message into a quote is a way of reading it.
    if (created.leadId) {
      await db
        .update(leads)
        .set({ status: "read", readAt: new Date(), updatedAt: new Date() })
        .where(and(eq(leads.id, created.leadId), eq(leads.status, "new")));
    }

    res.status(201).json({ quote: await loadQuote(created.id) });
  }),
);

/** The editable fields a body actually carries, in the row's own shape. */
function definedFields(body: Partial<Record<keyof typeof fields, unknown>>) {
  const patch: Partial<typeof salesQuotes.$inferInsert> = {};
  for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
    const value = body[key];
    if (value === undefined) continue;
    if (key === "vatRate") patch.vatRate = (value as number).toFixed(2);
    else if (key === "customerName") patch.customerName = (value as string) ?? "";
    else (patch as Record<string, unknown>)[key] = value;
  }
  if (body.customerFirstName !== undefined || body.customerLastName !== undefined) {
    patch.customerName = joinName(patch.customerFirstName, patch.customerLastName);
  }
  return patch;
}

// ── Editing ───────────────────────────────────────────────────────────────

const patchBody = z.object({ source: z.enum(QUOTE_SOURCES).optional(), ...fields }).strict();

salesQuotesRouter.patch(
  "/:id",
  WRITE,
  validate({ params: idParams, body: patchBody }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<IdParams>(req);
    const body = req.body as z.infer<typeof patchBody>;
    const before = await rowFor(id);

    const patch = definedFields(body);
    if (body.source) patch.source = body.source;
    if (Object.keys(patch).length === 0) throw AppError.badRequest("Nothing to change.");

    await db
      .update(salesQuotes)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(salesQuotes.id, id));

    await recordAudit({
      actor: actorOf(req),
      action: "sales_quote.updated",
      entityType: "sales_quote",
      entityId: id,
      // Which fields, and the old and new value of the short ones; the lines
      // and notes are long and are named only.
      changes: Object.fromEntries(
        Object.entries(patch).map(([key, to]) => [
          key,
          key === "lines" || key === "needs" ? true : { from: before[key as keyof SalesQuoteRow] ?? null, to },
        ]),
      ),
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json({ quote: await loadQuote(id) });
  }),
);

/** Moves a quote along, refusing a step its current status does not allow. */
async function transition(
  req: Request,
  id: string,
  from: readonly string[],
  to: (typeof QUOTE_STATUSES)[number],
  extra: Partial<typeof salesQuotes.$inferInsert> = {},
) {
  const before = await rowFor(id);
  if (!from.includes(before.status)) {
    throw AppError.conflict("INVALID_STATE_TRANSITION", `A quote in "${before.status}" cannot move to "${to}".`);
  }

  await db
    .update(salesQuotes)
    .set({ ...extra, status: to, updatedAt: new Date() })
    .where(eq(salesQuotes.id, id));

  await recordAudit({
    actor: actorOf(req),
    action: `sales_quote.${to}`,
    entityType: "sales_quote",
    entityId: id,
    changes: { status: { from: before.status, to } },
    ipAddress: req.ip,
    requestId: req.requestId,
  });

  return loadQuote(id);
}

const visitBody = z
  .object({ visitDate: day, visitTime: clock, visitBy: text(120), visitNote: text(500) })
  .strict();

/** Books the site visit: request → visit. */
salesQuotesRouter.post(
  "/:id/visit",
  WRITE,
  validate({ params: idParams, body: visitBody }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<IdParams>(req);
    const body = req.body as z.infer<typeof visitBody>;
    const before = await rowFor(id);

    const visit = definedFields(body);
    if (!(visit.visitDate ?? before.visitDate)) {
      throw AppError.unprocessable("Choose a date for the visit first.", { field: "visitDate" });
    }

    res.json({ quote: await transition(req, id, ["request"], "visit", visit) });
  }),
);

/**
 * Sends the quote to the customer and marks it sent.
 *
 * The email is the point of the step, so it is sent with `send` and a failure
 * fails the request: the quote stays unsent rather than claiming to be out.
 */
salesQuotesRouter.post(
  "/:id/send",
  WRITE,
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<IdParams>(req);
    const quote = await rowFor(id);

    if (!["request", "visit", "sent"].includes(quote.status)) {
      throw AppError.conflict("INVALID_STATE_TRANSITION", `A quote in "${quote.status}" cannot be sent.`);
    }
    if (quote.lines.length === 0) {
      throw AppError.unprocessable("Add at least one line before sending.", { field: "lines" });
    }
    const email = quote.customerEmail?.trim() ?? "";
    if (!z.string().email().safeParse(email).success) {
      throw AppError.unprocessable("Add the customer's email first.", { field: "customerEmail" });
    }

    const totals = quoteTotals(quote.lines, quote.vatRate);
    if (totals.gross < 0) throw AppError.unprocessable("The quote total cannot be negative.", { field: "lines" });

    // The customer's language when the quote came from the website, else German.
    const [lead] = quote.leadId
      ? await db.select({ locale: leads.locale }).from(leads).where(eq(leads.id, quote.leadId)).limit(1)
      : [];
    const locale = toLocale(lead?.locale ?? "de");
    const company = await companyDetails();

    await mailer.send({
      template: "sales-quote",
      to: email,
      locale,
      payload: {
        number: quote.number,
        name: greetingName(quote.customerFirstName, quote.customerName) || undefined,
        sender: company.name,
        lines: quote.lines,
        netAmount: totals.net.toFixed(2),
        vatRate: quote.vatRate,
        vatAmount: totals.vatAmount.toFixed(2),
        totalGross: totals.gross.toFixed(2),
        validUntil: quote.validUntil ?? undefined,
        url: `${env.WEB_ORIGIN}/${locale}/kontakt`,
      },
    });

    res.json({ quote: await transition(req, id, ["request", "visit", "sent"], "sent", { sentAt: new Date() }) });
  }),
);

/**
 * The customer said yes: the quote becomes a confirmed order, in the same
 * transaction as the status change, so there is never an accepted quote
 * without its booking or a booking from a quote still open. A quote that
 * already made an order (accepted, reopened, accepted again) keeps that one.
 */
salesQuotesRouter.post(
  "/:id/accept",
  WRITE,
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<IdParams>(req);

    const order = await db.transaction(async (tx) => {
      const [quote] = await tx.select().from(salesQuotes).where(eq(salesQuotes.id, id)).for("update").limit(1);
      if (!quote) throw AppError.notFound("Quote");
      if (quote.status !== "sent") {
        throw AppError.conflict("INVALID_STATE_TRANSITION", `A quote in "${quote.status}" cannot be accepted.`);
      }

      let booked = quote.orderId
        ? (await tx.select({ id: orders.id, reference: orders.reference }).from(orders).where(eq(orders.id, quote.orderId)).limit(1))[0]
        : undefined;

      if (!booked) {
        if (quote.lines.length === 0) throw AppError.unprocessable("Add at least one line first.", { field: "lines" });
        if (!z.string().email().safeParse(quote.customerEmail?.trim() ?? "").success) {
          throw AppError.unprocessable("Add the customer's email first.", { field: "customerEmail" });
        }
        const [lead] = quote.leadId
          ? await tx.select({ locale: leads.locale }).from(leads).where(eq(leads.id, quote.leadId)).limit(1)
          : [];
        booked = await createOrderFromQuote(tx, quote, toLocale(lead?.locale ?? "de"));

        await recordAudit(
          {
            actor: actorOf(req),
            action: "order.created",
            entityType: "order",
            entityId: booked.id,
            changes: { reference: booked.reference, fromQuote: quote.number },
            ipAddress: req.ip,
            requestId: req.requestId,
          },
          tx,
        );
      }

      const now = new Date();
      await tx
        .update(salesQuotes)
        .set({ status: "accepted", acceptedAt: now, declinedAt: null, orderId: booked.id, updatedAt: now })
        .where(eq(salesQuotes.id, id));

      await recordAudit(
        {
          actor: actorOf(req),
          action: "sales_quote.accepted",
          entityType: "sales_quote",
          entityId: id,
          changes: { status: { from: quote.status, to: "accepted" }, orderId: booked.id },
          ipAddress: req.ip,
          requestId: req.requestId,
        },
        tx,
      );

      return booked;
    });

    // After the commit, like every customer email: the booking is confirmed
    // whether or not the "Booking confirmed" message goes out.
    void sendTemplate("booking_confirmed", order.id, { onlyOnce: true });

    res.json({ quote: await loadQuote(id), order });
  }),
);

salesQuotesRouter.post(
  "/:id/decline",
  WRITE,
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<IdParams>(req);
    res.json({ quote: await transition(req, id, ["sent"], "declined", { declinedAt: new Date() }) });
  }),
);

/** Accepted or declined back to sent; an order already made stays linked. */
salesQuotesRouter.post(
  "/:id/reopen",
  WRITE,
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<IdParams>(req);
    res.json({
      quote: await transition(req, id, ["accepted", "declined"], "sent", { acceptedAt: null, declinedAt: null }),
    });
  }),
);

salesQuotesRouter.delete(
  "/:id",
  WRITE,
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<IdParams>(req);
    const before = await rowFor(id);

    await db.delete(salesQuotes).where(eq(salesQuotes.id, id));

    await recordAudit({
      actor: actorOf(req),
      action: "sales_quote.deleted",
      entityType: "sales_quote",
      entityId: id,
      changes: { number: before.number, status: before.status },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.status(204).end();
  }),
);

