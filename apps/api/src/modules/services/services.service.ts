import { db, schema } from "@mon/db";
import { asc } from "drizzle-orm";

import { BUILTIN_DEFAULTS, BUILTIN_SERVICES, defaultServiceImage, isBuiltinService } from "./services.defaults.js";

const { services } = schema;

export type ServiceRow = typeof services.$inferSelect;

/**
 * Creates the four built-in services the first time anything reads the
 * catalogue. `onConflictDoNothing` keeps an edited row as it is, so this is
 * safe to run on every boot; the promise is kept so it runs once per process.
 */
let builtinsReady: Promise<void> | null = null;

export function ensureBuiltinServices(): Promise<void> {
  builtinsReady ??= db
    .insert(services)
    .values(
      BUILTIN_SERVICES.map((key) => ({
        key,
        isBuiltin: true,
        isActive: true,
        name: BUILTIN_DEFAULTS[key].name,
        description: BUILTIN_DEFAULTS[key].description,
        tagline: BUILTIN_DEFAULTS[key].tagline,
        image: null,
        icon: BUILTIN_DEFAULTS[key].icon,
        // The planner prices these with its own rules (or sends them to the
        // team); "quote" is what a custom service gets.
        pricingModel: "builtin",
        flow: [],
        sortOrder: BUILTIN_DEFAULTS[key].sortOrder,
      })),
    )
    .onConflictDoNothing()
    .then(() => undefined)
    .catch((error: unknown) => {
      builtinsReady = null;
      throw error;
    });
  return builtinsReady;
}

export async function listServices(): Promise<ServiceRow[]> {
  await ensureBuiltinServices();
  return db.select().from(services).orderBy(asc(services.sortOrder), asc(services.key));
}

const hasText = (value: schema.Localized | null | undefined) =>
  Boolean(value && Object.values(value).some((text) => typeof text === "string" && text.trim()));

/**
 * What the website and the booking planner read: shown services only, with
 * the default photo filled in. A custom service nobody named yet has nothing
 * to put on a card, so it waits until it has one.
 */
export function publicService(row: ServiceRow) {
  return {
    key: row.key,
    isBuiltin: row.isBuiltin,
    name: row.name,
    description: row.description,
    tagline: row.tagline,
    image: row.image ?? defaultServiceImage(row.key),
    icon: row.icon,
    pricingModel: row.pricingModel,
    flow: row.flow,
    sortOrder: row.sortOrder,
  };
}

export function isPublic(row: ServiceRow): boolean {
  return row.isActive && hasText(row.name);
}

/** The dashboard's view: everything, plus the photo "Use original" goes back to. */
export function staffService(row: ServiceRow) {
  return {
    key: row.key,
    isBuiltin: row.isBuiltin,
    isActive: row.isActive,
    name: row.name,
    description: row.description,
    tagline: row.tagline,
    image: row.image,
    defaultImage: defaultServiceImage(row.key),
    // A built-in service's original wording, shown where a field is emptied.
    defaults: isBuiltinService(row.key)
      ? { name: BUILTIN_DEFAULTS[row.key].name, description: BUILTIN_DEFAULTS[row.key].description, tagline: BUILTIN_DEFAULTS[row.key].tagline }
      : null,
    icon: row.icon,
    pricingModel: row.pricingModel,
    flow: row.flow,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
  };
}
