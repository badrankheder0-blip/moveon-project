import { formatCalendarDate, formatCurrency, type Locale } from "@mon/core";

import type { RenderedTemplate } from "../types.js";
import { renderHtml, renderText, type LayoutBlock, type LayoutInput } from "./layout.js";

/**
 * A hand-priced quote (Angebot) the office sends from the dashboard: the lines
 * it priced after the site visit, net, VAT and the total, and how long the
 * offer stands. The customer accepts by replying, as the admin prototype's
 * own quote mail asks them to.
 */
export interface SalesQuotePayload {
  /** "AN-2026-0001". */
  number: string;
  name?: string | undefined;
  /** Who the offer is from, for the sign-off: the company name in the settings. */
  sender: string;
  lines: ReadonlyArray<{ description: string; qty: number; unitNet: number }>;
  /** Decimal strings, as the API computes them. */
  netAmount: string;
  vatRate: string;
  vatAmount: string;
  totalGross: string;
  /** "YYYY-MM-DD". */
  validUntil?: string | undefined;
  /** Where the customer can reach the office, e.g. the contact page. */
  url?: string | undefined;
}

interface Copy {
  subject: (number: string, sender: string) => string;
  heading: string;
  greeting: (name: string) => string;
  intro: string;
  net: string;
  vat: (rate: string) => string;
  total: string;
  valid: (date: string) => string;
  accept: string;
  button: string;
  regards: string;
}

const COPY: Record<Locale, Copy> = {
  de: {
    subject: (n, s) => `Angebot ${n} · ${s}`,
    heading: "Ihr Angebot",
    greeting: (n) => `Guten Tag ${n},`,
    intro: "vielen Dank für Ihre Anfrage. Gerne bieten wir Ihnen Folgendes an:",
    net: "Nettobetrag",
    vat: (r) => `zzgl. ${r} % USt.`,
    total: "Angebotssumme",
    valid: (d) => `Das Angebot ist gültig bis zum ${d}.`,
    accept: "Antworten Sie einfach auf diese E-Mail, um das Angebot anzunehmen.",
    button: "Kontakt aufnehmen",
    regards: "Mit freundlichen Grüßen",
  },
  en: {
    subject: (n, s) => `Quote ${n} · ${s}`,
    heading: "Your quote",
    greeting: (n) => `Hello ${n},`,
    intro: "thank you for your enquiry. We are happy to offer you the following:",
    net: "Net amount",
    vat: (r) => `plus ${r} % VAT`,
    total: "Quote total",
    valid: (d) => `This quote is valid until ${d}.`,
    accept: "Simply reply to this email to accept the quote.",
    button: "Contact us",
    regards: "Kind regards",
  },
  ar: {
    subject: (n, s) => `عرض السعر ${n} · ${s}`,
    heading: "عرض السعر الخاص بك",
    greeting: (n) => `مرحباً ${n}،`,
    intro: "شكراً لطلبك. يسعدنا أن نقدّم لك العرض التالي:",
    net: "المبلغ الصافي",
    vat: (r) => `ضريبة القيمة المضافة ${r}%`,
    total: "إجمالي العرض",
    valid: (d) => `العرض صالح حتى ${d}.`,
    accept: "للموافقة على العرض، ردّ على هذه الرسالة مباشرة.",
    button: "تواصل معنا",
    regards: "مع أطيب التحيات",
  },
  tr: {
    subject: (n, s) => `Teklif ${n} · ${s}`,
    heading: "Teklifiniz",
    greeting: (n) => `Merhaba ${n},`,
    intro: "talebiniz için teşekkür ederiz. Size aşağıdaki teklifi sunmaktan memnuniyet duyarız:",
    net: "Net tutar",
    vat: (r) => `+ %${r} KDV`,
    total: "Teklif toplamı",
    valid: (d) => `Bu teklif ${d} tarihine kadar geçerlidir.`,
    accept: "Teklifi kabul etmek için bu e-postayı yanıtlamanız yeterli.",
    button: "Bize ulaşın",
    regards: "Saygılarımızla",
  },
};

/** "19.00" → "19", "7.50" → "7.5": a rate reads as a person writes it. */
function rate(value: string): string {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? String(n) : value;
}

export function salesQuoteTemplate(payload: SalesQuotePayload, locale: Locale): RenderedTemplate {
  const copy = COPY[locale];
  const money = (n: number | string) => formatCurrency(n, locale);

  const blocks: LayoutBlock[] = [];
  if (payload.name) blocks.push({ paragraph: copy.greeting(payload.name) });
  blocks.push({ paragraph: copy.intro });

  blocks.push({
    lines: payload.lines.map(
      (line) => `${line.description || "—"}: ${line.qty} × ${money(line.unitNet)} = ${money(line.qty * line.unitNet)}`,
    ),
  });

  blocks.push({
    lines: [
      `${copy.net}: ${money(payload.netAmount)}`,
      `${copy.vat(rate(payload.vatRate))}: ${money(payload.vatAmount)}`,
      `${copy.total}: ${money(payload.totalGross)}`,
    ],
  });

  if (payload.validUntil) {
    blocks.push({ paragraph: copy.valid(formatCalendarDate(payload.validUntil, locale)) });
  }
  blocks.push({ paragraph: copy.accept });
  if (payload.url) blocks.push({ button: { label: copy.button, url: payload.url } });
  // Two paragraphs: HTML would fold a newline inside one into a space.
  blocks.push({ paragraph: copy.regards }, { paragraph: payload.sender });

  const layout: LayoutInput = {
    locale,
    heading: `${copy.heading} ${payload.number}`,
    blocks,
    reason: "transaction",
  };

  return {
    subject: copy.subject(payload.number, payload.sender),
    html: renderHtml(layout),
    text: renderText(layout),
  };
}
