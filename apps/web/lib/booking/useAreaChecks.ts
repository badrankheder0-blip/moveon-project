"use client";

import { useEffect, useRef, type Dispatch } from "react";

import { useApi } from "@/lib/api";

import { usedAddressKeys, validAddress, type AreaCheck, type Plan, type PlanAction } from "./plan";

/** "Königsallee 1, 40212 Düsseldorf" → "40212": the last five-digit group, as the street number comes first. */
const postcodeIn = (text: string) => text.match(/\b\d{5}\b/g)?.at(-1);

/**
 * Checks each address the plan uses against the office's service zones
 * (`GET /api/zones/match`) and writes the answer onto the address, where
 * `validateStep` reads it — when the office accepts addresses only inside
 * them (Settings → Company).
 *
 * By postcode first, as the zones are drawn, then by the address's position.
 * A failed check is recorded as "error", which holds nobody back: the office
 * asked to keep out addresses it does not serve, not customers whose
 * connection dropped.
 */
export function useAreaChecks(plan: Plan, dispatch: Dispatch<PlanAction>, enabled: boolean) {
  const { sdk } = useApi();
  const pending = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) return;

    for (const key of usedAddressKeys(plan)) {
      const address = plan.addresses[key];
      if (!validAddress(address) || address.area) continue;

      const ticket = `${key}|${address.text}`;
      if (pending.current.has(ticket)) continue;
      pending.current.add(ticket);

      const postcode = address.postcode?.replace(/\D/g, "") || postcodeIn(address.text);
      const point = typeof address.lat === "number" && typeof address.lng === "number" ? { lat: address.lat, lng: address.lng } : null;

      const settle = (area: AreaCheck) => {
        pending.current.delete(ticket);
        dispatch({
          type: "patch",
          patch: (current) => {
            const now = current.addresses[key];
            // Only if the customer has not changed the address since.
            if (!now || now.text !== address.text) return {};
            return { addresses: { ...current.addresses, [key]: { ...now, area } } };
          },
        });
      };

      if (!postcode && !point) {
        settle("nopostcode");
        continue;
      }

      sdk.http
        .get<{ zone: { id: string } | null }>("/api/zones/match", {
          ...(postcode ? { postcode } : {}),
          ...(point ? { lat: point.lat, lng: point.lng } : {}),
        })
        .then((response) => settle(response.zone ? "inside" : "outside"))
        .catch(() => settle("error"));
    }
  }, [plan, dispatch, enabled, sdk]);
}
