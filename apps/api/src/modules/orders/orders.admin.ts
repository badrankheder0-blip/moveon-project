import type { PriceBreakdown, PriceLine } from "@mon/core";
import { db, schema } from "@mon/db";
import { and, asc, desc, eq, gte, inArray, lte, ne, notInArray, or, sql } from "drizzle-orm";

import { AppError } from "../../lib/errors.js";
import { recordAudit } from "../audit/audit.service.js";
import type { RequestContext } from "./orders.service.js";
import { joinName, splitName } from "../../lib/names.js";

const { orders, teams, vehicles, dateChangeRequests, catalogItems, discountCodes, auditLogs } = schema;

type Order = typeof orders.$inferSelect;
type Answers = NonNullable<Order["answers"]>;

/**
 * What the admin dashboard reads and writes on an order beyond its status:
 * the crew and vehicle, the office's notes, the booking answers the team
 * completes after calling the customer, the price lines, the quote email and
 * the customer's date-change requests. Also the two read models the calendar
 * and the live map are drawn from.
 *
 * The order's net/VAT/gross columns are authoritative. The dashboard shows
 * and edits gross amounts (VAT included), as the prototype does. Stored lines
 * are gross too since pricing v2 (and for orders booked from a sales quote);
 * orders priced by v1 still carry net lines, so which kind an order has is
 * read from its numbers (`linesIncludeVat`). Edits always store gross lines,
 * in whole cents, with any rounding remainder on the largest line so the
 * parts always add up.
 */

// ── Money ─────────────────────────────────────────────────────────────────

const cents = (value: string | number | null | undefined) => Math.round((Number(value) || 0) * 100);
const euros = (value: number) => (value / 100).toFixed(2);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

function largestIndex(values: number[]): number {
  let best = 0;
  values.forEach((value, index) => {
    if (Math.abs(value) > Math.abs(values[best] ?? 0)) best = index;
  });
  return best;
}

export interface PriceView {
  vatRate: string;
  lines: { key: string; params: Record<string, string | number>; net: string; gross: string }[];
  discount: { code: string; gross: string } | null;
  subtotalGross: string;
  totalGross: string;
  netAmount: string;
  vatAmount: string;
}

/**
 * Whether the stored lines include VAT: they add up to the gross total
 * rather than to the net. Read from the numbers because the version alone
 * does not say it (a sales-quote order is version 0 with gross lines).
 */
function linesIncludeVat(order: Order): boolean {
  const all = order.priceBreakdown?.lines ?? [];
  if (all.length === 0) return true;
  const stored = sum(all.map((line) => cents(line.amount)));
  return Math.abs(stored - cents(order.totalGross)) <= Math.abs(stored - cents(order.netAmount));
}

/** The order's price as the dashboard shows it: gross lines that add up to the total. */
export function priceView(order: Order): PriceView {
  const vatFactor = 1 + (Number.parseFloat(order.vatRate) || 0) / 100;
  // What turns a stored line into a gross one.
  const factor = linesIncludeVat(order) ? 1 : vatFactor;
  const all = order.priceBreakdown?.lines ?? [];
  const discountLines = all.filter((line) => line.key === "line.discount_code");
  const lines = all.filter((line) => line.key !== "line.discount_code");

  const discountStored = -sum(discountLines.map((line) => cents(line.amount)));
  const discountGross = Math.round(discountStored * factor);
  const totalGross = cents(order.totalGross);
  const subtotalGross = totalGross + discountGross;

  const gross = lines.map((line) => Math.round(cents(line.amount) * factor));
  const remainder = subtotalGross - sum(gross);
  // Only a rounding remainder is spread; a larger gap means the stored lines
  // disagree with the total, and hiding that inside one line would mislead.
  if (gross.length > 0 && remainder !== 0 && Math.abs(remainder) <= gross.length) {
    gross[largestIndex(gross)]! += remainder;
  }

  return {
    vatRate: order.vatRate,
    lines: lines.map((line, index) => ({
      key: line.key,
      params: line.params ?? {},
      net: euros(Math.round((gross[index] ?? 0) / vatFactor)),
      gross: euros(gross[index] ?? 0),
    })),
    discount:
      discountStored !== 0
        ? { code: String(discountLines[0]?.params?.code ?? order.discountCode ?? ""), gross: euros(discountGross) }
        : null,
    subtotalGross: euros(subtotalGross),
    totalGross: order.totalGross,
    netAmount: order.netAmount,
    vatAmount: order.vatAmount,
  };
}

export interface LineInput {
  key?: string | undefined;
  label?: string | undefined;
  params?: Record<string, string | number> | undefined;
  gross: number;
}

/**
 * New money for an order from the office's gross lines.
 *
 * Prices include VAT, so the total is exactly what the office typed (less
 * any discount code, re-applied to the new subtotal as the prototype does);
 * net and VAT are split from it. Lines are stored gross, as the pricing
 * engine stores them.
 */
async function reprice(order: Order, input: LineInput[]) {
  const rate = Number.parseFloat(order.vatRate) || 0;
  const factor = 1 + rate / 100;
  const gross = input.map((line) => Math.round(line.gross * 100));
  const subtotal = sum(gross);

  const before = priceView(order);
  let discount = 0;
  let code = "";

  if (before.discount) {
    code = before.discount.code;
    const [rule] = code
      ? await db.select().from(discountCodes).where(eq(discountCodes.code, code.toUpperCase())).limit(1)
      : [];

    if (rule) {
      discount =
        rule.kind === "percentage"
          ? Math.round((subtotal * Number.parseFloat(rule.value)) / 100)
          : // A fixed code comes off the gross price, as in the pricing engine.
            cents(rule.value);
    } else {
      discount = cents(before.discount.gross);
    }

    discount = Math.max(0, Math.min(discount, Math.max(subtotal, 0)));
  }

  const total = Math.max(0, subtotal - discount);
  const net = Math.round(total / factor);
  const vat = total - net;

  const lines: PriceLine[] = input.map((line, index) => {
    const params = { ...(line.params ?? {}) };
    delete params.label;
    if (line.label) params.label = line.label;
    return {
      key: line.key || "line.custom",
      amount: euros(gross[index] ?? 0),
      ...(Object.keys(params).length > 0 ? { params } : {}),
    };
  });

  if (discount > 0) lines.push({ key: "line.discount_code", amount: euros(-discount), params: { code } });

  // The deposit keeps its share of the total.
  const oldTotal = cents(order.totalGross);
  const deposit = oldTotal > 0 ? Math.round((total * cents(order.depositAmount)) / oldTotal) : 0;

  const breakdown: PriceBreakdown = {
    ...order.priceBreakdown,
    lines,
    netAmount: euros(net),
    vatAmount: euros(vat),
    totalGross: euros(total),
    depositAmount: euros(deposit),
    computedAt: new Date().toISOString(),
  };
  // A hand-priced order is no longer the minimum-order case the engine flagged.
  delete breakdown.minimumApplied;

  return {
    priceBreakdown: breakdown,
    netAmount: euros(net),
    vatAmount: euros(vat),
    totalGross: euros(total),
    depositAmount: euros(deposit),
  };
}

// ── Booking answers ───────────────────────────────────────────────────────

const FLOOR_RE = /^-?\d{1,2}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "08:00 – 10:00", "08:00" or "8:00" → "08:00". */
function startOf(window: string): string | null {
  const match = window.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  if (hour > 23) return null;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function addDaysTo(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 864e5);
}

/**
 * The answers that also live in a column. Filling one in keeps the column in
 * step, so the crew page, the calendar and the customer's account read the
 * corrected value, as the prototype syncs them. A value that does not fit
 * the column (a floor that is not a number) is kept as an answer only.
 */
function columnsFor(order: Order, answers: Record<string, string | null>): Partial<typeof orders.$inferInsert> {
  const patch: Partial<typeof orders.$inferInsert> = {};
  const extras = { ...(order.extraServices ?? {}) } as Record<string, unknown>;
  let extrasTouched = false;

  for (const [id, raw] of Object.entries(answers)) {
    const value = (raw ?? "").trim();

    switch (id) {
      case "customerType":
        if (value === "private" || value === "business") patch.customerType = value;
        break;
      case "contact.name":
        if (value.length >= 2) {
          const name = splitName(value.slice(0, 120));
          patch.contactName = joinName(name.first, name.last);
          patch.contactFirstName = name.first;
          patch.contactLastName = name.last;
        }
        break;
      case "contact.firstName":
      case "contact.lastName": {
        if (!value) break;
        const first = (id === "contact.firstName" ? value : (patch.contactFirstName ?? order.contactFirstName ?? splitName(order.contactName).first)).slice(0, 60);
        const last = (id === "contact.lastName" ? value : (patch.contactLastName ?? order.contactLastName ?? splitName(order.contactName).last)).slice(0, 60);
        patch.contactFirstName = first;
        patch.contactLastName = last;
        patch.contactName = joinName(first, last);
        break;
      }
      case "contact.email":
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) patch.contactEmail = value.toLowerCase();
        break;
      case "contact.phone":
        if (value.length >= 5) patch.contactPhone = value.slice(0, 40);
        break;
      case "addr.from.text":
      case "addr.service.text":
        if (value) patch.originAddress = value;
        break;
      case "addr.to.text":
        patch.destinationAddress = value || null;
        break;
      case "prop.from.floor":
      case "prop.service.floor":
        if (FLOOR_RE.test(value)) patch.originFloor = Number(value);
        break;
      case "prop.to.floor":
        if (FLOOR_RE.test(value)) patch.destinationFloor = Number(value);
        break;
      case "prop.from.lift":
      case "prop.service.lift":
        if (value === "yes" || value === "no") patch.originHasElevator = value === "yes";
        break;
      case "prop.to.lift":
        if (value === "yes" || value === "no") patch.destinationHasElevator = value === "yes";
        break;
      case "volume.mode":
        if (value === "area" || value === "items") patch.calculationMethod = value;
        break;
      case "volume.area":
      case "cleaning.area": {
        const area = Number(value.replace(",", "."));
        if (value === "") patch.areaSqm = null;
        else if (Number.isFinite(area) && area >= 0 && area < 100000) patch.areaSqm = Math.round(area);
        break;
      }
      case "workers.helpers": {
        const crew = Number(value);
        if (Number.isInteger(crew) && crew >= 1 && crew <= 20) patch.crewSize = crew;
        break;
      }
      case "addons.packing":
        if (value === "yes" || value === "no") {
          extras.packingService = value === "yes";
          extrasTouched = true;
        }
        break;
      case "addons.insurance":
        if (value === "yes" || value === "no") {
          extras.transportInsurance = value === "yes";
          extrasTouched = true;
        }
        break;
      case "dates.date":
        if (DAY_RE.test(value)) {
          patch.scheduledDate = value;
          // A two-day job keeps its second day right after the first.
          if (order.scheduledSecondDate && order.scheduledDate) {
            patch.scheduledSecondDate = addDaysTo(order.scheduledSecondDate, daysBetween(order.scheduledDate, value));
          }
        }
        break;
      case "dates.second":
        if (value === "") patch.scheduledSecondDate = null;
        else if (DAY_RE.test(value)) patch.scheduledSecondDate = value;
        break;
      case "dates.win": {
        const start = startOf(value);
        if (value === "") patch.scheduledTime = null;
        else if (start) patch.scheduledTime = start;
        break;
      }
      default:
        break;
    }
  }

  if (extrasTouched) patch.extraServices = extras;
  return patch;
}

// ── Reads ─────────────────────────────────────────────────────────────────

/** When the latest quote email went out, from the audit trail that recorded it. */
async function quoteSentAt(orderId: string): Promise<string | null> {
  const [row] = await db
    .select({ at: auditLogs.createdAt })
    .from(auditLogs)
    .where(and(eq(auditLogs.entityType, "order"), eq(auditLogs.entityId, orderId), eq(auditLogs.action, "order.quote_sent")))
    .orderBy(desc(auditLogs.createdAt))
    .limit(1);
  return row ? row.at.toISOString() : null;
}

/** The catalogue names and volumes behind `selected_items`. */
async function resolveItems(selected: Record<string, number> | null) {
  const ids = Object.keys(selected ?? {}).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (ids.length === 0) return [];

  const rows = await db
    .select({ id: catalogItems.id, name: catalogItems.name, category: catalogItems.category, volumeM3: catalogItems.volumeM3 })
    .from(catalogItems)
    .where(inArray(catalogItems.id, ids));
  const byId = new Map(rows.map((row) => [row.id, row]));

  return ids.map((id) => ({
    id,
    name: byId.get(id)?.name ?? id,
    category: byId.get(id)?.category ?? null,
    count: Number(selected?.[id] ?? 0),
    volumeM3: byId.get(id)?.volumeM3 ?? null,
  }));
}

/**
 * The order with everything the detail page shows. A customer gets the same
 * view minus what belongs to the office: the internal notes never leave it.
 */
export async function orderDetail(order: Order, staff: boolean) {
  const [team, vehicle, requests, sentAt, items] = await Promise.all([
    order.teamId
      ? db.select({ id: teams.id, name: teams.name, area: teams.area, colour: teams.colour }).from(teams).where(eq(teams.id, order.teamId)).limit(1)
      : Promise.resolve([]),
    order.vehicleId
      ? db
          .select({ id: vehicles.id, name: vehicles.name, plate: vehicles.plate, capacityM3: vehicles.capacityM3 })
          .from(vehicles)
          .where(eq(vehicles.id, order.vehicleId))
          .limit(1)
      : Promise.resolve([]),
    db
      .select({
        id: dateChangeRequests.id,
        requestedDate: dateChangeRequests.requestedDate,
        requestedTime: dateChangeRequests.requestedTime,
        reason: dateChangeRequests.reason,
        status: dateChangeRequests.status,
        createdAt: dateChangeRequests.createdAt,
        decidedAt: dateChangeRequests.decidedAt,
      })
      .from(dateChangeRequests)
      .where(eq(dateChangeRequests.orderId, order.id))
      .orderBy(desc(dateChangeRequests.createdAt)),
    // The customer's account shows it too, on its tracker ("Quote sent").
    quoteSentAt(order.id),
    resolveItems(order.selectedItems),
  ]);

  const { internalNotes, ...rest } = order;

  return {
    ...rest,
    ...(staff ? { internalNotes } : {}),
    team: team[0] ?? null,
    vehicle: vehicle[0] ?? null,
    dateRequests: requests,
    quoteSentAt: sentAt,
    items,
    price: priceView(order),
  };
}

/** Active teams and vehicles, for the assignment selects when the fleet API is not there. */
export async function fleetOptions() {
  const [teamRows, vehicleRows] = await Promise.all([
    db
      .select({ id: teams.id, name: teams.name, area: teams.area, colour: teams.colour })
      .from(teams)
      .where(eq(teams.isActive, true))
      .orderBy(asc(teams.sortOrder), asc(teams.name)),
    db
      .select({ id: vehicles.id, name: vehicles.name, plate: vehicles.plate, capacityM3: vehicles.capacityM3 })
      .from(vehicles)
      .where(eq(vehicles.isActive, true))
      .orderBy(asc(vehicles.sortOrder), asc(vehicles.name)),
  ]);
  return { teams: teamRows, vehicles: vehicleRows };
}

/** Every job scheduled in a range (either of its days), for the calendar. */
export async function calendarJobs(from: string, to: string) {
  const rows = await db
    .select({
      id: orders.id,
      reference: orders.reference,
      status: orders.status,
      serviceType: orders.serviceType,
      contactName: orders.contactName,
      scheduledDate: orders.scheduledDate,
      scheduledTime: orders.scheduledTime,
      scheduledSecondDate: orders.scheduledSecondDate,
      teamId: orders.teamId,
      vehicleId: orders.vehicleId,
      teamName: teams.name,
      teamArea: teams.area,
    })
    .from(orders)
    .leftJoin(teams, eq(teams.id, orders.teamId))
    .where(
      and(
        ne(orders.status, "cancelled"),
        or(
          and(gte(orders.scheduledDate, from), lte(orders.scheduledDate, to)),
          and(gte(orders.scheduledSecondDate, from), lte(orders.scheduledSecondDate, to)),
        ),
      ),
    )
    .orderBy(asc(orders.scheduledDate), asc(orders.scheduledTime))
    .limit(2000);

  return { jobs: rows };
}

/**
 * The live map's read model: open orders with somewhere to drive, their crew
 * and vehicle, and what they carry from the catalogue items the customer
 * chose. Positions are simulated in the browser until vehicles report GPS.
 */
export async function dispatchBoard() {
  const rows = await db
    .select({
      id: orders.id,
      reference: orders.reference,
      status: orders.status,
      serviceType: orders.serviceType,
      customerType: orders.customerType,
      contactName: orders.contactName,
      contactPhone: orders.contactPhone,
      company: sql<string | null>`${orders.answers}->'company'->>'value'`,
      originAddress: orders.originAddress,
      destinationAddress: orders.destinationAddress,
      scheduledDate: orders.scheduledDate,
      scheduledTime: orders.scheduledTime,
      teamId: orders.teamId,
      vehicleId: orders.vehicleId,
      teamName: teams.name,
      teamArea: teams.area,
      calculationMethod: orders.calculationMethod,
      areaSqm: orders.areaSqm,
      selectedItems: orders.selectedItems,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(teams, eq(teams.id, orders.teamId))
    .where(notInArray(orders.status, ["cancelled", "completed"]))
    .orderBy(asc(orders.scheduledDate), desc(orders.createdAt))
    .limit(300);

  const allIds = [...new Set(rows.flatMap((row) => Object.keys(row.selectedItems ?? {})))];
  const catalogue = allIds.length
    ? await db
        .select({ id: catalogItems.id, name: catalogItems.name, volumeM3: catalogItems.volumeM3 })
        .from(catalogItems)
        .where(inArray(catalogItems.id, allIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id))))
    : [];
  const byId = new Map(catalogue.map((item) => [item.id, item]));

  const jobs = rows.map(({ selectedItems, ...row }) => {
    const items = Object.entries(selectedItems ?? {}).map(([id, count]) => ({
      name: byId.get(id)?.name ?? id,
      count: Number(count),
      volumeM3: Number(byId.get(id)?.volumeM3 ?? 0),
    }));
    const itemVolume = items.reduce((total, item) => total + item.volumeM3 * item.count, 0);
    // By floor area the volume is a rule of thumb: about 0.3 m³ per m².
    const volume = row.calculationMethod === "area" && row.areaSqm ? row.areaSqm * 0.3 : itemVolume;
    return { ...row, items, volumeM3: Math.round(volume * 10) / 10 };
  });

  return { jobs, ...(await fleetOptions()) };
}

// ── Writes ────────────────────────────────────────────────────────────────

export interface OrderUpdate {
  teamId?: string | null | undefined;
  vehicleId?: string | null | undefined;
  internalNotes?: string | null | undefined;
  answers?: Record<string, string | null> | undefined;
  lines?: LineInput[] | undefined;
}

export async function updateOrder(orderId: string, input: OrderUpdate, context: RequestContext) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
    if (!order) throw AppError.notFound("Order");

    const patch: Partial<typeof orders.$inferInsert> = {};
    const changes: Record<string, unknown> = {};

    if (input.teamId !== undefined && input.teamId !== order.teamId) {
      if (input.teamId) {
        const [team] = await tx.select({ id: teams.id }).from(teams).where(eq(teams.id, input.teamId)).limit(1);
        if (!team) throw AppError.unprocessable("That team does not exist.");
      }
      patch.teamId = input.teamId;
      changes.teamId = { from: order.teamId, to: input.teamId };
    }

    if (input.vehicleId !== undefined && input.vehicleId !== order.vehicleId) {
      if (input.vehicleId) {
        const [vehicle] = await tx.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.id, input.vehicleId)).limit(1);
        if (!vehicle) throw AppError.unprocessable("That vehicle does not exist.");
      }
      patch.vehicleId = input.vehicleId;
      changes.vehicleId = { from: order.vehicleId, to: input.vehicleId };
    }

    if (input.internalNotes !== undefined) {
      const notes = input.internalNotes?.trim() ? input.internalNotes : null;
      if (notes !== order.internalNotes) {
        patch.internalNotes = notes;
        // The notes themselves stay out of the audit trail; that they changed is enough.
        changes.internalNotes = { changed: true };
      }
    }

    if (input.answers && Object.keys(input.answers).length > 0) {
      const next: Answers = { ...(order.answers ?? {}) };
      const answered: Record<string, { from: string | null; to: string | null }> = {};

      for (const [id, value] of Object.entries(input.answers)) {
        answered[id] = { from: next[id]?.value ?? null, to: value };
        // Marked as the team's, so the dashboard can show "Added by team".
        next[id] = { value: value ?? "", byTeam: true };
      }

      patch.answers = next;
      const synced = columnsFor(order, input.answers);
      Object.assign(patch, synced);
      changes.answers = answered;
      if (Object.keys(synced).length > 0) changes.columns = Object.keys(synced);
    }

    if (input.lines) {
      const money = await reprice(order, input.lines);
      Object.assign(patch, money);
      changes.price = { from: order.totalGross, to: money.totalGross, lines: input.lines.length };
    }

    if (Object.keys(patch).length === 0) return { order, changed: false };

    const [updated] = await tx
      .update(orders)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    await recordAudit(
      {
        actor: context.actor,
        action: "order.updated",
        entityType: "order",
        entityId: orderId,
        changes,
        ipAddress: context.ipAddress,
        requestId: context.requestId,
      },
      tx,
    );

    return { order: updated!, changed: true, dateMoved: "scheduledDate" in patch || "scheduledSecondDate" in patch };
  });
}

/** Records that the quote went out; the email itself is sent after commit. */
export async function markQuoteSent(order: Order, context: RequestContext) {
  await recordAudit({
    actor: context.actor,
    action: "order.quote_sent",
    entityType: "order",
    entityId: order.id,
    changes: { totalGross: order.totalGross, to: order.contactEmail },
    ipAddress: context.ipAddress,
    requestId: context.requestId,
  });
}

/**
 * A customer asks to move their booking. One open request per order: asking
 * again replaces the date on the open one rather than stacking requests the
 * office would have to untangle.
 */
export async function requestDateChange(
  order: Order,
  input: { date: string; time?: string | undefined; reason?: string | undefined },
  context: RequestContext,
) {
  if (order.status === "cancelled" || order.status === "completed") {
    throw AppError.conflict("INVALID_STATE_TRANSITION", `An order that is ${order.status} cannot be moved.`);
  }

  const today = new Date().toISOString().slice(0, 10);
  if (input.date <= today) throw AppError.unprocessable("The new date must be in the future.");

  return db.transaction(async (tx) => {
    const [open] = await tx
      .select()
      .from(dateChangeRequests)
      .where(and(eq(dateChangeRequests.orderId, order.id), eq(dateChangeRequests.status, "requested")))
      .for("update")
      .limit(1);

    const values = {
      requestedDate: input.date,
      requestedTime: input.time?.trim() || null,
      reason: input.reason?.trim() || null,
    };

    const [row] = open
      ? await tx.update(dateChangeRequests).set({ ...values, createdAt: new Date() }).where(eq(dateChangeRequests.id, open.id)).returning()
      : await tx.insert(dateChangeRequests).values({ orderId: order.id, ...values }).returning();

    await recordAudit(
      {
        actor: context.actor,
        action: "order.date_change_requested",
        entityType: "order",
        entityId: order.id,
        changes: { requestId: row!.id, from: order.scheduledDate, to: input.date, time: values.requestedTime },
        ipAddress: context.ipAddress,
        requestId: context.requestId,
      },
      tx,
    );

    return row!;
  });
}

/**
 * The office answers a date-change request. Approving moves the booking (and
 * a second day with it) to the requested date and time; declining keeps it.
 *
 * Capacity is not re-checked on approval: the office is deciding with the
 * calendar in front of it, and refusing its decision would only push the
 * same move through the order editor instead.
 */
export async function decideDateChange(
  orderId: string,
  requestId: string,
  approve: boolean,
  note: string | undefined,
  context: RequestContext,
) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
    if (!order) throw AppError.notFound("Order");

    const [request] = await tx
      .select()
      .from(dateChangeRequests)
      .where(and(eq(dateChangeRequests.id, requestId), eq(dateChangeRequests.orderId, orderId)))
      .for("update")
      .limit(1);
    if (!request) throw AppError.notFound("Date change request");
    if (request.status !== "requested") {
      throw AppError.conflict("INVALID_STATE_TRANSITION", `This request was already ${request.status}.`);
    }

    const now = new Date();
    await tx
      .update(dateChangeRequests)
      .set({ status: approve ? "approved" : "declined", decidedBy: context.actor.id ?? null, decidedAt: now })
      .where(eq(dateChangeRequests.id, requestId));

    let updated = order;

    if (approve) {
      const patch: Partial<typeof orders.$inferInsert> = { scheduledDate: request.requestedDate, updatedAt: now };
      const start = request.requestedTime ? startOf(request.requestedTime) : null;
      if (start) patch.scheduledTime = start;
      if (order.scheduledSecondDate && order.scheduledDate) {
        patch.scheduledSecondDate = addDaysTo(order.scheduledSecondDate, daysBetween(order.scheduledDate, request.requestedDate));
      }
      if (note) patch.internalNotes = order.internalNotes ? `${order.internalNotes}\n${note}` : note;
      // A date the team typed in earlier would otherwise keep showing over the moved one.
      if (order.answers && ["dates.date", "dates.win", "dates.second"].some((key) => key in order.answers!)) {
        const { "dates.date": _date, "dates.win": _win, "dates.second": _second, ...answers } = order.answers;
        patch.answers = answers;
      }

      const [moved] = await tx.update(orders).set(patch).where(eq(orders.id, orderId)).returning();
      updated = moved ?? order;
    }

    await recordAudit(
      {
        actor: context.actor,
        action: approve ? "order.date_change_approved" : "order.date_change_declined",
        entityType: "order",
        entityId: orderId,
        changes: {
          requestId,
          date: approve ? { from: order.scheduledDate, to: request.requestedDate } : request.requestedDate,
        },
        ipAddress: context.ipAddress,
        requestId: context.requestId,
      },
      tx,
    );

    return updated!;
  });
}
