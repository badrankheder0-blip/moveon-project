"use client";

import { useEffect, useState } from "react";

import { CONSENT_KEY } from "@/app/components/site/ConsentBar";

/**
 * The cookie page's own choice, drawn as the cookie card in the corner but
 * in the page: it records the same choice under the same key, so a visitor
 * can change their mind here after the card has gone.
 */
export function CookieChoice({
  title,
  body,
  accept,
  reject,
  privacyHref,
}: {
  title: string;
  /** `[[words]]` marks the link to the privacy policy. */
  body: string;
  accept: string;
  reject: string;
  privacyHref: string;
}) {
  const [choice, setChoice] = useState<string | null>(null);

  useEffect(() => {
    try {
      setChoice(localStorage.getItem(CONSENT_KEY));
    } catch {
      setChoice(null);
    }
  }, []);

  const decide = (value: "all" | "essential") => {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Without storage the choice lasts for this page only.
    }
    setChoice(value);
  };

  if (!title) return null;

  return (
    <div className="m-ck" style={{ position: "static", width: "auto", boxShadow: "0 14px 34px #1d22200f" }} data-rv="1">
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span className="m-ck-ic">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5zM8.5 8.5h.01M16 15.5h.01M11 17h.01M7 13h.01" />
          </svg>
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <b>{title}</b>
          <p>
            {body.split(/\[\[(.+?)\]\]/).map((part, i) =>
              i % 2 ? (
                <a key={i} href={privacyHref} style={{ fontWeight: 600 }}>
                  {part}
                </a>
              ) : (
                part
              ),
            )}
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="m-ck-all" aria-pressed={choice === "all"} onClick={() => decide("all")}>
          {accept}
        </button>
        <button type="button" className="m-ck-min" aria-pressed={choice === "essential"} onClick={() => decide("essential")}>
          {reject}
        </button>
      </div>
    </div>
  );
}
