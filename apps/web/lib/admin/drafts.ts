"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { useApi } from "@/lib/api";

/**
 * Configuration drafts (the API's `/api/admin/config`).
 *
 * A settings screen reads its live values as usual and overlays the drafts
 * of its domain on top: `value(ref, live)` is what the field shows,
 * `edited(ref)` marks it yellow, `set(ref, value)` stores a draft and
 * `revert(ref)` drops it. Nothing reaches the website until the frame's
 * "Save & publish" bar publishes every draft at once.
 */

export interface DraftSummary {
  count: number;
  byDomain: Record<string, number>;
  lastPublishedAt: string | null;
}

const SUMMARY_KEY = ["admin", "config", "summary"] as const;

export function useDraftSummary(enabled = true) {
  const { sdk } = useApi();
  return useQuery({
    queryKey: SUMMARY_KEY,
    queryFn: () => sdk.http.get<DraftSummary>("/api/admin/config/summary"),
    enabled,
    refetchInterval: 30_000,
  });
}

export function useDrafts(domain: string) {
  const { sdk } = useApi();
  const client = useQueryClient();
  const key = ["admin", "config", "drafts", domain];

  const query = useQuery({
    queryKey: key,
    queryFn: () => sdk.http.get<{ drafts: { ref: string; value: unknown }[] }>(`/api/admin/config/drafts/${encodeURIComponent(domain)}`),
  });

  const map = useMemo(() => new Map((query.data?.drafts ?? []).map((row) => [row.ref, row.value])), [query.data]);

  const refresh = useCallback(async () => {
    await Promise.all([client.invalidateQueries({ queryKey: key }), client.invalidateQueries({ queryKey: SUMMARY_KEY })]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, domain]);

  const set = useCallback(
    async (ref: string, value: unknown) => {
      await sdk.http.post(`/api/admin/config/drafts/${encodeURIComponent(domain)}`, { ref, value });
      await refresh();
    },
    [sdk, domain, refresh],
  );

  const revert = useCallback(
    async (ref: string) => {
      await sdk.http.delete(`/api/admin/config/drafts/${encodeURIComponent(domain)}/${encodeURIComponent(ref)}`);
      await refresh();
    },
    [sdk, domain, refresh],
  );

  return {
    loading: query.isLoading,
    drafts: map,
    edited: (ref: string) => map.has(ref),
    value: <T,>(ref: string, live: T): T => (map.has(ref) ? (map.get(ref) as T) : live),
    set,
    revert,
  };
}

/** "Discard" and "Save & publish", for the frame's bar. */
export function usePublishing() {
  const { sdk } = useApi();
  const client = useQueryClient();

  const after = () => client.invalidateQueries({ queryKey: ["admin", "config"] }).then(() => client.invalidateQueries());

  const publish = useMutation({
    mutationFn: () => sdk.http.post<{ published: number }>("/api/admin/config/publish", {}),
    onSuccess: after,
  });
  const discard = useMutation({
    mutationFn: () => sdk.http.delete("/api/admin/config/drafts"),
    onSuccess: after,
  });

  return { publish, discard };
}
