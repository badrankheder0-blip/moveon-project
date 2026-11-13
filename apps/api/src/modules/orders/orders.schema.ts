import { z } from "zod";

export const createOrderSchema = z.object({
  quoteId: z.string().uuid(),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().toLowerCase().email(),
  contactPhone: z.string().trim().min(5).max(40),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD."),
  scheduledTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM."),
  notes: z.string().trim().max(2000).optional(),
  locale: z.enum(["de", "en", "ar", "tr"]).optional(),
  /**
   * The answers to the questions the office added to the booking flow
   * (Dashboard → Services), as `extra.<step>.<question id>`. Stored in
   * `orders.answers`, where the order page reads them.
   */
  answers: z
    .record(z.string().regex(/^extra\.[A-Za-z0-9_-]{1,40}\.[A-Za-z0-9_-]{1,40}$/), z.string().trim().max(2000))
    .refine((value) => Object.keys(value).length <= 60, "Too many answers.")
    .optional(),
});

export const changeStatusSchema = z.object({
  status: z.enum(["quoted", "confirmed", "cancelled", "completed"]),
  reason: z.string().trim().max(500).optional(),
});

export const listOrdersSchema = z.object({
  status: z.enum(["quoted", "confirmed", "cancelled", "completed"]).optional(),
  search: z.string().trim().max(120).optional(),
  // Capped: an unbounded limit is how the legacy admin panel downloaded the
  // entire orders table on every page load.
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().datetime().optional(),
  // By creation time either way, because that is the column the cursor walks.
  // Staff working through a backlog read it oldest first.
  sort: z.enum(["newest", "oldest"]).default("newest"),
});

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD.");

/** One priced line as the office edits it: a gross amount, VAT included. */
const priceLineSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^line\.[a-z0-9_]+$/)
    .max(60)
    .optional(),
  label: z.string().trim().max(160).optional(),
  params: z.record(z.union([z.string().max(200), z.number()])).optional(),
  gross: z.number().min(-1_000_000).max(1_000_000),
});

/**
 * The office's edits to an order. Every part is optional; the route checks
 * the capability each part needs (assignment is `orders.assign`, the rest is
 * `orders.write`).
 */
export const updateOrderSchema = z
  .object({
    teamId: z.string().uuid().nullable().optional(),
    vehicleId: z.string().uuid().nullable().optional(),
    internalNotes: z.string().max(5000).nullable().optional(),
    // Booking answers by question id. Bounded so a client cannot grow the
    // jsonb column without limit.
    answers: z
      .record(z.string().regex(/^[A-Za-z0-9_.:-]{1,80}$/), z.string().max(2000).nullable())
      .refine((value) => Object.keys(value).length <= 60, "Too many answers at once.")
      .optional(),
    lines: z.array(priceLineSchema).max(60).optional(),
  })
  .refine((value) => Object.values(value).some((part) => part !== undefined), "Nothing to change.");

export const dateChangeSchema = z.object({
  date: isoDay,
  time: z.string().trim().max(40).optional(),
  reason: z.string().trim().max(1000).optional(),
});

export const decideDateChangeSchema = z.object({
  /** Appended to the internal notes, written by the dashboard in its own language. */
  note: z.string().trim().max(300).optional(),
});

export const calendarQuerySchema = z
  .object({ from: isoDay, to: isoDay })
  .refine((value) => value.from <= value.to, "`from` must not be after `to`.")
  .refine(
    (value) => (Date.parse(value.to) - Date.parse(value.from)) / 864e5 <= 120,
    "The range is limited to 120 days.",
  );
