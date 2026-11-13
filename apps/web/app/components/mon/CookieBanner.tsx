"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CONSENT_KEY } from "@/app/components/site/ConsentBar";
import type { Locale } from "@/lib/i18n/config";

import type { Copy } from "./links";

/**
 * The cookie card in the corner, as the prototype draws it.
 *
 * Records the same choice under the same key as the cookie page's own band,
 * so deciding in either place settles both. Shown only once the browser has
 * been asked, so a visitor who already chose never sees it flash.
 */
export function CookieBanner({ copy, locale }: { copy: Copy; locale: Locale }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(!localStorage.getItem(CONSENT_KEY));
    } catch {
      setShow(false);
    }
  }, []);

  const decide = (value: "all" | "essential") => {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Without storage the card simply comes back on the next visit.
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="m-ck" role="dialog" aria-label={copy["cookie.title"]}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span className="m-ck-ic">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5zM8.5 8.5h.01M16 15.5h.01M11 17h.01M7 13h.01" />
          </svg>
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <b>{copy["cookie.title"]}</b>
          <p>
            {copy["cookie.text"]}{" "}
            <Link href={`/${locale}/datenschutz`} style={{ fontWeight: 600 }}>
              {copy["cookie.more"]}
            </Link>
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="m-ck-all" onClick={() => decide("all")}>
          {copy["cookie.all"]}
        </button>
        <button type="button" className="m-ck-min" onClick={() => decide("essential")}>
          {copy["cookie.necessary"]}
        </button>
      </div>
    </div>
  );
}
