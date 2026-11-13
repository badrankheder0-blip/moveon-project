import { toLocale } from "@mon/core";
import { db, schema } from "@mon/db";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";
import {
  AUDIENCES,
  KINDS,
  NOTIFY_CHANNELS,
  deliver,
  dispatchDueNotifications,
  employeeKey,
  isEmployeeKey,
  pickText,
  reachOf,
  recipientNames,
  visibleAt,
  visibleTo,
  type NotificationRow,
} from "./notifications.service.js";

export { dispatchDueNotifications, notificationsForEmployee } from "./notifications.service.js";

const { notifications, notificationReads, users, employees, teams } = schema;

/**
 * One-off announcements to customers or employees, and the in-app list they
 * read.
 *
 * The notification centre sends now or at a set time; the customer account
 * lists what reached it and marks it read. Email goes out with it; SMS and
 * WhatsApp are kept on the notification until a provider is connected.
 */
export const notificationsRouter: Router = Router();

notificationsRouter.use(requireAuth);

const localized = z
  .object({ de: z.string().max(2000), en: z.string().max(2000), tr: z.string().max(2000), ar: z.string().max(2000) })
  .partial();

/** Drops empty languages: an empty one falls back to German when read. */
const clean = (text: z.infer<typeof localized> | undefined) =>
  Object.fromEntries(Object.entries(text ?? {}).map(([k, v]) => [k, (v ?? "").trim()]).filter(([, v]) => v));

const hasText = (text: z.infer<typeof localized> | undefined) => Object.values(text ?? {}).some((v) => v?.trim());

const uuid = z.string().uuid();
const recipientKey = z.string().refine((k) => uuid.safeParse(isEmployeeKey(k) ? k.slice("employee:".length) : k).success, "Unknown recipient.");

async function present(list: NotificationRow[]) {
  const [reach, names] = await Promise.all([reachOf(list), recipientNames([...new Set(list.flatMap((n) => n.recipients))])]);
  return list.map((n) => ({
    id: n.id,
    audience: n.audience,
    recipients: n.recipients,
    recipientNames: n.recipients.map((k) => names.get(k) ?? "—"),
    kind: n.kind,
    title: n.title,
    body: n.body,
    buttonText: n.buttonText ?? {},
    buttonUrl: n.buttonUrl,
    channels: n.channels,
    scheduledAt: n.scheduledAt,
    sentAt: n.sentAt,
    at: visibleAt(n),
    createdAt: n.createdAt,
    total: reach.get(n.id)?.total ?? 0,
    reads: reach.get(n.id)?.reads ?? 0,
  }));
}

// ── Signed-in accounts: the in-app list ─────────────────────────────────

/**
 * The caller's notifications, newest first, in their language (`?locale=`,
 * else the account's), with the full texts for a client that switches
 * language itself, and whether each has been read.
 */
notificationsRouter.get(
  "/mine",
  validate({ query: z.object({ locale: z.enum(["de", "en", "tr", "ar"]).optional() }) }),
  asyncHandler(async (req, res) => {
    const now = new Date();
    await dispatchDueNotifications(now);

    const [me] = await db.select({ id: users.id, role: users.role, createdAt: users.createdAt, locale: users.locale }).from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (!me) throw AppError.unauthenticated();
    const locale = toLocale(validatedQuery<{ locale?: string }>(req).locale ?? me.locale);

    const rows = await db
      .select({ n: notifications, readAt: notificationReads.readAt })
      .from(notifications)
      .leftJoin(notificationReads, and(eq(notificationReads.notificationId, notifications.id), eq(notificationReads.userId, me.id)))
      .where(visibleTo(me, now))
      .orderBy(desc(sql`coalesce(${notifications.sentAt}, ${notifications.scheduledAt}, ${notifications.createdAt})`))
      .limit(50);

    const items = rows.map(({ n, readAt }) => ({
      id: n.id,
      kind: n.kind,
      title: pickText(n.title, locale),
      body: pickText(n.body, locale),
      buttonText: pickText(n.buttonText, locale) || null,
      buttonUrl: n.buttonUrl,
      texts: { title: n.title, body: n.body, buttonText: n.buttonText ?? {} },
      at: visibleAt(n),
      readAt,
    }));

    res.json({ items, unread: items.filter((i) => !i.readAt).length });
  }),
);

const idParam = z.object({ id: z.string().uuid() });

notificationsRouter.post(
  "/:id/read",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;
    const [me] = await db.select({ id: users.id, role: users.role, createdAt: users.createdAt }).from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (!me) throw AppError.unauthenticated();

    // Only one the caller can actually see; anything else is "not found".
    const [n] = await db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.id, id), visibleTo(me, new Date()))).limit(1);
    if (!n) throw AppError.notFound("Notification");

    await db.insert(notificationReads).values({ notificationId: id, userId: me.id }).onConflictDoNothing();
    res.json({ ok: true });
  }),
);

// ── Staff: the notification centre ──────────────────────────────────────

notificationsRouter.get(
  "/",
  requirePermission("messages.write"),
  asyncHandler(async (_req, res) => {
    await dispatchDueNotifications(new Date());
    const list = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(300);
    res.json({ notifications: await present(list) });
  }),
);

/**
 * The people a notification can go to by name, and how many each broadcast
 * reaches: customer accounts and the crew. Searched by name, email or phone.
 */
notificationsRouter.get(
  "/people",
  requirePermission("messages.write"),
  validate({ query: z.object({ q: z.string().trim().max(100).optional() }) }),
  asyncHandler(async (req, res) => {
    const { q } = validatedQuery<{ q?: string }>(req);
    const term = q ? `%${q}%` : null;

    const [customers, crew, [customerCount], [crewCount]] = await Promise.all([
      db
        .select({ id: users.id, name: users.fullName, email: users.email, phone: users.phone })
        .from(users)
        .where(
          and(
            eq(users.role, "customer"),
            eq(users.status, "active"),
            term ? or(ilike(users.fullName, term), ilike(users.email, term), ilike(users.phone, term)) : undefined,
          ),
        )
        .orderBy(desc(users.createdAt))
        .limit(40),
      db
        .select({ id: employees.id, name: employees.fullName, phone: employees.phone, email: employees.email, team: teams.name })
        .from(employees)
        .leftJoin(teams, eq(teams.id, employees.teamId))
        .where(
          and(
            eq(employees.isActive, true),
            term ? or(ilike(employees.fullName, term), ilike(employees.phone, term), ilike(employees.email, term), ilike(teams.name, term)) : undefined,
          ),
        )
        .orderBy(asc(employees.fullName))
        .limit(40),
      db.select({ n: count() }).from(users).where(and(eq(users.role, "customer"), eq(users.status, "active"))),
      db.select({ n: count() }).from(employees).where(eq(employees.isActive, true)),
    ]);

    const people = [
      ...customers.map((c) => ({ key: c.id, kind: "customer" as const, name: c.name || c.email, sub: [c.email, c.phone].filter(Boolean).join(" · ") })),
      ...crew.map((e) => ({ key: employeeKey(e.id), kind: "employee" as const, name: e.name, sub: [e.team, e.phone].filter(Boolean).join(" · ") })),
    ];

    res.json({ people, counts: { customers: customerCount?.n ?? 0, employees: crewCount?.n ?? 0 } });
  }),
);

const createBody = z.object({
  audience: z.enum(AUDIENCES),
  recipients: z.array(recipientKey).max(500).optional(),
  kind: z.enum(KINDS).default("info"),
  title: localized,
  body: localized,
  buttonText: localized.optional(),
  buttonUrl: z
    .string()
    .trim()
    .max(500)
    .refine((u) => !u || /^(https?:\/\/|\/|#)\S*$/i.test(u), "Use a link starting with https://, / or #.")
    .optional(),
  channels: z.array(z.enum(NOTIFY_CHANNELS)).min(1, "Choose at least one channel."),
  /** Absent: now. */
  scheduledAt: z.string().datetime({ offset: true }).optional(),
});

notificationsRouter.post(
  "/",
  requirePermission("messages.write"),
  validate({ body: createBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createBody>;
    if (!hasText(body.title) || !hasText(body.body)) throw AppError.unprocessable("Write a title and a message.");

    const recipients = body.audience === "individual" ? [...new Set(body.recipients ?? [])] : [];
    if (body.audience === "individual" && !recipients.length) throw AppError.unprocessable("Pick at least one person.");

    const now = new Date();
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (scheduledAt && scheduledAt.getTime() <= now.getTime()) throw AppError.unprocessable("Pick a date and time in the future.");

    // Anyone named must exist; a stale id from an old search would otherwise
    // count as a reader nobody can be.
    const names = await recipientNames(recipients);
    if (names.size !== recipients.length) throw AppError.unprocessable("One of the people picked no longer exists.");

    const [created] = await db
      .insert(notifications)
      .values({
        audience: body.audience,
        recipients,
        kind: body.kind,
        title: clean(body.title),
        body: clean(body.body),
        buttonText: hasText(body.buttonText) ? clean(body.buttonText) : null,
        buttonUrl: body.buttonUrl || null,
        channels: [...new Set(body.channels)],
        scheduledAt,
        sentAt: scheduledAt ? null : now,
        createdBy: req.user!.id,
        createdAt: now,
      })
      .returning();

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: scheduledAt ? "notification.scheduled" : "notification.sent",
      entityType: "notification",
      entityId: created!.id,
      changes: { audience: body.audience, recipients: recipients.length, channels: body.channels, scheduledAt: scheduledAt?.toISOString() ?? null },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    if (!scheduledAt) void deliver(created!).catch(() => undefined);

    const [dto] = await present([created!]);
    res.status(201).json({ notification: dto });
  }),
);

/** "Send now" on a scheduled notification. */
notificationsRouter.post(
  "/:id/send",
  requirePermission("messages.write"),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;
    const now = new Date();
    const [sent] = await db
      .update(notifications)
      .set({ sentAt: now, scheduledAt: now })
      .where(and(eq(notifications.id, id), sql`${notifications.sentAt} is null`))
      .returning();
    if (!sent) {
      const [exists] = await db.select({ id: notifications.id }).from(notifications).where(eq(notifications.id, id)).limit(1);
      if (!exists) throw AppError.notFound("Notification");
      throw AppError.conflict("INVALID_STATE_TRANSITION", "This notification has already been sent.");
    }

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "notification.sent_early",
      entityType: "notification",
      entityId: id,
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    void deliver(sent).catch(() => undefined);
    const [dto] = await present([sent]);
    res.json({ notification: dto });
  }),
);

/** Deleting takes it out of every account's list, read or not. */
notificationsRouter.delete(
  "/:id",
  requirePermission("messages.write"),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;
    const [gone] = await db.delete(notifications).where(eq(notifications.id, id)).returning({ id: notifications.id, title: notifications.title });
    if (!gone) throw AppError.notFound("Notification");

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "notification.deleted",
      entityType: "notification",
      entityId: id,
      changes: { title: gone.title },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json({ ok: true });
  }),
);
