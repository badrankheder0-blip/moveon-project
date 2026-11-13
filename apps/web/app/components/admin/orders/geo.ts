/**
 * Where things are on the live map, until vehicles report GPS: a fixed table
 * of the NRW cities the business serves, the depot in Köln-Ossendorf, and the
 * prototype's simulation of a vehicle driving its order's route on an
 * eight-minute loop.
 */

export type LatLng = [number, number];

export const DEPOT: LatLng = [50.9806, 6.8985];

const CITIES: Record<string, LatLng> = {
  köln: [50.9375, 6.9603],
  düsseldorf: [51.2277, 6.7735],
  bonn: [50.7374, 7.0982],
  essen: [51.4556, 7.0116],
  dortmund: [51.5136, 7.4653],
  duisburg: [51.4344, 6.7623],
  leverkusen: [51.0459, 6.9853],
  bochum: [51.4818, 7.2162],
  wuppertal: [51.2562, 7.1508],
  münster: [51.9607, 7.6261],
  mönchengladbach: [51.1805, 6.4428],
  gelsenkirchen: [51.5177, 7.0857],
  aachen: [50.7753, 6.0839],
  krefeld: [51.3388, 6.5853],
  bielefeld: [52.0302, 8.5325],
  neuss: [51.2042, 6.6879],
  oberhausen: [51.4963, 6.8638],
  hagen: [51.3671, 7.4633],
  hamm: [51.6739, 7.815],
  solingen: [51.1652, 7.0671],
  paderborn: [51.7189, 8.7575],
  siegen: [50.8748, 8.0243],
  "bergisch gladbach": [50.9918, 7.1367],
  recklinghausen: [51.6141, 7.1979],
  remscheid: [51.1787, 7.1897],
  herne: [51.5369, 7.2009],
};

/** The city behind a two-digit postcode prefix. */
const POSTCODES: Record<string, string> = {
  "40": "düsseldorf", "41": "mönchengladbach", "42": "wuppertal", "44": "dortmund", "45": "essen", "46": "oberhausen",
  "47": "duisburg", "48": "münster", "50": "köln", "51": "leverkusen", "52": "aachen", "53": "bonn", "57": "siegen",
  "58": "hagen", "59": "hamm", "32": "bielefeld", "33": "bielefeld",
};

/**
 * A stable point for an address: its city's centre, nudged by a hash of the
 * address so two jobs in the same city do not sit on top of each other.
 */
export function geoOf(address: string | null | undefined): LatLng {
  const text = String(address ?? "");
  const low = text.toLowerCase();
  let key = Object.keys(CITIES).find((city) => low.includes(city));
  if (!key) {
    const postcode = text.match(/\b(\d{5})\b/);
    if (postcode) key = POSTCODES[postcode[1]!.slice(0, 2)];
  }
  const centre = CITIES[key ?? "köln"] ?? CITIES.köln!;
  let hash = 7;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return [centre[0] + ((hash & 1023) / 1023 - 0.5) * 0.035, centre[1] + (((hash >> 10) & 1023) / 1023 - 0.5) * 0.055];
}

/** Metres between two points. */
export function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r;
  const dLng = (b[1] - a[1]) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export interface Route {
  pts: LatLng[];
  /** Metres. */
  dist: number;
  /** Seconds. */
  dur: number;
}

/** A straight leg: a quarter longer than the crow flies, at 45 km/h. */
export function straightRoute(a: LatLng, b: LatLng): Route {
  const dist = haversine(a, b) * 1.25;
  return { pts: [a, b], dist, dur: dist / 12.5 };
}

/** The point a fraction of the way along a polyline. */
export function along(pts: LatLng[], fraction: number): LatLng {
  if (pts.length < 2) return pts[0] ?? DEPOT;
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const d = haversine(pts[i - 1]!, pts[i]!);
    seg.push(d);
    total += d;
  }
  let t = Math.max(0, Math.min(1, fraction)) * total;
  for (let i = 0; i < seg.length; i += 1) {
    if (t <= seg[i]! || i === seg.length - 1) {
      const q = seg[i] ? Math.min(1, t / seg[i]!) : 0;
      return [pts[i]![0] + (pts[i + 1]![0] - pts[i]![0]) * q, pts[i]![1] + (pts[i + 1]![1] - pts[i]![1]) * q];
    }
    t -= seg[i]!;
  }
  return pts[pts.length - 1]!;
}

export type Phase = "toA" | "load" | "toB" | "unload" | "back" | "idle";

const PHASES: [Phase, number, number][] = [
  ["toA", 0, 0.24],
  ["load", 0.24, 0.34],
  ["toB", 0.34, 0.64],
  ["unload", 0.64, 0.74],
  ["back", 0.74, 0.92],
  ["idle", 0.92, 1],
];

export const CYCLE_MS = 480_000;

export interface SimState {
  phase: Phase;
  pos: LatLng;
  /** How far through the current phase, 0–1. */
  within: number;
  /** How far through the whole loop, 0–1. */
  loop: number;
  route: Route | null;
}

/**
 * Where a vehicle is now: depot → pickup → load → delivery → unload → depot,
 * each vehicle offset in the loop so they do not move in lockstep.
 */
export function simulate(index: number, a: LatLng | null, b: LatLng | null, now: number, routeOf: (from: LatLng, to: LatLng) => Route): SimState {
  if (!a || !b) return { phase: "idle", pos: DEPOT, within: 0, loop: 0.95, route: null };
  const loop = (now / CYCLE_MS + index * 0.31) % 1;
  const [phase, start, end] = PHASES.find(([, s, e]) => loop >= s && loop < e) ?? PHASES[5]!;
  const within = (loop - start) / (end - start);
  const legs: Partial<Record<Phase, [LatLng, LatLng]>> = { toA: [DEPOT, a], toB: [a, b], back: [b, DEPOT] };
  const leg = legs[phase];
  if (leg) {
    const route = routeOf(leg[0], leg[1]);
    return { phase, pos: along(route.pts, within), within, loop, route };
  }
  return { phase, pos: phase === "load" ? a : phase === "unload" ? b : DEPOT, within, loop, route: null };
}
