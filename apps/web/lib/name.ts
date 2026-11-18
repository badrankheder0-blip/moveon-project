/**
 * A person's name as every form asks for it: first name and last name. The
 * API still keeps the whole name ("Vorname Nachname") next to the halves.
 */
export function splitName(full: string | null | undefined): { first: string; last: string } {
  const text = (full ?? "").trim().replace(/\s+/g, " ");
  const space = text.indexOf(" ");
  return space > 0 ? { first: text.slice(0, space), last: text.slice(space + 1) } : { first: text, last: "" };
}

export function joinName(first: string | null | undefined, last: string | null | undefined): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(" ");
}
