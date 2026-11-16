"use client";

import { useEffect, useRef } from "react";

/**
 * A small rich-text field for a job posting's sections: bold, italic, a
 * sub-heading, bullet and numbered lists, and links. It edits HTML in place
 * with the browser's own editing commands; the API strips anything outside
 * that set when the posting is saved, so pasted formatting from Word or a
 * website cannot reach the page.
 */

const TOOLS: { cmd: string; arg?: string; label: string; title: string; icon?: string }[] = [
  { cmd: "bold", label: "B", title: "Bold" },
  { cmd: "italic", label: "I", title: "Italic" },
  { cmd: "formatBlock", arg: "h3", label: "H", title: "Heading" },
  { cmd: "formatBlock", arg: "p", label: "¶", title: "Paragraph" },
  { cmd: "insertUnorderedList", label: "", title: "Bullet list", icon: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" },
  { cmd: "insertOrderedList", label: "", title: "Numbered list", icon: "M10 6h10M10 12h10M10 18h10M4 4.5h1.5V9M4 9h3M4 14.5c.5-.7 2.5-.9 2.5.5 0 1.2-2.5 1.6-2.5 3h2.6" },
  { cmd: "createLink", label: "", title: "Link", icon: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" },
];

export function RichTextEditor({
  value,
  onChange,
  label,
  hint,
  linkPrompt,
}: {
  value: string;
  onChange: (html: string) => void;
  label: string;
  hint?: string;
  /** Asked for a link's address; the dashboard has no prompt() dialog of its own. */
  linkPrompt: () => string | null;
}) {
  const box = useRef<HTMLDivElement>(null);

  // Load the value once per posting; afterwards the field owns its content,
  // so the caret is never thrown to the start by a re-render.
  useEffect(() => {
    if (box.current && box.current.innerHTML !== value) box.current.innerHTML = value;
    // New lines become <p> paragraphs rather than bare <div>s.
    document.execCommand("defaultParagraphSeparator", false, "p");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = (cmd: string, arg?: string) => {
    box.current?.focus();
    if (cmd === "createLink") {
      const url = linkPrompt()?.trim();
      if (!url) return;
      document.execCommand(cmd, false, /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`);
    } else {
      document.execCommand(cmd, false, arg);
    }
    onChange(box.current?.innerHTML ?? "");
  };

  return (
    <div className="a-field">
      <span>{label}</span>
      <div className="a-rte">
        <div className="a-rte-bar" role="toolbar" aria-label={label}>
          {TOOLS.map((tool) => (
            <button
              key={`${tool.cmd}-${tool.arg ?? ""}`}
              type="button"
              title={tool.title}
              aria-label={tool.title}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => run(tool.cmd, tool.arg)}
              style={tool.cmd === "bold" ? { fontWeight: 800 } : tool.cmd === "italic" ? { fontStyle: "italic" } : undefined}
            >
              {tool.icon ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={tool.icon} />
                </svg>
              ) : (
                tool.label
              )}
            </button>
          ))}
        </div>
        <div
          ref={box}
          className="a-rte-box"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          dir="auto"
          onInput={() => onChange(box.current?.innerHTML ?? "")}
        />
      </div>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}
