"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api";

import type { Team, Vehicle } from "./types";

/**
 * The teams and vehicles an order can be assigned to.
 *
 * Settings owns them and serves them at `/api/fleet`. Should that not answer
 * (not deployed yet, or the role may not read it), the orders API's own list
 * of the active rows is used instead, so the selects never come up empty
 * while the table has rows; if neither answers, they are simply empty.
 */
export function useFleet() {
  const { sdk } = useApi();

  return useQuery({
    queryKey: ["admin", "orders", "fleet"],
    staleTime: 60_000,
    queryFn: async () => {
      const [teams, vehicles] = await Promise.all([
        sdk.http.get<{ teams: Team[] }>("/api/fleet/teams").then((r) => r.teams).catch(() => null),
        sdk.http.get<{ vehicles: Vehicle[] }>("/api/fleet/vehicles").then((r) => r.vehicles).catch(() => null),
      ]);

      let fallback: { teams: Team[]; vehicles: Vehicle[] } | null = null;
      if (!teams || !vehicles) {
        fallback = await sdk.http.get<{ teams: Team[]; vehicles: Vehicle[] }>("/api/orders/assignable").catch(() => ({ teams: [], vehicles: [] }));
      }

      const order = <T extends { sortOrder?: number; name: string; isActive?: boolean }>(list: T[]) =>
        list.filter((row) => row.isActive !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));

      return {
        teams: order(teams ?? fallback?.teams ?? []),
        vehicles: order(vehicles ?? fallback?.vehicles ?? []),
      };
    },
  });
}

/** "Team A · Köln", as the prototype names a team. */
export function teamLabel(team: { name: string; area?: string | null } | null | undefined): string {
  return team ? [team.name, team.area].filter(Boolean).join(" · ") : "";
}

/** "Small Truck · 19 m³". */
export function vehicleLabel(vehicle: { name: string; capacityM3?: string | number | null } | null | undefined): string {
  if (!vehicle) return "";
  const m3 = Number(vehicle.capacityM3);
  return m3 > 0 ? `${vehicle.name} · ${Number.isInteger(m3) ? m3 : m3.toFixed(1).replace(/\.0$/, "")} m³` : vehicle.name;
}
