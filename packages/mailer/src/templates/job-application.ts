import type { RenderedTemplate } from "../types.js";
import { renderHtml, renderText, type LayoutBlock, type LayoutInput } from "./layout.js";

/**
 * A job application, to the office.
 *
 * German only: it goes to the team, whatever language the applicant used. The
 * files are not attached — a CV is personal data and the mailbox is shared and
 * kept forever — so the mail links to the application in the dashboard, where
 * the files can be downloaded by someone signed in.
 */
export interface JobApplicationPayload {
  jobTitle: string;
  name: string;
  email: string;
  phone: string;
  address?: string | undefined;
  message?: string | undefined;
  /** One line per file: its name and size. */
  files: readonly string[];
  /** The applicant's site language. */
  locale: string;
  dashboardUrl: string;
}

export function jobApplicationTemplate(payload: JobApplicationPayload): RenderedTemplate {
  const facts = [
    `Stelle: ${payload.jobTitle}`,
    `Name: ${payload.name}`,
    `E-Mail: ${payload.email}`,
    `Telefon: ${payload.phone}`,
  ];
  if (payload.address) facts.push(`Adresse: ${payload.address}`);
  facts.push(`Sprache: ${payload.locale}`);

  const blocks: LayoutBlock[] = [
    { paragraph: "Über die Website ist eine neue Bewerbung eingegangen." },
    { lines: facts },
  ];
  if (payload.message) blocks.push({ paragraph: `Nachricht: ${payload.message}` });
  blocks.push({ paragraph: "Unterlagen:" }, { lines: payload.files });
  blocks.push({ button: { label: "Bewerbung im Dashboard öffnen", url: payload.dashboardUrl } });

  const layout: LayoutInput = {
    locale: "de",
    heading: "Neue Bewerbung",
    blocks,
    notice: "Die Unterlagen sind aus Datenschutzgründen nicht angehängt. Sie können sie im Dashboard herunterladen.",
    reason: "transaction",
  };

  return {
    subject: `Neue Bewerbung: ${payload.jobTitle} — ${payload.name}`,
    html: renderHtml(layout),
    text: renderText(layout),
  };
}
