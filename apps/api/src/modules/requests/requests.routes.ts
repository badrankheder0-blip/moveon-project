import { randomInt } from "node:crypto";

import { db, schema } from "@mon/db";
import { eq, inArray } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { mailer } from "../../lib/mailer.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requestRateLimit } from "../../middleware/rate-limit.js";
import { optionalAuth } from "../../middleware/require-auth.js";
import { validate } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";
import { businessDay, defaultVatRate, guessService, nextQuoteNumber } from "../sales-quotes/sales-quotes.service.js";

/**
 * Requests the team prices by hand.
 *
 * The booking planner books what the pricing engine can price — a move, a
 * cleaning by floor area — as orders. What it collects with no engine behind
 * it arrives here: a renovation is assessed on a site visit, a business
 * customer gets a visit and a tailored quote, counted junk removal is
 * "confirmed by the team", and a custom service the office added under
 * Dashboard → Services is always priced by the team.
 *
 * Nothing is priced. Each request is kept as a quote request in
 * Dashboard → Quotes & visits (status "request", source "website"), mailed to
 * the office address the dashboard edits (`contact.email`), and confirmed to
 * the customer.
 */
export const requestsRouter: Router = Router();

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD.");

const BUILTIN_JOBS = ["moving", "renovation", "cleaning", "disposal", "visit"] as const;
type BuiltinJob = (typeof BUILTIN_JOBS)[number];
const isBuiltinJob = (service: string): service is BuiltinJob => (BUILTIN_JOBS as readonly string[]).includes(service);

const requestBody = z.object({
  customerType: z.enum(["private", "business"]),
  company: z.string().trim().max(160).optional(),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().toLowerCase().email(),
  contactPhone: z.string().trim().min(5).max(40),
  locale: z.enum(["de", "en", "ar", "tr"]).default("de"),
  jobs: z
    .array(
      z.object({
        /** A built-in job, or the key of a custom service (Dashboard → Services). */
        service: z.string().regex(/^[a-z0-9][a-z0-9-]{1,39}$/),
        address: z.string().trim().min(3).max(300),
        date: day.optional(),
        /** The arrival window as the customer saw it, e.g. "10:00–12:00". */
        window: z.string().trim().max(20).optional(),
        /** What the customer asked for, already summarised by the planner (answers included). */
        summary: z.string().trim().max(3000).default(""),
      }),
    )
    .min(1)
    .max(12),
  notes: z.string().trim().max(4000).optional(),
});

type RequestBody = z.infer<typeof requestBody>;

/** German, for the office. The customer's copy uses the same lines. */
const SERVICE_NAME: Record<BuiltinJob, string> = {
  moving: "Umzug",
  renovation: "Renovierung (Besichtigung)",
  cleaning: "Reinigung",
  disposal: "Entrümpelung",
  visit: "Besichtigung (Geschäftskunde)",
};

/**
 * The German names of the custom services a request names, from the
 * published catalogue. A key that is not a shown custom service is refused:
 * the office would get a request for something it no longer offers.
 */
async function customServiceNames(keys: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (keys.length === 0) return names;

  const rows = await db
    .select({ key: schema.services.key, name: schema.services.name, isActive: schema.services.isActive, isBuiltin: schema.services.isBuiltin })
    .from(schema.services)
    .where(inArray(schema.services.key, keys));

  for (const row of rows) {
    if (!row.isActive || row.isBuiltin) continue;
    const name = row.name.de?.trim() || row.name.en?.trim() || Object.values(row.name).find((text) => text?.trim()) || row.key;
    names.set(row.key, name);
  }

  const unknown = keys.filter((key) => !names.has(key));
  if (unknown.length) throw AppError.unprocessable("This service is not offered any more.", { services: unknown });
  return names;
}

requestsRouter.post(
  "/",
  optionalAuth,
  requestRateLimit,
  validate({ body: requestBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as RequestBody;

    const [office] = await db
      .select({ value: schema.siteSettings.value })
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.key, "contact.email"))
      .limit(1);

    const officeEmail = office?.value.trim();

    if (!officeEmail) {
      // Accepting a request nobody will ever read is worse than refusing it.
      logger.error("Service request refused: no contact.email in site settings");
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        503,
        "Requests cannot be received right now. Please call or email us.",
      );
    }

    const reference = `ANF-${new Date().getFullYear()}-${String(randomInt(10000, 100000))}`;

    const custom = await customServiceNames([...new Set(body.jobs.map((job) => job.service).filter((service) => !isBuiltinJob(service)))]);
    const serviceName = (service: string) => (isBuiltinJob(service) ? SERVICE_NAME[service] : `${custom.get(service) ?? service} (Anfrage)`);

    const jobs = body.jobs.map((job) =>
      [
        serviceName(job.service),
        job.address,
        [job.date, job.window].filter(Boolean).join(" "),
        job.summary,
      ]
        .filter(Boolean)
        .join(" — "),
    );

    // For the dashboard: one job per block, each answer on its own line.
    const jobBlocks = body.jobs.map((job) =>
      [
        [serviceName(job.service), job.address, [job.date, job.window].filter(Boolean).join(" ")].filter(Boolean).join(" — "),
        ...job.summary
          .split(" · ")
          .map((part) => part.trim())
          .filter(Boolean)
          .map((part) => `  – ${part}`),
      ].join("\n"),
    );

    const quote = await storeAsQuoteRequest(body, reference, jobBlocks, req.user ? { id: req.user.id, email: req.user.email } : null);

    const payload = {
      reference,
      name: body.contactName,
      email: body.contactEmail,
      phone: body.contactPhone,
      company: body.company || undefined,
      customerType: body.customerType,
      jobs,
      notes: body.notes || undefined,
      customerLocale: body.locale,
    };

    // The request is already kept in Quotes & visits, so a failed office copy
    // is logged rather than failing the call — a retry would file it twice.
    const mailed = await mailer.trySend({
      template: "service-request",
      to: officeEmail,
      payload: { ...payload, audience: "team" },
      locale: "de",
    });
    if (!mailed) logger.warn({ reference, quote: quote.number }, "Service request stored, but the office copy could not be mailed");

    // The confirmation is a courtesy; the request has already arrived.
    await mailer.trySend({
      template: "service-request",
      to: body.contactEmail,
      payload: { ...payload, audience: "customer" },
      locale: body.locale,
    });

    logger.info({ reference, quote: quote.number, userId: req.user?.id, jobs: body.jobs.length }, "Service request received");

    res.status(201).json({ reference });
  }),
);

/**
 * Files the request in Dashboard → Quotes & visits as a quote request: the
 * customer, the first job's address, service and preferred date, and every
 * job line (with the customer's answers) under "needs".
 */
async function storeAsQuoteRequest(
  body: RequestBody,
  reference: string,
  jobLines: string[],
  actor: { id: string; email: string } | null,
) {
  const first = body.jobs[0]!;
  // A business visit names its services in the summary ("Leistungen: Umzug, …").
  const service = first.service === "visit" ? guessService(first.summary) : first.service;
  const visitTime = first.window?.match(/^(\d{2}:\d{2})/)?.[1] ?? null;
  const needs = [
    `Buchungsplaner · Anfrage ${reference}${body.customerType === "business" ? " · Geschäftskunde" : ""}`,
    ...jobLines.map((line) => `• ${line}`),
    body.notes ? `\n${body.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 8000);
  const vatRate = await defaultVatRate();

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.salesQuotes)
      .values({
        number: await nextQuoteNumber(tx),
        status: "request",
        source: "website",
        customerName: body.contactName,
        customerEmail: body.contactEmail,
        customerPhone: body.contactPhone,
        company: body.company || null,
        address: first.address,
        service,
        needs,
        visitDate: first.date ?? null,
        visitTime,
        vatRate,
        validUntil: businessDay(30),
      })
      .returning({ id: schema.salesQuotes.id, number: schema.salesQuotes.number });

    await recordAudit(
      {
        actor: actor ?? { isSystem: true },
        action: "sales_quote.created",
        entityType: "sales_quote",
        entityId: row!.id,
        changes: { number: row!.number, source: "website", request: reference, service },
      },
      tx,
    );

    return row!;
  });
}
