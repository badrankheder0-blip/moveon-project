import {
  IMAGE_UPLOAD_MAX_BYTES,
  UPLOAD_MAX_BYTES,
  VIDEO_UPLOAD_MAX_BYTES,
  checkMediaUpload,
  isSafeImageSrc,
  isSafeVideoSrc,
  type UploadMediaKind,
} from "@mon/core";
import { db, schema } from "@mon/db";
import { and, asc, eq } from "drizzle-orm";
import { Router, type RequestHandler } from "express";
import multer from "multer";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { redis } from "../../lib/redis.js";
import { storeUpload, uploadsEnabled, uploadsUnavailable } from "../../lib/upload-storage.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { uploadRateLimit } from "../../middleware/rate-limit.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireAnyPermission, requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";
import { CACHE_TTL_SECONDS, CONTENT_CACHE_PREFIX, SETTINGS_CACHE_KEY, invalidateSiteCache } from "./site-cache.js";
import { siteEditorRouter } from "./site-editor.routes.js";
// Registers the "content" and "settings" draft publishers at startup.
import "./site.publishers.js";

const { siteSettings, contentBlocks } = schema;

export const siteRouter: Router = Router();

/**
 * The dashboard's editors: every locale of a section at once, drafts for
 * "Save & publish", and the company settings. The endpoints below that write
 * straight to the live rows stay for the older website screen.
 */
siteRouter.use("/editor", siteEditorRouter);

/**
 * The website's theme and content, managed from the dashboard.
 *
 * Two audiences: the website reads the published values anonymously on every
 * render, and admins edit them. The read path is cached because it runs on
 * every page view; every write invalidates that cache immediately, so a change
 * is visible on the next request rather than after a TTL.
 */

// ── Public: what the website renders with ───────────────────────────────

/**
 * Theme tokens.
 *
 * Returned as a flat map the site turns into CSS custom properties. Only
 * theme and brand keys are public — contact and SEO groups are included too
 * since they appear on the page anyway, but nothing operational is.
 */
siteRouter.get(
  "/theme",
  asyncHandler(async (_req, res) => {
    const cached = await redis.get(SETTINGS_CACHE_KEY).catch(() => null);

    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const rows = await db
      .select({ key: siteSettings.key, value: siteSettings.value, group: siteSettings.group })
      .from(siteSettings);

    const payload = {
      theme: Object.fromEntries(
        rows.filter((r) => r.group === "theme").map((r) => [r.key, r.value]),
      ),
      brand: Object.fromEntries(
        rows.filter((r) => r.group === "brand").map((r) => [r.key, r.value]),
      ),
      contact: Object.fromEntries(
        rows.filter((r) => r.group === "contact").map((r) => [r.key, r.value]),
      ),
      seo: Object.fromEntries(rows.filter((r) => r.group === "seo").map((r) => [r.key, r.value])),
      // The two company settings the booking planner applies to addresses
      // (Settings → Company). Read-only here; the rest of "company" — bank
      // and tax details — stays private.
      booking: {
        serviceAreas: rows.find((r) => r.key === "company.serviceAreas")?.value ?? "",
        onlyInsideAreas: rows.find((r) => r.key === "company.onlyInsideAreas")?.value === "true",
      },
    };

    await redis
      .set(SETTINGS_CACHE_KEY, JSON.stringify(payload), "EX", CACHE_TTL_SECONDS)
      .catch(() => undefined);

    res.json(payload);
  }),
);

const contentQuery = z.object({
  locale: z.enum(["de", "en", "ar", "tr"]).default("de"),
  section: z.string().trim().max(60).optional(),
});

/** Published content for a locale, grouped by section. */
siteRouter.get(
  "/content",
  validate({ query: contentQuery }),
  asyncHandler(async (req, res) => {
    const { locale, section } = validatedQuery<z.infer<typeof contentQuery>>(req);
    const cacheKey = `${CONTENT_CACHE_PREFIX}${locale}:${section ?? "all"}`;

    const cached = await redis.get(cacheKey).catch(() => null);

    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const filters = [eq(contentBlocks.locale, locale), eq(contentBlocks.isPublished, true)];
    if (section) filters.push(eq(contentBlocks.section, section));

    const rows = await db
      .select({
        section: contentBlocks.section,
        slot: contentBlocks.slot,
        value: contentBlocks.value,
      })
      .from(contentBlocks)
      .where(and(...filters))
      .orderBy(asc(contentBlocks.section), asc(contentBlocks.sortOrder));

    // Nested by section so a page pulls only what it renders.
    const grouped: Record<string, Record<string, string>> = {};

    for (const row of rows) {
      grouped[row.section] ??= {};
      grouped[row.section]![row.slot] = row.value;
    }

    const payload = { locale, sections: grouped };

    await redis.set(cacheKey, JSON.stringify(payload), "EX", CACHE_TTL_SECONDS).catch(() => undefined);

    res.json(payload);
  }),
);

// ── Staff: editing ──────────────────────────────────────────────────────

// Settings and content are separate capabilities: an editor who may rewrite
// page copy is not thereby allowed to repaint the site, and vice versa.
const themeEditor = [requireAuth, requirePermission("theme.write")] as const;
const contentEditor = [requireAuth, requirePermission("content.write")] as const;
/** Page photos are content, the logo is theme; either editor may upload. */
const photoUploader = [requireAuth, requireAnyPermission("content.write", "theme.write")] as const;

/** Every setting with its editor metadata, so the UI builds itself. */
siteRouter.get(
  "/settings",
  ...themeEditor,
  asyncHandler(async (_req, res) => {
    const settings = await db
      .select()
      .from(siteSettings)
      .orderBy(asc(siteSettings.group), asc(siteSettings.sortOrder));

    res.json({ settings });
  }),
);

/** Colours are validated as hex so a typo cannot produce an unstyled site. */
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const settingBody = z.object({ value: z.string().trim().max(2000) });

/**
 * What an image field accepts, stated in the error the editor shows.
 *
 * The value is rendered into an <img src> on public pages, so only files the
 * site ships and https URLs get through — a javascript: or data: value, or an
 * image over plain http, is refused here and again when the site renders.
 */
const IMAGE_RULE =
  "Expected an image path under /images/ (e.g. /images/home/hero-truck.jpg) or an https:// URL.";

/** The same for a video block, whose value lands in a <video src>. */
const VIDEO_RULE =
  "Expected a video path under /videos/ (e.g. /videos/home/strip-1.mp4) or an https:// URL.";

/**
 * Block kinds whose value is a file reference rather than copy. A photo or a
 * clip is the same in every language, so these are written to all four
 * locales' rows at once (see writeBlock) and can be reset to their seed.
 */
function isMediaKind(kind: string): kind is UploadMediaKind {
  return kind === "image" || kind === "video";
}

siteRouter.patch(
  "/settings/:key",
  ...themeEditor,
  validate({ params: z.object({ key: z.string().min(1).max(80) }), body: settingBody }),
  asyncHandler(async (req, res) => {
    const key = validatedParams<{ key: string }>(req).key;

    const [before] = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);

    if (!before) {
      throw AppError.notFound("Setting");
    }

    const value = req.body.value as string;

    // The kind recorded with the setting is what it is validated against —
    // a colour field must not be able to hold prose.
    if (before.kind === "color" && !HEX.test(value)) {
      throw AppError.unprocessable("Expected a hex colour such as #E62039.");
    }

    if (before.kind === "email" && !z.string().email().safeParse(value).success) {
      throw AppError.unprocessable("Expected a valid email address.");
    }

    if (before.kind === "url" && !z.string().url().safeParse(value).success) {
      throw AppError.unprocessable("Expected a valid URL.");
    }

    if (before.kind === "number" && Number.isNaN(Number(value))) {
      throw AppError.unprocessable("Expected a number.");
    }

    if (before.kind === "image" && !isSafeImageSrc(value)) {
      throw AppError.unprocessable(IMAGE_RULE);
    }

    const [updated] = await db
      .update(siteSettings)
      .set({ value, updatedAt: new Date(), updatedBy: req.user!.id })
      .where(eq(siteSettings.key, key))
      .returning();

    await invalidateSiteCache();

    // A theme change is visible to every visitor, so who made it is recorded.
    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "site.setting_updated",
      entityType: "site_setting",
      entityId: key,
      changes: { value: { from: before.value, to: value } },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json(updated);
  }),
);

const blocksQuery = z.object({
  locale: z.enum(["de", "en", "ar", "tr"]).default("de"),
  section: z.string().trim().max(60).optional(),
});

/** All blocks including unpublished ones, for the editor. */
siteRouter.get(
  "/blocks",
  ...contentEditor,
  validate({ query: blocksQuery }),
  asyncHandler(async (req, res) => {
    const { locale, section } = validatedQuery<z.infer<typeof blocksQuery>>(req);

    const filters = [eq(contentBlocks.locale, locale)];
    if (section) filters.push(eq(contentBlocks.section, section));

    const blocks = await db
      .select()
      .from(contentBlocks)
      .where(and(...filters))
      .orderBy(asc(contentBlocks.section), asc(contentBlocks.sortOrder));

    res.json({ locale, blocks });
  }),
);

siteRouter.patch(
  "/blocks/:id",
  ...contentEditor,
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
      value: z.string().trim().max(10_000).optional(),
      isPublished: z.boolean().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;

    const [before] = await db.select().from(contentBlocks).where(eq(contentBlocks.id, id)).limit(1);

    if (!before) {
      throw AppError.notFound("Content block");
    }

    // An image block's value lands in an <img src> on a public page, so it is
    // held to the image rule rather than accepted as free text. Empty is
    // allowed: it means "no photo set", and the page shows its own or none.
    // A video block is held to the video rule the same way; empty there means
    // "no clip", and the panel shows its poster photo.
    const value: string | undefined = req.body.value;

    if (value !== undefined && value !== "") {
      if (before.kind === "image" && !isSafeImageSrc(value)) {
        throw AppError.unprocessable(IMAGE_RULE);
      }

      if (before.kind === "video" && !isSafeVideoSrc(value)) {
        throw AppError.unprocessable(VIDEO_RULE);
      }
    }

    const updated = await writeBlock(before, req.body, req.user!.id);

    await invalidateSiteCache();

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "site.content_updated",
      entityType: "content_block",
      entityId: id,
      changes: {
        slot: `${before.section}.${before.slot}`,
        locale: isMediaKind(before.kind) ? "all" : before.locale,
        ...(req.body.value !== undefined ? { value: { from: before.value, to: req.body.value } } : {}),
        ...(req.body.isPublished !== undefined ? { isPublished: req.body.isPublished } : {}),
      },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json(updated);
  }),
);

/**
 * Puts an image or video block back to what the page shipped with.
 *
 * The escape hatch for a pasted URL that later breaks or turns out wrong: the
 * editor need not remember which file the design used. A strip clip's seed is
 * empty, so resetting one takes the clip off and leaves its poster.
 */
siteRouter.post(
  "/blocks/:id/reset",
  ...contentEditor,
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;

    const [before] = await db.select().from(contentBlocks).where(eq(contentBlocks.id, id)).limit(1);

    if (!before) {
      throw AppError.notFound("Content block");
    }

    const { mediaDefault } = await import("@mon/db/image-content");
    const value = isMediaKind(before.kind) ? mediaDefault(before.section, before.slot) : undefined;

    if (value === undefined) {
      throw AppError.unprocessable("Only a seeded image or video block has a default to reset to.");
    }

    const updated = await writeBlock(before, { value }, req.user!.id);

    await invalidateSiteCache();

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "site.content_updated",
      entityType: "content_block",
      entityId: id,
      changes: {
        slot: `${before.section}.${before.slot}`,
        locale: "all",
        value: { from: before.value, to: value },
        reset: true,
      },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json(updated);
  }),
);

// ── Staff: photo and video uploads ──────────────────────────────────────

/** "8 MB" — the limits as an editor reads them. */
const megabytes = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

/**
 * Whether the upload button should be offered at all, and how large a file
 * each kind may be.
 *
 * Asked separately rather than discovered by a failed upload, so an editor on
 * a deployment without storage never sees a control that can only fail.
 * `maxBytes` is the photo limit, as it always was; videos have their own.
 */
siteRouter.get(
  "/uploads",
  ...photoUploader,
  (_req, res) => {
    res.json({
      enabled: uploadsEnabled,
      maxBytes: IMAGE_UPLOAD_MAX_BYTES,
      videoMaxBytes: VIDEO_UPLOAD_MAX_BYTES,
    });
  },
);

/**
 * Multipart parsing, held in memory and capped at the larger upload limit.
 *
 * Memory rather than a temp file because the whole file is needed anyway — its
 * type is read from its bytes and it goes to S3 in one request. The cap has to
 * be the video limit, because the type is not known until the bytes are in;
 * the photo limit is applied once it is. One file and no other fields:
 * anything else in the form is a client this endpoint was not built for.
 */
const parseUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_BYTES, files: 1, fields: 0, parts: 1 },
}).single("file");

/** Runs multer and turns its errors into the API's own. */
const receiveFile: RequestHandler = (req, res, next) => {
  parseUpload(req, res, (error: unknown) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      return next(
        error.code === "LIMIT_FILE_SIZE"
          ? new AppError("PAYLOAD_TOO_LARGE", 413, `The file is larger than ${megabytes(UPLOAD_MAX_BYTES)}.`)
          : AppError.badRequest('Send exactly one file, in a form field named "file".'),
      );
    }

    next(AppError.badRequest("The upload could not be read."));
  });
};

/** Refused before the body is read, so a disabled store costs no buffer. */
const requireUploads: RequestHandler = (_req, _res, next) => {
  next(uploadsEnabled ? undefined : uploadsUnavailable());
};

/**
 * `?kind=image` or `?kind=video` says which the field being filled takes, so a
 * photo dropped on a video field is refused here, by its bytes, rather than
 * saved as a "clip" no browser can play. Without it either kind is accepted.
 */
const uploadQuery = z.object({ kind: z.enum(["image", "video"]).optional() });

const UNSUPPORTED: Record<UploadMediaKind | "any", string> = {
  image: "Only JPEG, PNG, WebP and AVIF photos can be uploaded. SVG is not accepted.",
  video: "Only MP4 and WebM videos can be uploaded.",
  any: "Only JPEG, PNG, WebP or AVIF photos and MP4 or WebM videos can be uploaded. SVG is not accepted.",
};

/**
 * Stores a photo or a video and returns the URL to put in its field.
 *
 * Only stores it: attaching it to a page is the ordinary block PATCH, so the
 * editor previews the file in place and the change is validated and audited
 * the same way as a pasted URL.
 */
siteRouter.post(
  "/uploads",
  ...photoUploader,
  uploadRateLimit,
  // Before the body is read: a malformed query costs no 60 MB buffer.
  validate({ query: uploadQuery }),
  requireUploads,
  receiveFile,
  asyncHandler(async (req, res) => {
    const { kind: expected } = validatedQuery<z.infer<typeof uploadQuery>>(req);

    if (!req.file) {
      throw AppError.badRequest('Send the file in a form field named "file".');
    }

    // Decided by the bytes, not by req.file.mimetype or the file name — both
    // are whatever the browser was told.
    const checked = checkMediaUpload(req.file.buffer, expected);

    if (!checked.ok) {
      if (checked.reason === "too_large") {
        throw checked.kind === "video"
          ? new AppError("PAYLOAD_TOO_LARGE", 413, `The video is larger than ${megabytes(VIDEO_UPLOAD_MAX_BYTES)}.`)
          : new AppError("PAYLOAD_TOO_LARGE", 413, `The photo is larger than ${megabytes(IMAGE_UPLOAD_MAX_BYTES)}.`);
      }

      throw checked.reason === "empty"
        ? AppError.badRequest("The file is empty.")
        : new AppError("UNSUPPORTED_MEDIA_TYPE", 415, UNSUPPORTED[expected ?? "any"]);
    }

    const { format } = checked;
    const { key, url } = await storeUpload(req.file.buffer, format);

    // The file is public the moment it is stored, whether or not a page ever
    // uses it, so the upload itself is recorded — not only the later edit.
    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: format.kind === "video" ? "site.video_uploaded" : "site.image_uploaded",
      entityType: "upload",
      entityId: key,
      changes: {
        contentType: format.contentType,
        bytes: req.file.size,
        originalName: req.file.originalname.slice(0, 200),
      },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.status(201).json({ url, kind: format.kind, contentType: format.contentType });
  }),
);

/**
 * Applies an edit to a block, and to its sibling locales when it is a photo or
 * a clip.
 *
 * A photograph is the same in every language, so an image block's rows are
 * kept identical: editing the German row and leaving the Arabic page on the
 * old photo would be a bug no editor could see from the form they were on.
 * Video blocks follow the same rule. Text blocks are per locale and only the
 * one row changes.
 */
async function writeBlock(
  before: typeof contentBlocks.$inferSelect,
  patch: { value?: string; isPublished?: boolean },
  userId: string,
): Promise<typeof contentBlocks.$inferSelect> {
  const where =
    isMediaKind(before.kind)
      ? and(eq(contentBlocks.section, before.section), eq(contentBlocks.slot, before.slot))
      : eq(contentBlocks.id, before.id);

  const rows = await db
    .update(contentBlocks)
    .set({ ...patch, updatedAt: new Date(), updatedBy: userId })
    .where(where)
    .returning();

  return rows.find((row) => row.id === before.id) ?? rows[0]!;
}

/**
 * Restores every theme setting to its seeded default.
 *
 * The escape hatch for an admin who has made the site unreadable — without it,
 * a bad contrast choice could only be undone by editing the database.
 */
siteRouter.post(
  "/settings/reset-theme",
  ...themeEditor,
  asyncHandler(async (req, res) => {
    const { THEME_DEFAULTS } = await import("@mon/db/site-defaults");

    for (const setting of THEME_DEFAULTS) {
      await db
        .update(siteSettings)
        .set({ value: setting.value, updatedAt: new Date(), updatedBy: req.user!.id })
        .where(eq(siteSettings.key, setting.key));
    }

    await invalidateSiteCache();

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "site.theme_reset",
      entityType: "site_setting",
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.status(204).send();
  }),
);

