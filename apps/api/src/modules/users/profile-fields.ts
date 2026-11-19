import { z } from "zod";

/**
 * Profile fields checked the same way wherever they are saved: by the
 * customer on their own profile (`users.routes.ts`) and by the office on the
 * customer's behalf (`customers.routes.ts`).
 */

/** The customer's own address: four fields, all filled or none (the forms check "all or none"). */
export const profileAddressSchema = z.object({
  street: z.string().trim().max(160).default(""),
  houseNumber: z.string().trim().max(20).default(""),
  zip: z.string().trim().max(12).default(""),
  city: z.string().trim().max(80).default(""),
});

/** A German Steuernummer ("12/345/67890") or an EU VAT ID ("DE123456789"). */
export const taxNumberSchema = z
  .string()
  .trim()
  .min(5)
  .max(30)
  .regex(/^[A-Za-z0-9 ./-]+$/, "Use letters, digits, spaces, slashes, dots or dashes.");

export const companyNameSchema = z.string().trim().min(2).max(120);
