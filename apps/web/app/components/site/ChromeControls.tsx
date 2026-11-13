"use client";

import { useEffect, useId, useRef, useState } from "react";

import { LOCALE_META, LOCALES } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

/**
 * The interactive piece the nav bar and the footer share, and their icons.
 *
 * The footer is a server component — it reads the CMS — but the frames give it
 * the same language control as the header, and that needs the browser to open
 * a menu. Keeping it here means the footer stays server-rendered around one
 * small island, and the header and footer cannot drift apart.
 */

/**
 * The language control of 357:23886, drawn two ways.
 *
 * The header (357:23936) writes "العربية" in muted 16/24 with the globe after
 * it; the footer (357:24047) puts a black globe first and the language in
 * 14/18 ink — "English". The frames are drawn in English, and "العربية" is the
 * one other language the designer had in mind; the site has four, so a single
 * "switch to" label cannot name all of them. The button shows the language the
 * page is in, in its own script — which is what the footer draws — and opens a
 * menu of all four, so every locale stays one click away.
 */
export function LanguageMenu({
  variant = "header",
  placement = "below",
}: {
  variant?: "header" | "footer";
  /** The footer sits at the bottom of the page, so its menu opens upwards. */
  placement?: "below" | "above";
}) {
  const { t, locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Escape and a click elsewhere close it, the same as the account menu.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointerDown(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={`${t("nav.language")}: ${LOCALE_META[locale].label}`}
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center rounded-md whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow ${
          variant === "footer"
            ? "min-h-11 gap-4 text-body-sm leading-[18px] text-text-strong hover:text-brand-red"
            : "gap-1.5 text-body leading-6 text-text-faint hover:text-text-strong"
        }`}
      >
        {variant === "footer" ? <Globe strokeWidth={1.5} /> : null}
        <span lang={locale}>{LOCALE_META[locale].label}</span>
        {variant === "header" ? <Globe /> : null}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t("nav.language")}
          className={`absolute end-0 z-40 grid w-44 gap-1 rounded-xl border border-border-subtle bg-neutral-0 p-2 shadow-lg ${
            placement === "above" ? "bottom-full mb-3" : "top-full mt-3"
          }`}
        >
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              role="menuitemradio"
              aria-checked={code === locale}
              lang={code}
              onClick={() => {
                setOpen(false);
                if (code !== locale) setLocale(code);
              }}
              className={`rounded-md px-3 py-2 text-start text-body-sm font-semibold hover:bg-neutral-50 ${
                code === locale ? "text-brand-red" : "text-text-default hover:text-text-strong"
              }`}
            >
              {LOCALE_META[code].label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** vuesax/linear/global, 20px: a 1px stroke in the header, 1.5px in the footer. */
export function Globe({ strokeWidth = 1 }: { strokeWidth?: number }) {
  // The 24-unit glyph renders at 20px, so 1.2 units draw the frame's 1px.
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth * 1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
      <path d="M8 3h1a28.4 28.4 0 0 0 0 18H8M15 3a28.4 28.4 0 0 1 0 18" />
      <path d="M3 16v-1a28.4 28.4 0 0 0 18 0v1M3 9a28.4 28.4 0 0 1 18 0" />
    </svg>
  );
}

/** vuesax/linear/profile, 18px, 1.5px stroke. */
export function ProfileIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12.16 10.87a1.8 1.8 0 0 0-.33 0 4.42 4.42 0 0 1-4.27-4.43A4.43 4.43 0 0 1 12 2a4.43 4.43 0 0 1 .16 8.87Z" />
      <path d="M7.16 14.56c-2.42 1.62-2.42 4.26 0 5.87 2.75 1.84 7.26 1.84 10.01 0 2.42-1.62 2.42-4.26 0-5.87-2.74-1.83-7.25-1.83-10.01 0Z" />
    </svg>
  );
}
