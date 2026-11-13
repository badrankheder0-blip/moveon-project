"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon } from "../Icons";
import { FaqBlock } from "./client";

/**
 * The FAQ pages' body (the prototype's v14 `#/faq` and `#/faq/<cat>`): a
 * search over every answer, then either a card per category — the FAQ's own
 * topics and each service's questions — or, on a category's page, a way back
 * and that category's questions. While a search is typed, the matching
 * questions of every category show instead, a line saying so when none do.
 */

export interface FaqCategory {
  slug: string;
  href: string;
  title: string;
  icon: string;
  items: { q: string; a: string }[];
}

export interface FaqHubCopy {
  placeholder: string;
  empty: string;
  one: string;
  many: string;
  cta: string;
  back: string;
  backHref: string;
}

export function FaqSearch({ copy, cats, selected }: { copy: FaqHubCopy; cats: FaqCategory[]; selected?: string | undefined }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = q
    ? cats.map((cat) => ({ ...cat, items: cat.items.filter((item) => `${item.q} ${item.a}`.toLowerCase().includes(q)) })).filter((cat) => cat.items.length)
    : [];
  const current = cats.find((cat) => cat.slug === selected);

  return (
    <>
      <section style={{ position: "relative" }}>
        <div className="mp-search">
          <label data-rv="1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d71635" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.placeholder} aria-label={copy.placeholder} />
          </label>
          {q && !results.length ? <p>{copy.empty}</p> : null}
        </div>
      </section>

      {q ? (
        results.map((cat) => (
          <section key={cat.slug} style={{ position: "relative" }}>
            <FaqBlock title={cat.title} items={cat.items} small />
          </section>
        ))
      ) : current ? (
        <>
          <section style={{ position: "relative" }}>
            <div className="mp-faq-back">
              <Link href={copy.backHref}>
                <svg className="m-flip" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
                {copy.back}
              </Link>
            </div>
          </section>
          <section style={{ position: "relative" }}>
            <FaqBlock key={current.slug} title={current.title} items={current.items} small />
          </section>
        </>
      ) : (
        <section style={{ position: "relative" }}>
          <div className="mp-faq-cats">
            {cats.map((cat) => (
              <Link key={cat.slug} href={cat.href} data-rv="1">
                <span className="mp-faq-cat-top">
                  <span>
                    <Icon d={cat.icon} size={21} width={1.9} />
                  </span>
                  <small>
                    {cat.items.length} {cat.items.length === 1 ? copy.one : copy.many}
                  </small>
                </span>
                <b>{cat.title}</b>
                <ul>
                  {cat.items.slice(0, 2).map((item, i) => (
                    <li key={i}>
                      <span />
                      <span>{item.q}</span>
                    </li>
                  ))}
                </ul>
                <span className="mp-faq-cat-cta">
                  {copy.cta}
                  <svg className="m-flip" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
