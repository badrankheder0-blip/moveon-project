import type { CompanyData } from "./invoice-company.js";
import type { CustomerSnapshot, InvoiceRow } from "./invoices.service.js";

/**
 * The accountant's export: a DATEV "Buchungsstapel" in the EXTF format
 * (DATEV-Format 7.0, category 21, format version 13), the file DATEV
 * Rechnungswesen and Unternehmen online import as a booking batch.
 *
 * One booking per invoice: the gross amount debited to the customer's debtor
 * account against the revenue account. 8400 is SKR03's "Erlöse 19 % USt", an
 * automatic account, so no BU key is needed and DATEV works the VAT out of the
 * gross itself; invoices at 7 % go to 8300 instead.
 *
 * Debtor accounts are numbered by each customer's first invoice — the first
 * customer ever invoiced is 10000, the next new one 10001 — which keeps every
 * customer on the same account across exports and no two customers on one
 * (the prototype hashed the email, and hashes collide). Invoices are never
 * deleted, so that order never changes.
 */

const COLUMNS: string[] = [
  "Umsatz (ohne Soll/Haben-Kz)",
  "Soll/Haben-Kennzeichen",
  "WKZ Umsatz",
  "Kurs",
  "Basis-Umsatz",
  "WKZ Basis-Umsatz",
  "Konto",
  "Gegenkonto (ohne BU-Schlüssel)",
  "BU-Schlüssel",
  "Belegdatum",
  "Belegfeld 1",
  "Belegfeld 2",
  "Skonto",
  "Buchungstext",
  "Postensperre",
  "Diverse Adressnummer",
  "Geschäftspartnerbank",
  "Sachverhalt",
  "Zinssperre",
  "Beleglink",
  ...Array.from({ length: 8 }, (_, i) => [`Beleginfo - Art ${i + 1}`, `Beleginfo - Inhalt ${i + 1}`]).flat(),
  "KOST1 - Kostenstelle",
  "KOST2 - Kostenstelle",
  "Kost-Menge",
  "EU-Land u. UStID (Bestimmung)",
  "EU-Steuersatz (Bestimmung)",
  "Abw. Versteuerungsart",
  "Sachverhalt L+L",
  "Funktionsergänzung L+L",
  "BU 49 Hauptfunktionstyp",
  "BU 49 Hauptfunktionsnummer",
  "BU 49 Funktionsergänzung",
  ...Array.from({ length: 20 }, (_, i) => [`Zusatzinformation - Art ${i + 1}`, `Zusatzinformation- Inhalt ${i + 1}`]).flat(),
  "Stück",
  "Gewicht",
  "Zahlweise",
  "Forderungsart",
  "Veranlagungsjahr",
  "Zugeordnete Fälligkeit",
  "Skontotyp",
  "Auftragsnummer",
  "Buchungstyp",
  "USt-Schlüssel (Anzahlungen)",
  "EU-Land (Anzahlungen)",
  "Sachverhalt L+L (Anzahlungen)",
  "EU-Steuersatz (Anzahlungen)",
  "Erlöskonto (Anzahlungen)",
  "Herkunft-Kz",
  "Buchungs GUID",
  "KOST-Datum",
  "SEPA-Mandatsreferenz",
  "Skontosperre",
  "Gesellschaftername",
  "Beteiligtennummer",
  "Identifikationsnummer",
  "Zeichnernummer",
  "Postensperre bis",
  "Bezeichnung SoBil-Sachverhalt",
  "Kennzeichen SoBil-Buchung",
  "Festschreibung",
  "Leistungsdatum",
  "Datum Zuord. Steuerperiode",
  "Fälligkeit",
  "Generalumkehr (GU)",
  "Steuersatz",
  "Land",
  "Abrechnungsreferenz",
  "BVV-Position",
  "EU-Land u. UStID (Ursprung)",
  "EU-Steuersatz (Ursprung)",
  "Abw. Skontokonto",
];

const col = (name: string) => {
  const index = COLUMNS.indexOf(name);
  if (index < 0) throw new Error(`Unknown DATEV column ${name}`);
  return index;
};

/** A text field: quoted, quotes doubled, DATEV's own length limit applied. */
const text = (value: string | undefined | null, max: number) => `"${String(value ?? "").replace(/"/g, '""').slice(0, max)}"`;

/** "1916,88" — DATEV amounts: decimal comma, no grouping, no sign. */
const amount = (value: string | number) => Math.abs(Number(value) || 0).toFixed(2).replace(".", ",");

const ddmm = (iso: string) => `${iso.slice(8, 10)}${iso.slice(5, 7)}`;
const ddmmyyyy = (iso: string) => `${iso.slice(8, 10)}${iso.slice(5, 7)}${iso.slice(0, 4)}`;
const yyyymmdd = (iso: string) => iso.replace(/-/g, "");

/** Belegfeld 1 allows letters, digits and $ & % * + - / only. */
const belegfeld = (value: string) => value.replace(/[^A-Za-z0-9$&%*+\-/]/g, "").slice(0, 36);

export interface DatevOptions {
  month: string;
  company: CompanyData;
  /** Overrides the revenue account for 19 % invoices (default 8400, SKR04: 4400). */
  revenueAccount?: string | undefined;
  consultant?: string | undefined;
  client?: string | undefined;
}

/**
 * Builds the file for one month.
 *
 * `monthInvoices` are the invoices issued in the month; `allInvoices` is every
 * invoice ever issued, number order, and only decides the debtor accounts.
 */
export function buildDatev(
  monthInvoices: InvoiceRow[],
  allInvoices: Pick<InvoiceRow, "number" | "customer">[],
  options: DatevOptions,
): string {
  const debtor = new Map<string, number>();
  for (const invoice of allInvoices) {
    const key = customerKey(invoice.customer as CustomerSnapshot);
    if (!debtor.has(key)) debtor.set(key, 10000 + debtor.size);
  }

  const [year, month] = options.month.split("-").map(Number) as [number, number];
  const first = `${options.month}-01`;
  const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const fyMonth = options.company.datev.fiscalYearStartMonth;
  const fyYear = month >= fyMonth ? year : year - 1;
  const fiscalStart = `${fyYear}${String(fyMonth).padStart(2, "0")}01`;

  const chart = (options.company.datev.chart || "03").padStart(2, "0");
  const revenue19 = options.revenueAccount || options.company.datev.revenueAccount || (chart === "04" ? "4400" : "8400");
  const revenue7 = chart === "04" ? "4300" : "8300";
  const consultant = digitsOr(options.consultant || options.company.datev.consultant, "1001");
  const client = digitsOr(options.client || options.company.datev.client, "1");

  const now = new Date();
  const stamp = `${now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 17)}`;

  // The header record: 31 fields, in DATEV's order.
  const header = [
    text("EXTF", 4),
    "700",
    "21",
    text("Buchungsstapel", 14),
    "13",
    stamp,
    "",
    text("RE", 2),
    text("m.on", 25),
    text("", 25),
    consultant,
    client,
    fiscalStart,
    "4",
    yyyymmdd(first),
    yyyymmdd(last),
    text(`Rechnungen ${options.month}`, 30),
    text("", 2),
    "1",
    "0",
    "0",
    text("EUR", 3),
    "",
    text("", 0),
    "",
    "",
    text(chart, 2),
    "",
    "",
    text("", 0),
    text("", 0),
  ].join(";");

  const lines = [header, COLUMNS.map((name) => text(name, 200)).join(";")];

  for (const invoice of [...monthInvoices].sort((a, b) => a.number.localeCompare(b.number))) {
    const customer = invoice.customer as CustomerSnapshot;
    const rate = Number(invoice.vatRate);
    const fields: string[] = COLUMNS.map(() => "");
    fields[col("Umsatz (ohne Soll/Haben-Kz)")] = amount(invoice.totalGross);
    fields[col("Soll/Haben-Kennzeichen")] = text(Number(invoice.totalGross) < 0 ? "H" : "S", 1);
    fields[col("WKZ Umsatz")] = text("EUR", 3);
    fields[col("Konto")] = String(debtor.get(customerKey(customer)) ?? 10000);
    fields[col("Gegenkonto (ohne BU-Schlüssel)")] = Math.round(rate) === 7 ? revenue7 : revenue19;
    fields[col("Belegdatum")] = ddmm(invoice.issueDate);
    fields[col("Belegfeld 1")] = text(belegfeld(invoice.number), 36);
    fields[col("Buchungstext")] = text([customer.company || customer.name, customer.reference].filter(Boolean).join(" "), 60);
    fields[col("Auftragsnummer")] = text(customer.reference ?? "", 30);
    if (customer.serviceDates?.[0]) fields[col("Leistungsdatum")] = ddmmyyyy(customer.serviceDates[0]);
    fields[col("Fälligkeit")] = ddmmyyyy(invoice.dueDate);
    fields[col("Festschreibung")] = "0";
    lines.push(fields.join(";"));
  }

  return `${lines.join("\r\n")}\r\n`;
}

function customerKey(customer: CustomerSnapshot): string {
  return (customer.email || customer.name || "").trim().toLowerCase();
}

function digitsOr(value: string | undefined, fallback: string): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits || fallback;
}

/**
 * DATEV reads these files as Windows-1252. Latin-1 covers the German letters
 * byte for byte; the handful of characters 1252 adds (€, „, –, …) are mapped,
 * and anything else becomes "?" rather than a broken byte sequence.
 */
const CP1252: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
  0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91,
  0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
  0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

export function toWindows1252(value: string): Buffer {
  const bytes: number[] = [];
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (code < 0x80 || (code >= 0xa0 && code <= 0xff)) bytes.push(code);
    else bytes.push(CP1252[code] ?? 0x3f);
  }
  return Buffer.from(bytes);
}
