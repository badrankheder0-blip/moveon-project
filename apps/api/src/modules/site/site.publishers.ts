import { schema } from "@mon/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { recordAudit } from "../audit/audit.service.js";
import { registerPublisher } from "../config/publish-registry.js";
import { CONTACT_MIRROR, DASHBOARD_SETTINGS, settingKinds, settingProblem } from "./company-settings.js";
import { invalidateSiteCache } from "./site-cache.js";
import { applyContentDrafts } from "./site-content.js";

const { siteSettings } = schema;

/**
 * The website's copy, pictures and settings reach visitors on
 * "Save & publish", not on the keystroke that edits them.
 *
 *   content   ref `section|slot|locale` (`*` for every locale), value = the
 *             block's new text, picture or clip path.
 *   settings  ref = the `site_settings` key, value = its new string.
 *
 * Both clear the site's cache afterwards, so the API answers with the new
 * values at once; the website's own fetch cache catches up within a minute.
 */

registerPublisher("content", {
  permission: "content.write",
  schema: z.string().max(10_000),
  apply: async (tx, rows, actor) => {
    const touched = await applyContentDrafts(tx, rows, actor.id);

    await recordAudit(
      {
        actor,
        action: "site.content_published",
        entityType: "content_block",
        changes: { count: touched.length, slots: touched.slice(0, 100) },
      },
      tx,
    );
  },
  afterPublish: invalidateSiteCache,
});

registerPublisher("settings", {
  permission: "settings.write",
  schema: z.string().max(4000),
  apply: async (tx, rows, actor) => {
    const keys = rows.map((row) => row.ref);
    const kinds = await settingKinds(keys, tx);
    const now = new Date();
    const changes: Record<string, { from: string | null; to: string }> = {};

    for (const row of rows) {
      const key = row.ref;
      const value = typeof row.value === "string" ? row.value : String(row.value ?? "");
      const kind = kinds.get(key);
      if (!kind) throw AppError.unprocessable(`There is no setting called ${key}.`);

      const problem = settingProblem(key, kind, value);
      if (problem) throw AppError.unprocessable(`${key}: ${problem}`);

      const [before] = await tx.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);

      if (before) {
        await tx.update(siteSettings).set({ value, updatedAt: now, updatedBy: actor.id }).where(eq(siteSettings.key, key));
      } else {
        const definition = DASHBOARD_SETTINGS.find((entry) => entry.key === key)!;
        await tx.insert(siteSettings).values({
          key,
          value,
          group: definition.group,
          kind: definition.kind,
          label: definition.label,
          description: definition.description ?? null,
          sortOrder: definition.sortOrder,
          updatedAt: now,
          updatedBy: actor.id,
        });
      }
      changes[key] = { from: before?.value ?? null, to: value };

      // The header, the contact page and the footer read `contact.*`; the
      // company's details are the same facts, so they move together. An
      // emptied company field leaves the public one as it was rather than
      // blanking the phone number in the header. The WhatsApp number is the
      // exception: emptying it is how the office takes the button down.
      const mirror = CONTACT_MIRROR[key];
      if (mirror && (value.trim() || key === "company.whatsapp")) {
        await tx.update(siteSettings).set({ value, updatedAt: now, updatedBy: actor.id }).where(eq(siteSettings.key, mirror));
      }
    }

    await recordAudit({ actor, action: "site.settings_published", entityType: "site_setting", changes }, tx);
  },
  afterPublish: invalidateSiteCache,
});
