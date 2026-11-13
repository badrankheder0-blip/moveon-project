import { schema } from "@mon/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "../audit/audit.service.js";
import { registerPublisher } from "../config/publish-registry.js";
import { codeWasUsed, endOfDay, normaliseAudience } from "./discounts.service.js";

const { discountCodes } = schema;

/**
 * Discount codes are drafted per code: draft ref = the code (upper case),
 * value = what the dashboard edits, or `{ deleted: true }`. Publishing writes
 * `discount_codes`, which the quote and booking paths validate against.
 * Limits the dashboard does not show (valid-from, max uses, minimum order)
 * are left as they are.
 */

export const CODE_PATTERN = /^[A-Z0-9_-]{3,40}$/;

export const discountValue = z
  .object({
    kind: z.enum(["percentage", "fixed"]),
    value: z.string().regex(/^\d{1,6}(\.\d{1,2})?$/, "Expected a decimal amount."),
    validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    isActive: z.boolean(),
    audience: z.array(z.string().trim().toLowerCase().email().max(254)).max(200),
  })
  .refine((value) => Number.parseFloat(value.value) > 0, { message: "Enter a value above 0.", path: ["value"] })
  .refine((value) => value.kind !== "percentage" || Number.parseFloat(value.value) <= 100, {
    message: "A percentage discount cannot exceed 100.",
    path: ["value"],
  });

const discountDraft = z.union([z.object({ deleted: z.literal(true) }), discountValue]);

registerPublisher("discounts", {
  permission: "discounts.write",
  schema: discountDraft,
  apply: async (tx, rows, actor) => {
    for (const row of rows) {
      const code = row.ref.trim().toUpperCase();
      if (!CODE_PATTERN.test(code)) continue;
      const parsed = discountDraft.parse(row.value);

      if ("deleted" in parsed) {
        // A code that was redeemed stays, switched off: past orders name it,
        // and their invoices should still say where the discount came from.
        if (await codeWasUsed(tx, code)) {
          await tx.update(discountCodes).set({ isActive: false }).where(eq(discountCodes.code, code));
          await recordAudit({ actor, action: "discount.disabled", entityType: "discount_code", entityId: code, changes: { reason: "deleted after use" } }, tx);
        } else {
          await tx.delete(discountCodes).where(eq(discountCodes.code, code));
          await recordAudit({ actor, action: "discount.deleted", entityType: "discount_code", entityId: code }, tx);
        }
        continue;
      }

      const values = {
        kind: parsed.kind,
        value: parsed.value,
        isActive: parsed.isActive,
        validUntil: parsed.validUntil ? endOfDay(parsed.validUntil) : null,
        audience: normaliseAudience(parsed.audience),
      };

      await tx
        .insert(discountCodes)
        .values({ code, ...values })
        .onConflictDoUpdate({ target: discountCodes.code, set: values });

      await recordAudit(
        {
          actor,
          action: "discount.published",
          entityType: "discount_code",
          entityId: code,
          changes: { kind: values.kind, value: values.value, isActive: values.isActive, validUntil: parsed.validUntil, audience: values.audience.length },
        },
        tx,
      );
    }
  },
});
