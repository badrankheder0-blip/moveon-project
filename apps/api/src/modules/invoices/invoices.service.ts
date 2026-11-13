import { env } from "@mon/config";
import { db, schema } from "@mon/db";
import type { InvoiceLine, InvoiceParty } from "@mon/db/schema";
import { and, eq, ne, sql } from "drizzle-orm";

import { AppError } from "../../lib/errors.js";
import { recordAudit, type AuditActor } from "../audit/audit.service.js";
import { loadCompany } from "./invoice-company.js";

const { invoices, documentCounters, orders } = schema;

/**
 * Issuing invoices and reading them back.
 *
 * An invoice is a snapshot: the lines, the totals, the customer and the seller
 * are copied from the order and the settings when it is issued, and never
 * follow later edits to either. The number comes from `document_counters`
 * inside the same transaction as the insert, so it is per year and gap-free:
 * a rollback takes its number back with it, and two people pressing "Create"
 * at once wait for each other on the counter row.
 */

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type InvoiceRow = typeof invoices.$inferSelect;
type OrderRow = typeof orders.$inferSelect;

/** What the screens show: "overdue" is a sent invoice past its due date. */
export type InvoiceState = "draft" | "sent" | "overdue" | "paid" | "cancelled";

/** The extra facts kept with the customer snapshot, beside `InvoiceParty`. */
export interface CustomerSnapshot extends InvoiceParty {
  phone?: string;
  /** The order's reference, as the invoice prints it under "Auftrag". */
  reference?: string;
  /** The service days, ISO dates, for "Leistungsdatum". */
  serviceDates?: string[];
  serviceType?: string;
}

/** "2026-10-25" in the business's own time zone: due dates are calendar days there. */
export function businessToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: env.BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(isoDay: string, days: number): string {
  const date = new Date(`${isoDay}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function stateOf(row: Pick<InvoiceRow, "status" | "dueDate">, today = businessToday()): InvoiceState {
  if (row.status === "paid" || row.status === "cancelled" || row.status === "draft") return row.status;
  return row.dueDate < today ? "overdue" : "sent";
}

/** The row as the API returns it. */
export function present(row: InvoiceRow, extra: { orderReference?: string | null; orderStatus?: string | null } = {}, today = businessToday()) {
  return {
    id: row.id,
    number: row.number,
    orderId: row.orderId,
    orderReference: extra.orderReference ?? (row.customer as CustomerSnapshot).reference ?? null,
    orderStatus: extra.orderStatus ?? null,
    status: stateOf(row, today),
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    lines: row.lines,
    netAmount: row.netAmount,
    vatRate: row.vatRate,
    vatAmount: row.vatAmount,
    totalGross: row.totalGross,
    customer: row.customer as CustomerSnapshot,
    seller: row.seller,
    sentAt: row.sentAt,
    paidAt: row.paidAt,
    remindersSent: row.remindersSent,
    lastReminderAt: row.lastReminderAt,
    createdAt: row.createdAt,
  };
}

export type PresentedInvoice = ReturnType<typeof present>;

// ── Lines ─────────────────────────────────────────────────────────────────

const cents = (value: string | number | null | undefined) => Math.round((Number(value) || 0) * 100);

const SERVICE_DE: Record<string, string> = {
  moving: "Umzug",
  cleaning: "Reinigung",
  disposal: "Entrümpelung",
  renovation: "Renovierung",
};

/**
 * German wording for the price lines, keyed as the pricing engine keys them
 * (both rate cards: the net v1 lines of older orders and the gross v2 ones).
 * The detail in brackets is what §14 UStG calls the quantity and kind of the
 * service. The API cannot read the web app's catalogue, so the words live here.
 */
const LINE_DE: Record<string, [label: string, detail?: string]> = {
  "line.base_rate": ["Grundpreis {service}"],
  "line.area": ["Fläche", "{sqm} m²"],
  "line.selected_items": ["Möbel und Gegenstände", "{count} Positionen"],
  "line.travel": ["Fahrstrecke", "{km} km"],
  "line.travel_long_distance": ["Zuschlag Fernumzug", "{km} km"],
  "line.floor_surcharge": ["Etagenzuschlag", "{floors} Etagen ohne Aufzug"],
  "line.packing_service": ["Verpackungsservice"],
  "line.parking_zone": ["Halteverbotszone"],
  "line.transport_insurance": ["Transportversicherung", "{percent} % des Leistungswerts"],
  "line.crew_of_three": ["3. Mitarbeiter"],
  "line.second_van": ["2. Transporter"],
  "line.saturday_surcharge": ["Samstagszuschlag", "{percent} %"],
  "line.business_discount": ["Gewerberabatt", "{percent} %"],
  "line.discount_code": ["Rabatt", "Code {code}"],
  "line.minimum_order_value": ["Aufschlag auf den Mindestauftragswert"],
  "line.assembly": ["Möbelmontage"],
  "line.disassembly": ["Möbeldemontage"],
  "line.stairs_from": ["Treppen, alte Wohnung (ohne Aufzug)", "{floors} Etagen × {rate} €"],
  "line.stairs_to": ["Treppen, neue Wohnung (ohne Aufzug)", "{floors} Etagen × {rate} €"],
  "line.volume": ["Transport des Inventars", "{m3} m³ × {rate} €"],
  "line.volume_estimated": ["Transport (nach Fläche geschätzt)", "{m3} m³ × {rate} €"],
  "line.crew": ["Umzugsteam", "{movers} Träger × {hours} Std. × {rate} €"],
  "line.dismantling": ["Möbelabbau", "{count} Stück × {rate} €"],
  "line.reassembly": ["Möbelaufbau", "{count} Stück × {rate} €"],
  "line.assembly_both": ["Möbelab- und -aufbau", "{count} Stück × {rate} €"],
  "line.packing": ["Packservice", "{m3} m³ × {rate} €"],
  "line.insurance": ["Transportversicherung", "pauschal"],
  "line.special_piano": ["Sonderhandling Klavier", "{count} × {rate} €"],
  "line.special_safe": ["Sonderhandling Tresor", "{count} × {rate} €"],
  "line.special_aquarium": ["Sonderhandling Aquarium", "{count} × {rate} €"],
  "line.special_gym": ["Sonderhandling Fitnessgeräte", "{count} × {rate} €"],
  "line.special_heavy": ["Sonderhandling schwere Teile", "{count} × {rate} €"],
  "line.special_artwork": ["Sonderhandling Kunst und Spiegel", "{count} × {rate} €"],
  "line.saturday": ["Samstagszuschlag", "pauschal"],
  "line.holiday_surcharge": ["Feiertagszuschlag", "pauschal"],
  "line.cleaning_area": ["Umzugsreinigung", "{sqm} m² × {rate} €"],
  "line.windows_standard": ["Fensterreinigung, Standardfenster", "{count} × {rate} €"],
  "line.windows_patio": ["Fensterreinigung, Balkon- und Terrassentüren", "{count} × {rate} €"],
  "line.windows_large": ["Fensterreinigung, große Verglasung", "{count} × {rate} €"],
  "line.windows_roof": ["Fensterreinigung, Dachfenster", "{count} × {rate} €"],
};

/** "1.20" → "1,20", "42.4" → "42,4": German decimals inside a line's wording. */
function germanNumber(value: string | number, money: boolean): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return money
    ? n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

function fillGerman(template: string, params: Record<string, string | number>): string | null {
  let missing = false;
  const text = template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined || value === "") {
      missing = true;
      return "";
    }
    if (name === "service") return SERVICE_DE[String(value)] ?? String(value);
    if (name === "code") return String(value);
    return germanNumber(value, name === "rate");
  });
  return missing ? null : text;
}

interface LooseLine {
  key: string;
  amount: string;
  params?: Record<string, string | number>;
  /** A line the office typed in by hand carries its own wording. */
  label?: string;
}

export function lineLabel(line: LooseLine): string {
  const params = line.params ?? {};
  const own = line.label ?? (typeof params.label === "string" ? params.label : undefined);
  if (own) return own;

  const words = LINE_DE[line.key];
  if (!words) return line.key.replace(/^line\./, "").replace(/_/g, " ");

  const label = fillGerman(words[0], params) ?? words[0].replace(/\s*\{\w+\}/g, "");
  const detail = words[1] ? (words[1].includes("{") ? fillGerman(words[1], params) : words[1]) : null;
  return detail ? `${label} (${detail})` : label;
}

/**
 * The order's lines as gross amounts that add up to the invoice total.
 *
 * Orders priced on the first rate card carry net lines (VAT added at the end);
 * the current rate card's lines are gross already. Which one an order has is
 * read off the sums rather than the pricing version, so a hand-edited order is
 * judged by what it actually adds up to. Lines that match neither are replaced
 * by one line for the whole order, because the order's total is the one
 * figure that is authoritative. Rounding drift lands on the largest line.
 */
export function snapshotLines(order: Pick<OrderRow, "priceBreakdown" | "totalGross" | "netAmount" | "vatRate" | "serviceType" | "reference">): InvoiceLine[] {
  const raw = (order.priceBreakdown?.lines ?? []) as LooseLine[];
  const grossC = cents(order.totalGross);
  const netC = cents(order.netAmount);
  const factor = 1 + (Number(order.vatRate) || 0) / 100;
  const sum = raw.reduce((n, line) => n + cents(line.amount), 0);

  let lines: { label: string; c: number }[];

  if (raw.length > 0 && Math.abs(sum - grossC) <= 2) {
    lines = raw.map((line) => ({ label: lineLabel(line), c: cents(line.amount) }));
  } else if (raw.length > 0 && Math.abs(sum - netC) <= 2 && netC !== grossC) {
    lines = raw.map((line) => ({ label: lineLabel(line), c: Math.round(cents(line.amount) * factor) }));
  } else {
    lines = [{ label: `${SERVICE_DE[order.serviceType] ?? "Leistung"} laut Auftrag ${order.reference}`, c: grossC }];
  }

  lines = lines.filter((line) => line.c !== 0);
  if (lines.length === 0) lines = [{ label: `${SERVICE_DE[order.serviceType] ?? "Leistung"} laut Auftrag ${order.reference}`, c: grossC }];

  const drift = grossC - lines.reduce((n, line) => n + line.c, 0);
  if (drift !== 0) {
    const largest = lines.reduce((best, line) => (line.c > best.c ? line : best), lines[0]!);
    largest.c += drift;
  }

  return lines.map((line) => ({ label: line.label, amount: line.c / 100 }));
}

// ── Issuing ───────────────────────────────────────────────────────────────

export interface ActorContext {
  actor: AuditActor;
  ipAddress?: string | undefined;
  requestId?: string | undefined;
}

/** Takes the next number for the year, inside the caller's transaction. */
async function nextNumber(tx: Tx, year: number): Promise<string> {
  const [counter] = await tx
    .insert(documentCounters)
    .values({ kind: "invoice", year, last: 1 })
    .onConflictDoUpdate({
      target: [documentCounters.kind, documentCounters.year],
      set: { last: sql`${documentCounters.last} + 1` },
    })
    .returning({ last: documentCounters.last });

  return `RE-${year}-${String(counter!.last).padStart(4, "0")}`;
}

/** The orders that may be invoiced: work that was agreed, at a price. */
const INVOICEABLE = new Set(["confirmed", "completed"]);

export async function issueInvoice(orderId: string, userId: string, context: ActorContext): Promise<InvoiceRow> {
  return db.transaction(async (tx) => {
    // Locked so a second "Create" for the same order waits here and then sees
    // the first invoice, rather than both passing the check below.
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
    if (!order) throw AppError.notFound("Order");

    if (!INVOICEABLE.has(order.status)) {
      throw AppError.unprocessable(
        order.status === "cancelled"
          ? "A cancelled order cannot be invoiced."
          : "Only confirmed or completed orders can be invoiced. Confirm the order first.",
      );
    }

    if (!(cents(order.totalGross) > 0)) {
      throw AppError.unprocessable("The order has no price yet.");
    }

    const [existing] = await tx
      .select({ id: invoices.id, number: invoices.number })
      .from(invoices)
      .where(and(eq(invoices.orderId, order.id), ne(invoices.status, "cancelled")))
      .limit(1);

    if (existing) {
      throw AppError.conflict("CONFLICT", `This order already has invoice ${existing.number}.`, { invoiceId: existing.id, number: existing.number });
    }

    const company = await loadCompany(tx);
    const issueDate = businessToday();
    const number = await nextNumber(tx, Number(issueDate.slice(0, 4)));

    const grossC = cents(order.totalGross);
    const vatRate = Number(order.vatRate) || 0;
    // VAT is contained in the gross, so the net is worked back out of it.
    const netC = Math.round(grossC / (1 + vatRate / 100));
    const answers = order.answers ?? {};
    const company_ = answers.company?.value?.trim();

    const customer: CustomerSnapshot = {
      name: order.contactName,
      email: order.contactEmail,
      phone: order.contactPhone,
      // The prototype bills to where the work ends up: the new home of a move,
      // the one address of everything else.
      address: order.destinationAddress ?? order.originAddress,
      ...(company_ ? { company: company_ } : {}),
      reference: order.reference,
      serviceType: order.serviceType,
      serviceDates: [order.scheduledDate, order.scheduledSecondDate].filter((day): day is string => Boolean(day)),
    };

    const [created] = await tx
      .insert(invoices)
      .values({
        number,
        orderId: order.id,
        status: "draft",
        issueDate,
        dueDate: addDays(issueDate, company.paymentTermDays),
        lines: snapshotLines(order),
        netAmount: (netC / 100).toFixed(2),
        vatRate: vatRate.toFixed(2),
        vatAmount: ((grossC - netC) / 100).toFixed(2),
        totalGross: (grossC / 100).toFixed(2),
        customer,
        seller: company.seller,
        createdBy: userId,
      })
      .returning();

    await recordAudit(
      {
        actor: context.actor,
        action: "invoice.created",
        entityType: "invoice",
        entityId: created!.id,
        changes: { number, orderId: order.id, reference: order.reference, totalGross: created!.totalGross },
        ipAddress: context.ipAddress,
        requestId: context.requestId,
      },
      tx,
    );

    return created!;
  });
}
