import { db, schema } from "@mon/db";
import { asc, count, eq } from "drizzle-orm";

import { recordAudit } from "../audit/audit.service.js";

const { serviceZones, auditLogs } = schema;

export type ZoneRow = typeof serviceZones.$inferSelect;

/** The audit entity every zone change is recorded under. */
export const ZONE_ENTITY = "service_zone";

/**
 * The four areas the admin prototype starts with — Köln & Bonn,
 * Düsseldorf & Niederrhein, the Ruhr and Aachen — with its corners, postcode
 * prefixes and travel surcharges.
 */
const DEFAULT_ZONES: Array<Omit<typeof serviceZones.$inferInsert, "id">> = [
  {
    name: "Köln & Bonn",
    colour: "#d71635",
    surcharge: "0",
    postcodePrefixes: ["50", "51", "53"],
    polygon: [[51.12, 6.72], [51.12, 7.22], [50.86, 7.36], [50.62, 7.28], [50.62, 6.9], [50.86, 6.66]],
    sortOrder: 1,
  },
  {
    name: "Düsseldorf & Niederrhein",
    colour: "#252b28",
    surcharge: "0",
    postcodePrefixes: ["40", "41", "47"],
    polygon: [[51.44, 6.42], [51.44, 6.98], [51.13, 7.12], [51.12, 6.72], [51.1, 6.38]],
    sortOrder: 2,
  },
  {
    name: "Ruhrgebiet",
    colour: "#ffcb08",
    surcharge: "25",
    postcodePrefixes: ["44", "45", "46", "58"],
    polygon: [[51.64, 6.72], [51.66, 7.72], [51.34, 7.72], [51.3, 7.1], [51.44, 6.98], [51.44, 6.72]],
    sortOrder: 3,
  },
  {
    name: "Aachen",
    colour: "#8a8f87",
    surcharge: "35",
    postcodePrefixes: ["52"],
    polygon: [[50.95, 5.98], [50.95, 6.42], [50.62, 6.42], [50.6, 6.02]],
    sortOrder: 4,
  },
];

/**
 * Puts the default zones in place once, the first time zones are read.
 *
 * Only on a database where zones were never managed: once any zone change has
 * been recorded, an empty table means the office deleted them all, and they
 * must not come back on the next request.
 */
let defaultsReady: Promise<void> | null = null;

export function ensureDefaultZones(): Promise<void> {
  defaultsReady ??= (async () => {
    const [{ value: existing } = { value: 0 }] = await db.select({ value: count() }).from(serviceZones);
    if (existing > 0) return;

    const [managed] = await db.select({ id: auditLogs.id }).from(auditLogs).where(eq(auditLogs.entityType, ZONE_ENTITY)).limit(1);
    if (managed) return;

    await db.transaction(async (tx) => {
      await tx.insert(serviceZones).values(DEFAULT_ZONES);
      await recordAudit({ actor: { isSystem: true }, action: "zone.defaults_created", entityType: ZONE_ENTITY, changes: { count: DEFAULT_ZONES.length } }, tx);
    });
  })().catch((error: unknown) => {
    defaultsReady = null;
    throw error;
  });
  return defaultsReady;
}

export async function listZones(): Promise<ZoneRow[]> {
  await ensureDefaultZones();
  return db.select().from(serviceZones).orderBy(asc(serviceZones.sortOrder), asc(serviceZones.createdAt));
}

export function zoneDto(row: ZoneRow) {
  return {
    id: row.id,
    name: row.name,
    colour: row.colour,
    polygon: row.polygon,
    postcodePrefixes: row.postcodePrefixes,
    surcharge: row.surcharge,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

/** Ray casting over [lat, lng] corners. */
export function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i]!;
    const [yj, xj] = polygon[j]!;
    if (yi > point[0] !== yj > point[0] && point[1] < ((xj - xi) * (point[0] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * The active zone an address falls in.
 *
 * By postcode first, and the longest matching prefix wins, so a zone for
 * "441" can sit inside one for "44". Without a postcode match, a point (the
 * address's coordinates) is tested against the drawn polygons, as the admin
 * prototype's checker does for a city.
 */
export async function matchZone(postcode: string | undefined, point: [number, number] | undefined): Promise<ZoneRow | null> {
  const zones = (await listZones()).filter((zone) => zone.isActive);
  const digits = (postcode ?? "").replace(/\D/g, "");

  if (digits) {
    let best: { zone: ZoneRow; length: number } | null = null;
    for (const zone of zones) {
      for (const prefix of zone.postcodePrefixes) {
        const clean = prefix.replace(/\D/g, "");
        if (clean && digits.startsWith(clean) && (!best || clean.length > best.length)) best = { zone, length: clean.length };
      }
    }
    if (best) return best.zone;
  }

  if (point) return zones.find((zone) => pointInPolygon(point, zone.polygon)) ?? null;
  return null;
}
