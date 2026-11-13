import { randomBytes } from "node:crypto";

import { hashPassword } from "@mon/auth";
import { env } from "@mon/config";
import type { PriceBreakdown } from "@mon/core";
import { db, schema } from "@mon/db";
import type { QuoteLine } from "@mon/db/schema";
import { eq, like, or, sql } from "drizzle-orm";

const { documentCounters, orders, priceSettings, salesQuotes, siteSettings, users } = schema;

/** Any Drizzle executor inside a transaction. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type SalesQuoteRow = typeof salesQuotes.$inferSelect;

export const QUOTE_STATUSES = ["request", "visit", "sent", "accepted", "declined"] as const;
export const QUOTE_SOURCES = ["website", "phone", "team"] as const;

/** The services an order can be booked as; a custom service books as a move. */
const ORDER_SERVICES = ["moving", "cleaning", "disposal", "renovation"] as const;
type OrderService = (typeof ORDER_SERVICES)[number];

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Today, or a day relative to it, in the business's own calendar ("YYYY-MM-DD"). */
export function businessDay(offsetDays = 0): string {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: env.BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (offsetDays === 0) return day;
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/**
 * The next "AN-2026-0001".
 *
 * One row per kind and year in `document_counters`, bumped by an upsert inside
 * the caller's transaction: the row stays locked until it commits, so two
 * quotes created at once wait for each other rather than sharing a number, and
 * a creation that rolls back gives its number back.
 */
export async function nextQuoteNumber(tx: Tx): Promise<string> {
  const year = Number(businessDay().slice(0, 4));

  const [row] = await tx
    .insert(documentCounters)
    .values({ kind: "quote", year, last: 1 })
    .onConflictDoUpdate({
      target: [documentCounters.kind, documentCounters.year],
      set: { last: sql`${documentCounters.last} + 1` },
    })
    .returning({ last: documentCounters.last });

  return `AN-${year}-${String(row!.last).padStart(4, "0")}`;
}

/** The VAT the rate card charges, as a new quote's default. */
export async function defaultVatRate(): Promise<string> {
  const [row] = await db
    .select({ value: priceSettings.value })
    .from(priceSettings)
    .where(eq(priceSettings.key, "vat_percent"))
    .limit(1);
  const rate = Number.parseFloat(row?.value ?? "");
  return Number.isFinite(rate) && rate >= 0 ? rate.toFixed(2) : "19.00";
}

/** Net, VAT and gross of a quote's lines, as the dashboard and the Angebot show them. */
export function quoteTotals(lines: readonly QuoteLine[], vatRate: string | number) {
  const vat = typeof vatRate === "string" ? Number.parseFloat(vatRate) || 0 : vatRate;
  const net = round2(lines.reduce((sum, line) => sum + line.qty * line.unitNet, 0));
  const gross = round2(net * (1 + vat / 100));
  return { net, vat, vatAmount: round2(gross - net), gross };
}

/**
 * Guesses the service a website message is about, from its topic and text —
 * the prototype's own rules, in the languages the site is written in.
 */
export function guessService(text: string): OrderService {
  const t = text.toLowerCase();
  if (/paint|renov|maler|anstrich|streich|tadilat|boya|دهان|ترميم/.test(t)) return "renovation";
  if (/clean|reinig|temizl|تنظيف/.test(t)) return "cleaning";
  if (/clear|dispos|junk|entrümp|entsorg|tasfiye|إزالة/.test(t)) return "disposal";
  return "moving";
}

/**
 * The company block for the Angebot: the settings an admin edits, with the
 * company's own keys (`company.*`) taking precedence over the website's brand
 * and contact details when they are set.
 */
export async function companyDetails() {
  const rows = await db
    .select({ key: siteSettings.key, value: siteSettings.value })
    .from(siteSettings)
    .where(or(like(siteSettings.key, "brand.%"), like(siteSettings.key, "contact.%"), like(siteSettings.key, "company.%")));

  const s = Object.fromEntries(rows.map((row) => [row.key, row.value.trim()]));
  const pick = (...keys: string[]) => keys.map((key) => s[key]).find((value) => value) ?? "";

  return {
    name: pick("company.name", "company.legalName", "brand.legalName", "brand.name") || "m.on",
    legalForm: pick("company.legalForm"),
    address: pick("company.address", "contact.address"),
    email: pick("company.email", "contact.email"),
    phone: pick("company.phone", "contact.phone"),
    website: pick("company.website"),
    register: pick("company.register", "company.registerNumber", "company.commercialRegister"),
    vatId: pick("company.vatId", "company.vat_id", "company.ustId"),
    taxNumber: pick("company.taxNumber", "company.tax_number"),
    managingDirector: pick("company.director", "company.managingDirector"),
    iban: pick("company.iban"),
    bic: pick("company.bic"),
    bank: pick("company.bank", "company.bankName"),
    logo: pick("brand.logo"),
  };
}

/**
 * The customer account an accepted quote's order belongs to.
 *
 * Orders always have an owner. A customer who already has an account gets the
 * order in it; otherwise an account is opened for their email with a password
 * nobody knows, which they take over by signing in with a code or resetting it.
 */
async function customerFor(tx: Tx, quote: SalesQuoteRow, email: string, locale: string): Promise<string> {
  const [existing] = await tx
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  if (existing) return existing.id;

  const [created] = await tx
    .insert(users)
    .values({
      email,
      passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
      fullName: quote.customerName.trim() || quote.company?.trim() || email,
      phone: quote.customerPhone ?? null,
      role: "customer",
      locale,
    })
    .returning({ id: users.id });
  return created!.id;
}

/** "UP-2026-000009", following the booking path's numbering. */
async function nextOrderReference(tx: Tx): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `UP-${year}-`;

  // The booking path counts the year's orders; the highest number in use is
  // taken too, so a gap left by a deleted order can never hand out a duplicate.
  const [row] = await tx
    .select({
      count: sql<number>`count(*)::int`,
      top: sql<number>`coalesce(max(nullif(regexp_replace(${orders.reference}, '^.*-', ''), '')::int), 0)`,
    })
    .from(orders)
    .where(like(orders.reference, `${prefix}%`));

  const sequence = Math.max(Number(row?.count ?? 0), Number(row?.top ?? 0)) + 1;
  return `${prefix}${String(sequence).padStart(6, "0")}`;
}

/**
 * Books an accepted quote as a confirmed order: the quote's lines become the
 * order's price lines, gross (net plus the quote's VAT), and the customer's
 * contact details and address are copied over. No date yet — the office
 * agrees it with the customer and sets it on the order.
 */
export async function createOrderFromQuote(tx: Tx, quote: SalesQuoteRow, locale: string) {
  const email = quote.customerEmail!.trim().toLowerCase();
  const userId = await customerFor(tx, quote, email, locale);
  const vat = Number.parseFloat(quote.vatRate) || 0;
  const now = new Date();

  const lines = quote.lines.map((line) => ({
    key: "line.custom",
    amount: round2(line.qty * line.unitNet * (1 + vat / 100)).toFixed(2),
    params: {
      label: line.description || "—",
      qty: line.qty,
      unitNet: line.unitNet,
      // As the prototype writes it under each line: "9 × €312,00 netto".
      rate: `${line.qty} × €${line.unitNet.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} netto`,
    },
  }));
  const total = round2(lines.reduce((sum, line) => sum + Number.parseFloat(line.amount), 0));
  const net = round2(quote.lines.reduce((sum, line) => sum + line.qty * line.unitNet, 0));

  const breakdown: PriceBreakdown = {
    lines,
    netAmount: net.toFixed(2),
    vatRate: quote.vatRate,
    vatAmount: round2(total - net).toFixed(2),
    totalGross: total.toFixed(2),
    depositAmount: "0.00",
    pricingVersion: 0,
    computedAt: now.toISOString(),
  };

  const service = (ORDER_SERVICES as readonly string[]).includes(quote.service ?? "")
    ? (quote.service as OrderService)
    : "moving";

  const [order] = await tx
    .insert(orders)
    .values({
      reference: await nextOrderReference(tx),
      userId,
      status: "confirmed",
      serviceType: service,
      customerType: quote.company?.trim() ? "business" : "private",
      contactName: quote.customerName.trim() || quote.company?.trim() || email,
      contactEmail: email,
      contactPhone: quote.customerPhone?.trim() ?? "",
      originAddress: quote.address?.trim() ?? "",
      // Priced by hand, so there is no item inventory to list; "area" with no
      // area says that, where "items" with none reads as a missing answer.
      calculationMethod: "area",
      netAmount: breakdown.netAmount,
      vatRate: quote.vatRate,
      vatAmount: breakdown.vatAmount,
      totalGross: breakdown.totalGross,
      depositAmount: "0.00",
      priceBreakdown: breakdown,
      notes: quote.needs?.trim() || null,
      internalNotes: `Angebot ${quote.number}${quote.service && service !== quote.service ? ` · ${quote.service}` : ""}`,
      locale,
      confirmedAt: now,
    })
    .returning({ id: orders.id, reference: orders.reference });

  return order!;
}
