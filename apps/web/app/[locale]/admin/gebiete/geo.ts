/**
 * The admin prototype's NRW reference points: the cities its zone checker and
 * coverage list know, and the postcode areas it maps to a city. Enough to
 * test a zone from the dashboard; the API's own match uses the postcode
 * prefixes and, failing those, an address's real coordinates.
 */

export type Point = [number, number];

export const CITIES: Record<string, Point> = {
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

/** The first two postcode digits, as the city they mostly belong to. */
export const POSTCODE_CITY: Record<string, string> = {
  "40": "düsseldorf",
  "41": "mönchengladbach",
  "42": "wuppertal",
  "44": "dortmund",
  "45": "essen",
  "46": "oberhausen",
  "47": "duisburg",
  "48": "münster",
  "50": "köln",
  "51": "leverkusen",
  "52": "aachen",
  "53": "bonn",
  "57": "siegen",
  "58": "hagen",
  "59": "hamm",
  "32": "bielefeld",
  "33": "bielefeld",
};

export const cityName = (key: string) =>
  key
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/** Ray casting over [lat, lng] corners. */
export function inside(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i]!;
    const [yj, xj] = polygon[j]!;
    if (yi > point[0] !== yj > point[0] && point[1] < ((xj - xi) * (point[0] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** The polygon's area in km², flat-earth at its mean latitude (fine at this scale). */
export function areaKm2(points: Point[]): number {
  if (points.length < 3) return 0;
  const lat = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const k = Math.cos((lat * Math.PI) / 180) * 111.32;
  let area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    area += points[j]![1] * k * (points[i]![0] * 110.57) - points[i]![1] * k * (points[j]![0] * 110.57);
  }
  return Math.round(Math.abs(area / 2));
}
