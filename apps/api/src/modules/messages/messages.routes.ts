import { toLocale } from "@mon/core";
import { db, schema } from "@mon/db";
import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireAnyPermission, requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedQuery } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";
import { TEMPLATE_KEYS, VARIABLES } from "./messages.defaults.js";
import { templateDraft } from "./messages.publisher.js";
import { getTemplates, runScheduledMessages, sendTestMessage } from "./messages.service.js";

export { runScheduledMessages, sendTemplate } from "./messages.service.js";

const { messageLog, orders } = schema;

/**
 * The six automatic customer messages: templates, triggers, channels and the
 * sent log.
 *
 * Edits are drafts (domain "messages", see messages.publisher.ts) and go live
 * on "Save & publish"; what is sent is always the published row. The sending
 * itself is `sendTemplate(key, orderId)` for the event-driven messages and
 * `runScheduledMessages(now)` for the ones on a clock.
 */
export const messageTemplatesRouter: Router = Router();

messageTemplatesRouter.use(requireAuth);

messageTemplatesRouter.get(
  "/",
  requireAnyPermission("settings.write", "messages.read"),
  asyncHandler(async (_req, res) => {
    res.json({ templates: await getTemplates(), variables: VARIABLES });
  }),
);

/** The sent log, newest first, with the customer each message went to. */
messageTemplatesRouter.get(
  "/log",
  requireAnyPermission("settings.write", "messages.read"),
  validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(100).default(8) }) }),
  asyncHandler(async (req, res) => {
    const { limit } = validatedQuery<{ limit: number }>(req);
    const log = await db
      .select({
        id: messageLog.id,
        templateKey: messageLog.templateKey,
        orderId: messageLog.orderId,
        orderReference: orders.reference,
        customerName: orders.contactName,
        channel: messageLog.channel,
        recipient: messageLog.recipient,
        status: messageLog.status,
        error: messageLog.error,
        sentAt: messageLog.sentAt,
      })
      .from(messageLog)
      .leftJoin(orders, eq(orders.id, messageLog.orderId))
      .orderBy(desc(messageLog.sentAt))
      .limit(limit);
    res.json({ log });
  }),
);

/** A parsed localized text without its absent languages. */
const defined = (text: Partial<Record<"de" | "en" | "tr" | "ar", string | undefined>>) =>
  Object.fromEntries(Object.entries(text).filter(([, v]) => typeof v === "string")) as Record<string, string>;

const testBody = z.object({
  key: z.enum(TEMPLATE_KEYS),
  locale: z.enum(["de", "en", "tr", "ar"]).optional(),
  /** The template as it stands on screen, drafts included. */
  template: templateDraft.pick({ subject: true, body: true }).optional(),
});

/** "Send test": a sample of the message to the signed-in person's own address. */
messageTemplatesRouter.post(
  "/test",
  requireAnyPermission("settings.write", "messages.write"),
  validate({ body: testBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof testBody>;
    const live = (await getTemplates()).find((t) => t.key === body.key)!;
    const to = req.user!.email;

    try {
      await sendTestMessage({
        key: body.key,
        to,
        locale: toLocale(body.locale),
        subject: body.template ? defined(body.template.subject) : live.subject,
        body: body.template ? defined(body.template.body) : live.body,
      });
    } catch {
      throw new AppError("SERVICE_UNAVAILABLE", 503, "The test message could not be sent.");
    }

    await recordAudit({
      actor: { id: req.user!.id, email: to },
      action: "message_template.test_sent",
      entityType: "message_template",
      entityId: body.key,
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json({ ok: true, to });
  }),
);

/**
 * Runs the time-based messages now — what the scheduler does every few
 * minutes, for an admin who wants to see it happen. Idempotent.
 */
messageTemplatesRouter.post(
  "/run-scheduled",
  requirePermission("settings.write"),
  asyncHandler(async (req, res) => {
    const result = await runScheduledMessages(new Date());
    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "message_template.run_scheduled",
      entityType: "message_template",
      changes: { ...result },
      ipAddress: req.ip,
      requestId: req.requestId,
    });
    res.json(result);
  }),
);
