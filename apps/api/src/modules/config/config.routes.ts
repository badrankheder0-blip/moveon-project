import type { Permission } from "@mon/core";
import { db, schema } from "@mon/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { validate, validatedParams } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";
import { allPublishers, publisherFor } from "./publish-registry.js";

const { configDrafts, configPublishes } = schema;

/**
 * Drafts and "Save & publish" for every configuration domain.
 *
 * The dashboard shows "You have unpublished changes" while any draft the
 * caller may publish exists. Publishing applies them all in one transaction,
 * so the website never sees half of an edit.
 */
export const configRouter: Router = Router();

configRouter.use(requireAuth);

/**
 * The domains this caller may edit: by the capabilities `requireAuth`
 * resolved for this request, so a "selected pages" member gets exactly the
 * domains their pages grant rather than their role's defaults.
 */
function writableDomains(permissions: readonly Permission[] | undefined): string[] {
  if (!permissions) return [];
  return allPublishers()
    .filter(([, publisher]) => permissions.includes(publisher.permission))
    .map(([domain]) => domain);
}

const mayWrite = (permissions: readonly Permission[] | undefined, permission: Permission) => !!permissions?.includes(permission);

configRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const domains = writableDomains(req.verifiedPermissions);
    const rows = domains.length
      ? await db.select({ domain: configDrafts.domain }).from(configDrafts).where(inArray(configDrafts.domain, domains))
      : [];
    const [last] = await db.select().from(configPublishes).orderBy(desc(configPublishes.publishedAt)).limit(1);

    const byDomain: Record<string, number> = {};
    for (const row of rows) byDomain[row.domain] = (byDomain[row.domain] ?? 0) + 1;

    res.json({ count: rows.length, byDomain, lastPublishedAt: last?.publishedAt ?? null });
  }),
);

configRouter.get(
  "/drafts/:domain",
  validate({ params: z.object({ domain: z.string().min(1).max(40) }) }),
  asyncHandler(async (req, res) => {
    const { domain } = validatedParams<{ domain: string }>(req);
    const publisher = publisherFor(domain);
    if (!publisher) throw AppError.notFound("Domain");
    if (!mayWrite(req.verifiedPermissions, publisher.permission)) throw AppError.forbidden();

    const rows = await db
      .select({ ref: configDrafts.ref, value: configDrafts.value, updatedAt: configDrafts.updatedAt })
      .from(configDrafts)
      .where(eq(configDrafts.domain, domain));
    res.json({ drafts: rows });
  }),
);

// POST, not PUT: the API's CORS policy and the SDK speak GET/POST/PATCH/DELETE.
configRouter.post(
  "/drafts/:domain",
  validate({
    params: z.object({ domain: z.string().min(1).max(40) }),
    body: z.object({ ref: z.string().min(1).max(300), value: z.unknown() }),
  }),
  asyncHandler(async (req, res) => {
    const { domain } = validatedParams<{ domain: string }>(req);
    const publisher = publisherFor(domain);
    if (!publisher) throw AppError.notFound("Domain");
    if (!mayWrite(req.verifiedPermissions, publisher.permission)) throw AppError.forbidden();

    const parsed = publisher.schema.safeParse(req.body.value);
    if (!parsed.success) throw AppError.badRequest("Invalid value.", parsed.error.flatten());

    const values = { domain, ref: req.body.ref as string, value: parsed.data as object, updatedBy: req.user!.id, updatedAt: new Date() };
    await db
      .insert(configDrafts)
      .values(values)
      .onConflictDoUpdate({ target: [configDrafts.domain, configDrafts.ref], set: { value: values.value, updatedBy: values.updatedBy, updatedAt: values.updatedAt } });

    res.json({ ok: true });
  }),
);

configRouter.delete(
  "/drafts/:domain/:ref",
  validate({ params: z.object({ domain: z.string().min(1).max(40), ref: z.string().min(1).max(300) }) }),
  asyncHandler(async (req, res) => {
    const { domain, ref } = validatedParams<{ domain: string; ref: string }>(req);
    const publisher = publisherFor(domain);
    if (!publisher) throw AppError.notFound("Domain");
    if (!mayWrite(req.verifiedPermissions, publisher.permission)) throw AppError.forbidden();

    await db.delete(configDrafts).where(and(eq(configDrafts.domain, domain), eq(configDrafts.ref, ref)));
    res.json({ ok: true });
  }),
);

/** "Discard": drops every draft the caller may write. */
configRouter.delete(
  "/drafts",
  asyncHandler(async (req, res) => {
    const domains = writableDomains(req.verifiedPermissions);
    if (domains.length) await db.delete(configDrafts).where(inArray(configDrafts.domain, domains));
    res.json({ ok: true });
  }),
);

/** "Save & publish": applies every draft the caller may write, atomically. */
configRouter.post(
  "/publish",
  asyncHandler(async (req, res) => {
    const domains = writableDomains(req.verifiedPermissions);
    if (!domains.length) throw AppError.forbidden();

    const rows = await db.select().from(configDrafts).where(inArray(configDrafts.domain, domains));
    if (!rows.length) {
      res.json({ published: 0 });
      return;
    }

    const actor = { id: req.user!.id, email: req.user!.email };
    const touched = [...new Set(rows.map((row) => row.domain))];

    await db.transaction(async (tx) => {
      for (const domain of touched) {
        const publisher = publisherFor(domain);
        if (!publisher) continue;
        await publisher.apply(
          tx,
          rows.filter((row) => row.domain === domain).map((row) => ({ ref: row.ref, value: row.value })),
          actor,
        );
      }
      await tx.delete(configDrafts).where(inArray(configDrafts.domain, touched));
      await tx.insert(configPublishes).values({ changes: rows.length, publishedBy: actor.id });
    });

    for (const domain of touched) await publisherFor(domain)?.afterPublish?.();

    await recordAudit({
      actor,
      action: "config.published",
      entityType: "config",
      entityId: touched.join(","),
      changes: Object.fromEntries(touched.map((domain) => [domain, { count: rows.filter((row) => row.domain === domain).length }])),
      ipAddress: req.ip,
    });

    res.json({ published: rows.length, domains: touched });
  }),
);
