import { env } from "@mon/config";
import { toLocale, type Locale } from "@mon/core";
import { db, schema } from "@mon/db";
import {
  createLogTransport,
  createResendTransport,
  createSmtpTransport,
  escapeHtml,
  type MailTransport,
  type SentMail,
} from "@mon/mailer";
import { eq } from "drizzle-orm";

import { logger } from "../../lib/logger.js";
import type { CustomerSnapshot, InvoiceRow } from "./invoices.service.js";

const { messageTemplates, messageLog } = schema;

/**
 * The invoice and payment-reminder emails.
 *
 * The shared mailer only sends the templates registered in @mon/mailer, and
 * these two carry the office's own wording: the "invoice_sent" and
 * "payment_reminder" templates from Customer messages when they exist (sent
 * whether or not the automatic trigger is switched on, since pressing Send is
 * the trigger here), otherwise the defaults below. So the module keeps a transport of its own, built
 * from the same settings and created on the first invoice that is sent; in
 * development that is the log driver, which writes the message to the outbox
 * instead of sending it.
 */

export type InvoiceMailKind = "invoice" | "reminder";

/** The Customer messages template each email takes its wording from. */
const TEMPLATE_KEYS: Record<InvoiceMailKind, string[]> = {
  invoice: ["invoice_sent"],
  reminder: ["payment_reminder"],
};

let transport: MailTransport | null = null;

function invoiceTransport(): MailTransport {
  if (transport) return transport;

  if (env.MAIL_DRIVER === "resend") {
    transport = createResendTransport({ apiKey: env.RESEND_API_KEY!, from: env.MAIL_FROM, replyTo: env.MAIL_REPLY_TO });
  } else if (env.MAIL_DRIVER === "smtp") {
    transport = createSmtpTransport({
      host: env.SMTP_HOST!,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER!,
      password: env.SMTP_PASSWORD!,
      from: env.MAIL_FROM,
      replyTo: env.MAIL_REPLY_TO,
    });
  } else {
    transport = createLogTransport({ outboxDir: env.MAIL_OUTBOX_DIR });
  }

  return transport;
}

type Copy = { subject: string; body: string };

const DEFAULTS: Record<InvoiceMailKind, Record<Locale, Copy>> = {
  invoice: {
    de: {
      subject: "Ihre Rechnung {invoice} von {company}",
      body: "Hallo {name},\n\nvielen Dank für Ihren Auftrag {ref}.\nAnbei erhalten Sie Ihre Rechnung {invoice} über {total}, zahlbar bis {due}.\n\nViele Grüße\n{company}",
    },
    en: {
      subject: "Your invoice {invoice} from {company}",
      body: "Hello {name},\n\nthank you for your order {ref}.\nHere is your invoice {invoice} for {total}, due on {due}.\n\nKind regards\n{company}",
    },
    ar: {
      subject: "فاتورتك {invoice} من {company}",
      body: "مرحباً {name}،\n\nشكراً لطلبك {ref}.\nإليك فاتورتك {invoice} بقيمة {total}، تُستحق في {due}.\n\nمع التحية\n{company}",
    },
    tr: {
      subject: "{company} faturanız {invoice}",
      body: "Merhaba {name},\n\n{ref} numaralı siparişiniz için teşekkür ederiz.\n{total} tutarındaki {invoice} numaralı faturanız ektedir, son ödeme tarihi {due}.\n\nSaygılarımızla\n{company}",
    },
  },
  reminder: {
    de: {
      subject: "Zahlungserinnerung – Rechnung {invoice}",
      body: "Hallo {name},\n\nzu unserer Rechnung {invoice} über {total} (fällig am {due}) haben wir noch keinen Zahlungseingang gesehen.\nBitte überweisen Sie den Betrag in den nächsten Tagen.\n\nViele Grüße\n{company}",
    },
    en: {
      subject: "Payment reminder – invoice {invoice}",
      body: "Hello {name},\n\nwe have not yet received payment for invoice {invoice} of {total} (due on {due}).\nPlease transfer the amount in the next few days.\n\nKind regards\n{company}",
    },
    ar: {
      subject: "تذكير بالدفع – الفاتورة {invoice}",
      body: "مرحباً {name}،\n\nلم يصلنا بعد دفع الفاتورة {invoice} بقيمة {total} (المستحقة في {due}).\nنرجو تحويل المبلغ خلال الأيام القادمة.\n\nمع التحية\n{company}",
    },
    tr: {
      subject: "Ödeme hatırlatması – fatura {invoice}",
      body: "Merhaba {name},\n\n{total} tutarındaki {invoice} numaralı faturanın ödemesi (son ödeme tarihi {due}) henüz bize ulaşmadı.\nLütfen tutarı önümüzdeki günlerde havale edin.\n\nSaygılarımızla\n{company}",
    },
  },
};

const FACTS: Record<Locale, { number: string; date: string; due: string; amount: string; iban: string; purpose: string; paid: string; button: string; vat: string }> = {
  de: { number: "Rechnungsnummer", date: "Rechnungsdatum", due: "Fällig am", amount: "Rechnungsbetrag", iban: "IBAN", purpose: "Verwendungszweck", paid: "Bezahlt am", button: "Auftrag ansehen", vat: "inkl. {rate} % USt." },
  en: { number: "Invoice number", date: "Invoice date", due: "Due on", amount: "Amount", iban: "IBAN", purpose: "Payment reference", paid: "Paid on", button: "View your order", vat: "incl. {rate}% VAT" },
  ar: { number: "رقم الفاتورة", date: "تاريخ الفاتورة", due: "تاريخ الاستحقاق", amount: "المبلغ", iban: "IBAN", purpose: "مرجع التحويل", paid: "دُفعت في", button: "عرض طلبك", vat: "شامل ضريبة القيمة المضافة {rate}%" },
  tr: { number: "Fatura numarası", date: "Fatura tarihi", due: "Son ödeme", amount: "Tutar", iban: "IBAN", purpose: "Ödeme açıklaması", paid: "Ödeme tarihi", button: "Siparişinizi görüntüleyin", vat: "%{rate} KDV dahil" },
};

const euro = (value: string | number) =>
  `${(Number(value) || 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dayDe = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
};
const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? values[name]! : match));

interface TemplateRow {
  subject: Record<string, string | undefined>;
  body: Record<string, string | undefined>;
}

async function officeWording(kind: InvoiceMailKind): Promise<TemplateRow | null> {
  for (const key of TEMPLATE_KEYS[kind]) {
    try {
      const [row] = await db
        .select({ subject: messageTemplates.subject, body: messageTemplates.body })
        .from(messageTemplates)
        .where(eq(messageTemplates.key, key))
        .limit(1);
      if (row) return row as TemplateRow;
    } catch {
      // The defaults below are always good enough to send.
      return null;
    }
  }
  return null;
}

export interface InvoiceMailResult {
  sent: SentMail;
  to: string;
}

/**
 * Sends the invoice or a reminder to the customer and notes it in the
 * Customer messages log. Throws when the transport fails, so the caller does
 * not mark an invoice as sent that never left.
 */
export async function sendInvoiceMail(kind: InvoiceMailKind, invoice: InvoiceRow, orderLocale: string): Promise<InvoiceMailResult> {
  const customer = invoice.customer as CustomerSnapshot;
  const to = customer.email?.trim();
  if (!to) throw new Error("The invoice has no customer email address.");

  const locale = toLocale(orderLocale);
  const seller = invoice.seller;
  const company = seller.name ?? "m.on";
  const values: Record<string, string> = {
    name: customer.name.split(/\s+/)[0] ?? customer.name,
    fullName: customer.name,
    ref: customer.reference ?? "",
    invoice: invoice.number,
    total: euro(invoice.totalGross),
    due: dayDe(invoice.dueDate),
    date: dayDe(invoice.issueDate),
    iban: seller.iban ?? "",
    company,
    // The customer's account, where Customer messages links too.
    link: `${env.WEB_ORIGIN.replace(/\/+$/, "")}/${locale}/konto/auftraege/${invoice.orderId}`,
  };

  const own = await officeWording(kind);
  const fallback = DEFAULTS[kind][locale];
  const subject = fill(own?.subject[locale] || own?.subject.de || fallback.subject, values);
  const body = fill(own?.body[locale] || own?.body.de || fallback.body, values);

  const facts = FACTS[locale];
  const rows: [string, string][] = [
    [facts.number, invoice.number],
    [facts.date, dayDe(invoice.issueDate)],
    [facts.due, dayDe(invoice.dueDate)],
    [facts.amount, `${euro(invoice.totalGross)} (${fill(facts.vat, { rate: String(Number(invoice.vatRate)) })})`],
    ...(seller.iban ? ([[facts.iban, seller.iban], [facts.purpose, invoice.number]] as [string, string][]) : []),
  ];

  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = dir === "rtl" ? "right" : "left";
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:23px;color:#252b28;text-align:${align};">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const lineRows = invoice.lines
    .map((line) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eef0ea;font-size:13px;color:#4a514d;">${escapeHtml(line.label)}</td><td dir="ltr" style="padding:6px 0;border-bottom:1px solid #eef0ea;font-size:13px;text-align:right;white-space:nowrap;">${escapeHtml(euro(line.amount))}</td></tr>`)
    .join("");
  const factRows = rows
    .map(([label, value]) => `<tr><td style="padding:3px 0;font-size:13px;color:#737870;">${escapeHtml(label)}</td><td dir="ltr" style="padding:3px 0;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(value)}</td></tr>`)
    .join("");

  const html = `<!doctype html>
<html lang="${locale}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f5f5f0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f0;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<tr><td style="padding:0 0 18px;text-align:${align};"><span style="font:700 20px/1 Arial,sans-serif;color:#d71635;">${escapeHtml(company)}</span></td></tr>
<tr><td style="background:#ffffff;border:1px solid #e3e5de;border-radius:12px;padding:28px;">
${paragraphs}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px;background:#fafaf7;border:1px solid #e3e5de;border-radius:10px;padding:12px 16px;">${factRows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">${lineRows}</table>
<p style="margin:0;text-align:center;"><a href="${escapeHtml(values.link!)}" style="display:inline-block;padding:12px 24px;background:#d71635;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${escapeHtml(facts.button)}</a></p>
</td></tr>
<tr><td style="padding:16px 8px 0;font-size:12px;line-height:18px;color:#737870;text-align:${align};">${escapeHtml([company, seller.address, seller.email, seller.phone].filter(Boolean).join(" · "))}</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    body,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    ...invoice.lines.map((line) => `${line.label}: ${euro(line.amount)}`),
    "",
    `${facts.button}: ${values.link}`,
    "",
    "—",
    [company, seller.address, seller.email, seller.phone].filter(Boolean).join(" · "),
  ].join("\n");

  const templateKey = TEMPLATE_KEYS[kind][0]!;

  try {
    const sent = await invoiceTransport().send({
      to,
      subject,
      html,
      text,
      replyTo: env.MAIL_REPLY_TO ?? seller.email,
      tags: { template: `invoice-${kind}` },
    });

    logger.info({ template: `invoice-${kind}`, to, driver: sent.via, delivered: sent.delivered, invoice: invoice.number }, sent.delivered ? "Mail sent" : "Mail recorded but not sent");
    await db
      .insert(messageLog)
      .values({ templateKey, orderId: invoice.orderId, channel: "email", recipient: to, status: "sent" })
      .catch(() => undefined);

    return { sent, to };
  } catch (error) {
    logger.error({ template: `invoice-${kind}`, to, err: error, invoice: invoice.number }, "Mail could not be sent");
    await db
      .insert(messageLog)
      .values({ templateKey, orderId: invoice.orderId, channel: "email", recipient: to, status: "failed", error: error instanceof Error ? error.message.slice(0, 500) : "send failed" })
      .catch(() => undefined);
    throw error;
  }
}
