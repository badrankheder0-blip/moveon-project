import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./identity.js";
import { orders } from "./orders.js";

/**
 * What the admin dashboard runs the business with, beyond the bookings
 * themselves: the website inbox, hand-priced quotes, invoices, damage cases,
 * date-change requests, announcements, the automatic customer messages, the
 * service zones, the service catalogue and the configuration drafts.
 *
 * Field names follow the admin prototype (m-on-admin) where it named them.
 */

const money = (name: string) => numeric(name, { precision: 10, scale: 2 });

/** Text in the four site languages. */
export type Localized = { de?: string; en?: string; ar?: string; tr?: string };

// ── Website inbox ─────────────────────────────────────────────────────────

/**
 * A message sent from one of the website's forms: contact, business,
 * partnership or job application. Every field the form had is kept in
 * `data`, so the inbox can show it as it was filled in.
 */
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** "contact" | "business" | "partner" | "job" */
    kind: text("kind").notNull(),
    /** "new" | "read" | "replied" | "closed" */
    status: text("status").notNull().default("new"),
    /** The sender's name as one line ("Vorname Nachname"), or the company. */
    name: text("name").notNull(),
    // The halves of `name` when the form asked for a person (null for a
    // company-only message, and for messages split before these existed).
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    message: text("message"),
    data: jsonb("data").$type<Record<string, string>>().notNull().default({}),
    /** The office's own note, never shown to the sender. */
    note: text("note"),
    locale: text("locale").notNull().default("de"),
    readAt: timestamp("read_at", { withTimezone: true }),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("leads_status_created_idx").on(table.status, table.createdAt)],
);

// ── Quotes & site visits ──────────────────────────────────────────────────

export interface QuoteLine {
  description: string;
  qty: number;
  /** Net price per unit, in euros. */
  unitNet: number;
}

/**
 * A hand-priced quote (Angebot), for work that needs a site visit: a
 * renovation, a business move, a special request. Net prices; VAT on top.
 * Not the `quotes` table, which is the pricing engine's automatic result.
 *
 * request → visit → sent → accepted (creates an order) · declined
 */
export const salesQuotes = pgTable(
  "sales_quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** "AN-2026-0001", issued on creation. */
    number: text("number").notNull(),
    status: text("status").notNull().default("request"),
    /** "website" | "phone" | "team" */
    source: text("source").notNull().default("team"),
    customerName: text("customer_name").notNull(),
    // The halves of `customerName`, as the quote form edits them.
    customerFirstName: text("customer_first_name"),
    customerLastName: text("customer_last_name"),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone"),
    company: text("company"),
    address: text("address"),
    /** A service key ("moving", "renovation", …) or a custom service's code. */
    service: text("service"),
    needs: text("needs"),
    visitDate: date("visit_date"),
    visitTime: text("visit_time"),
    visitBy: text("visit_by"),
    visitNote: text("visit_note"),
    lines: jsonb("lines").$type<QuoteLine[]>().notNull().default([]),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("19"),
    validUntil: date("valid_until"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    declinedAt: timestamp("declined_at", { withTimezone: true }),
    /** The booking an accepted quote became. */
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("sales_quotes_number_idx").on(table.number), index("sales_quotes_status_idx").on(table.status)],
);

// ── Invoices ──────────────────────────────────────────────────────────────

export interface InvoiceLine {
  label: string;
  /** Gross amount in euros, VAT included, as the order's lines are. */
  amount: number;
}

export interface InvoiceParty {
  name: string;
  email?: string;
  address?: string;
  company?: string;
  vatId?: string;
}

/**
 * A German invoice (Rechnung), issued from an order. A snapshot: once issued
 * its lines, totals and parties do not follow later edits to the order.
 *
 * draft → sent → paid; "overdue" is a sent invoice past `dueDate`.
 */
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** "RE-2026-0001": per year, gap-free, from `invoice_counters`. */
    number: text("number").notNull(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("draft"),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),
    lines: jsonb("lines").$type<InvoiceLine[]>().notNull(),
    netAmount: money("net_amount").notNull(),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull(),
    vatAmount: money("vat_amount").notNull(),
    totalGross: money("total_gross").notNull(),
    customer: jsonb("customer").$type<InvoiceParty>().notNull(),
    seller: jsonb("seller").$type<Record<string, string>>().notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    remindersSent: integer("reminders_sent").notNull().default(0),
    lastReminderAt: timestamp("last_reminder_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("invoices_number_idx").on(table.number),
    index("invoices_order_idx").on(table.orderId),
    index("invoices_status_idx").on(table.status),
  ],
);

/** The last invoice and quote number issued per year, kept gap-free. */
export const documentCounters = pgTable(
  "document_counters",
  {
    /** "invoice" | "quote" */
    kind: text("kind").notNull(),
    year: integer("year").notNull(),
    last: integer("last").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.kind, table.year] })],
);

// ── Damage cases ──────────────────────────────────────────────────────────

/**
 * A damage report, from first report to solution.
 * reported → checking → insurer → resolved · rejected
 */
export const damageClaims = pgTable(
  "damage_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    /** "customer" | "crew" | "team" */
    source: text("source").notNull().default("team"),
    status: text("status").notNull().default("reported"),
    item: text("item").notNull(),
    description: text("description"),
    photos: jsonb("photos").$type<string[]>().notNull().default([]),
    claimedAmount: money("claimed_amount"),
    approvedAmount: money("approved_amount"),
    /** "repair" | "compensation" | "replacement" | "none" */
    solution: text("solution"),
    notes: text("notes"),
    reportedBy: uuid("reported_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("damage_claims_status_idx").on(table.status), index("damage_claims_order_idx").on(table.orderId)],
);

// ── Date-change requests ──────────────────────────────────────────────────

/** A customer asking to move their booking. requested → approved · declined */
export const dateChangeRequests = pgTable(
  "date_change_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    requestedDate: date("requested_date").notNull(),
    requestedTime: text("requested_time"),
    reason: text("reason"),
    status: text("status").notNull().default("requested"),
    decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("date_change_requests_order_idx").on(table.orderId)],
);

// ── Announcements ─────────────────────────────────────────────────────────

/**
 * A one-off notification to customers, employees or chosen people. Text per
 * language; an empty language falls back to German.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** "customers" | "employees" | "everyone" | "individual" */
    audience: text("audience").notNull(),
    /** User ids, for "individual". */
    recipients: jsonb("recipients").$type<string[]>().notNull().default([]),
    /** "info" | "important" | "offer" */
    kind: text("kind").notNull().default("info"),
    title: jsonb("title").$type<Localized>().notNull(),
    body: jsonb("body").$type<Localized>().notNull(),
    buttonText: jsonb("button_text").$type<Localized>(),
    buttonUrl: text("button_url"),
    /** "inapp" | "email" | "sms" | "whatsapp" */
    channels: jsonb("channels").$type<string[]>().notNull().default(["inapp"]),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notifications_sent_idx").on(table.sentAt)],
);

export const notificationReads = pgTable(
  "notification_reads",
  {
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.notificationId, table.userId] })],
);

// ── Automatic customer messages ───────────────────────────────────────────

/**
 * The six automatic messages and their triggers (booking confirmed, reminder,
 * crew on the way, invoice sent, payment reminder, review request).
 */
export const messageTemplates = pgTable("message_templates", {
  key: text("key").primaryKey(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  channels: jsonb("channels").$type<string[]>().notNull().default(["email"]),
  subject: jsonb("subject").$type<Localized>().notNull(),
  body: jsonb("body").$type<Localized>().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messageLog = pgTable(
  "message_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateKey: text("template_key").notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    channel: text("channel").notNull(),
    recipient: text("recipient").notNull(),
    /** "sent" | "failed" | "test" */
    status: text("status").notNull(),
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("message_log_template_idx").on(table.templateKey, table.sentAt)],
);

// ── Service zones ─────────────────────────────────────────────────────────

/** An area m.on serves, drawn on a map, matched by postcode prefix. */
export const serviceZones = pgTable(
  "service_zones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    colour: text("colour").notNull().default("#d71635"),
    /** [lat, lng] corners. */
    polygon: jsonb("polygon").$type<[number, number][]>().notNull().default([]),
    postcodePrefixes: jsonb("postcode_prefixes").$type<string[]>().notNull().default([]),
    /** Travel surcharge added as a price line, in euros. */
    surcharge: money("surcharge").notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("service_zones_surcharge_non_negative", sql`${table.surcharge} >= 0`)],
);

// ── Service catalogue ─────────────────────────────────────────────────────

export interface FlowQuestion {
  id: string;
  /** "text" | "number" | "select" | "yesno" | "counter" | "address" | "photos" | "area" */
  type: string;
  label: Localized;
  required: boolean;
  options?: Localized[];
}

export interface FlowStep {
  id: string;
  title?: Localized;
  hint?: Localized;
  /** Built-in answers the office marks as required. */
  required?: string[];
  questions?: FlowQuestion[];
}

/**
 * The services the website offers: the four built-in ones and any custom
 * service, with what the booking flow asks for each.
 */
export const services = pgTable("services", {
  /** "moving" | "renovation" | "cleaning" | "disposal", or a custom code. */
  key: text("key").primaryKey(),
  isBuiltin: boolean("is_builtin").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  name: jsonb("name").$type<Localized>().notNull(),
  description: jsonb("description").$type<Localized>().notNull().default({}),
  tagline: jsonb("tagline").$type<Localized>().notNull().default({}),
  image: text("image"),
  icon: text("icon"),
  /** Custom services: "quote" (request a quote) for now. */
  pricingModel: text("pricing_model").notNull().default("quote"),
  flow: jsonb("flow").$type<FlowStep[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Configuration drafts ──────────────────────────────────────────────────

/**
 * Configuration edits waiting for "Save & publish".
 *
 * The dashboard edits prices, services, zones, discounts, settings, content
 * and the rest as a draft; only publishing changes what the website and the
 * booking flow show. One row per edited thing: `domain` names the table it
 * belongs to ("pricing", "content", …) and `ref` the row ("per_km",
 * "home|hero.1.title|de", …). Publishing applies every row in one
 * transaction and clears them.
 */
/**
 * jsonb that keeps the type the value was written with.
 *
 * postgres.js already decodes jsonb, and drizzle's own `jsonb` then runs
 * JSON.parse over the decoded result. For an object that is harmless, but a
 * stored JSON *string* goes through twice: "7.77" comes back as the number
 * 7.77 while "abc" stays a string. Draft values are the one place a bare
 * string is stored, and a publisher that checks `typeof value === "string"`
 * silently dropped every numeric edit because of it — a published price that
 * never changed. Decoding once keeps a draft exactly what the dashboard sent.
 */
const draftValue = customType<{ data: unknown; driverData: unknown }>({
  dataType: () => "jsonb",
  // The write path is unchanged: drizzle's jsonb serialises the same way.
  toDriver: (value) => JSON.stringify(value),
  // postgres.js has already parsed this — parsing again is the bug.
  fromDriver: (value) => value,
});

export const configDrafts = pgTable(
  "config_drafts",
  {
    domain: text("domain").notNull(),
    ref: text("ref").notNull(),
    value: draftValue("value").notNull(),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.domain, table.ref] })],
);

/** When configuration was last published, and by whom. */
export const configPublishes = pgTable("config_publishes", {
  id: uuid("id").primaryKey().defaultRandom(),
  changes: integer("changes").notNull(),
  publishedBy: uuid("published_by").references(() => users.id, { onDelete: "set null" }),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
});
