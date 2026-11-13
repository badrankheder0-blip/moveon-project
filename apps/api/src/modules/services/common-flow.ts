import { db, schema } from "@mon/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "../audit/audit.service.js";
import { registerPublisher, type Tx } from "../config/publish-registry.js";
import { QUESTION_TYPES } from "./services.defaults.js";

const { siteSettings } = schema;

/**
 * The booking steps every customer sees, whatever services they pick — the
 * "Common steps" of Dashboard → Booking site: per step, each built-in
 * answer's label, whether it is required and whether it is shown, and the
 * questions the office added.
 *
 * Drafted in domain "bookingflow" (ref = step id, value = that step's
 * settings) and published into one `site_settings` row as JSON, so no table
 * is needed. The planner reads it with the services (`GET /api/services`).
 */

export const COMMON_STEP_IDS = ["type", "services", "account", "address", "schedule", "photos", "review", "payment"] as const;
export type CommonStepId = (typeof COMMON_STEP_IDS)[number];

const SETTING_KEY = "planner.commonFlow";

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
  id: z.string().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/),
  type: z.enum(QUESTION_TYPES),
  label: localized(200),
  required: z.boolean(),
  options: z.array(localized(120)).max(30).optional(),
});

const field = z.object({
  label: localized(200).optional(),
  required: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

/** One step's settings, as drafted. An empty object puts the step back to the planner's own. */
export const commonStepValue = z.object({
  fields: z.record(z.string().regex(/^[a-z][A-Za-z]{1,30}\.[a-z][A-Za-z]{1,40}$/), field).optional(),
  questions: z.array(question).max(40).optional(),
});

export type CommonStepValue = z.infer<typeof commonStepValue>;
export type CommonStep = CommonStepValue & { id: CommonStepId };

const isStepId = (id: string): id is CommonStepId => (COMMON_STEP_IDS as readonly string[]).includes(id);

/** Keeps only what says something, so a step back at its defaults leaves the list. */
function tidy(id: CommonStepId, value: CommonStepValue): CommonStep | null {
  const fields = Object.fromEntries(
    Object.entries(value.fields ?? {})
      .map(([key, entry]) => {
        const out: z.infer<typeof field> = {};
        const label = Object.fromEntries(Object.entries(entry.label ?? {}).filter(([, text]) => typeof text === "string" && text.trim()));
        if (Object.keys(label).length) out.label = label;
        if (entry.required !== undefined) out.required = entry.required;
        if (entry.hidden) out.hidden = true;
        return [key, out] as const;
      })
      .filter(([, entry]) => Object.keys(entry).length > 0),
  );
  const step: CommonStep = { id };
  if (Object.keys(fields).length) step.fields = fields;
  if (value.questions?.length) step.questions = value.questions;
  return step.fields || step.questions ? step : null;
}

function parse(raw: string | undefined | null): CommonStep[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list.flatMap((entry) => {
      const id = (entry as { id?: unknown })?.id;
      if (typeof id !== "string" || !isStepId(id)) return [];
      const parsed = commonStepValue.safeParse(entry);
      const step = parsed.success ? tidy(id, parsed.data) : null;
      return step ? [step] : [];
    });
  } catch {
    return [];
  }
}

/** The published common steps; an empty list until the office changes one. */
export async function loadCommonFlow(executor: typeof db | Tx = db): Promise<CommonStep[]> {
  const [row] = await executor.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, SETTING_KEY)).limit(1);
  return parse(row?.value);
}

registerPublisher("bookingflow", {
  permission: "content.write",
  schema: commonStepValue,
  apply: async (tx, rows, actor) => {
    const steps = new Map((await loadCommonFlow(tx)).map((step) => [step.id, step]));

    for (const row of rows) {
      if (!isStepId(row.ref)) continue;
      const step = tidy(row.ref, commonStepValue.parse(row.value));
      if (step) steps.set(row.ref, step);
      else steps.delete(row.ref);
    }

    const value = JSON.stringify(COMMON_STEP_IDS.map((id) => steps.get(id)).filter(Boolean));
    await tx
      .insert(siteSettings)
      .values({
        key: SETTING_KEY,
        value,
        // Its own group, so no settings screen lists it as an editable text.
        group: "planner",
        kind: "json",
        label: "Booking site — common steps (fields and questions)",
        updatedAt: new Date(),
        updatedBy: actor.id,
      })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date(), updatedBy: actor.id } });

    await recordAudit(
      {
        actor,
        action: "booking_flow.published",
        entityType: "site_setting",
        entityId: SETTING_KEY,
        changes: { steps: rows.map((row) => row.ref) },
      },
      tx,
    );
  },
});
