"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { useDrafts } from "@/lib/admin/drafts";
import { ApiError, useApi } from "@/lib/api";

/**
 * The website's copy and pictures as the dashboard edits them: every
 * `content_blocks` row in all four languages, with the "content" drafts laid
 * over it.
 *
 * A draft's ref is `section|slot|locale`. Copy is drafted per language; a
 * photo, a clip or a link reads the same in every language, so it is drafted
 * once under the locale `*` and published to all four rows. Nothing reaches
 * the site until the frame's "Save & publish".
 */

export type Loc = "de" | "en" | "ar" | "tr";
/** The editors' language switch, in the prototype's order. */
export const EDIT_LOCALES: Loc[] = ["de", "en", "tr", "ar"];
export const ALL_LOCALES: Loc[] = ["de", "en", "ar", "tr"];
export const LOCALE_NAMES: Record<Loc, string> = { de: "Deutsch", en: "English", tr: "Türkçe", ar: "العربية" };

export interface Block {
  section: string;
  slot: string;
  locale: string;
  kind: string;
  label: string;
  value: string;
  sortOrder: number;
}

interface BlocksResponse {
  blocks: Block[];
  /** `section|slot` → the file a photo slot shipped with. */
  originals: Record<string, string>;
}

export interface SlotMeta {
  slot: string;
  kind: string;
  label: string;
  sortOrder: number;
}

export interface ContentChange {
  section: string;
  slot: string;
  /** A language, or `*` for a value every language shares. */
  locale: Loc | "*";
  value: string;
}

const BLOCKS_KEY = ["admin", "site", "blocks"] as const;
const DRAFTS_KEY = ["admin", "config", "drafts", "content"] as const;
const SUMMARY_KEY = ["admin", "config", "summary"] as const;

export const contentRef = (section: string, slot: string, locale: string) => `${section}|${slot}|${locale}`;

export function parseRef(ref: string): { section: string; slot: string; locale: string } | null {
  const parts = ref.split("|");
  return parts.length === 3 ? { section: parts[0]!, slot: parts[1]!, locale: parts[2]! } : null;
}

export const isMedia = (kind: string) => kind === "image" || kind === "video";

/** Language-neutral slots that are not pictures: links, ids, icons, dates, prices, switches. */
const NEUTRAL_LAST = /^(href|[a-z]+Href|icon|date|id|capacity|price|shown)$/;

/** A slot whose value is the same in every language, so it is drafted under `*`. */
export function isNeutral(slot: string, kind: string): boolean {
  return isMedia(kind) || slot.startsWith("layout.") || NEUTRAL_LAST.test(slot.split(".").pop() ?? "");
}

/** Guesses a slot's kind before any row has it (a list item just added). */
function guessKind(slot: string): string {
  const last = slot.split(".").pop() ?? "";
  if (/video/i.test(last)) return "video";
  if (/^(img|image|poster|slogan|avatar|photo|picture)$/i.test(last)) return "image";
  return "text";
}

export function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useContent() {
  const { sdk } = useApi();
  const client = useQueryClient();
  const drafts = useDrafts("content");

  const query = useQuery({
    queryKey: [...BLOCKS_KEY, "*"],
    queryFn: () => sdk.http.get<BlocksResponse>("/api/site/editor/blocks"),
    staleTime: 30_000,
  });

  const index = useMemo(() => {
    const rows = new Map<string, string>();
    const meta = new Map<string, Map<string, SlotMeta>>();
    for (const block of query.data?.blocks ?? []) {
      rows.set(contentRef(block.section, block.slot, block.locale), block.value);
      let slots = meta.get(block.section);
      if (!slots) meta.set(block.section, (slots = new Map()));
      if (!slots.has(block.slot)) slots.set(block.slot, { slot: block.slot, kind: block.kind, label: block.label, sortOrder: block.sortOrder });
    }
    return { rows, meta };
  }, [query.data]);

  const kindOf = useCallback(
    (section: string, slot: string) => index.meta.get(section)?.get(slot)?.kind ?? guessKind(slot),
    [index],
  );

  /** What the site shows now. A shared value is read from the German row. */
  const live = useCallback(
    (section: string, slot: string, locale: Loc | "*") => index.rows.get(contentRef(section, slot, locale === "*" ? "de" : locale)) ?? "",
    [index],
  );

  /** The draft for this slot in this language, if there is one. */
  const draftOf = useCallback(
    (section: string, slot: string, locale: Loc | "*"): string | undefined => {
      const own = drafts.drafts.get(contentRef(section, slot, locale));
      if (own !== undefined) return String(own);
      if (locale === "*") return undefined;
      const shared = drafts.drafts.get(contentRef(section, slot, "*"));
      return shared === undefined ? undefined : String(shared);
    },
    [drafts.drafts],
  );

  const neutral = useCallback((section: string, slot: string) => isNeutral(slot, kindOf(section, slot)), [kindOf]);

  /** What the field shows: the draft, or the live value. */
  const value = useCallback(
    (section: string, slot: string, locale: Loc) => {
      const at: Loc | "*" = neutral(section, slot) ? "*" : locale;
      return draftOf(section, slot, at) ?? live(section, slot, at);
    },
    [draftOf, live, neutral],
  );

  const edited = useCallback(
    (section: string, slot: string, locale: Loc) => draftOf(section, slot, neutral(section, slot) ? "*" : locale) !== undefined,
    [draftOf, neutral],
  );

  /**
   * Stores drafts. A value equal to what is live drops the draft instead, so
   * typing a field back to its old text clears its yellow mark.
   */
  const save = useCallback(
    async (changes: ContentChange[]) => {
      const out = new Map<string, string | null>();
      for (const change of changes) {
        const shared = change.locale === "*" || neutral(change.section, change.slot);
        const locale: Loc | "*" = shared ? "*" : change.locale;
        const same = change.value === live(change.section, change.slot, locale);
        out.set(contentRef(change.section, change.slot, locale), same ? null : change.value);
        // A shared value replaces any per-language draft of the same slot.
        if (shared) {
          for (const loc of ALL_LOCALES) {
            const ref = contentRef(change.section, change.slot, loc);
            if (drafts.drafts.has(ref)) out.set(ref, null);
          }
        }
      }
      const list = [...out.entries()]
        .filter(([ref, val]) => val !== null || drafts.drafts.has(ref))
        .map(([ref, val]) => ({ ref, value: val }));
      if (!list.length) return;
      for (let i = 0; i < list.length; i += 800) {
        await sdk.http.post("/api/site/editor/drafts", { drafts: list.slice(i, i + 800) });
      }
      await Promise.all([client.invalidateQueries({ queryKey: DRAFTS_KEY }), client.invalidateQueries({ queryKey: SUMMARY_KEY })]);
    },
    [sdk, client, drafts.drafts, live, neutral],
  );

  /** Drops drafts by ref — a field's, a section's or a whole page's. */
  const revert = useCallback(
    async (refs: string[]) => {
      const list = refs.filter((ref) => drafts.drafts.has(ref)).map((ref) => ({ ref, value: null }));
      if (!list.length) return;
      for (let i = 0; i < list.length; i += 800) {
        await sdk.http.post("/api/site/editor/drafts", { drafts: list.slice(i, i + 800) });
      }
      await Promise.all([client.invalidateQueries({ queryKey: DRAFTS_KEY }), client.invalidateQueries({ queryKey: SUMMARY_KEY })]);
    },
    [sdk, client, drafts.drafts],
  );

  /** The drafts of one section (or of every section), as refs. */
  const draftRefs = useCallback(
    (section?: string) => [...drafts.drafts.keys()].filter((ref) => !section || ref.startsWith(`${section}|`)),
    [drafts.drafts],
  );

  const sections = useMemo(() => [...index.meta.keys()], [index]);
  const slotsOf = useCallback((section: string) => [...(index.meta.get(section)?.values() ?? [])], [index]);
  const original = useCallback((section: string, slot: string) => query.data?.originals[`${section}|${slot}`], [query.data]);

  return {
    loading: query.isLoading || drafts.loading,
    error: query.error,
    sections,
    slotsOf,
    kindOf,
    live,
    value,
    edited,
    neutral,
    original,
    save,
    revert,
    draftRefs,
    drafts: drafts.drafts,
  };
}

export type Content = ReturnType<typeof useContent>;

/**
 * A numbered list (`prefix.1.field`, `prefix.2.field`, …) as the site reads
 * it: items until the first one with every field empty. The longest list of
 * the four languages counts, so an item filled in only in German still shows.
 */
export function listLength(c: Content, section: string, prefix: string, fields: readonly string[], max = 24): number {
  let longest = 0;
  for (const locale of ALL_LOCALES) {
    let n = 0;
    while (n < max && fields.some((field) => c.value(section, `${prefix}.${n + 1}.${field}`, locale).trim())) n += 1;
    longest = Math.max(longest, n);
  }
  return longest;
}

/**
 * Adds, removes and reorders list items by renumbering their slots in every
 * language — the site has no other notion of order. Removing the last item
 * empties it, which ends the list there.
 */
export function listEdits(c: Content, section: string, prefix: string, fields: readonly string[]) {
  const n = listLength(c, section, prefix, fields);
  const slot = (i: number, field: string) => `${prefix}.${i}.${field}`;

  /** The changes that make item `to` hold what item `from` holds now ("" when from is 0). */
  const copy = (to: number, from: number): ContentChange[] =>
    fields.flatMap((field): ContentChange[] =>
      c.neutral(section, slot(to, field)) || c.neutral(section, slot(1, field))
        ? [{ section, slot: slot(to, field), locale: "*", value: from ? c.value(section, slot(from, field), "de") : "" }]
        : ALL_LOCALES.map((locale) => ({ section, slot: slot(to, field), locale, value: from ? c.value(section, slot(from, field), locale) : "" })),
    );

  return {
    count: n,
    remove: (i: number) => {
      const changes: ContentChange[] = [];
      for (let k = i; k < n; k += 1) changes.push(...copy(k, k + 1));
      changes.push(...copy(n, 0));
      return changes;
    },
    swap: (i: number, j: number) => (i < 1 || j < 1 || i > n || j > n ? [] : [...copy(i, j), ...copy(j, i)]),
    /** A new last item, starting as a copy of the current last one. */
    add: () => (n ? copy(n + 1, n) : []),
  };
}

/** Whether uploads are configured, and the upload itself. */
export function useUploads() {
  const { sdk } = useApi();
  const caps = useQuery({
    queryKey: ["admin", "site", "uploads"],
    queryFn: () => sdk.http.get<{ enabled: boolean; maxBytes: number; videoMaxBytes: number }>("/api/site/uploads"),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const upload = useCallback(
    async (file: File, kind: "image" | "video") => {
      const form = new FormData();
      form.append("file", file);
      const { url } = await sdk.http.post<{ url: string }>("/api/site/uploads", form, {
        query: { kind },
        timeoutMs: kind === "video" ? 600_000 : 120_000,
      });
      return url;
    },
    [sdk],
  );

  return { enabled: caps.data?.enabled ?? false, maxBytes: caps.data?.maxBytes, upload };
}

// ── Settings ──────────────────────────────────────────────────────────

export interface Setting {
  key: string;
  value: string;
  group: string;
  kind: string;
  label: string;
  description: string | null;
  sortOrder: number;
}

const SETTINGS_DRAFTS_KEY = ["admin", "config", "drafts", "settings"] as const;

/** `site_settings` with the "settings" drafts over it. */
export function useSiteSettingsDrafts() {
  const { sdk } = useApi();
  const client = useQueryClient();
  const drafts = useDrafts("settings");

  const query = useQuery({
    queryKey: ["admin", "site", "settings"],
    queryFn: () => sdk.http.get<{ settings: Setting[]; originals: Record<string, string> }>("/api/site/editor/settings"),
    staleTime: 30_000,
  });

  const rows = useMemo(() => new Map((query.data?.settings ?? []).map((row) => [row.key, row])), [query.data]);
  const live = useCallback((key: string) => rows.get(key)?.value ?? "", [rows]);
  const value = useCallback((key: string) => drafts.value(key, live(key)), [drafts, live]);

  const save = useCallback(
    async (changes: { key: string; value: string }[]) => {
      const list = changes
        .map((change) => ({ key: change.key, value: change.value === live(change.key) ? null : change.value }))
        .filter((change) => change.value !== null || drafts.drafts.has(change.key));
      if (!list.length) return;
      await sdk.http.post("/api/site/editor/settings/drafts", { drafts: list });
      await Promise.all([client.invalidateQueries({ queryKey: SETTINGS_DRAFTS_KEY }), client.invalidateQueries({ queryKey: SUMMARY_KEY })]);
    },
    [sdk, client, drafts.drafts, live],
  );

  return {
    loading: query.isLoading || drafts.loading,
    error: query.error,
    live,
    value,
    edited: drafts.edited,
    original: (key: string) => query.data?.originals[key],
    save,
    revert: drafts.revert,
  };
}
