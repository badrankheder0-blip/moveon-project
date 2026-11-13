import { schema } from "@mon/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "../audit/audit.service.js";
import { registerPublisher } from "../config/publish-registry.js";
import { QUESTION_TYPES, SERVICE_ICONS, isBuiltinService } from "./services.defaults.js";

const { services } = schema;

/**
 * Services are drafted whole: draft ref = the service key, value = the full
 * service as the dashboard edits it (or `{ deleted: true }` for a custom
 * service being removed). Publishing writes each one to `services`, so the
 * website and the booking planner switch to it in one go.
 */

const localized = (max: number) =>
  z
    .object({
      de: z.string().max(max).optional(),
      en: z.string().max(max).optional(),
      tr: z.string().max(max).optional(),
      ar: z.string().max(max).optional(),
    })
    .strip();

const question = z.object({
  id: z.string().min(1).max(40),
  type: z.enum(QUESTION_TYPES),
  label: localized(200),
  required: z.boolean(),
  options: z.array(localized(120)).max(30).optional(),
});

const step = z.object({
  id: z.string().min(1).max(40),
  title: localized(200).optional(),
  hint: localized(400).optional(),
  // The step's built-in answers the office needs; absent = the planner's own.
  required: z.array(z.string().min(1).max(80)).max(60).optional(),
  questions: z.array(question).max(40).optional(),
});

/** A photo path on this site, or an absolute http(s) URL (an upload's). */
const image = z
  .string()
  .trim()
  .max(1000)
  .regex(/^(\/(?!\/)|https?:\/\/)/, "Use a /images/… path or an http(s) URL.")
  .nullable();

export const serviceValue = z.object({
  key: z.string().regex(/^[a-z0-9][a-z0-9-]{1,39}$/),
  isActive: z.boolean(),
  name: localized(80),
  description: localized(400),
  tagline: localized(120),
  image,
  icon: z.enum(SERVICE_ICONS).nullable(),
  pricingModel: z.string().max(20).optional(),
  flow: z.array(step).max(20),
  sortOrder: z.number().int().min(0).max(10_000),
});

const deleted = z.object({ deleted: z.literal(true) });

/** Drops the languages left out, so a stored text has only the ones written. */
function toLocalized(value: { de?: string | undefined; en?: string | undefined; tr?: string | undefined; ar?: string | undefined }): schema.Localized {
  const out: schema.Localized = {};
  for (const lang of ["de", "en", "tr", "ar"] as const) {
    const text = value[lang];
    if (typeof text === "string") out[lang] = text;
  }
  return out;
}

export const serviceDraft = z.union([deleted, serviceValue]).superRefine((value, ctx) => {
  if ("deleted" in value || isBuiltinService(value.key)) return;

  // A custom service has one planner step of its own, and the website reads
  // its questions from the flow entry called "questions"
  // (apps/web/lib/booking/catalog.ts, `plannerStep`). Any other id maps to a
  // step that does not exist, so the questions are stored and then never
  // asked — silently, which is the worst way to lose them. The dashboard
  // always writes "questions"; this refuses anything else rather than
  // accepting a service whose questions can never reach a customer.
  for (const [index, step] of value.flow.entries()) {
    if (step.id !== "questions") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["flow", index, "id"],
        message: 'A custom service keeps its questions in one flow step called "questions".',
      });
    }
  }
});

registerPublisher("services", {
  permission: "catalog.write",
  schema: serviceDraft,
  apply: async (tx, rows, actor) => {
    for (const row of rows) {
      const key = row.ref;
      const parsed = serviceDraft.parse(row.value);

      if ("deleted" in parsed) {
        // The four built-in services can be hidden, never removed: the
        // planner's steps and the pricing engine are written around them.
        if (isBuiltinService(key)) continue;
        await tx.delete(services).where(and(eq(services.key, key), eq(services.isBuiltin, false)));
        await recordAudit({ actor, action: "service.deleted", entityType: "service", entityId: key }, tx);
        continue;
      }

      const builtin = isBuiltinService(key);
      const values = {
        isBuiltin: builtin,
        isActive: parsed.isActive,
        name: toLocalized(parsed.name),
        description: toLocalized(parsed.description),
        tagline: toLocalized(parsed.tagline),
        image: parsed.image || null,
        icon: parsed.icon,
        // Custom services can only be priced by the team for now.
        pricingModel: builtin ? "builtin" : "quote",
        flow: parsed.flow as schema.FlowStep[],
        sortOrder: parsed.sortOrder,
        updatedAt: new Date(),
      };

      await tx
        .insert(services)
        .values({ key, ...values })
        .onConflictDoUpdate({ target: services.key, set: values });

      await recordAudit(
        {
          actor,
          action: "service.published",
          entityType: "service",
          entityId: key,
          changes: {
            isActive: parsed.isActive,
            name: parsed.name,
            questions: parsed.flow.reduce((sum, s) => sum + (s.questions?.length ?? 0), 0),
          },
        },
        tx,
      );
    }
  },
});
