import { env } from "@mon/config";

import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { redis } from "../../lib/redis.js";

/**
 * Server-side geocoding.
 *
 * The legacy app called Nominatim directly from every visitor's browser on
 * each keystroke: no API key, no identifying User-Agent, no caching and no
 * rate limiting. Nominatim's policy allows roughly one request per second and
 * blocks traffic like that — at which point address entry and distance
 * calculation both stop working for everyone.
 *
 * Proxying it here gives one identified caller, a shared cache, and a rate
 * limit we control. It also means the client cannot assert a shorter distance
 * to lower its own price.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // addresses do not move
const REQUEST_TIMEOUT_MS = 5000;

/** The company only operates with an origin in North Rhine-Westphalia. */
const SERVICE_AREA_STATE = "Nordrhein-Westfalen";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  state: string;
  country: string;
  displayName: string;
}

/**
 * Rewrites the ASCII spellings of German vowels back into the real characters.
 *
 * Nominatim matches "Düsseldorf" and fails on "Duesseldorf", and "Straße" and
 * fails on "Strasse" — which are precisely how somebody types their own address
 * on a keyboard without umlauts. That is most of the customers this site is
 * translated into Arabic and Turkish for, and the failure is total: no price,
 * no booking, and an error message that gives them nothing to try.
 *
 * Only used as a second attempt, never the first: "Strasse" is also a real
 * surname, and rewriting every query would turn a search that would have
 * succeeded into one that does not.
 */
function germanize(query: string): string {
  return query
    .replace(/\bstrasse\b/gi, "straße")
    .replace(/strasse/gi, "straße")
    .replace(/ue/g, "ü")
    .replace(/oe/g, "ö")
    .replace(/ae/g, "ä")
    .replace(/Ue/g, "Ü")
    .replace(/Oe/g, "Ö")
    .replace(/Ae/g, "Ä");
}

export async function geocode(query: string): Promise<GeocodeResult> {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  const cacheKey = `geo:${normalized}`;

  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    return JSON.parse(cached) as GeocodeResult;
  }

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "de");
  url.searchParams.set("q", query);

  const response = await fetchWithTimeout(url, {
    // Nominatim's policy requires an identifying User-Agent with contact info.
    headers: { "User-Agent": env.GEOCODING_USER_AGENT, "Accept-Language": "de" },
  });

  if (!response.ok) {
    logger.error({ status: response.status }, "Geocoding provider returned an error");
    throw new AppError("SERVICE_UNAVAILABLE", 503, "Address lookup is unavailable right now.");
  }

  const payload = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: { state?: string; country?: string };
  }>;

  let first = payload[0];

  if (!first) {
    // Second attempt with umlauts restored. Skipped when it would change
    // nothing, so a genuinely unknown address still fails in one round trip
    // rather than two.
    const retry = germanize(query);

    if (retry !== query) {
      const retryUrl = new URL(url);
      retryUrl.searchParams.set("q", retry);

      const retryResponse = await fetchWithTimeout(retryUrl, {
        headers: { "User-Agent": env.GEOCODING_USER_AGENT, "Accept-Language": "de" },
      });

      if (retryResponse.ok) {
        const retryPayload = (await retryResponse.json()) as typeof payload;
        first = retryPayload[0];
      }
    }
  }

  if (!first) {
    // Says what to do, not just that something went wrong. The previous message
    // left a customer with a correctly spelled address and no next step — and
    // the two real causes, an unusual spelling and an address outside Germany,
    // both have an answer the customer can act on.
    throw AppError.unprocessable(
      "We could not find that address. Please check the spelling, or try just the postcode and city. We currently only serve addresses in Germany.",
    );
  }

  const result: GeocodeResult = {
    latitude: Number.parseFloat(first.lat),
    longitude: Number.parseFloat(first.lon),
    state: first.address?.state ?? "",
    country: first.address?.country ?? "",
    displayName: first.display_name,
  };

  await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SECONDS).catch(() => undefined);

  return result;
}

/**
 * One address the booking planner can offer the customer to pick.
 *
 * Split into the parts the planner shows (`line1` is street and number,
 * `line2` postcode and town) and the parts the property step asks about.
 * `nrw` is decided here, not in the browser, for the same reason the distance
 * is: the service area is a business rule and the client is not trusted with
 * business rules.
 */
export interface AddressCandidate {
  text: string;
  line1: string;
  line2: string;
  streetName: string;
  houseNumber: string;
  postcode: string;
  city: string;
  lat: number;
  lng: number;
  nrw: boolean;
}

interface NominatimPlace {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string | undefined>;
}

function toCandidate(place: NominatimPlace): AddressCandidate {
  const a = place.address ?? {};
  const streetName = a.road ?? a.pedestrian ?? a.residential ?? a.square ?? a.path ?? "";
  const houseNumber = a.house_number ?? "";
  const street = [streetName, houseNumber].filter(Boolean).join(" ");
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? "";
  const postcode = a.postcode ?? "";
  const line2 = [postcode, city].filter(Boolean).join(" ");

  return {
    text: [street, line2].filter(Boolean).join(", ") || place.display_name,
    line1: street || place.name || city,
    line2,
    streetName,
    houseNumber,
    postcode,
    city,
    lat: Number.parseFloat(place.lat),
    lng: Number.parseFloat(place.lon),
    nrw:
      a.country_code === "de" &&
      ((a.state ?? "").includes(SERVICE_AREA_STATE) || a["ISO3166-2-lvl4"] === "DE-NW"),
  };
}

/**
 * Address suggestions for what the customer has typed.
 *
 * The planner debounces and only asks after three characters, but the cache is
 * what actually keeps this inside Nominatim's policy: the same street typed by
 * a hundred customers is one upstream request.
 */
export async function searchAddresses(query: string): Promise<AddressCandidate[]> {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  const cacheKey = `geo:search:${normalized}`;

  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return JSON.parse(cached) as AddressCandidate[];

  const lookup = async (text: string) => {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "6");
    url.searchParams.set("countrycodes", "de");
    url.searchParams.set("q", text);

    const response = await fetchWithTimeout(url, {
      headers: { "User-Agent": env.GEOCODING_USER_AGENT, "Accept-Language": "de" },
    });

    if (!response.ok) {
      logger.error({ status: response.status }, "Geocoding provider returned an error");
      throw new AppError("SERVICE_UNAVAILABLE", 503, "Address lookup is unavailable right now.");
    }

    return (await response.json()) as NominatimPlace[];
  };

  let places = await lookup(query);

  // The same second chance `geocode` gives a keyboard without umlauts.
  if (places.length === 0) {
    const retry = germanize(query);
    if (retry !== query) places = await lookup(retry);
  }

  // Inside the service area first: an address in NRW is the one the customer
  // can actually book, and it is usually the one they meant.
  const candidates = places
    .map(toCandidate)
    .filter((candidate) => Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng))
    // A building and its entrance come back as two places with one address.
    .filter((candidate, index, all) => all.findIndex((other) => other.text === candidate.text) === index)
    .sort((a, b) => Number(b.nrw) - Number(a.nrw));

  // An empty answer is not cached: it is as often a half-typed street as a
  // place that does not exist, and a month of "no results" for it would be
  // a month of customers who cannot enter their address.
  if (candidates.length > 0) {
    await redis
      .set(cacheKey, JSON.stringify(candidates), "EX", CACHE_TTL_SECONDS)
      .catch(() => undefined);
  }

  return candidates;
}

/** The address under a point the customer placed on the map. */
export async function reverseAddress(lat: number, lng: number): Promise<AddressCandidate> {
  // Five decimals is about a metre: finer pins are the same building.
  const cacheKey = `geo:reverse:${lat.toFixed(5)},${lng.toFixed(5)}`;

  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return JSON.parse(cached) as AddressCandidate;

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("lat", lat.toFixed(6));
  url.searchParams.set("lon", lng.toFixed(6));

  const response = await fetchWithTimeout(url, {
    headers: { "User-Agent": env.GEOCODING_USER_AGENT, "Accept-Language": "de" },
  });

  if (!response.ok) {
    logger.error({ status: response.status }, "Geocoding provider returned an error");
    throw new AppError("SERVICE_UNAVAILABLE", 503, "Address lookup is unavailable right now.");
  }

  const place = (await response.json()) as NominatimPlace & { error?: string };

  if (place.error) {
    throw AppError.unprocessable(
      "No address was found at this point. Search for the street, or place the pin on a building.",
    );
  }

  // The pin, not the building centroid Nominatim answers with: the customer
  // placed it on their entrance.
  const candidate = { ...toCandidate(place), lat, lng };

  await redis
    .set(cacheKey, JSON.stringify(candidate), "EX", CACHE_TTL_SECONDS)
    .catch(() => undefined);

  return candidate;
}

/** Enforced server-side; the legacy check was a string match in the browser. */
export function assertWithinServiceArea(result: GeocodeResult): void {
  if (!result.state.includes(SERVICE_AREA_STATE)) {
    throw AppError.unprocessable(
      `The starting address must be in ${SERVICE_AREA_STATE}.`,
    );
  }
}

/**
 * Distance between two addresses, in road kilometres — what a move's travel
 * line is priced on (`per_km` up to `long_distance_from_km`, then
 * `per_km_long_distance`, both set in the dashboard).
 *
 * With `GOOGLE_MAPS_SERVER_KEY` it is the driven distance from Google's Routes
 * API. Without one, or when Google does not answer, it falls back to the
 * great-circle distance times a road factor. That fallback under-reports real
 * driving distance by roughly 20–30% on winding routes, so a production site
 * that charges per kilometre should have the key set; the fallback exists so a
 * Google outage slows nobody's booking down.
 */
const ROAD_DISTANCE_MULTIPLIER = 1.25;
const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

export async function estimateDistanceKm(origin: string, destination: string): Promise<number> {
  const [from, to] = await Promise.all([geocode(origin), geocode(destination)]);

  assertWithinServiceArea(from);

  if (env.GOOGLE_MAPS_SERVER_KEY) {
    try {
      return await drivingDistanceKm(from, to, env.GOOGLE_MAPS_SERVER_KEY);
    } catch (error) {
      // Logged, not thrown: a quote with an estimated distance is better than
      // no quote, and the log is how the office learns the key needs looking at.
      logger.warn({ err: error }, "Driving distance unavailable; using the straight-line estimate");
    }
  }

  const straightLine = haversineKm(
    from.latitude,
    from.longitude,
    to.latitude,
    to.longitude,
  );

  return Math.round(straightLine * ROAD_DISTANCE_MULTIPLIER * 100) / 100;
}

/**
 * The driven distance between two geocoded points, from Google's Routes API.
 *
 * Asked by coordinates rather than by the typed text, so the route starts at
 * the same place the service-area check just approved. Cached like the
 * geocoding itself: the roads between two front doors rarely change.
 */
async function drivingDistanceKm(from: GeocodeResult, to: GeocodeResult, key: string): Promise<number> {
  const point = (result: GeocodeResult) => `${result.latitude.toFixed(5)},${result.longitude.toFixed(5)}`;
  const cacheKey = `route:${point(from)}:${point(to)}`;

  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return Number.parseFloat(cached);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const location = (result: GeocodeResult) => ({
      location: { latLng: { latitude: result.latitude, longitude: result.longitude } },
    });

    const response = await fetch(ROUTES_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        // Only the distance is billed for and read.
        "X-Goog-FieldMask": "routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: location(from),
        destination: location(to),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        regionCode: "de",
      }),
    });

    if (!response.ok) {
      throw new Error(`Routes API answered ${response.status}`);
    }

    const payload = (await response.json()) as { routes?: Array<{ distanceMeters?: number }> };
    const meters = payload.routes?.[0]?.distanceMeters;

    if (typeof meters !== "number" || !Number.isFinite(meters)) {
      throw new Error("Routes API returned no route");
    }

    const km = Math.round((meters / 1000) * 100) / 100;
    await redis.set(cacheKey, String(km), "EX", CACHE_TTL_SECONDS).catch(() => undefined);

    return km;
  } finally {
    clearTimeout(timeout);
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const EARTH_RADIUS_KM = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchWithTimeout(url: URL, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError("SERVICE_UNAVAILABLE", 503, "Address lookup timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
