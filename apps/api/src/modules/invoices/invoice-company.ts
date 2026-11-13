import { db, schema } from "@mon/db";
import { inArray, like, or } from "drizzle-orm";

const { siteSettings } = schema;

/**
 * The seller's side of an invoice: the company data, bank details and tax
 * numbers a German Rechnung has to carry, read from the site settings.
 *
 * Settings owns the `company.*` keys. Until it has created them the brand and
 * contact settings stand in for name, address, email and phone, so an invoice
 * issued on a fresh database still names a seller; the bank and tax lines are
 * simply left off rather than invented.
 */

/** Any Drizzle executor: the pool, or an open transaction. */
type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The keys the invoices screen edits, as Settings names them. */
export const INVOICE_SETTING_KEYS = {
  iban: "company.iban",
  vatId: "company.vatId",
  taxNumber: "company.taxNumber",
  paymentTermDays: "company.paymentTermDays",
} as const;

export const DEFAULT_PAYMENT_TERM_DAYS = 14;

/** The fallbacks for a database where Settings has not written company data yet. */
const FALLBACK_KEYS = [
  "brand.name",
  "brand.legalName",
  "brand.logo",
  "contact.address",
  "contact.email",
  "contact.phone",
] as const;

export interface CompanyData {
  /** Everything the invoice prints about the seller, non-empty values only. */
  seller: Record<string, string>;
  iban: string;
  vatId: string;
  taxNumber: string;
  paymentTermDays: number;
  /** Which `company.*` keys exist, so the screen only offers edits it can save. */
  present: string[];
  /** DATEV header values the accountant may have set. */
  datev: { consultant: string; client: string; revenueAccount: string; chart: string; fiscalYearStartMonth: number };
}

export async function loadCompany(executor: Executor = db): Promise<CompanyData> {
  const rows = await executor
    .select({ key: siteSettings.key, value: siteSettings.value })
    .from(siteSettings)
    .where(or(like(siteSettings.key, "company.%"), inArray(siteSettings.key, [...FALLBACK_KEYS])));

  const values = new Map(rows.map((row) => [row.key, row.value.trim()]));
  const get = (...keys: string[]) => keys.map((key) => values.get(key) ?? "").find((value) => value !== "") ?? "";

  const name = get("company.name");
  const legalForm = get("company.legalForm");
  // "m.on" + "GmbH" is the legal name; "m.on GmbH" + "GmbH" must not become "m.on GmbH GmbH".
  const withForm = name && legalForm && !name.toLowerCase().endsWith(legalForm.toLowerCase()) ? `${name} ${legalForm}` : name;
  const legalName = get("company.legalName") || withForm || get("brand.legalName", "brand.name") || "m.on";

  const term = Number.parseInt(get(INVOICE_SETTING_KEYS.paymentTermDays), 10);
  const paymentTermDays = Number.isFinite(term) && term >= 0 && term <= 365 ? term : DEFAULT_PAYMENT_TERM_DAYS;

  const seller: Record<string, string> = {
    name: legalName,
    address: get("company.address", "contact.address"),
    email: get("company.email", "contact.email"),
    phone: get("company.phone", "contact.phone"),
    website: get("company.website"),
    vatId: get(INVOICE_SETTING_KEYS.vatId),
    taxNumber: get(INVOICE_SETTING_KEYS.taxNumber),
    iban: get(INVOICE_SETTING_KEYS.iban),
    bic: get("company.bic"),
    bank: get("company.bank", "company.bankName"),
    register: get("company.register"),
    managingDirector: get("company.managingDirector", "company.ceo"),
    logo: get("company.logo", "brand.logo"),
  };

  for (const key of Object.keys(seller)) if (!seller[key]) delete seller[key];

  const month = Number.parseInt(get("company.fiscalYearStart"), 10);

  return {
    seller,
    iban: seller.iban ?? "",
    vatId: seller.vatId ?? "",
    taxNumber: seller.taxNumber ?? "",
    paymentTermDays,
    present: [...values.keys()].filter((key) => key.startsWith("company.")),
    datev: {
      consultant: get("company.datevConsultant"),
      client: get("company.datevClient"),
      revenueAccount: get("company.datevRevenueAccount"),
      chart: get("company.datevChart"),
      fiscalYearStartMonth: month >= 1 && month <= 12 ? month : 1,
    },
  };
}
