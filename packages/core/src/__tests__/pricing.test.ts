import { describe, expect, it } from "vitest";

import type { QuoteInput } from "../domain-types.js";
import { calculatePrice, PricingError, type CatalogItemRate } from "../pricing/engine.js";
import { buildRateCard, RATE_KEYS } from "../pricing/rate-card.js";

/** The admin prototype's default rates (m-on-admin, pricing defaults). */
const PROTOTYPE_RATES: Record<(typeof RATE_KEYS)[number], string> = {
  km: "1.90",
  m3: "14.00",
  hour: "32.00",
  floor_move: "15.00",
  floor_large: "8.00",
  pack: "8.00",
  move_min: "0.00",
  clean_m2: "4.90",
  clean_min: "99.00",
  win_standard: "11.00",
  win_patio: "12.00",
  win_large: "0.00",
  win_roof: "0.00",
  asm_dis: "10.00",
  asm_re: "12.00",
  asm_both: "20.00",
  sp_piano: "150.00",
  sp_safe: "120.00",
  sp_aquarium: "90.00",
  sp_gym: "60.00",
  sp_heavy: "80.00",
  sp_artwork: "25.00",
  sat_move: "50.00",
  sat_other: "40.00",
  holiday: "60.00",
  parking_zone: "95.00",
  transport_insurance: "45.00",
  vat_percent: "19.00",
  deposit_percent: "20.00",
};

const rates = buildRateCard(Object.entries(PROTOTYPE_RATES).map(([key, value]) => ({ key, value })));

const sofa: CatalogItemRate = { id: "sofa", price: 4500, disposalPrice: 3000, assemblyPrice: 0, disassemblyPrice: 0, volumeM3: 2.5 };
const wardrobe: CatalogItemRate = { id: "wardrobe", price: 6000, disposalPrice: 4000, assemblyPrice: 0, disassemblyPrice: 0, volumeM3: 2 };
const catalog = new Map([
  [sofa.id, sofa],
  [wardrobe.id, wardrobe],
]);

const move = (overrides: Partial<QuoteInput> = {}): QuoteInput => ({
  serviceType: "moving",
  customerType: "private",
  originAddress: "Berliner Allee 10, 40212 Düsseldorf",
  destinationAddress: "Ehrenstraße 12, 50672 Köln",
  originFloor: 0,
  destinationFloor: 0,
  originHasElevator: false,
  destinationHasElevator: false,
  calculationMethod: "area",
  areaSqm: 60,
  extras: { packingService: false, parkingZone: false, transportInsurance: false },
  crewSize: 2,
  secondVan: false,
  ...overrides,
});

const amount = (breakdown: ReturnType<typeof calculatePrice>, key: string) => breakdown.lines.find((entry) => entry.key === key)?.amount;

describe("calculatePrice, version 2 (the booking prototype's model)", () => {
  it("prices a move by distance, estimated volume and crew hours", () => {
    const result = calculatePrice(move(), { rates, catalog, distanceKm: 42 });

    // 42 km × €1.90
    expect(amount(result, "line.travel")).toBe("79.80");
    // 60 m² × 0.3 = 18 m³ × €14
    expect(amount(result, "line.volume_estimated")).toBe("252.00");
    // 18 m³ → 3 movers, max(3, ⌈18/5 + 1⌉) = 5 h, × €32
    expect(amount(result, "line.crew")).toBe("480.00");
    expect(result.totalGross).toBe("811.80");
    expect(result.pricingVersion).toBe(2);
  });

  it("works VAT back out of the gross total", () => {
    const result = calculatePrice(move(), { rates, catalog, distanceKm: 42 });
    expect(result.netAmount).toBe("682.18");
    expect(result.vatAmount).toBe("129.62");
  });

  it("charges stairs per floor at each address without a lift", () => {
    const result = calculatePrice(move({ originFloor: 3, destinationFloor: 2, destinationHasElevator: true }), { rates, catalog, distanceKm: 0 });
    expect(amount(result, "line.stairs_from")).toBe("45.00");
    expect(amount(result, "line.stairs_to")).toBeUndefined();
  });

  it("prices the inventory's volume, packing, assembly pieces and special items", () => {
    const result = calculatePrice(
      move({
        calculationMethod: "items",
        areaSqm: undefined,
        selectedItems: { sofa: 2, wardrobe: 1 },
        extras: {
          packingService: true,
          parkingZone: true,
          transportInsurance: false,
          disassemblyItems: { wardrobe: 1, sofa: 1 },
          assemblyItems: { wardrobe: 1 },
        },
        specialItems: { piano: 1 },
      }),
      { rates, catalog, distanceKm: 0 },
    );

    // 2 × 2.5 + 2 = 7 m³
    expect(amount(result, "line.volume")).toBe("98.00");
    expect(amount(result, "line.packing")).toBe("56.00");
    expect(amount(result, "line.assembly_both")).toBe("20.00");
    expect(amount(result, "line.dismantling")).toBe("10.00");
    expect(amount(result, "line.parking_zone")).toBe("95.00");
    expect(amount(result, "line.special")).toBe("150.00");
  });

  it("prices any special item the catalogue names, and labels it with that name", () => {
    // A code the product never shipped with: special items are catalogue rows
    // the office adds, so the engine must price one it has never seen.
    const withBillard = buildRateCard([
      ...Object.entries(PROTOTYPE_RATES).map(([key, value]) => ({ key, value })),
      { key: "sp_billard", value: "220.00", label: "Billardtisch" },
    ]);

    const result = calculatePrice(move({ specialItems: { billard: 2 } }), { rates: withBillard, catalog, distanceKm: 0 });
    const line = result.lines.find((entry) => entry.key === "line.special");

    expect(line?.amount).toBe("440.00");
    // The name travels with the line: a code added this morning has no
    // translation, so the breakdown reads with what the office called it.
    expect(line?.params?.name).toBe("Billardtisch");
  });

  it("ignores a special item the catalogue no longer offers", () => {
    // An old link or a stale tab must not fail outright.
    const result = calculatePrice(move({ specialItems: { retired: 3 } }), { rates, catalog, distanceKm: 0 });
    expect(amount(result, "line.special")).toBeUndefined();
  });

  it("adds the flat Saturday surcharge, or the holiday one instead", () => {
    const saturday = calculatePrice(move({ scheduledDate: "2026-10-31" }), { rates, catalog, distanceKm: 0 });
    expect(amount(saturday, "line.saturday")).toBe("50.00");

    const holiday = calculatePrice(move({ scheduledDate: "2026-12-26" }), { rates, catalog, distanceKm: 0, holidayDates: new Set(["2026-12-26"]) });
    expect(amount(holiday, "line.holiday_surcharge")).toBe("60.00");
    expect(amount(holiday, "line.saturday")).toBeUndefined();
  });

  it("adds the service zone's travel surcharge before the discount", () => {
    const zoned = calculatePrice(move({ discountCode: "TEN" }), {
      rates,
      catalog,
      distanceKm: 0,
      zoneSurcharge: { name: "Aachen", amount: 3500 },
      discount: { code: "TEN", kind: "percentage", value: 10 },
    });
    const keys = zoned.lines.map((line) => line.key);
    expect(amount(zoned, "line.zone_surcharge")).toBe("35.00");
    expect(zoned.lines.find((line) => line.key === "line.zone_surcharge")?.params).toEqual({ zone: "Aachen" });
    expect(keys.indexOf("line.zone_surcharge")).toBeLessThan(keys.indexOf("line.discount_code"));

    const free = calculatePrice(move(), { rates, catalog, distanceKm: 0, zoneSurcharge: { name: "Köln", amount: 0 } });
    expect(amount(free, "line.zone_surcharge")).toBeUndefined();
  });

  it("prices a moving clean by area and windows, and tops it up to the minimum", () => {
    const small = calculatePrice(
      { ...move(), serviceType: "cleaning", destinationAddress: undefined, areaSqm: 10, windows: { standard: 2, large: 1 } },
      { rates, catalog, distanceKm: 0 },
    );
    expect(amount(small, "line.cleaning_area")).toBe("49.00");
    expect(amount(small, "line.windows_standard")).toBe("22.00");
    // Large glass is priced 0 → left for the team, not a line.
    expect(amount(small, "line.windows_large")).toBeUndefined();
    expect(amount(small, "line.minimum_order_value")).toBe("28.00");
    expect(small.totalGross).toBe("99.00");
  });

  it("applies a discount code to the gross and never goes below zero", () => {
    const result = calculatePrice(move(), { rates, catalog, distanceKm: 42, discount: { code: "WILLKOMMEN10", kind: "percentage", value: 10 } });
    expect(amount(result, "line.discount_code")).toBe("-81.18");
    expect(result.totalGross).toBe("730.62");
  });

  it("leaves a clearance by area to the team", () => {
    expect(() => calculatePrice({ ...move(), serviceType: "disposal" }, { rates, catalog, distanceKm: 0 })).toThrow(PricingError);
  });
});
