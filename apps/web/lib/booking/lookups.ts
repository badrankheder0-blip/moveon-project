"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api";
import { REFERENCE_POLL_MS } from "@/lib/live/config";
import type { PlanAddress } from "./plan";

/**
 * The planner's reads from the API: address lookup and the furniture catalog.
 *
 * Both go through our own endpoints. The prototype called Nominatim and the
 * OSRM demo router straight from the browser, which the geocoding service was
 * written to stop; the catalog is the one the dashboard edits and the pricing
 * engine prices, so an item the customer adds is an item the quote knows.
 */

export interface AddressCandidate extends PlanAddress {
  line1: string;
  line2: string;
  lat: number;
  lng: number;
}

export function useAddressLookup() {
  const { sdk } = useApi();

  return {
    search: async (query: string) =>
      (await sdk.http.get<{ results: AddressCandidate[] }>("/api/geocoding/search", { q: query })).results,
    reverse: async (lat: number, lng: number) =>
      (
        await sdk.http.get<{ result: AddressCandidate }>("/api/geocoding/reverse", {
          lat: lat.toFixed(6),
          lng: lng.toFixed(6),
        })
      ).result,
  };
}

export interface CatalogEntry {
  id: string;
  category: string;
  name: string;
  /** Decimal strings, as the API returns money. Only compared with zero here. */
  assemblyPrice: string;
  disassemblyPrice: string;
  volumeM3: string | null;
}

export function useFurnitureCatalog() {
  const { sdk } = useApi();

  return useQuery({
    queryKey: ["catalog", "furniture", "planner"],
    queryFn: async () =>
      (await sdk.http.get<{ items: CatalogEntry[] }>("/api/catalog", { kind: "furniture" })).items,
    staleTime: REFERENCE_POLL_MS,
  });
}

/** An item that needs extra handling on a move — a piano, a safe, a new one. */
export interface SpecialEntry {
  id: string;
  /** What a quote records it as, and what its breakdown line is built from. */
  code: string;
  name: string;
  price: string;
}

/**
 * The special items the office offers.
 *
 * Read from the catalogue rather than a list in the code: these are rows the
 * dashboard adds to and renames, so a piano and an item invented this morning
 * reach the planner the same way.
 */
export function useSpecialCatalog() {
  const { sdk } = useApi();

  return useQuery({
    queryKey: ["catalog", "special", "planner"],
    queryFn: async () => {
      const { items } = await sdk.http.get<{ items: (SpecialEntry & { code: string | null })[] }>("/api/catalog", { kind: "special" });
      // A row without a code cannot be quoted, so it is not offered.
      return items.filter((item): item is SpecialEntry => Boolean(item.code));
    },
    staleTime: REFERENCE_POLL_MS,
  });
}

/** Whether the catalog prices taking this item apart or putting it together. */
export const canAssemble = (entry: CatalogEntry) =>
  Number.parseFloat(entry.assemblyPrice) > 0 || Number.parseFloat(entry.disassemblyPrice) > 0;

export const entryVolume = (entry: CatalogEntry) => {
  const volume = entry.volumeM3 === null ? 0 : Number.parseFloat(entry.volumeM3);
  return Number.isFinite(volume) ? volume : 0;
};
