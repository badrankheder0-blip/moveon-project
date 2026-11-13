/**
 * Sends one of every email the product can send, to one address.
 *
 * Uses the applications own mailer, so it proves the real path: the configured
 * driver, the real From address, the real templates. Run it with the address
 * as the only argument.
 */
import { mailer } from "../src/lib/mailer.js";

const to = process.argv[2];
if (!to) { console.error("usage: tsx scripts/mail-selftest.ts <address>"); process.exit(1); }

const ref = "MON-TEST-" + new Date().toISOString().slice(5, 16).replace(/[-:T]/g, "");
const money = (n: string) => n;

const cases: { label: string; run: () => Promise<unknown> }[] = [
  { label: "otp", run: () => mailer.send({ template: "otp", to, locale: "de",
      payload: { code: "472913", expiresInMinutes: 10, name: "Khader" } }) },
  { label: "verify-email", run: () => mailer.send({ template: "verify-email", to, locale: "de",
      payload: { url: "https://moveongo.de/de/email-bestaetigen?token=selftest", expiresInHours: 24, name: "Khader" } }) },
  { label: "password-reset", run: () => mailer.send({ template: "password-reset", to, locale: "de",
      payload: { url: "https://moveongo.de/de/passwort-zuruecksetzen?token=selftest", expiresInMinutes: 60, name: "Khader" } }) },
];

for (const stage of ["submitted", "confirmed", "completed", "cancelled"] as const) {
  cases.push({ label: "order-status/" + stage, run: () => mailer.send({ template: "order-status", to, locale: "de",
    payload: { stage, reference: ref, name: "Khader", scheduledDate: "2027-03-15", scheduledTime: "09:00",
      totalGross: money("886.53"), depositAmount: money("177.31"),
      ...(stage === "cancelled" ? { cancellationFee: money("50.00") } : {}),
      url: "https://moveongo.de/de/konto/auftraege" } }) });
}

for (const kind of ["deposit", "balance", "refund"] as const) {
  cases.push({ label: "payment-receipt/" + kind, run: () => mailer.send({ template: "payment-receipt", to, locale: "de",
    payload: { reference: ref, name: "Khader", amount: money("177.31"), kind, method: "Überweisung",
      paidAmount: money("177.31"), totalGross: money("886.53"), url: "https://moveongo.de/de/konto/rechnungen" } }) });
}

for (const audience of ["customer", "team"] as const) {
  cases.push({ label: "service-request/" + audience, run: () => mailer.send({ template: "service-request", to, locale: "de",
    payload: { audience, reference: ref, name: "Khader Badran", email: to, phone: "+49 170 1234567",
      customerType: "private", jobs: ["Umzug", "Reinigung"], notes: "Selbsttest nach dem Deploy.", customerLocale: "de" } }) });
}

cases.push({ label: "sales-quote", run: () => mailer.send({ template: "sales-quote", to, locale: "de",
  payload: { number: "AN-" + ref, sender: "m.on", name: "Khader",
    lines: [{ description: "Umzug 60 m²", qty: 1, unitNet: 74498 }, { description: "Transportversicherung", qty: 1, unitNet: 3782 }],
    netAmount: money("744.98"), vatRate: "19", vatAmount: money("141.55"), totalGross: money("886.53"),
    validUntil: "2027-01-31", url: "https://moveongo.de/de/konto" } }) });

async function main() {
  let ok = 0, failed = 0;
  for (const c of cases) {
    try { await c.run(); console.log("  SENT   " + c.label); ok++; }
    catch (error) { console.log("  FAILED " + c.label + " — " + (error instanceof Error ? error.message : String(error))); failed++; }
  }
  console.log(`\n${ok}/${cases.length} sent to ${to}` + (failed ? `, ${failed} failed` : ""));
  await mailer.close();

}
void main();
