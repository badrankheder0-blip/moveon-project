import sanitizeHtml from "sanitize-html";

/**
 * The HTML a job posting's sections may hold.
 *
 * The dashboard's editor produces paragraphs, headings, lists, bold, italic and
 * links, and the website renders the stored HTML as is — so everything else is
 * stripped here, on the way in, whatever the editor (or a hand-made request)
 * sent. Links may only point at http(s) or mail addresses and always open
 * safely in a new tab.
 */
export function cleanRichText(html: string): string {
  const clean = sanitizeHtml(html, {
    allowedTags: ["p", "br", "h3", "h4", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a"],
    // target and rel are set by the transform below, never taken from the input.
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      b: "strong",
      i: "em",
      h1: "h3",
      h2: "h3",
      div: "p",
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
    exclusiveFilter: (frame) => frame.tag === "p" && !frame.text.trim() && !frame.mediaChildren.length,
  });

  // An editor left empty still sends "<p><br></p>"; that is no content.
  return clean.replace(/<p>(\s|<br\s*\/?>)*<\/p>/g, "").trim();
}
