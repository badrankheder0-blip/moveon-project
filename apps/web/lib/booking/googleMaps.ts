"use client";

import type { AddressCandidate } from "./lookups";

/**
 * Google Maps for the planner's address step.
 *
 * Switched on by `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: a browser key restricted
 * to the site's domains, with the Maps JavaScript API and the Geocoding API
 * enabled. Without one the planner keeps its own schematic map and typed
 * address search, so a missing key never blocks a booking.
 *
 * The script is loaded once, on demand, and only on the planner — a visitor
 * reading the homepage does not download Google's map bundle.
 *
 * There is no `@types/google.maps` in the workspace, so the few classes used
 * here are described below rather than typed as `any`.
 */

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export const googleMapsEnabled = KEY.trim().length > 0;

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

interface LatLng {
  lat(): number;
  lng(): number;
}

export interface GoogleMap {
  setCenter(point: LatLngLiteral): void;
  setZoom(zoom: number): void;
  getZoom(): number | undefined;
  fitBounds(bounds: unknown, padding?: number): void;
  addListener(event: string, handler: (event: { latLng?: LatLng }) => void): { remove(): void };
}

export interface GoogleMarker {
  setPosition(point: LatLngLiteral): void;
  setMap(map: GoogleMap | null): void;
  getPosition(): LatLng | null;
  addListener(event: string, handler: () => void): { remove(): void };
}

interface GeocoderResult {
  formatted_address: string;
  geometry: { location: LatLng };
  address_components: Array<{ long_name: string; short_name: string; types: string[] }>;
}

export interface GoogleMapsApi {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap;
  Marker: new (options: Record<string, unknown>) => GoogleMarker;
  Polyline: new (options: Record<string, unknown>) => { setMap(map: GoogleMap | null): void };
  LatLngBounds: new () => { extend(point: LatLngLiteral): void };
  Geocoder: new () => {
    geocode(request: Record<string, unknown>): Promise<{ results: GeocoderResult[] }>;
  };
  SymbolPath: { CIRCLE: number };
}

let loading: Promise<GoogleMapsApi> | null = null;

/**
 * Google reports a rejected key (wrong domain, API not enabled, billing off)
 * through a global callback after the script has loaded, then draws its own
 * error box over the map. Listening lets the planner say something useful
 * instead and point the customer back to the typed address field.
 */
let authFailed = false;
const authListeners = new Set<() => void>();

export function onGoogleMapsAuthFailure(listener: () => void): () => void {
  if (authFailed) listener();
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

/** Loads the Maps JavaScript API once per page, in the reader's language. */
export function loadGoogleMaps(locale: string): Promise<GoogleMapsApi> {
  if (!googleMapsEnabled) return Promise.reject(new Error("Google Maps is not configured."));

  const existing = (window as unknown as { google?: { maps?: GoogleMapsApi & { Map?: unknown } } }).google?.maps;
  if (existing?.Map) return Promise.resolve(existing);

  loading ??= new Promise<GoogleMapsApi>((resolve, reject) => {
    const callback = `__monMapsReady${Date.now()}`;
    const scope = window as unknown as Record<string, unknown>;

    scope.gm_authFailure = () => {
      authFailed = true;
      for (const listener of authListeners) listener();
    };

    scope[callback] = () => {
      delete scope[callback];
      resolve((window as unknown as { google: { maps: GoogleMapsApi } }).google.maps);
    };

    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js?" +
      new URLSearchParams({ key: KEY, v: "weekly", language: locale, region: "DE", loading: "async", callback }).toString();
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error("Google Maps could not be loaded."));
    };

    document.head.appendChild(script);
  });

  return loading;
}

/**
 * Turns a Google geocoder answer into the planner's address shape.
 *
 * NRW is read from the result's own state component rather than guessed from
 * the postcode, the same rule the server applies to its lookups.
 */
function toCandidate(result: GeocoderResult, pin?: LatLngLiteral): AddressCandidate {
  const part = (type: string, short = false) => {
    const found = result.address_components.find((component) => component.types.includes(type));
    return found ? (short ? found.short_name : found.long_name) : "";
  };

  const streetName = part("route");
  const houseNumber = part("street_number");
  const postcode = part("postal_code");
  const city = part("locality") || part("postal_town") || part("administrative_area_level_3");
  const state = part("administrative_area_level_1");
  const country = part("country", true);

  const line1 = [streetName, houseNumber].filter(Boolean).join(" ");
  const line2 = [postcode, city].filter(Boolean).join(" ");

  return {
    text: [line1, line2].filter(Boolean).join(", ") || result.formatted_address,
    line1: line1 || result.formatted_address,
    line2,
    streetName,
    houseNumber,
    postcode,
    city,
    // The customer's pin, not the building centroid: it marks their entrance.
    lat: pin?.lat ?? result.geometry.location.lat(),
    lng: pin?.lng ?? result.geometry.location.lng(),
    nrw: country === "DE" && (state === "Nordrhein-Westfalen" || state === "North Rhine-Westphalia" || part("administrative_area_level_1", true) === "NRW"),
    manual: false,
  };
}

/** Runs a geocoder request; "nothing here" is an empty list, not an error. */
async function geocode(maps: GoogleMapsApi, request: Record<string, unknown>): Promise<GeocoderResult[]> {
  try {
    return (await new maps.Geocoder().geocode(request)).results;
  } catch (error) {
    if (String((error as { code?: string })?.code ?? error).includes("ZERO_RESULTS")) return [];
    throw error;
  }
}

/** The address under a pin, or null when Google has no street address there. */
export async function addressAt(maps: GoogleMapsApi, point: LatLngLiteral): Promise<AddressCandidate | null> {
  const results = await geocode(maps, { location: point });
  const best = results.find((result) =>
    result.address_components.some((component) => component.types.includes("route")),
  );
  return best ? toCandidate(best, point) : null;
}

/** The first match for typed text, biased to Germany. */
export async function findAddress(maps: GoogleMapsApi, text: string): Promise<AddressCandidate | null> {
  const results = await geocode(maps, { address: text, region: "de", componentRestrictions: { country: "DE" } });
  return results[0] ? toCandidate(results[0]) : null;
}

/** The middle of North Rhine-Westphalia, at a zoom that shows the state. */
export const NRW_CENTER: LatLngLiteral = { lat: 51.43, lng: 7.66 };
