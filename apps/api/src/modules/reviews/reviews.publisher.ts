import { schema } from "@mon/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "../audit/audit.service.js";
import { registerPublisher } from "../config/publish-registry.js";

const { reviews } = schema;

/**
 * Review moderation is drafted in the dashboard and reaches the website on
 * "Save & publish", like every other change to what the site shows.
 *
 * Draft ref = the review's id; value = how it should stand once published:
 * on the site, hidden from it, and the reply. A review is waiting while it is
 * neither published nor hidden.
 */
export const reviewDraft = z.object({
  isPublished: z.boolean(),
  hidden: z.boolean(),
  reply: z.string().max(2000),
});

const uuid = z.string().uuid();

registerPublisher("reviews", {
  permission: "reviews.moderate",
  schema: reviewDraft,
  apply: async (tx, rows, actor) => {
    const now = new Date();

    for (const row of rows) {
      if (!uuid.safeParse(row.ref).success) continue;
      const parsed = reviewDraft.safeParse(row.value);
      if (!parsed.success) continue;
      const value = parsed.data;

      const [before] = await tx.select().from(reviews).where(eq(reviews.id, row.ref)).limit(1);
      // Deleted since it was drafted (its order went): nothing to apply.
      if (!before) continue;

      const hidden = value.hidden && !value.isPublished;
      const reply = value.reply.trim();
      const patch: Partial<typeof reviews.$inferInsert> = {
        isPublished: value.isPublished,
        hiddenAt: hidden ? (before.hiddenAt ?? now) : null,
        updatedAt: now,
      };

      if (reply !== (before.adminReply ?? "")) {
        patch.adminReply = reply || null;
        patch.adminRepliedAt = reply ? now : null;
        patch.adminRepliedBy = reply ? actor.id : null;
      }

      await tx.update(reviews).set(patch).where(eq(reviews.id, row.ref));

      await recordAudit(
        {
          actor,
          action: "review.moderated",
          entityType: "review",
          entityId: row.ref,
          changes: {
            isPublished: { from: before.isPublished, to: patch.isPublished },
            hidden: { from: !!before.hiddenAt, to: hidden },
            ...(patch.adminReply !== undefined ? { reply: { from: before.adminReply, to: patch.adminReply } } : {}),
          },
        },
        tx,
      );
    }
  },
});
