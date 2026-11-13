"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";

import { useText } from "@/lib/admin/text";
import { useI18n } from "@/lib/i18n/provider";

import { Icon } from "./Icon";
import { IC } from "./model";
import { AC } from "./text";
import "./account.css";

/**
 * The sign-in card from the website prototype (#/login, #/signup, #/forgot):
 * a photo panel with the promise and four perks on one side, the form on the
 * other, with "Sign in | Create account" tabs above it. The two halves wrap
 * onto each other on a phone, photo first.
 *
 * Shared by every account door — password, code, reset link, address
 * confirmation — so they read as one place.
 */

/** The `?next=…` (and any other query) of this page, to carry between the doors. Read after mount, so the page still renders on the server. */
export function useCarriedQuery(): string {
  const [query, setQuery] = useState("");
  useEffect(() => setQuery(window.location.search), []);
  return query;
}

/** The destination asked for in `?next=`, when it is a path on this site. */
export function nextDestination(): string | null {
  if (typeof window === "undefined") return null;
  const next = new URLSearchParams(window.location.search).get("next");
  // Only a path here: an absolute or protocol-relative URL would make this an open redirect.
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function AuthCard({
  tab,
  title,
  sub,
  onSubmit,
  busy,
  children,
}: {
  /** Which tab is lit; null hides the tabs. */
  tab: "login" | "signup" | null;
  title: string;
  sub: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  busy?: boolean;
  children: ReactNode;
}) {
  const { locale } = useI18n();
  const tx = useText(AC);
  const query = useCarriedQuery();

  return (
    <section className="au-sec" data-screen-label="Sign in">
      <div className="au-card">
        <div className="au-panel">
          <img data-zoom="1" src="/images/mon/photos/admin-login.webp" alt="" aria-hidden="true" />
          <div className="au-shade" aria-hidden="true" />
          <div className="au-bar" aria-hidden="true" />
          <span className="au-eyebrow">{tx("auEyebrow")}</span>
          <h2 className="au-head">{tx("auHead")}</h2>
          <ul className="au-perks">
            {(["perk1", "perk2", "perk3", "perk4"] as const).map((key) => (
              <li key={key}>
                <span className="au-tick">
                  <Icon d={IC.check} size={12} sw={3} color="#ffffff" />
                </span>
                {tx(key)}
              </li>
            ))}
          </ul>
        </div>

        <div className="au-side">
          <form className="au-form" noValidate onSubmit={onSubmit} aria-busy={busy || undefined}>
            {tab ? (
              <div className="au-tabs">
                <Link href={`/${locale}/login${query}`} aria-current={tab === "login" ? "page" : undefined}>
                  {tx("signIn")}
                </Link>
                <Link href={`/${locale}/signup${query}`} aria-current={tab === "signup" ? "page" : undefined}>
                  {tx("signUp")}
                </Link>
              </div>
            ) : null}
            <div className="au-title">
              <h1>{title}</h1>
              <p>{sub}</p>
            </div>
            {children}
          </form>
        </div>
      </div>
    </section>
  );
}

/** One of the card's tall grey fields, with its icon inside. */
export function AuField({ label, icon, className, ...input }: { label: string; icon: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="au-field">
      {label}
      <span>
        <Icon d={icon} size={17} color="#92958e" />
        <input {...input} className={`au-input${className ? ` ${className}` : ""}`} />
      </span>
    </label>
  );
}

export function AuError({ text }: { text: string }) {
  return text ? (
    <p role="alert" className="au-err">
      {text}
    </p>
  ) : null;
}

export function AuSubmit({ label, busy }: { label: string; busy?: boolean }) {
  return (
    <button type="submit" className="au-submit" disabled={busy}>
      {label}
      <Icon d={IC.arrow} size={16} sw={2.2} flip />
    </button>
  );
}

export const FIELD_ICON = {
  email: IC.mail,
  pass: IC.lock,
  name: IC.users,
  phone: IC.phone,
  code: IC.key,
} as const;
