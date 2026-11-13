import { db, schema } from "@mon/db";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireAnyPermission, requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedQuery } from "../../middleware/validate.js";
import { BRAND_ORIGINALS, ensureDashboardSettings, settingKinds, settingProblem } from "./company-settings.js";
import { checkContentDrafts, ensurePlannerRows, isMediaKind, parseContentRef, type ContentRef } from "./site-content.js";

const { contentBlocks, siteSettings, configDrafts } = schema;

/**
 * What the admin dashboard's website screens read and draft through.
 *
 * Reads return every locale of a section in one response, because the
 * editors switch language without a round trip and a list's add or remove
 * renumbers its items in all four languages at once. Writes are drafts in
 * `config_drafts` — domain "content" or "settings" — validated here against
 * the row they will land on, so a bad value is refused on the field instead
 * of failing everyone's "Save & publish" later.
 */
export const siteEditorRouter: Router = Router();

siteEditorRouter.use(requireAuth);

const blocksQuery = z.object({ section: z.string().trim().max(60).optional() });

siteEditorRouter.get(
  "/blocks",
  requirePermission("content.write"),
  validate({ query: blocksQuery }),
  asyncHandler(async (req, res) => {
    const { section } = validatedQuery<z.infer<typeof blocksQuery>>(req);

    if (!section || section === "planner") await ensurePlannerRows();

    const rows = await db
      .select({
        section: contentBlocks.section,
        slot: contentBlocks.slot,
        locale: contentBlocks.locale,
        kind: contentBlocks.kind,
        label: contentBlocks.label,
        value: contentBlocks.value,
        sortOrder: contentBlocks.sortOrder,
      })
      .from(contentBlocks)
      .where(section ? eq(contentBlocks.section, section) : undefined)
      .orderBy(asc(contentBlocks.section), asc(contentBlocks.sortOrder), asc(contentBlocks.slot));

    // A photo's "Use original" puts back the file the page shipped with.
    const { mediaDefault } = await import("@mon/db/image-content");
    const { PLANNER_CONTENT } = await import("./planner-content.js");
    const originals: Record<string, string> = {};
    for (const row of rows) {
      if (!isMediaKind(row.kind) || row.locale !== "de") continue;
      const original =
        mediaDefault(row.section, row.slot) ??
        (row.section === "planner" ? PLANNER_CONTENT.find((seed) => seed.slot === row.slot)?.values.en : undefined);
      if (original !== undefined) originals[`${row.section}|${row.slot}`] = original;
    }

    res.json({ blocks: rows, originals });
  }),
);

const draftsBody = z.object({
  drafts: z
    .array(z.object({ ref: z.string().min(1).max(300), value: z.string().max(10_000).nullable() }))
    .min(1)
    .max(800),
});

/**
 * Several content drafts in one transaction: a list's remove or reorder
 * renumbers every later item in every language, and half of that would show
 * a list with a hole in it. A null value drops the draft.
 */
siteEditorRouter.post(
  "/drafts",
  requirePermission("content.write"),
  validate({ body: draftsBody }),
  asyncHandler(async (req, res) => {
    const { drafts } = req.body as z.infer<typeof draftsBody>;

    const parsed = drafts.map((draft) => {
      const ref = parseContentRef(draft.ref);
      if (!ref) throw AppError.badRequest(`Not a content reference: ${draft.ref}`);
      return { key: draft.ref, ref, value: draft.value };
    });

    await checkContentDrafts(
      parsed.filter((draft) => draft.value !== null).map((draft) => ({ ref: draft.ref as ContentRef, value: draft.value! })),
    );

    await writeDrafts("content", parsed, req.user!.id);
    res.json({ ok: true, count: parsed.length });
  }),
);

/** Every setting, with the dashboard's own rows created first. */
siteEditorRouter.get(
  "/settings",
  requireAnyPermission("settings.write", "theme.write"),
  asyncHandler(async (_req, res) => {
    await ensureDashboardSettings();

    const settings = await db.select().from(siteSettings).orderBy(asc(siteSettings.group), asc(siteSettings.sortOrder));
    res.json({ settings, originals: BRAND_ORIGINALS });
  }),
);

const settingDraftsBody = z.object({
  drafts: z
    .array(z.object({ key: z.string().min(1).max(80), value: z.string().max(4000).nullable() }))
    .min(1)
    .max(50),
});

/** Settings drafts, each checked against its setting's kind. */
siteEditorRouter.post(
  "/settings/drafts",
  requirePermission("settings.write"),
  validate({ body: settingDraftsBody }),
  asyncHandler(async (req, res) => {
    const { drafts } = req.body as z.infer<typeof settingDraftsBody>;
    await ensureDashboardSettings();

    const kinds = await settingKinds(drafts.map((draft) => draft.key));

    for (const draft of drafts) {
      const kind = kinds.get(draft.key);
      if (!kind) throw AppError.notFound("Setting");
      if (draft.value === null) continue;
      const problem = settingProblem(draft.key, kind, draft.value);
      if (problem) throw AppError.unprocessable(problem, { key: draft.key });
    }

    await writeDrafts(
      "settings",
      drafts.map((draft) => ({ key: draft.key, value: draft.value })),
      req.user!.id,
    );
    res.json({ ok: true, count: drafts.length });
  }),
);

/** Upserts and deletes drafts of one domain in a single transaction. */
async function writeDrafts(domain: string, drafts: { key: string; value: string | null }[], userId: string): Promise<void> {
  const now = new Date();

  await db.transaction(async (tx) => {
    const drop = drafts.filter((draft) => draft.value === null).map((draft) => draft.key);
    if (drop.length) await tx.delete(configDrafts).where(and(eq(configDrafts.domain, domain), inArray(configDrafts.ref, drop)));

    for (const draft of drafts) {
      if (draft.value === null) continue;
      await tx
        .insert(configDrafts)
        .values({ domain, ref: draft.key, value: draft.value, updatedBy: userId, updatedAt: now })
        .onConflictDoUpdate({
          target: [configDrafts.domain, configDrafts.ref],
          set: { value: draft.value, updatedBy: userId, updatedAt: now },
        });
    }
  });
}
