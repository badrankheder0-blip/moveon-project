import type { WindowType } from "../domain-types.js";
import { parseMoney, type Cents } from "../money.js";

/**
 * The tunable pricing parameters, as stored in `price_settings`.
 *
 * Since pricing version 2 these are the rates the admin prototype's Pricing
 * screen lists — distance, volume, crew hours, stairs, packing, cleaning per
 * m², windows, dismantling and assembly per piece, special items, Saturday
 * and holiday surcharges — and every amount includes VAT, as the booking
 * flow shows its prices.
 *
 * Every key is listed explicitly rather than being read as a loose record, so
 * a missing or renamed row is a startup error with a clear message instead of
 * `undefined` propagating into an arithmetic expression.
 */
/** How a special item's catalogue code reaches the rate card. */
export const SPECIAL_PREFIX = "sp_";

export const RATE_KEYS = [
  // Moving
  "km",
  "m3",
  "hour",
  "floor_move",
  "floor_large",
  "pack",
  "move_min",
  // Cleaning
  "clean_m2",
  "clean_min",
  // Windows (0 = the team prices it on request)
  "win_standard",
  "win_patio",
  "win_large",
  "win_roof",
  // Dismantling & assembly, per piece
  "asm_dis",
  "asm_re",
  "asm_both",
  // Special items are not listed here: they are catalogue rows the office
  // manages, so the set is whatever the catalogue holds and a missing one is
  // not a broken rate card. They reach the card as "sp_<code>" rows.
  // Surcharges, per job
  "sat_move",
  "sat_other",
  "holiday",
  // Add-ons, flat
  "parking_zone",
  "transport_insurance",
  // Terms
  "vat_percent",
  "deposit_percent",
] as const;

export type RateKey = (typeof RATE_KEYS)[number];

/** Money becomes integer cents (VAT included); percentages stay plain numbers. */
export interface RateCard {
  perKm: Cents;
  perM3: Cents;
  perHour: Cents;
  perFloor: Cents;
  perFloorLarge: Cents;
  packingPerM3: Cents;
  movingMinimum: Cents;

  cleaningPerSqm: Cents;
  cleaningMinimum: Cents;
  windows: Record<WindowType, Cents>;

  disassembly: Cents;
  reassembly: Cents;
  disassemblyAndReassembly: Cents;

  /**
   * Items that need extra handling on a move, by their catalogue code.
   *
   * Open-ended on purpose: the office adds and renames these in the dashboard,
   * so the engine prices whatever the quote names rather than a fixed six. The
   * name rides along because the breakdown line has to read as something a
   * customer recognises even for a code added this morning.
   */
  special: Record<string, { amount: Cents; name: string }>;

  saturdayMoving: Cents;
  saturdayOther: Cents;
  holiday: Cents;

  parkingZone: Cents;
  transportInsurance: Cents;

  vatPercent: number;
  depositPercent: number;
}

export class MissingRateError extends Error {
  constructor(public readonly keys: readonly string[]) {
    super(
      `Rate card is incomplete. Missing price_settings rows: ${keys.join(", ")}. ` +
        "Run `pnpm seed` or add the rows via the admin panel.",
    );
    this.name = "MissingRateError";
  }
}

/**
 * Builds a validated rate card from raw `price_settings` rows.
 * Throws once, listing every missing key, rather than failing on the first.
 * Rows that are no longer rates (the version-1 keys) are ignored.
 */
export function buildRateCard(rows: readonly { key: string; value: string; label?: string | null }[]): RateCard {
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  const missing = RATE_KEYS.filter((key) => !byKey.has(key));

  if (missing.length > 0) {
    throw new MissingRateError(missing);
  }

  const money = (key: RateKey): Cents => parseMoney(byKey.get(key)!);
  const percent = (key: RateKey): number => Number.parseFloat(byKey.get(key)!);

  return {
    perKm: money("km"),
    perM3: money("m3"),
    perHour: money("hour"),
    perFloor: money("floor_move"),
    perFloorLarge: money("floor_large"),
    packingPerM3: money("pack"),
    movingMinimum: money("move_min"),
    cleaningPerSqm: money("clean_m2"),
    cleaningMinimum: money("clean_min"),
    windows: {
      standard: money("win_standard"),
      patio: money("win_patio"),
      large: money("win_large"),
      roof: money("win_roof"),
    },
    disassembly: money("asm_dis"),
    reassembly: money("asm_re"),
    disassemblyAndReassembly: money("asm_both"),
    special: Object.fromEntries(
      rows
        .filter((row) => row.key.startsWith(SPECIAL_PREFIX) && row.key.length > SPECIAL_PREFIX.length)
        .map((row) => [row.key.slice(SPECIAL_PREFIX.length), { amount: parseMoney(row.value), name: row.label?.trim() || row.key.slice(SPECIAL_PREFIX.length) }]),
    ),
    saturdayMoving: money("sat_move"),
    saturdayOther: money("sat_other"),
    holiday: money("holiday"),
    parkingZone: money("parking_zone"),
    transportInsurance: money("transport_insurance"),
    vatPercent: percent("vat_percent"),
    depositPercent: percent("deposit_percent"),
  };
}
