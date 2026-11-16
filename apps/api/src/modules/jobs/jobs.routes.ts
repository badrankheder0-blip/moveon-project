import { env } from "@mon/config";
import { db, schema } from "@mon/db";
import { and, asc, count, desc, eq, isNull, max, ne, sql } from "drizzle-orm";
import { Router, type RequestHandler } from "express";
import multer from "multer";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { mailer } from "../../lib/mailer.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { jobApplicationRateLimit } from "../../middleware/rate-limit.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";

import {
  cleanFileName,
  detectJobFile,
  JOB_ATTACHMENTS_MAX,
  JOB_FILE_MAX_BYTES,
  readJobFile,
  storeJobFile,
} from "./job-files.js";
import { cleanRichText } from "./rich-text.js";

/**
 * Job postings and applications.
 *
 * Public: the list of active postings, one posting's details, and sending an
 * application with a CV and attachments for it. Dashboard ("content.write"):
 * creating, editing, switching off and deleting postings, and reading the
 * applications sent for each, files included.
 *
 * Every public read goes to the database uncached, so a change in the
 * dashboard is on the website the moment it is saved.
 */

const { jobs, jobApplications } = schema;
type JobApplicationFile = schema.JobApplicationFile;

export const jobsRouter: Router = Router();

const EMPLOYMENT_TYPES = ["full_time", "part_time", "mini_job"] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const live = () => and(isNull(jobs.deletedAt), eq(jobs.isActive, true));

/** "Fahrer, Führerschein C1/CE (m/w/d)" → "fahrer-fuehrerschein-c1-ce-m-w-d". */
function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "stelle"
  );
}

/** A slug no other posting uses: the title's, then -2, -3… */
async function freeSlug(title: string, exceptId?: string): Promise<string> {
  const base = slugify(title);
  for (let n = 1; n < 100; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const [taken] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(exceptId ? and(eq(jobs.slug, candidate), ne(jobs.id, exceptId)) : eq(jobs.slug, candidate))
      .limit(1);
    if (!taken) return candidate;
  }
  return `${base}-${Date.now()}`;
}

// ── Website ──────────────────────────────────────────────────────────────

const listColumns = {
  id: jobs.id,
  slug: jobs.slug,
  title: jobs.title,
  summary: jobs.summary,
  location: jobs.location,
  employmentType: jobs.employmentType,
};

jobsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const items = await db.select(listColumns).from(jobs).where(live()).orderBy(asc(jobs.sortOrder), asc(jobs.createdAt));
    res.set("Cache-Control", "no-store").json({ items });
  }),
);

const slugParam = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,100}$/) });

jobsRouter.get(
  "/posting/:slug",
  validate({ params: slugParam }),
  asyncHandler(async (req, res) => {
    const { slug } = validatedParams<{ slug: string }>(req);
    const [job] = await db
      .select({
        ...listColumns,
        description: jobs.description,
        tasks: jobs.tasks,
        requirements: jobs.requirements,
        offer: jobs.offer,
      })
      .from(jobs)
      .where(and(eq(jobs.slug, slug), live()))
      .limit(1);
    if (!job) throw AppError.notFound("Job");
    res.set("Cache-Control", "no-store").json({ job });
  }),
);

/** The CV and up to five attachments, in memory, each under the size cap. */
const parseApplication = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: JOB_FILE_MAX_BYTES, files: 1 + JOB_ATTACHMENTS_MAX, fields: 20, fieldSize: 20_000 },
}).fields([
  { name: "cv", maxCount: 1 },
  { name: "attachments", maxCount: JOB_ATTACHMENTS_MAX },
]);

const receiveApplication: RequestHandler = (req, res, next) => {
  parseApplication(req, res, (error: unknown) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      return next(
        error.code === "LIMIT_FILE_SIZE"
          ? new AppError("PAYLOAD_TOO_LARGE", 413, "FILE_TOO_LARGE")
          : error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE"
            ? AppError.badRequest("TOO_MANY_FILES")
            : AppError.badRequest("The application could not be read."),
      );
    }
    next(AppError.badRequest("The application could not be read."));
  });
};

const applicationBody = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  address: z.string().trim().max(300).optional().default(""),
  phone: z.string().trim().min(5).max(40),
  email: z.string().trim().toLowerCase().max(200).regex(EMAIL),
  message: z.string().trim().max(5000).optional().default(""),
  locale: z.enum(["de", "en", "ar", "tr"]).default("de"),
  consent: z.literal("true"),
  website: z.string().optional(),
});

const sizeText = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Sends an application for one posting.
 *
 * Multipart: the fields below, the CV as `cv` and the extras as
 * `attachments`. Error messages for the file checks are codes (FILE_TOO_LARGE,
 * CV_REQUIRED, CV_TYPE, ATTACHMENT_TYPE, TOO_MANY_FILES) that the website
 * turns into text in the visitor's language.
 */
jobsRouter.post(
  "/posting/:slug/applications",
  jobApplicationRateLimit,
  validate({ params: slugParam }),
  receiveApplication,
  asyncHandler(async (req, res) => {
    const { slug } = validatedParams<{ slug: string }>(req);
    const parsed = applicationBody.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Validation failed", {
        issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      });
    }
    const body = parsed.data;

    const [job] = await db.select({ id: jobs.id, title: jobs.title }).from(jobs).where(and(eq(jobs.slug, slug), live())).limit(1);
    if (!job) throw AppError.notFound("Job");

    // A bot filled the hidden field: answer as if it worked, keep nothing.
    if (body.website) {
      logger.info({ job: slug }, "Job application dropped by the honeypot");
      res.status(201).json({ ok: true });
      return;
    }

    const uploads = (req.files ?? {}) as Record<string, Express.Multer.File[] | undefined>;
    const cv = uploads.cv?.[0];
    if (!cv) throw AppError.badRequest("CV_REQUIRED");

    const incoming: { file: Express.Multer.File; kind: JobApplicationFile["kind"] }[] = [
      { file: cv, kind: "cv" },
      ...(uploads.attachments ?? []).map((file) => ({ file, kind: "attachment" as const })),
    ];

    // Every file is checked before any is written, so a refused upload leaves nothing behind.
    const checked = incoming.map(({ file, kind }) => {
      const format = file.size > 0 ? detectJobFile(file.buffer, kind) : null;
      if (!format) {
        throw new AppError("UNSUPPORTED_MEDIA_TYPE", 415, kind === "cv" ? "CV_TYPE" : "ATTACHMENT_TYPE");
      }
      return { file, kind, format };
    });

    const files: JobApplicationFile[] = [];
    for (const { file, kind, format } of checked) {
      files.push({
        kind,
        name: cleanFileName(file.originalname, format),
        storedName: await storeJobFile(file.buffer, format),
        contentType: format.contentType,
        bytes: file.size,
      });
    }

    const [created] = await db
      .insert(jobApplications)
      .values({
        jobId: job.id,
        jobTitle: job.title,
        firstName: body.firstName,
        lastName: body.lastName,
        address: body.address || null,
        phone: body.phone,
        email: body.email,
        message: body.message || null,
        locale: body.locale,
        files,
        consentAt: new Date(),
      })
      .returning({ id: jobApplications.id });

    const [office] = await db
      .select({ value: schema.siteSettings.value })
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.key, "contact.email"))
      .limit(1);
    const officeEmail = office?.value.trim();

    // The application is stored and visible in the dashboard either way; a
    // missing or failed notification is logged, never a reason to refuse it.
    if (officeEmail) {
      const mailed = await mailer.trySend({
        template: "job-application",
        to: officeEmail,
        payload: {
          jobTitle: job.title,
          name: `${body.firstName} ${body.lastName}`,
          email: body.email,
          phone: body.phone,
          address: body.address || undefined,
          message: body.message || undefined,
          files: files.map((f) => `${f.kind === "cv" ? "Lebenslauf" : "Anlage"}: ${f.name} (${sizeText(f.bytes)})`),
          locale: body.locale,
          dashboardUrl: `${env.WEB_ORIGIN}/de/admin/stellen?job=${job.id}&application=${created!.id}`,
        },
        locale: "de",
      });
      if (!mailed) logger.warn({ application: created!.id }, "Job application stored, but the office could not be mailed");
    } else {
      logger.warn({ application: created!.id }, "Job application stored without a notification: no contact.email in site settings");
    }

    logger.info({ application: created!.id, job: job.id, files: files.length }, "Job application received");
    res.status(201).json({ ok: true });
  }),
);

// ── Dashboard ────────────────────────────────────────────────────────────

const admin = Router();
admin.use(requireAuth, requirePermission("content.write"));
jobsRouter.use("/admin", admin);

/** Every posting that was not deleted, with how many applications it has and how many are unread. */
admin.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(jobs).where(isNull(jobs.deletedAt)).orderBy(asc(jobs.sortOrder), asc(jobs.createdAt));
    const counts = await db
      .select({
        jobId: jobApplications.jobId,
        total: count(),
        unread: sql<number>`count(*) filter (where ${jobApplications.readAt} is null)`.mapWith(Number),
      })
      .from(jobApplications)
      .groupBy(jobApplications.jobId);
    const byJob = new Map(counts.map((c) => [c.jobId, c]));

    // Applications for postings since deleted stay readable, under their old title.
    const orphans = await db
      .select({ id: jobs.id, title: jobs.title, total: count() })
      .from(jobApplications)
      .innerJoin(jobs, eq(jobs.id, jobApplications.jobId))
      .where(sql`${jobs.deletedAt} is not null`)
      .groupBy(jobs.id, jobs.title);

    res.json({
      items: rows.map((job) => ({
        ...job,
        applications: byJob.get(job.id)?.total ?? 0,
        unread: byJob.get(job.id)?.unread ?? 0,
      })),
      deleted: orphans,
    });
  }),
);

const jobBody = z.object({
  title: z.string().trim().min(2).max(160),
  summary: z.string().trim().max(400).default(""),
  description: z.string().max(40_000).default(""),
  tasks: z.string().max(40_000).default(""),
  requirements: z.string().max(40_000).default(""),
  offer: z.string().max(40_000).default(""),
  location: z.string().trim().max(120).default(""),
  employmentType: z.enum(EMPLOYMENT_TYPES).default("full_time"),
  isActive: z.boolean().default(true),
});

type JobBody = z.infer<typeof jobBody>;

const cleanJob = (body: Partial<JobBody>) => ({
  ...body,
  ...(body.description !== undefined ? { description: cleanRichText(body.description) } : {}),
  ...(body.tasks !== undefined ? { tasks: cleanRichText(body.tasks) } : {}),
  ...(body.requirements !== undefined ? { requirements: cleanRichText(body.requirements) } : {}),
  ...(body.offer !== undefined ? { offer: cleanRichText(body.offer) } : {}),
});

admin.post(
  "/",
  validate({ body: jobBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as JobBody;
    const [last] = await db.select({ value: max(jobs.sortOrder) }).from(jobs);
    const [created] = await db
      .insert(jobs)
      .values({ ...cleanJob(body), title: body.title, slug: await freeSlug(body.title), sortOrder: (last?.value ?? 0) + 1 })
      .returning();

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "job.created",
      entityType: "job",
      entityId: created!.id,
      changes: { title: created!.title },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.status(201).json({ job: created });
  }),
);

const idParam = z.object({ id: z.string().uuid() });

admin.patch(
  "/:id",
  validate({ params: idParam, body: jobBody.partial().extend({ sortOrder: z.number().int().min(0).optional() }) }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<{ id: string }>(req);
    const body = req.body as Partial<JobBody> & { sortOrder?: number };

    const [current] = await db.select().from(jobs).where(and(eq(jobs.id, id), isNull(jobs.deletedAt))).limit(1);
    if (!current) throw AppError.notFound("Job");

    // A renamed posting gets the new title's address.
    const slug = body.title && body.title !== current.title ? await freeSlug(body.title, id) : current.slug;

    const [updated] = await db
      .update(jobs)
      .set({ ...cleanJob(body), slug, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "job.updated",
      entityType: "job",
      entityId: id,
      changes: { fields: Object.keys(body) },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json({ job: updated });
  }),
);

/**
 * Takes a posting off the website for good. The row stays, so its
 * applications and their files remain readable; its address is given up for
 * a future posting with the same title.
 */
admin.delete(
  "/:id",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<{ id: string }>(req);
    const [current] = await db.select().from(jobs).where(and(eq(jobs.id, id), isNull(jobs.deletedAt))).limit(1);
    if (!current) throw AppError.notFound("Job");

    await db
      .update(jobs)
      .set({ deletedAt: new Date(), isActive: false, slug: `${current.slug}--deleted-${id.slice(0, 8)}`, updatedAt: new Date() })
      .where(eq(jobs.id, id));

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "job.deleted",
      entityType: "job",
      entityId: id,
      changes: { title: current.title },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.status(204).end();
  }),
);

/** The applications sent for one posting, newest first. File names on disk are not sent. */
admin.get(
  "/:id/applications",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<{ id: string }>(req);
    const rows = await db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.jobId, id))
      .orderBy(desc(jobApplications.createdAt));

    res.json({
      items: rows.map(({ files, ...rest }) => ({
        ...rest,
        files: files.map((f, index) => ({ index, kind: f.kind, name: f.name, contentType: f.contentType, bytes: f.bytes })),
      })),
    });
  }),
);

admin.post(
  "/applications/:id/read",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const { id } = validatedParams<{ id: string }>(req);
    await db
      .update(jobApplications)
      .set({ readAt: new Date() })
      .where(and(eq(jobApplications.id, id), isNull(jobApplications.readAt)));
    res.status(204).end();
  }),
);

/** One file of an application, as a download. Who fetched which CV is audited. */
admin.get(
  "/applications/:id/files/:index",
  validate({ params: z.object({ id: z.string().uuid(), index: z.coerce.number().int().min(0).max(20) }) }),
  asyncHandler(async (req, res) => {
    const { id, index } = validatedParams<{ id: string; index: number }>(req);
    const [row] = await db.select({ files: jobApplications.files }).from(jobApplications).where(eq(jobApplications.id, id)).limit(1);
    const file = row?.files[index];
    if (!file) throw AppError.notFound("File");

    let bytes: Buffer;
    try {
      bytes = await readJobFile(file.storedName);
    } catch (error) {
      logger.error({ err: error, application: id, index }, "Job application file missing on disk");
      throw AppError.notFound("File");
    }

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "job_application.file_downloaded",
      entityType: "job_application",
      entityId: id,
      changes: { file: file.name },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res
      .set({
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      })
      .send(bytes);
  }),
);
