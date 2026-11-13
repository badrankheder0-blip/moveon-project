import { env } from "@mon/config";
import { toLocale } from "@mon/core";
import {
  createLogTransport,
  createResendTransport,
  createSmtpTransport,
  escapeHtml,
  safeUrl,
  sanitizeUrl,
  type MailTransport,
  type SentMail,
} from "@mon/mailer";

import { logger } from "../../lib/logger.js";

/**
 * Emails whose words the office writes: the automatic customer messages and
 * the notification centre's announcements.
 *
 * The shared mailer only sends the templates registered in @mon/mailer, whose
 * copy lives in code; these messages are text an admin edits in the
 * dashboard. They go through the same transports (log in development, SMTP or
 * Resend in production) with the same driver choice, built once on first use,
 * and a deliberately plain layout: the text, an optional button, the sender.
 */

let transport: MailTransport | null = null;

function getTransport(): MailTransport {
  if (transport) return transport;

  const onAttempt = (attempt: { attempt: number; outcome: string; message?: string | undefined }) =>
    logger.debug({ scope: "mail" }, `freeform attempt ${attempt.attempt} ${attempt.outcome}${attempt.message ? `: ${attempt.message}` : ""}`);

  if (env.MAIL_DRIVER === "resend") {
    transport = createResendTransport({ apiKey: env.RESEND_API_KEY!, from: env.MAIL_FROM, replyTo: env.MAIL_REPLY_TO, onAttempt });
  } else if (env.MAIL_DRIVER === "smtp") {
    transport = createSmtpTransport({
      host: env.SMTP_HOST!,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER!,
      password: env.SMTP_PASSWORD!,
      from: env.MAIL_FROM,
      replyTo: env.MAIL_REPLY_TO,
      onAttempt,
    });
  } else {
    transport = createLogTransport({ outboxDir: env.MAIL_OUTBOX_DIR });
  }
  return transport;
}

export interface FreeformMail {
  to: string;
  subject: string;
  /** Plain text; blank lines separate paragraphs. */
  body: string;
  locale?: unknown;
  button?: { label: string; url: string } | null | undefined;
  /** Carried into logs and the outbox file name. */
  tag: string;
}

const FOOTER = {
  de: "Sie erhalten diese E-Mail von m.on. Fragen? Antworten Sie einfach auf diese E-Mail.",
  en: "You are receiving this email from m.on. Questions? Just reply to this email.",
  tr: "Bu e-postayı m.on'dan alıyorsunuz. Sorunuz mu var? Bu e-postayı yanıtlamanız yeterli.",
  ar: "وصلتك هذه الرسالة من m.on. عندك سؤال؟ رد على هذه الرسالة مباشرة.",
} as const;

function renderHtml(mail: FreeformMail): string {
  const locale = toLocale(mail.locale);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = dir === "rtl" ? "right" : "left";
  const paragraphs = mail.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#252b28">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const button =
    mail.button && sanitizeUrl(mail.button.url) !== "#"
      ? `<p style="margin:22px 0 6px"><a href="${safeUrl(mail.button.url)}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#d71635;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">${escapeHtml(mail.button.label)}</a></p>`
      : "";

  return `<!DOCTYPE html><html lang="${locale}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(mail.subject)}</title></head>
<body style="margin:0;padding:0;background:#f6f7f3">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f3"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e5de;border-radius:12px;overflow:hidden">
<tr><td style="height:5px;background:#d71635;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td dir="${dir}" style="padding:26px 28px 8px;text-align:${align};font-family:Helvetica,Arial,sans-serif">
<div style="font-size:20px;font-weight:700;color:#d71635;margin-bottom:18px">m.on</div>
${paragraphs}${button}
</td></tr>
<tr><td dir="${dir}" style="padding:14px 28px 24px;text-align:${align};font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#737870;border-top:1px solid #eef0ea">${escapeHtml(FOOTER[locale])}</td></tr>
</table></td></tr></table></body></html>`;
}

function renderText(mail: FreeformMail): string {
  const button = mail.button && sanitizeUrl(mail.button.url) !== "#" ? `\n\n${mail.button.label}: ${sanitizeUrl(mail.button.url)}` : "";
  return `${mail.body.trim()}${button}\n\n—\n${FOOTER[toLocale(mail.locale)]}`;
}

/** Sends one message; throws when the transport refuses it. */
export async function sendFreeformMail(mail: FreeformMail): Promise<SentMail> {
  const startedAt = Date.now();
  const sent = await getTransport().send({
    to: mail.to,
    subject: mail.subject,
    html: renderHtml(mail),
    text: renderText(mail),
    replyTo: env.MAIL_REPLY_TO,
    tags: { template: mail.tag },
  });
  logger.info(
    { template: mail.tag, to: mail.to, driver: sent.via, delivered: sent.delivered, durationMs: Date.now() - startedAt },
    sent.delivered ? "Mail sent" : "Mail recorded but not sent",
  );
  return sent;
}
