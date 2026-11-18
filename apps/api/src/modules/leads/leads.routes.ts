import { env, isTest } from "@mon/config";
import { db, schema } from "@mon/db";
import { and, desc, eq, ilike, inArray, ne, or, type SQL } from "drizzle-orm";
import { Router, type Request, type RequestHandler } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { mailer } from "../../lib/mailer.js";
import { redis } from "../../lib/redis.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";
import { cleanFileName, detectJobFile, JOB_FILE_MAX_BYTES } from "../jobs/job-files.js";
import { joinName } from "../../lib/names.js";

const { leads, salesQuotes } = schema;

/**
 * The website inbox: messages from the contact, business, partnership and job forms.
 *
 * The forms post here anonymously; the office reads, answers and closes them in
 * the dashboard, and can turn one into a quote (see sales-quotes). Every field a
 * form had is kept in `data`, so the inbox shows the message as it was filled in
 * even when a form gains a field this file has never heard of.
 */
export const leadsRouter: Router = Router();

export const LEAD_KINDS = ["contact", "business", "partner", "job"] as const;
export const LEAD_STATUSES = ["new", "read", "replied", "closed"] as const;

/**
 * Its own allowance, sized like the booking planner's requests: a handful an
 * hour is generous for a visitor and useless for a spammer. Not shared with
 * `/api/requests`, so a customer who books a site visit can still write to us.
 */
const leadRateLimit = rateLimit({
  windowMs: 60 * 60_000,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => isTest,
  store: new RedisStore({
    prefix: "ratelimit:lead:",
    sendCommand: (...args: string[]) => {
      const [command, ...rest] = args as [string, ...string[]];
      return redis.call(command, ...rest) as Promise<never>;
    },
  }),
  keyGenerator: (req: Request) => `ip:${req.ip ?? "unknown"}`,
  message: {
    error: { code: "RATE_LIMITED", message: "Too many requests. Please wait a moment and try again." },
  },
});

/** A form sends "" for a field left empty; that is the same as not sending it. */
const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const text = (max: number) => z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

const leadBody = z
  .object({
    kind: z.enum(LEAD_KINDS),
    name: text(160),
    /** The sender's first and last name, as the forms ask for them; `name` is made from them. */
    firstName: text(80),
    lastName: text(80),
    email: z.preprocess(blankToUndefined, z.string().trim().toLowerCase().email().max(254).optional()),
    phone: text(40),
    company: text(160),
    message: text(5000),
    locale: z.enum(["de", "en", "ar", "tr"]).default("de"),
    /** Every other field of the form, by its name. */
    data: z
      .record(z.string().regex(/^[A-Za-z][\w.-]{0,59}$/), z.string().trim().max(2000))
      .default({})
      .refine((data) => Object.keys(data).length <= 30, "Too many fields."),
    /**
     * A field no person sees. A bot that fills every input fills this one too,
     * and gets a polite answer and nothing stored.
     */
    website: z.string().optional(),
  })
  // One person's name, whichever way it came: two fields, or one older line.
  .transform((body) => {
    if (!body.firstName && !body.lastName) return body;
    return { ...body, name: joinName(body.firstName, body.lastName) };
  })
  .superRefine((body, ctx) => {
    const need = (field: "name" | "email" | "message" | "company", ok: boolean) => {
      if (!ok) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: "Required." });
    };
    const reachable = Boolean(body.email || body.phone);

    // What each form cannot be answered without.
    switch (body.kind) {
      case "contact":
        need("name", Boolean(body.name));
        need("email", Boolean(body.email));
        need("message", Boolean(body.message));
        break;
      case "business":
        need("company", Boolean(body.company || body.name));
        need("email", reachable);
        break;
      case "partner":
        need("company", Boolean(body.company || body.name));
        break;
      case "job":
        need("name", Boolean(body.name));
        need("email", reachable);
        break;
    }
  });

type LeadBody = z.infer<typeof leadBody>;

leadsRouter.post(
  "/",
  leadRateLimit,
  validate({ body: leadBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as LeadBody;

    if (body.website) {
      logger.info({ kind: body.kind }, "Website form dropped by the honeypot");
      res.status(201).json({ id: null });
      return;
    }

    // Empty answers carry nothing, and the inbox lists only the fields that were filled in.
    const data = Object.fromEntries(Object.entries(body.data).filter(([, value]) => value !== ""));

    const [created] = await db
      .insert(leads)
      .values({
        kind: body.kind,
        // The inbox needs something to call the sender by; the business form
        // asks for a company rather than a person.
        name: body.name ?? body.company ?? body.email ?? body.phone ?? "—",
        firstName: body.firstName ?? null,
        lastName: body.lastName ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        company: body.company ?? null,
        message: body.message ?? null,
        data,
        locale: body.locale,
      })
      .returning({ id: leads.id });

    logger.info({ leadId: created?.id, kind: body.kind }, "Website message received");

    res.status(201).json({ id: created?.id ?? null });
  }),
);

/** The office's name for each form, in the German notification. */
const KIND_LABEL: Record<(typeof LEAD_KINDS)[number], string> = {
  contact: "Kontaktanfrage",
  business: "Geschäftskundenanfrage",
  partner: "Partneranfrage",
  job: "Bewerbung",
};

/** The form's fields as multipart text (`payload`, JSON) and at most one file (`file`). */
const parseLeadWithFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: JOB_FILE_MAX_BYTES, files: 1, fields: 2, fieldSize: 40_000 },
}).single("file");

const receiveLeadWithFile: RequestHandler = (req, res, next) => {
  parseLeadWithFile(req, res, (error: unknown) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return next(new AppError("PAYLOAD_TOO_LARGE", 413, "FILE_TOO_LARGE"));
    }
    next(AppError.badRequest("The form could not be read."));
  });
};

/**
 * A website form with an optional file (the partner form): stored in the
 * inbox like any other message, and mailed to the office with the file
 * attached. The file is checked by its bytes — PDF, Word, JPEG or PNG — and is
 * not kept on the server; the mail is where it lives.
 */
leadsRouter.post(
  "/with-file",
  leadRateLimit,
  receiveLeadWithFile,
  asyncHandler(async (req, res) => {
    let raw: unknown;
    try {
      raw = JSON.parse(String((req.body as { payload?: unknown }).payload ?? ""));
    } catch {
      throw AppError.badRequest("The form could not be read.");
    }
    const parsed = leadBody.safeParse(raw);
    if (!parsed.success) {
      throw AppError.badRequest("Validation failed", {
        issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      });
    }
    const body = parsed.data;

    if (body.website) {
      logger.info({ kind: body.kind }, "Website form dropped by the honeypot");
      res.status(201).json({ id: null });
      return;
    }

    let attachment: { filename: string; content: Buffer; contentType: string } | undefined;
    if (req.file) {
      const format = req.file.size > 0 ? detectJobFile(req.file.buffer, "attachment") : null;
      if (!format) throw new AppError("UNSUPPORTED_MEDIA_TYPE", 415, "FILE_TYPE");
      attachment = { filename: cleanFileName(req.file.originalname, format), content: req.file.buffer, contentType: format.contentType };
    }

    const data = Object.fromEntries(Object.entries(body.data).filter(([, value]) => value !== ""));
    if (attachment) data.attachment = `${attachment.filename} (per E-Mail an das Büro gesendet)`;

    const [created] = await db
      .insert(leads)
      .values({
        kind: body.kind,
        name: body.name ?? body.company ?? body.email ?? body.phone ?? "—",
        firstName: body.firstName ?? null,
        lastName: body.lastName ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        company: body.company ?? null,
        message: body.message ?? null,
        data,
        locale: body.locale,
      })
      .returning({ id: leads.id });

    const [office] = await db
      .select({ value: schema.siteSettings.value })
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.key, "contact.email"))
      .limit(1);
    const officeEmail = office?.value.trim();

    // Stored either way; a missing or failed mail is logged, never a refusal.
    if (officeEmail) {
      const mailed = await mailer.trySend({
        template: "website-lead",
        to: officeEmail,
        payload: {
          kindLabel: KIND_LABEL[body.kind],
          name: body.name ?? body.company ?? "—",
          firstName: body.firstName,
          lastName: body.lastName,
          company: body.company,
          email: body.email,
          phone: body.phone,
          message: body.message,
          lines: Object.entries(body.data)
            .filter(([, value]) => value !== "")
            .map(([key, value]) => `${key}: ${value}`),
          attachment: attachment?.filename,
          locale: body.locale,
          inboxUrl: `${env.WEB_ORIGIN}/de/admin/posteingang`,
        },
        locale: "de",
        attachments: attachment ? [attachment] : undefined,
      });
      if (!mailed) logger.warn({ leadId: created?.id }, "Website message stored, but the office could not be mailed");
    } else {
      logger.warn({ leadId: created?.id }, "Website message stored without a notification: no contact.email in site settings");
    }

    logger.info({ leadId: created?.id, kind: body.kind, file: Boolean(attachment) }, "Website message with file received");
    res.status(201).json({ id: created?.id ?? null });
  }),
);

// ── The office ────────────────────────────────────────────────────────────

const listQuery = z.object({
  kind: z.enum(LEAD_KINDS).optional(),
  /** A status, or "open" for everything not closed. */
  status: z.enum([...LEAD_STATUSES, "open"]).optional(),
  q: z.string().trim().max(120).optional(),
});

const idParams = z.object({ id: z.string().uuid() });

/** The quote made from each message, so the inbox can offer "Open quote". */
async function quotesFor(ids: string[]) {
  if (ids.length === 0) return new Map<string, { id: string; number: string }>();

  const rows = await db
    .select({ id: salesQuotes.id, number: salesQuotes.number, leadId: salesQuotes.leadId })
    .from(salesQuotes)
    .where(inArray(salesQuotes.leadId, ids))
    .orderBy(desc(salesQuotes.createdAt));

  const byLead = new Map<string, { id: string; number: string }>();
  for (const row of rows) {
    if (row.leadId && !byLead.has(row.leadId)) byLead.set(row.leadId, { id: row.id, number: row.number });
  }
  return byLead;
}

leadsRouter.get(
  "/",
  requireAuth,
  requirePermission("messages.read"),
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const query = validatedQuery<z.infer<typeof listQuery>>(req);
    const conditions: SQL[] = [];

    if (query.kind) conditions.push(eq(leads.kind, query.kind));
    if (query.status === "open") conditions.push(ne(leads.status, "closed"));
    else if (query.status) conditions.push(eq(leads.status, query.status));
    if (query.q) {
      const term = `%${query.q}%`;
      conditions.push(
        or(
          ilike(leads.name, term),
          ilike(leads.email, term),
          ilike(leads.company, term),
          ilike(leads.phone, term),
          ilike(leads.message, term),
        )!,
      );
    }

    const rows = await db
      .select()
      .from(leads)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(leads.createdAt))
      .limit(1000);

    const quotes = await quotesFor(rows.map((row) => row.id));

    res.json({ leads: rows.map((row) => ({ ...row, quote: quotes.get(row.id) ?? null })) });
  }),
);

/** Reading a message is what marks it read, as opening it in the prototype does. */
leadsRouter.get(
  "/:id",
  requireAuth,
  requirePermission("messages.read"),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<z.infer<typeof idParams>>(req);

    const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    if (!lead) throw AppError.notFound("Message");

    let current = lead;
    if (lead.status === "new") {
      const now = new Date();
      const [updated] = await db
        .update(leads)
        .set({ status: "read", readAt: now, updatedAt: now })
        // Only if still new: two people opening it at once mark it read once.
        .where(and(eq(leads.id, id), eq(leads.status, "new")))
        .returning();
      if (updated) current = updated;
    }

    const quotes = await quotesFor([id]);
    res.json({ lead: { ...current, quote: quotes.get(id) ?? null } });
  }),
);

const patchBody = z
  .object({
    status: z.enum(LEAD_STATUSES).optional(),
    note: z.string().max(4000).nullable().optional(),
  })
  .strict()
  .refine((body) => body.status !== undefined || body.note !== undefined, "Nothing to change.");

leadsRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("messages.write"),
  validate({ params: idParams, body: patchBody }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<z.infer<typeof idParams>>(req);
    const body = req.body as z.infer<typeof patchBody>;

    const [before] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    if (!before) throw AppError.notFound("Message");

    const now = new Date();
    const patch: Partial<typeof leads.$inferInsert> = { updatedAt: now };

    if (body.note !== undefined) patch.note = body.note?.trim() ? body.note : null;

    if (body.status !== undefined && body.status !== before.status) {
      patch.status = body.status;
      // Each moment is kept the first time it happens; reopening clears "closed".
      if (body.status !== "new" && !before.readAt) patch.readAt = now;
      if (body.status === "replied") patch.repliedAt = now;
      patch.closedAt = body.status === "closed" ? now : null;
    }

    const [updated] = await db.update(leads).set(patch).where(eq(leads.id, id)).returning();

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "lead.updated",
      entityType: "lead",
      entityId: id,
      changes: {
        ...(patch.status ? { status: { from: before.status, to: patch.status } } : {}),
        ...(body.note !== undefined ? { note: true } : {}),
      },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    const quotes = await quotesFor([id]);
    res.json({ lead: { ...updated!, quote: quotes.get(id) ?? null } });
  }),
);
