import type { PriceBreakdown, PriceLine, QuoteInput } from "../domain-types.js";
import { WINDOW_TYPES } from "../domain-types.js";

import { isSaturday, toCalendarDate } from "../calendar-date.js";
import { atLeastZero, formatMoney, multiply, percentOf, sum, type Cents } from "../money.js";
import type { RateCard } from "./rate-card.js";

/**
 * The pricing engine — the single place a price is ever calculated.
 *
 * Version 2 prices the way the m.on booking prototype (mon-booking v34)
 * does, with the rates the admin prototype's Pricing screen edits:
 *
 *   moving   distance × €/km, stairs × €/floor per address without a lift,
 *            volume × €/m³ (from the inventory, or 0.3 m³ per m² of floor
 *            area), movers × hours × €/hour, dismantling/assembly per piece,
 *            packing × €/m³, special items per item, flat add-ons,
 *            the minimum moving order
 *   cleaning floor area × €/m² (or the cleaning catalogue), windows by type
 *            (a type priced 0 is left to the team), the minimum cleaning order
 *   disposal the catalogue's disposal prices; anything else is quoted by hand
 *
 * plus a flat Saturday or public-holiday surcharge and a discount code.
 * Every rate already includes VAT, so the lines add up to the gross total and
 * VAT is worked back out of it.
 *
 * The function is pure: same inputs, same output, no I/O. That is what makes
 * it unit-testable and what lets a disputed invoice be reproduced exactly.
 */

export const PRICING_VERSION = 2;

/** m³ of household goods per m² of floor area, for a normally furnished home. */
export const VOLUME_PER_SQM = 0.3;

export interface CatalogItemRate {
  id: string;
  price: Cents;
  disposalPrice: Cents;
  assemblyPrice: Cents;
  disassemblyPrice: Cents;
  volumeM3: number | null;
}

export interface DiscountRate {
  code: string;
  kind: "percentage" | "fixed";
  value: Cents | number;
}

export interface PricingContext {
  rates: RateCard;
  /** Catalog rows relevant to this service, keyed by id. */
  catalog: ReadonlyMap<string, CatalogItemRate>;
  /** Road distance in km. Only meaningful for moving jobs. */
  distanceKm: number;
  /** Already validated against usage limits and date window by the caller. */
  discount?: DiscountRate | undefined;
  /** Days ("2026-12-25") that carry the public-holiday surcharge. */
  holidayDates?: ReadonlySet<string> | undefined;
  /** The service zone the job starts in, when that zone charges for the drive. */
  zoneSurcharge?: { name: string; amount: Cents } | undefined;
}

export class PricingError extends Error {
  constructor(
    message: string,
    public readonly code: "UNKNOWN_CATALOG_ITEM" | "MISSING_AREA" | "MISSING_ITEMS" | "INVALID_INPUT",
  ) {
    super(message);
    this.name = "PricingError";
  }
}

export function calculatePrice(input: QuoteInput, context: PricingContext): PriceBreakdown {
  const { rates } = context;
  const lines: PriceLine[] = [];
  let estimatedHours = 0;

  if (input.serviceType === "moving") {
    estimatedHours = priceMove(input, context, lines);
  } else if (input.serviceType === "cleaning") {
    priceCleaning(input, context, lines);
    estimatedHours = estimateOtherHours(input);
  } else {
    priceDisposal(input, context, lines);
    estimatedHours = estimateOtherHours(input);
  }

  // ── Minimum order ─────────────────────────────────────────────────────
  const minimum = input.serviceType === "moving" ? rates.movingMinimum : input.serviceType === "cleaning" ? rates.cleaningMinimum : 0;
  const beforeMinimum = total(lines);
  const minimumApplied = minimum > 0 && beforeMinimum > 0 && beforeMinimum < minimum;
  if (minimumApplied) lines.push(line("line.minimum_order_value", minimum - beforeMinimum, { minimum: formatMoney(minimum) }));

  // ── Saturday or public holiday, flat per job ──────────────────────────
  if (input.scheduledDate) {
    if (context.holidayDates?.has(input.scheduledDate) && rates.holiday > 0) {
      lines.push(line("line.holiday_surcharge", rates.holiday));
    } else if (isSaturday(toCalendarDate(input.scheduledDate))) {
      const saturday = input.serviceType === "moving" ? rates.saturdayMoving : rates.saturdayOther;
      if (saturday > 0) lines.push(line("line.saturday", saturday));
    }
  }

  // ── Service zone travel surcharge, flat per job ───────────────────────
  if (context.zoneSurcharge && context.zoneSurcharge.amount > 0) {
    lines.push(line("line.zone_surcharge", context.zoneSurcharge.amount, { zone: context.zoneSurcharge.name }));
  }

  // ── Discount code ─────────────────────────────────────────────────────
  let gross = total(lines);
  if (context.discount) {
    const amount =
      context.discount.kind === "percentage" ? percentOf(gross, context.discount.value as number) : (context.discount.value as Cents);
    // Clamped so a large fixed discount cannot produce a negative invoice.
    const applied = Math.min(amount, gross);
    gross = atLeastZero(gross - applied);
    lines.push(line("line.discount_code", -applied, { code: context.discount.code }));
  }

  // ── VAT, worked back out of the gross, and the deposit ────────────────
  const net = Math.round(gross / (1 + rates.vatPercent / 100));
  const vatAmount = gross - net;
  const depositAmount = percentOf(gross, rates.depositPercent);

  return {
    lines,
    netAmount: formatMoney(net),
    vatRate: rates.vatPercent.toFixed(2),
    vatAmount: formatMoney(vatAmount),
    totalGross: formatMoney(gross),
    depositAmount: formatMoney(depositAmount),
    ...(minimumApplied ? { minimumApplied: true } : {}),
    estimatedHours: estimatedHours.toFixed(2),
    distanceKm: context.distanceKm.toFixed(2),
    pricingVersion: PRICING_VERSION,
    computedAt: new Date().toISOString(),
  };
}

// ── Moving ─────────────────────────────────────────────────────────────────

/** Prices a move and returns its estimated hours. */
function priceMove(input: QuoteInput, context: PricingContext, lines: PriceLine[]): number {
  const { rates, distanceKm } = context;

  // Distance: the road distance the server worked out.
  if (distanceKm > 0 && rates.perKm > 0) {
    lines.push(line("line.travel", multiply(rates.perKm, distanceKm), { km: distanceKm.toFixed(1), rate: formatMoney(rates.perKm) }));
  }

  // Stairs: per floor carried without a lift, at each address.
  const fromFloors = input.originHasElevator ? 0 : Math.max(0, input.originFloor);
  const toFloors = input.destinationHasElevator ? 0 : Math.max(0, input.destinationFloor);
  if (fromFloors > 0 && rates.perFloor > 0) {
    lines.push(line("line.stairs_from", multiply(rates.perFloor, fromFloors), { floors: fromFloors, rate: formatMoney(rates.perFloor) }));
  }
  if (toFloors > 0 && rates.perFloor > 0) {
    lines.push(line("line.stairs_to", multiply(rates.perFloor, toFloors), { floors: toFloors, rate: formatMoney(rates.perFloor) }));
  }

  // Volume: the inventory's m³, or an estimate from the floor area.
  const volume = moveVolume(input, context);
  if (volume > 0 && rates.perM3 > 0) {
    lines.push(
      line(input.calculationMethod === "area" ? "line.volume_estimated" : "line.volume", multiply(rates.perM3, volume), {
        m3: formatVolume(volume),
        rate: formatMoney(rates.perM3),
      }),
    );
  }

  // Crew: the prototype's recommendation for the volume, at least three when
  // the customer asked for a third mover.
  const recommended = volume < 12 ? 2 : volume < 25 ? 3 : volume < 40 ? 4 : 5;
  const movers = input.crewSize === 3 ? Math.max(3, recommended) : recommended;
  const hours = Math.max(3, Math.ceil(volume / 5 + 1));
  if (volume > 0 && rates.perHour > 0) {
    lines.push(line("line.crew", multiply(rates.perHour, movers * hours), { movers, hours, rate: formatMoney(rates.perHour) }));
  }

  // Dismantling and assembly, per piece. A piece in both lists is both.
  const dis = input.extras.disassemblyItems ?? {};
  const re = input.extras.assemblyItems ?? {};
  let onlyDis = 0;
  let onlyRe = 0;
  let both = 0;
  for (const id of new Set([...Object.keys(dis), ...Object.keys(re)])) {
    const d = Math.max(0, dis[id] ?? 0);
    const r = Math.max(0, re[id] ?? 0);
    const shared = Math.min(d, r);
    both += shared;
    onlyDis += d - shared;
    onlyRe += r - shared;
  }
  if (onlyDis > 0) lines.push(line("line.dismantling", multiply(rates.disassembly, onlyDis), { count: onlyDis, rate: formatMoney(rates.disassembly) }));
  if (onlyRe > 0) lines.push(line("line.reassembly", multiply(rates.reassembly, onlyRe), { count: onlyRe, rate: formatMoney(rates.reassembly) }));
  if (both > 0) {
    lines.push(line("line.assembly_both", multiply(rates.disassemblyAndReassembly, both), { count: both, rate: formatMoney(rates.disassemblyAndReassembly) }));
  }

  // Packing, by the total volume.
  if (input.extras.packingService && volume > 0 && rates.packingPerM3 > 0) {
    lines.push(line("line.packing", multiply(rates.packingPerM3, volume), { m3: formatVolume(volume), rate: formatMoney(rates.packingPerM3) }));
  }

  // Flat add-ons.
  if (input.extras.parkingZone && rates.parkingZone > 0) lines.push(line("line.parking_zone", rates.parkingZone));
  if (input.extras.transportInsurance && rates.transportInsurance > 0) lines.push(line("line.insurance", rates.transportInsurance));

  // Special items, per item. The set is the catalogue's, not a fixed list, so
  // the loop walks what the quote asked for; a code the catalogue no longer
  // has prices at nothing rather than throwing, which keeps an old link or a
  // stale tab from failing outright.
  for (const [code, asked] of Object.entries(input.specialItems ?? {})) {
    const count = Math.max(0, Math.floor(asked ?? 0));
    const rate = rates.special[code];
    if (count > 0 && rate && rate.amount > 0) {
      // One key for every special item: a code added in the dashboard has no
      // translation of its own, and the name the office gave it is what a
      // customer recognises. Breakdowns already stored keep their old
      // `line.special_<code>` keys, which still translate.
      lines.push(line("line.special", multiply(rate.amount, count), { count, rate: formatMoney(rate.amount), name: rate.name }));
    }
  }

  // Driving time on top of the handling hours, at a 50 km/h loaded average.
  return Math.round((hours + distanceKm / 50) * 4) / 4;
}

/** m³ to move: the selected items' volumes, or 0.3 m³ per m² of floor area. */
function moveVolume(input: QuoteInput, context: PricingContext): number {
  if (input.calculationMethod === "area") {
    if (input.areaSqm === undefined || input.areaSqm <= 0) {
      throw new PricingError("Area is required when pricing by area.", "MISSING_AREA");
    }
    return Math.round(input.areaSqm * VOLUME_PER_SQM * 10) / 10;
  }

  const selected = Object.entries(input.selectedItems ?? {}).filter(([, quantity]) => quantity > 0);
  if (selected.length === 0) throw new PricingError("At least one item must be selected.", "MISSING_ITEMS");

  const volume = selected.reduce((totalM3, [id, quantity]) => totalM3 + (requireCatalogItem(context, id).volumeM3 ?? 0) * quantity, 0);

  return Math.round(volume * 10) / 10;
}

// ── Cleaning ───────────────────────────────────────────────────────────────

function priceCleaning(input: QuoteInput, context: PricingContext, lines: PriceLine[]): void {
  const { rates } = context;
  const windowCount = WINDOW_TYPES.reduce((n, type) => n + Math.max(0, input.windows?.[type] ?? 0), 0);

  if (input.calculationMethod === "area") {
    if ((input.areaSqm === undefined || input.areaSqm <= 0) && windowCount === 0) {
      throw new PricingError("Area is required when pricing by area.", "MISSING_AREA");
    }
    if (input.areaSqm && input.areaSqm > 0) {
      lines.push(line("line.cleaning_area", multiply(rates.cleaningPerSqm, input.areaSqm), { sqm: input.areaSqm, rate: formatMoney(rates.cleaningPerSqm) }));
    }
  } else {
    const selected = Object.entries(input.selectedItems ?? {}).filter(([, quantity]) => quantity > 0);
    if (selected.length === 0 && windowCount === 0) throw new PricingError("At least one item must be selected.", "MISSING_ITEMS");
    if (selected.length > 0) {
      const amount = sum(selected.map(([id, quantity]) => multiply(requireCatalogItem(context, id).price, quantity)));
      lines.push(line("line.selected_items", amount, { count: selected.length }));
    }
  }

  // Windows by type; a type priced 0 is left for the team to quote.
  for (const type of WINDOW_TYPES) {
    const count = Math.max(0, Math.floor(input.windows?.[type] ?? 0));
    const rate = rates.windows[type];
    if (count > 0 && rate > 0) lines.push(line(`line.windows_${type}`, multiply(rate, count), { count, rate: formatMoney(rate) }));
  }
}

// ── Disposal ───────────────────────────────────────────────────────────────

function priceDisposal(input: QuoteInput, context: PricingContext, lines: PriceLine[]): void {
  if (input.calculationMethod === "area") {
    throw new PricingError("A clearance by floor area is quoted by the team.", "INVALID_INPUT");
  }

  const selected = Object.entries(input.selectedItems ?? {}).filter(([, quantity]) => quantity > 0);
  if (selected.length === 0) throw new PricingError("At least one item must be selected.", "MISSING_ITEMS");

  const amount = sum(selected.map(([id, quantity]) => multiply(requireCatalogItem(context, id).disposalPrice, quantity)));
  lines.push(line("line.selected_items", amount, { count: selected.length }));
}

// ── helpers ────────────────────────────────────────────────────────────────

/** A conservative duration for cleaning and clearance, for the second-day check. */
function estimateOtherHours(input: QuoteInput): number {
  const area = input.calculationMethod === "area" ? input.areaSqm ?? 0 : 0;
  const items = Object.values(input.selectedItems ?? {}).reduce((n, quantity) => n + quantity, 0);
  const windows = WINDOW_TYPES.reduce((n, type) => n + (input.windows?.[type] ?? 0), 0);
  return Math.round(Math.max(2, 1.5 + area * 0.05 + items * 0.25 + windows * 0.15) * 4) / 4;
}

function requireCatalogItem(context: PricingContext, itemId: string): CatalogItemRate {
  const item = context.catalog.get(itemId);

  if (!item) {
    throw new PricingError(`Unknown or inactive catalog item: ${itemId}`, "UNKNOWN_CATALOG_ITEM");
  }

  return item;
}

function amountOf(entry: PriceLine): Cents {
  return Math.round(Number.parseFloat(entry.amount) * 100);
}

function total(lines: readonly PriceLine[]): Cents {
  return sum(lines.map(amountOf));
}

/** "14,5" style is for German screens; the param stays a plain decimal. */
function formatVolume(m3: number): string {
  return (Math.round(m3 * 10) / 10).toString();
}

function line(key: string, amount: Cents, params?: Record<string, string | number>): PriceLine {
  return { key, amount: formatMoney(amount), ...(params ? { params } : {}) };
}
