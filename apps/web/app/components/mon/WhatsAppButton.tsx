"use client";

import { useI18n } from "@/lib/i18n/provider";

/**
 * The floating green button in the corner of every public page: a plain link
 * that opens a WhatsApp chat with the business number (wa.me). No bot, no
 * panel — it replaced the support assistant.
 *
 * The number is Settings → Company → WhatsApp number (`contact.whatsapp`);
 * without one the button is not shown.
 */

const LABEL: Record<string, string> = {
  de: "WhatsApp schreiben",
  en: "Message us on WhatsApp",
  ar: "راسلنا على واتساب",
  tr: "WhatsApp'tan yazın",
};

/** WhatsApp's mark, as one path. */
const MARK =
  "M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1a8.2 8.2 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.4-.5.3-.5a.5.5 0 0 0 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1.1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.5 13.5 0 0 0 5.2 4.6c.7.3 1.3.5 1.7.6a4.2 4.2 0 0 0 1.9.1 3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.2-.3-.3-.6-.4zM12 21.8a9.9 9.9 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.9 9.9 0 1 1 12 21.8z";

export function WhatsAppButton({ number }: { number?: string | undefined }) {
  const { locale } = useI18n();
  const digits = (number ?? "").replace(/[^\d]/g, "").replace(/^00/, "");
  if (digits.length < 8) return null;
  const label = LABEL[locale] ?? LABEL.de!;

  return (
    <a className="m-fab" href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" aria-label={label}>
      <span className="m-fab-label">{label}</span>
      <span className="m-fab-ic">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d={MARK} />
        </svg>
      </span>
    </a>
  );
}
