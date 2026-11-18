/**
 * A person's name, kept as the forms ask for it: first name and last name.
 *
 * The whole name ("Vorname Nachname") is still stored next to the halves,
 * because search, invoices and older screens read it as one line. A form that
 * sends only the whole name has it split once, at the first space.
 */

export interface NameParts {
  first: string;
  last: string;
}

export function splitName(full: string | null | undefined): NameParts {
  const text = (full ?? "").trim().replace(/\s+/g, " ");
  const space = text.indexOf(" ");
  return space > 0 ? { first: text.slice(0, space), last: text.slice(space + 1) } : { first: text, last: "" };
}

export function joinName(first: string | null | undefined, last: string | null | undefined): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(" ");
}

/** The halves sent, or the whole name split; and the whole name to store with them. */
export function nameParts(input: { first?: string | null | undefined; last?: string | null | undefined; full?: string | null | undefined }): NameParts & { full: string } {
  if (input.first?.trim() || input.last?.trim()) {
    const first = input.first?.trim() ?? "";
    const last = input.last?.trim() ?? "";
    return { first, last, full: joinName(first, last) };
  }
  const full = (input.full ?? "").trim().replace(/\s+/g, " ");
  return { ...splitName(full), full };
}

/** What a mail greets the person with: the first name when there is one. */
export function greetingName(first: string | null | undefined, full: string | null | undefined): string {
  return first?.trim() || splitName(full).first || "";
}
