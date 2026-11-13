import { schema } from "@mon/db";
import { z } from "zod";

import { recordAudit } from "../audit/audit.service.js";
import { registerPublisher } from "../config/publish-registry.js";
import { CHANNELS, TEMPLATE_DEFAULTS, TEMPLATE_KEYS, type TemplateKey } from "./messages.defaults.js";

const { messageTemplates } = schema;

const localized = z
  .object({
    de: z.string().max(4000),
    en: z.string().max(4000),
    tr: z.string().max(4000),
    ar: z.string().max(4000),
  })
  .partial();

/**
 * One template as the editor drafts it. Draft ref = the template key; value =
 * the whole template, so publishing writes exactly what the editor showed.
 */
export const templateDraft = z.object({
  isEnabled: z.boolean(),
  channels: z.array(z.enum(CHANNELS)).max(3),
  subject: localized,
  body: localized,
});

const isKey = (ref: string): ref is TemplateKey => (TEMPLATE_KEYS as readonly string[]).includes(ref);

/** Strips empty languages, so a cleared field falls back to German when sent. */
function clean(text: z.infer<typeof localized>) {
  return Object.fromEntries(Object.entries(text).filter(([, v]) => typeof v === "string" && v.trim() !== ""));
}

registerPublisher("messages", {
  permission: "settings.write",
  schema: templateDraft,
  apply: async (tx, rows, actor) => {
    const now = new Date();
    for (const row of rows) {
      if (!isKey(row.ref)) continue;
      const parsed = templateDraft.safeParse(row.value);
      if (!parsed.success) continue;
      const value = parsed.data;
      const channels = [...new Set(value.channels)];
      // German is what every other language falls back to; never publish it empty.
      const subject = { ...clean(value.subject), de: value.subject.de?.trim() || TEMPLATE_DEFAULTS[row.ref].subject.de };
      const body = { ...clean(value.body), de: value.body.de?.trim() || TEMPLATE_DEFAULTS[row.ref].body.de };

      await tx
        .insert(messageTemplates)
        .values({ key: row.ref, isEnabled: value.isEnabled, channels, subject, body, updatedBy: actor.id, updatedAt: now })
        .onConflictDoUpdate({
          target: messageTemplates.key,
          set: { isEnabled: value.isEnabled, channels, subject, body, updatedBy: actor.id, updatedAt: now },
        });

      await recordAudit(
        { actor, action: "message_template.published", entityType: "message_template", entityId: row.ref, changes: { isEnabled: value.isEnabled, channels } },
        tx,
      );
    }
  },
});
