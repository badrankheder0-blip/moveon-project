import type { Locale } from "@mon/core";

import type { RenderedTemplate } from "../types.js";
import { renderHtml, renderText, type LayoutBlock, type LayoutInput } from "./layout.js";

/**
 * A request the team prices by hand: a site visit, or work the planner could
 * not quote on its own (renovation, counted junk removal, special glass).
 *
 * Two audiences, one template. The customer gets a confirmation in their own
 * language; the team gets the same facts in German, because the office reads
 * German whatever language the customer booked in.
 */
export interface ServiceRequestPayload {
  audience: "customer" | "team";
  reference: string;
  name: string;
  /** The halves of `name`; the customer's copy greets by the first. */
  firstName?: string | undefined;
  lastName?: string | undefined;
  email: string;
  phone: string;
  company?: string | undefined;
  /** "private" or "business". */
  customerType: string;
  /** One line per job: what, where, when, and the customer's own answers. */
  jobs: readonly string[];
  notes?: string | undefined;
  /** The locale the customer used, so the team knows which language to reply in. */
  customerLocale?: string | undefined;
}

interface Copy {
  subject: (reference: string) => string;
  heading: string;
  intro: string;
  next: string;
  labels: { reference: string; contact: string; company: string; jobs: string; notes: string };
}

const GREETINGS: Record<Locale, (name: string) => string> = {
  de: (n) => `Hallo ${n},`,
  en: (n) => `Hello ${n},`,
  ar: (n) => `مرحباً ${n}،`,
  tr: (n) => `Merhaba ${n},`,
};

const CUSTOMER: Record<Locale, Copy> = {
  de: {
    subject: (r) => `Ihre Anfrage ist eingegangen — ${r}`,
    heading: "Danke, wir haben Ihre Anfrage",
    intro: "Wir prüfen Ihre Angaben und melden uns innerhalb von 48 Stunden, um den Termin zu bestätigen.",
    next: "Den Preis für diese Leistungen erhalten Sie nach der Besichtigung bzw. nach unserer Prüfung.",
    labels: { reference: "Referenz", contact: "Kontakt", company: "Firma", jobs: "Ihre Anfrage", notes: "Hinweise" },
  },
  en: {
    subject: (r) => `We've received your request — ${r}`,
    heading: "Thank you, your request is with us",
    intro: "We'll check your details and contact you within 48 hours to confirm the appointment.",
    next: "You'll receive the price for these services after the site visit or our review.",
    labels: { reference: "Reference", contact: "Contact", company: "Company", jobs: "Your request", notes: "Notes" },
  },
  ar: {
    subject: (r) => `وصلنا طلبك — ${r}`,
    heading: "شكراً لك، طلبك وصلنا",
    intro: "سنراجع بياناتك ونتواصل معك خلال 48 ساعة لتأكيد الموعد.",
    next: "ستحصل على سعر هذه الخدمات بعد زيارة الموقع أو بعد مراجعتنا.",
    labels: { reference: "رقم الطلب", contact: "التواصل", company: "الشركة", jobs: "طلبك", notes: "ملاحظات" },
  },
  tr: {
    subject: (r) => `Talebinizi aldık — ${r}`,
    heading: "Teşekkürler, talebiniz bize ulaştı",
    intro: "Bilgilerinizi kontrol edip randevuyu onaylamak için 48 saat içinde sizinle iletişime geçeceğiz.",
    next: "Bu hizmetlerin fiyatını yerinde inceleme veya değerlendirmemizden sonra alacaksınız.",
    labels: { reference: "Referans", contact: "İletişim", company: "Firma", jobs: "Talebiniz", notes: "Notlar" },
  },
};

const TEAM: Copy = {
  subject: (r) => `Neue Anfrage aus dem Buchungsplaner — ${r}`,
  heading: "Neue Anfrage",
  intro: "Über den Buchungsplaner ist eine Anfrage eingegangen, die von Hand bepreist werden muss.",
  next: "Bitte innerhalb von 48 Stunden Kontakt aufnehmen und den Termin bestätigen.",
  labels: { reference: "Referenz", contact: "Kontakt", company: "Firma", jobs: "Aufträge", notes: "Hinweise" },
};

export function serviceRequestTemplate(
  payload: ServiceRequestPayload,
  locale: Locale,
): RenderedTemplate {
  const team = payload.audience === "team";
  const copy = team ? TEAM : CUSTOMER[locale];
  const layoutLocale: Locale = team ? "de" : locale;

  const split = Boolean(payload.firstName || payload.lastName);
  const contact = [team && split ? "" : payload.name, payload.email, payload.phone].filter(Boolean).join(" · ");

  const facts = [`${copy.labels.reference}: ${payload.reference}`];
  if (team && split) facts.push(`Vorname: ${payload.firstName || "—"}`, `Nachname: ${payload.lastName || "—"}`);
  facts.push(`${copy.labels.contact}: ${contact}`);
  if (payload.company) facts.push(`${copy.labels.company}: ${payload.company}`);
  if (team) {
    facts.push(`Kundentyp: ${payload.customerType === "business" ? "Geschäftskunde" : "Privatkunde"}`);
    if (payload.customerLocale) facts.push(`Sprache: ${payload.customerLocale}`);
  }

  const greetName = payload.firstName?.trim() || payload.name.trim().split(/\s+/)[0] || "";
  const blocks: LayoutBlock[] = [
    ...(!team && greetName ? [{ paragraph: GREETINGS[locale](greetName) }] : []),
    { paragraph: copy.intro },
    { lines: facts },
    { paragraph: `${copy.labels.jobs}:` },
    { lines: payload.jobs },
  ];

  if (payload.notes) blocks.push({ paragraph: `${copy.labels.notes}: ${payload.notes}` });
  blocks.push({ paragraph: copy.next });

  const layout: LayoutInput = {
    locale: layoutLocale,
    heading: copy.heading,
    blocks,
    reason: "transaction",
  };

  return {
    subject: copy.subject(payload.reference),
    html: renderHtml(layout),
    text: renderText(layout),
  };
}
