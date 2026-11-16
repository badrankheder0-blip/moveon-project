import { isSafeImageSrc } from "@mon/core";
import { db, schema } from "@mon/db";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import type { Tx } from "../config/publish-registry.js";

const { siteSettings } = schema;

/**
 * Settings the admin dashboard added to `site_settings`: the company's legal
 * and bank details (group "company"), which the imprint, quotes and invoices
 * print, and the background picture behind the public pages.
 *
 * The settings PATCH only accepts keys that exist, and no seed carries
 * these, so they are created on first read with what the database already
 * knows — the legal name and the contact details — and sensible blanks.
 */

export interface SettingDefinition {
  key: string;
  group: string;
  kind: "text" | "textarea" | "email" | "number" | "boolean" | "image";
  label: string;
  description?: string;
  sortOrder: number;
  /** The value a new row starts with, given the settings that exist. */
  initial: (existing: Map<string, string>) => string;
}

/** Where the site's own pictures come from when a setting is reset. */
export const BRAND_ORIGINALS: Record<string, string> = {
  "brand.logo": "/images/mon/mon-lockup.png",
  "brand.mark": "/images/brand/logo.png",
  "brand.background": "/images/mon/home/symbol.webp",
};

const blank = () => "";

export const DASHBOARD_SETTINGS: SettingDefinition[] = [
  { key: "company.name", group: "company", kind: "text", label: "Company name", sortOrder: 1, initial: (s) => s.get("brand.name") ?? "m.on" },
  { key: "company.legalForm", group: "company", kind: "text", label: "Legal form", sortOrder: 2, initial: () => "GmbH" },
  { key: "company.register", group: "company", kind: "text", label: "Commercial register (court & number)", sortOrder: 3, initial: blank },
  { key: "company.vatId", group: "company", kind: "text", label: "VAT ID (USt-IdNr.)", sortOrder: 4, initial: blank },
  { key: "company.taxNumber", group: "company", kind: "text", label: "Tax number (Steuernummer)", sortOrder: 5, initial: blank },
  { key: "company.address", group: "company", kind: "text", label: "Address", sortOrder: 6, initial: (s) => s.get("contact.address") ?? "" },
  { key: "company.email", group: "company", kind: "email", label: "Email", sortOrder: 7, initial: (s) => s.get("contact.email") ?? "" },
  { key: "company.phone", group: "company", kind: "text", label: "Phone", sortOrder: 8, initial: (s) => s.get("contact.phone") ?? "" },
  {
    key: "company.whatsapp",
    group: "company",
    kind: "text",
    label: "WhatsApp number",
    description: "With country code, e.g. +49 151 2345678. The website's green WhatsApp button opens a chat with this number; empty hides the button.",
    sortOrder: 8,
    initial: blank,
  },
  { key: "company.iban", group: "company", kind: "text", label: "IBAN", sortOrder: 9, initial: blank },
  { key: "company.bic", group: "company", kind: "text", label: "BIC", sortOrder: 10, initial: blank },
  { key: "company.bank", group: "company", kind: "text", label: "Bank", sortOrder: 11, initial: blank },
  {
    key: "company.paymentTermDays",
    group: "company",
    kind: "number",
    label: "Payment term (days)",
    description: "Days an invoice is due after it is issued.",
    sortOrder: 12,
    initial: () => "14",
  },
  {
    key: "company.serviceAreas",
    group: "company",
    kind: "textarea",
    label: "Service areas",
    description: "Cities or postcodes served, separated by commas.",
    sortOrder: 13,
    initial: () => "Köln, Düsseldorf, Bonn, Essen, Dortmund",
  },
  {
    key: "company.onlyInsideAreas",
    group: "company",
    kind: "boolean",
    label: "Only accept addresses in the service areas",
    sortOrder: 14,
    initial: () => "false",
  },
  {
    key: "brand.background",
    group: "brand",
    kind: "image",
    label: "Background pattern",
    description: "The picture scattered faintly behind every public page. Upload one, or give a path under /images/ or an https:// address.",
    sortOrder: 7,
    initial: () => BRAND_ORIGINALS["brand.background"]!,
  },
];

/**
 * The public contact rows the company fields keep in step: the header's
 * phone, the contact page and the footer read `contact.*`.
 */
export const CONTACT_MIRROR: Record<string, string> = {
  "company.phone": "contact.phone",
  "company.email": "contact.email",
  "company.address": "contact.address",
  "company.whatsapp": "contact.whatsapp",
};

let ready: Promise<void> | null = null;

/** Creates the dashboard's settings rows that are missing, once per process. */
export function ensureDashboardSettings(): Promise<void> {
  ready ??= (async () => {
    const rows = await db.select({ key: siteSettings.key, value: siteSettings.value }).from(siteSettings);
    const existing = new Map(rows.map((row) => [row.key, row.value]));
    const missing = DASHBOARD_SETTINGS.filter((definition) => !existing.has(definition.key));

    if (missing.length) {
      await db
        .insert(siteSettings)
        .values(
          missing.map((definition) => ({
            key: definition.key,
            value: definition.initial(existing),
            group: definition.group,
            kind: definition.kind,
            label: definition.label,
            description: definition.description ?? null,
            sortOrder: definition.sortOrder,
          })),
        )
        .onConflictDoNothing();
    }
  })().catch((error: unknown) => {
    ready = null;
    throw error;
  });

  return ready;
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Why a value does not fit its setting, or null. The rules of the settings
 * PATCH, except that the dashboard's own fields may be left empty — a VAT ID
 * not known yet is a blank, not an error.
 */
export function settingProblem(key: string, kind: string, value: string): string | null {
  const optional = DASHBOARD_SETTINGS.some((definition) => definition.key === key);
  if (value === "" && (optional || kind === "text" || kind === "textarea")) return null;

  switch (kind) {
    case "color":
      return HEX.test(value) ? null : "Expected a hex colour such as #E62039.";
    case "email":
      return z.string().email().safeParse(value).success ? null : "Expected a valid email address.";
    case "url":
      return z.string().url().safeParse(value).success ? null : "Expected a valid URL.";
    case "number":
      if (Number.isNaN(Number(value))) return "Expected a number.";
      if (key === "company.paymentTermDays" && !/^\d{1,3}$/.test(value)) return "Expected a whole number of days.";
      return null;
    case "boolean":
      return value === "true" || value === "false" ? null : "Expected true or false.";
    case "image":
      return isSafeImageSrc(value)
        ? null
        : "Expected an image path under /images/ (e.g. /images/home/hero-truck.jpg) or an https:// URL.";
    default:
      return null;
  }
}

/** The kind a key is validated against: its row's, or its definition's before the row exists. */
export async function settingKinds(keys: string[], executor: typeof db | Tx = db): Promise<Map<string, string>> {
  const kinds = new Map<string, string>();
  if (!keys.length) return kinds;

  const rows = await executor.select({ key: siteSettings.key, kind: siteSettings.kind }).from(siteSettings).where(inArray(siteSettings.key, keys));
  for (const row of rows) kinds.set(row.key, row.kind);
  for (const definition of DASHBOARD_SETTINGS) if (keys.includes(definition.key) && !kinds.has(definition.key)) kinds.set(definition.key, definition.kind);
  return kinds;
}

export async function settingExists(key: string, executor: typeof db | Tx = db): Promise<boolean> {
  const [row] = await executor.select({ key: siteSettings.key }).from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return Boolean(row);
}
