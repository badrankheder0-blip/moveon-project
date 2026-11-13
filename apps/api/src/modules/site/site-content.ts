import { isSafeImageSrc, isSafeVideoSrc } from "@mon/core";
import { db, schema } from "@mon/db";
import { eq, inArray } from "drizzle-orm";

import { AppError } from "../../lib/errors.js";
import type { Tx } from "../config/publish-registry.js";
import { PLANNER_CONTENT } from "./planner-content.js";

const { contentBlocks } = schema;

/**
 * Content drafts: what "Save & publish" writes to `content_blocks`.
 *
 * A draft's ref is `section|slot|locale`. Copy is per language; a photo, a
 * clip or a link reads the same in every language, so its draft carries the
 * locale `*` and is written to all four rows. A draft may name a slot no row
 * has yet — the third card of a list the office just added — and publishing
 * creates the rows, typed and labelled after the list's other items.
 */

export const BLOCK_LOCALES = ["de", "en", "ar", "tr"] as const;
export type BlockLocale = (typeof BLOCK_LOCALES)[number];

const SECTION_RE = /^[a-z0-9][a-z0-9-]{0,59}$/;
const SLOT_RE = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,119}$/;

export interface ContentRef {
  section: string;
  slot: string;
  locale: BlockLocale | "*";
}

export function parseContentRef(ref: string): ContentRef | null {
  const parts = ref.split("|");
  if (parts.length !== 3) return null;
  const [section, slot, locale] = parts as [string, string, string];
  if (!SECTION_RE.test(section) || !SLOT_RE.test(slot)) return null;
  if (locale !== "*" && !(BLOCK_LOCALES as readonly string[]).includes(locale)) return null;
  return { section, slot, locale: locale as ContentRef["locale"] };
}

export function isMediaKind(kind: string): kind is "image" | "video" {
  return kind === "image" || kind === "video";
}

/** "Expected an image path…" — the reason a media value is refused, or null. */
export function mediaProblem(kind: string, value: string): string | null {
  if (value === "") return null;
  if (kind === "image" && !isSafeImageSrc(value)) {
    return "Expected an image path under /images/ (e.g. /images/home/hero-truck.jpg) or an https:// URL.";
  }
  if (kind === "video" && !isSafeVideoSrc(value)) {
    return "Expected a video path under /videos/ (e.g. /videos/home/strip-1.mp4) or an https:// URL.";
  }
  return null;
}

type BlockRow = typeof contentBlocks.$inferSelect;

/** `services.4.title` → `services.#.title`: the shape every item of a list shares. */
const shapeOf = (slot: string) => slot.replace(/\.\d+(?=\.|$)/g, ".#");
const numberOf = (slot: string) => /\.(\d+)(?=\.|$)/.exec(slot)?.[1];

/**
 * The kind and label a new row takes: those of the same field on another
 * item of its list when there is one ("Services — card 1: photo" becomes
 * "… card 5: photo"), otherwise guessed from the slot's name.
 */
export function templateFor(
  slot: string,
  sectionRows: BlockRow[],
): { kind: string; label: string; sortOrder: number } {
  const own = sectionRows.find((row) => row.slot === slot);
  if (own) return { kind: own.kind, label: own.label, sortOrder: own.sortOrder };

  const shape = shapeOf(slot);
  const sibling = shape !== slot ? sectionRows.find((row) => shapeOf(row.slot) === shape) : undefined;

  if (sibling) {
    const from = numberOf(sibling.slot);
    const to = numberOf(slot);
    const label = from && to ? sibling.label.replace(new RegExp(`\\b${from}\\b`), to) : sibling.label;
    return { kind: sibling.kind, label, sortOrder: sibling.sortOrder };
  }

  const last = slot.split(".").pop() ?? slot;
  const kind = /video/i.test(last)
    ? "video"
    : /^(img|image|poster|slogan|avatar|photo|picture)$/i.test(last)
      ? "image"
      : "text";
  return { kind, label: slot, sortOrder: 0 };
}

/**
 * Checks a batch of drafts before they are stored, so a bad photo URL is
 * refused while the editor is still on the field rather than failing the
 * whole publish later.
 */
export async function checkContentDrafts(drafts: { ref: ContentRef; value: string }[]): Promise<void> {
  const sections = [...new Set(drafts.map((draft) => draft.ref.section))];
  if (!sections.length) return;

  const rows = await db.select().from(contentBlocks).where(inArray(contentBlocks.section, sections));

  for (const draft of drafts) {
    const sectionRows = rows.filter((row) => row.section === draft.ref.section);
    const { kind } = templateFor(draft.ref.slot, sectionRows);
    const problem = mediaProblem(kind, draft.value);
    if (problem) throw AppError.unprocessable(problem, { ref: `${draft.ref.section}|${draft.ref.slot}|${draft.ref.locale}` });
  }
}

/**
 * Writes published content drafts to `content_blocks`, inside the publish
 * transaction. `*` drafts go first so a language-specific draft of the same
 * slot, should both exist, has the last word for its language.
 */
export async function applyContentDrafts(tx: Tx, drafts: { ref: string; value: unknown }[], actorId: string): Promise<string[]> {
  const parsed = drafts
    .map((draft) => ({ ref: parseContentRef(draft.ref), value: typeof draft.value === "string" ? draft.value : String(draft.value ?? "") }))
    .filter((draft): draft is { ref: ContentRef; value: string } => draft.ref !== null)
    .sort((a, b) => Number(b.ref.locale === "*") - Number(a.ref.locale === "*"));

  const sections = [...new Set(parsed.map((draft) => draft.ref.section))];
  if (!sections.length) return [];

  const rows = await tx.select().from(contentBlocks).where(inArray(contentBlocks.section, sections));
  const now = new Date();
  const touched: string[] = [];

  for (const { ref, value } of parsed) {
    const sectionRows = rows.filter((row) => row.section === ref.section);
    const template = templateFor(ref.slot, sectionRows);
    const media = isMediaKind(template.kind);

    const problem = mediaProblem(template.kind, value);
    if (problem) throw AppError.unprocessable(`${ref.section} · ${ref.slot}: ${problem}`);

    // A picture is the same in every language, whichever locale its draft
    // happened to be written under.
    const locales: readonly BlockLocale[] = media || ref.locale === "*" ? BLOCK_LOCALES : [ref.locale as BlockLocale];

    for (const locale of locales) {
      const existing = sectionRows.find((row) => row.slot === ref.slot && row.locale === locale);

      if (existing) {
        if (existing.value === value) continue;
        await tx.update(contentBlocks).set({ value, updatedAt: now, updatedBy: actorId }).where(eq(contentBlocks.id, existing.id));
        existing.value = value;
      } else {
        const [created] = await tx
          .insert(contentBlocks)
          .values({
            section: ref.section,
            slot: ref.slot,
            locale,
            value,
            kind: template.kind,
            label: template.label,
            sortOrder: template.sortOrder,
            isPublished: true,
            updatedAt: now,
            updatedBy: actorId,
          })
          .returning();
        if (created) rows.push(created);
      }
    }

    touched.push(`${ref.section}.${ref.slot}${media || ref.locale === "*" ? "" : `@${ref.locale}`}`);
  }

  return touched;
}

let plannerReady: Promise<void> | null = null;

/**
 * Creates the booking planner's rows that do not exist yet, once per
 * process. Only missing (slot, locale) pairs are inserted, so a value the
 * office already changed is never put back.
 */
export function ensurePlannerRows(): Promise<void> {
  plannerReady ??= (async () => {
    const existing = await db
      .select({ slot: contentBlocks.slot, locale: contentBlocks.locale })
      .from(contentBlocks)
      .where(eq(contentBlocks.section, "planner"));
    const have = new Set(existing.map((row) => `${row.slot}|${row.locale}`));

    const missing = PLANNER_CONTENT.flatMap((seed, index) =>
      BLOCK_LOCALES.filter((locale) => !have.has(`${seed.slot}|${locale}`)).map((locale) => ({
        section: "planner",
        slot: seed.slot,
        locale,
        value: seed.values[locale],
        kind: seed.kind,
        label: seed.label,
        sortOrder: 10 + index,
      })),
    );

    if (missing.length) await db.insert(contentBlocks).values(missing).onConflictDoNothing();
  })().catch((error: unknown) => {
    plannerReady = null;
    throw error;
  });

  return plannerReady;
}
