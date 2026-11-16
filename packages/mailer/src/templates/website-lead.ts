import type { RenderedTemplate } from "../types.js";
import { renderHtml, renderText, type LayoutBlock, type LayoutInput } from "./layout.js";

/**
 * A website form (partner request, …) to the office, in German. Any file the
 * sender uploaded travels as an attachment of this mail.
 */
export interface WebsiteLeadPayload {
  /** What the form was, in German: "Partneranfrage", … */
  kindLabel: string;
  name: string;
  company?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  message?: string | undefined;
  /** Every other answer, as "Label: value". */
  lines: readonly string[];
  /** The uploaded file's name, when there is one. */
  attachment?: string | undefined;
  locale: string;
  inboxUrl: string;
}

export function websiteLeadTemplate(payload: WebsiteLeadPayload): RenderedTemplate {
  const facts = [`Name: ${payload.name}`];
  if (payload.company) facts.push(`Firma: ${payload.company}`);
  if (payload.email) facts.push(`E-Mail: ${payload.email}`);
  if (payload.phone) facts.push(`Telefon: ${payload.phone}`);
  facts.push(...payload.lines, `Sprache: ${payload.locale}`);

  const blocks: LayoutBlock[] = [{ paragraph: `Über die Website ist eine neue ${payload.kindLabel} eingegangen.` }, { lines: facts }];
  if (payload.message) blocks.push({ paragraph: `Nachricht: ${payload.message}` });
  blocks.push({ paragraph: payload.attachment ? `Anhang: ${payload.attachment} (an diese E-Mail angehängt)` : "Kein Anhang." });
  blocks.push({ button: { label: "Im Website-Posteingang öffnen", url: payload.inboxUrl } });

  const layout: LayoutInput = { locale: "de", heading: `Neue ${payload.kindLabel}`, blocks, reason: "transaction" };

  return {
    subject: `Neue ${payload.kindLabel}: ${payload.company || payload.name}`,
    html: renderHtml(layout),
    text: renderText(layout),
  };
}
