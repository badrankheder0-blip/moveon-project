import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import type { Locale } from "@/lib/i18n/config";

import { Arrow, Icon } from "../Icons";
import { initialsOf, readItems, siteHref, type Copy } from "../links";
import { StoryBlock, type StoryData } from "../blocks/client";
import { CoverageMap } from "./Coverage";
import { AudienceTabs, CompareSlider, FaqList, HeroPanels, MythCards, ServicesCarousel } from "./Interactive";

/**
 * The homepage, section by section as the website prototype builds it:
 *
 *   hero panels · services · before & after · NRW coverage · moving types ·
 *   numbers · expectations · gallery · six reasons · moving day · reviews ·
 *   FAQ · guides · questions + quote
 *
 * Every word, photo and link is a row of the CMS section `home`
 * (packages/db/src/home-content.ts), so the office edits all of it from the
 * dashboard; a section whose rows are empty is left out rather than drawn
 * hollow.
 */

const SYMBOL = "/images/mon/home/symbol.webp";

/** The sections in the prototype's order: the keys the homepage editor saves. */
const DEFAULT_ORDER = ["hero", "services", "compare", "area", "audiences", "stats", "myths", "marquee", "why", "story", "reviews", "faq", "guides", "cta"];

/**
 * The homepage editor's order (`layout.order`) less what it switched off
 * (`layout.hidden`), both comma lists. A section the saved order does not
 * name (one added since) keeps its default place after the others.
 */
function sectionOrder(copy: Copy): string[] {
  const list = (slot: string) =>
    (copy[slot] ?? "")
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean);
  const saved = list("layout.order").filter((key) => DEFAULT_ORDER.includes(key));
  const hidden = new Set(list("layout.hidden"));
  return [...new Set([...saved, ...DEFAULT_ORDER])].filter((key) => !hidden.has(key));
}

export interface Testimonial {
  key: string;
  text: string;
  name: string;
  meta: string;
}

/**
 * `stories`: the moving day of every service, behind tabs (the prototype's
 * v14); without them the homepage's own moving day shows alone.
 */
export function HomePage({
  copy,
  locale,
  testimonials,
  stories = [],
}: {
  copy: Copy;
  locale: Locale;
  testimonials: Testimonial[];
  stories?: StoryData[];
}) {
  const c = (slot: string) => copy[slot]?.trim() ?? "";
  const href = (value: string) => siteHref(locale, value);

  const panels = readItems(copy, "hero", ["label", "title", "short", "href", "poster", "video"]).map((panel) => ({
    ...panel,
    href: href(panel.href),
  }));
  const cards = readItems(copy, "services", ["title", "link", "href", "img"]).map((card) => ({ ...card, href: href(card.href) }));
  const tabs = readItems(copy, "audiences", ["tab", "title", "body", "linkText", "linkHref", "after", "btn", "btnHref", "img"], {
    untrimmed: ["after"],
  }).map(
    (tab) => ({ ...tab, linkHref: href(tab.linkHref), btnHref: href(tab.btnHref) }),
  );
  const stats = readItems(copy, "stats", ["value", "label"]);
  const myths = readItems(copy, "myths", ["front", "back"]);
  const gallery = readItems(copy, "marquee", ["img", "label", "href"]);
  const reasons = readItems(copy, "why", ["title", "text", "img"]);
  const steps = readItems(copy, "story", ["time", "title", "text", "img"]);
  const faqs = readItems(copy, "faq", ["q", "a"]);
  const guides = readItems(copy, "guides", ["title", "excerpt", "minutes", "img", "icon", "href"]);
  const paragraphs = c("area.body")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = [gallery.slice(0, 6), gallery.slice(6)].filter((row) => row.length > 0);

  const blocks: Record<string, ReactNode> = {
    // Hero
    hero: panels.length ? (
      <section id="hero" style={{ position: "relative" }}>
        <HeroPanels panels={panels} cta={c("hero.cta")} symbol={SYMBOL} />
        {c("hero.slogan") ? (
          <div className="m-slogan" data-rv="1">
            <img src={c("hero.slogan")} alt={c("hero.sloganAlt")} />
          </div>
        ) : null}
      </section>
    ) : null,

    // Services
    services: cards.length ? (
      <section id="services" style={{ position: "relative" }}>
        <div className="m-sec">
          <div className="m-car-head" data-rv="1">
            <h2 className="m-h2">{c("services.title")}</h2>
            <p className="m-lead">{c("services.sub")}</p>
          </div>
          <ServicesCarousel cards={cards} />
        </div>
      </section>
    ) : null,

    // Before & after
    compare: c("compare.before") && c("compare.after") ? (
      <section id="compare" style={{ position: "relative" }}>
        <div className="m-wrap m-sec">
          <div className="m-head-c is-12" data-rv="1" style={{ maxWidth: 700 }}>
            <span className="m-eyebrow">{c("compare.eyebrow")}</span>
            <h2 className="m-h2 is-tight">{c("compare.title")}</h2>
            <p className="m-lead is-l">{c("compare.sub")}</p>
          </div>
          <CompareSlider
            before={c("compare.before")}
            after={c("compare.after")}
            beforeLabel={c("compare.beforeLabel")}
            afterLabel={c("compare.afterLabel")}
            label={c("compare.title")}
          />
        </div>
      </section>
    ) : null,

    // NRW coverage
    area: c("area.title") ? (
      <section id="area" style={{ position: "relative" }}>
        <div className="m-wrap m-sec m-split">
          <div data-rv="1" style={{ position: "relative" }}>
            {c("area.img") ? <CoverageMap map={c("area.img")} symbol={SYMBOL} /> : null}
          </div>
          <div className="m-split-text" data-rv="2">
            <span className="m-eyebrow">{c("area.eyebrow")}</span>
            <h2 className="m-h2">{c("area.title")}</h2>
            <div className="m-paras">
              {paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {c("area.link") ? (
              <Link href={href(c("area.href"))} className="m-arrow-link" style={{ marginTop: 4 }}>
                {c("area.link")}
                <Arrow />
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    ) : null,

    // Moving types
    audiences: tabs.length ? (
      <section id="audiences" style={{ position: "relative" }}>
        <div className="m-wrap m-sec" style={{ position: "relative" }}>
          <div className="m-head-c" data-rv="1" style={{ maxWidth: 640 }}>
            <span className="m-eyebrow">{c("audiences.eyebrow")}</span>
            <h2 className="m-h2" style={{ textWrap: "wrap" }}>
              {c("audiences.title")}
            </h2>
            <p className="m-lead">{c("audiences.sub")}</p>
          </div>
          <AudienceTabs tabs={tabs} />
        </div>
      </section>
    ) : null,

    // Numbers
    stats: stats.length ? (
      <section id="stats" style={{ position: "relative" }}>
        <div className="m-stats">
          {stats.map((stat, i) => (
            <div key={`${stat.value}-${i}`} className="m-stat" data-rv={(i % 4) + 1}>
              <span className="m-stat-ring" data-count={stat.value}>
                {stat.value}
              </span>
              <span className="m-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>
    ) : null,

    // Expectations
    myths: myths.length ? (
      <section id="expectations" style={{ position: "relative" }}>
        <div className="m-wrap m-sec">
          <div className="m-head-c is-12" data-rv="1" style={{ maxWidth: 700 }}>
            <span className="m-eyebrow">{c("myths.eyebrow")}</span>
            <h2 className="m-h2 is-tight">{c("myths.title")}</h2>
            <p className="m-lead is-l">{c("myths.sub")}</p>
          </div>
          <MythCards items={myths} frontLabel={c("myths.frontLabel")} backLabel={c("myths.backLabel")} hint={c("myths.hint")} symbol={SYMBOL} />
        </div>
      </section>
    ) : null,

    // Gallery
    marquee: rows.length ? (
      <section id="gallery" style={{ position: "relative" }}>
        <div className="m-marq">
          <div className="m-car-head" data-rv="1">
            <span className="m-eyebrow">{c("marquee.eyebrow")}</span>
            <h2 className="m-h2">{c("marquee.title")}</h2>
            <p className="m-lead">{c("marquee.sub")}</p>
          </div>
          <div className="m-marq-rows" dir="ltr">
            {rows.map((row, r) => (
              <div key={r} className={`m-marq-row${r === 1 ? " is-rev" : ""}`}>
                {[...row, ...row].map((item, i) => (
                  <Link
                    key={`${item.img}-${i}`}
                    href={href(item.href)}
                    className={`m-marq-item w${i % 3}`}
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    tabIndex={i >= row.length ? -1 : undefined}
                    aria-hidden={i >= row.length ? true : undefined}
                  >
                    <img src={item.img} alt="" loading="lazy" />
                    <span className="m-marq-shade" />
                    <span className="m-marq-label">
                      <i />
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    ) : null,

    // Six reasons
    why: reasons.length ? (
      <section id="why" style={{ position: "relative" }}>
        <div className="m-wrap m-sec m-why">
          <img className="m-why-mark" src={SYMBOL} alt="" aria-hidden="true" />
          <div className="m-why-head" data-rv="1">
            <span className="m-eyebrow">{c("why.eyebrow")}</span>
            <h2 className="m-h2">{c("why.title")}</h2>
            {c("why.sub") ? <p className="m-lead is-l">{c("why.sub")}</p> : null}
          </div>
          <div className="m-why-grid">
            {reasons.map((reason, i) => (
              <div key={`${reason.title}-${i}`} className="m-why-item" data-rv={(i % 4) + 1}>
                {reason.img ? (
                  <span className="m-why-img" data-tilt="1">
                    <img src={reason.img} alt="" loading="lazy" />
                    <span className="m-shade" />
                  </span>
                ) : null}
                <span className="m-num" dir="ltr">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3>{reason.title}</h3>
                <p>{reason.text}</p>
              </div>
            ))}
          </div>
          {c("why.link") ? (
            <Link href={href(c("why.href"))} className="m-arrow-link">
              {c("why.link")}
              <Arrow />
            </Link>
          ) : null}
        </div>
      </section>
    ) : null,

    // Moving day
    story: steps.length ? (
      <StoryBlock
        tabs
        stories={
          stories.length
            ? stories
            : [{ id: "moving", name: "", eyebrow: c("story.eyebrow"), title: c("story.title"), sub: c("story.sub"), steps }]
        }
      />
    ) : null,

    // Reviews
    reviews: testimonials.length ? (
      <section id="reviews" style={{ position: "relative" }}>
        <div className="m-wrap m-sec" style={{ position: "relative" }}>
          <div className="m-head-c" data-rv="1" style={{ maxWidth: 660 }}>
            <span className="m-eyebrow">{c("reviews.eyebrow")}</span>
            <h2 className="m-h2">{c("reviews.title")}</h2>
            {c("reviews.sub") ? <p className="m-lead">{c("reviews.sub")}</p> : null}
          </div>
          <div className="m-revs">
            {testimonials.map((review, i) => (
              <figure key={review.key} className="m-rev" data-rv={(i % 4) + 1}>
                <span className="m-rev-q" aria-hidden="true">
                  “
                </span>
                <blockquote>{review.text}</blockquote>
                <figcaption>
                  <span className="m-rev-ini">{initialsOf(review.name)}</span>
                  <span>
                    <b>{review.name}</b>
                    <small>{review.meta}</small>
                  </span>
                </figcaption>
                <img className="m-rev-mark" src={SYMBOL} alt="" aria-hidden="true" />
              </figure>
            ))}
          </div>
          {c("reviews.more") ? (
            <div className="m-revs-more">
              <Link href={href(c("reviews.moreHref"))} className="m-btn-outline">
                {c("reviews.more")}
                <Arrow />
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    ) : null,

    // FAQ
    faq: faqs.length ? (
      <section id="faqs" style={{ position: "relative" }}>
        <div className="m-faq">
          <div data-rv="1" style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
            {c("faq.eyebrow") ? (
              <Link href={href("/faq")} className="m-faq-pill">
                {c("faq.eyebrow")}
                <svg className="m-flip" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            ) : null}
            <h2 className="m-h2" style={{ textWrap: "wrap" }}>
              {c("faq.title")}
            </h2>
          </div>
          <FaqList items={faqs} />
        </div>
      </section>
    ) : null,

    // Guides
    guides: guides.length ? (
      <section id="guides" style={{ position: "relative" }}>
        <div className="m-wrap m-sec">
          <div className="m-guides-head" data-rv="1">
            <div>
              <span className="m-eyebrow">{c("guides.eyebrow")}</span>
              <h2 className="m-h2">{c("guides.title")}</h2>
            </div>
          </div>
          <div className="m-guides">
            {guides.map((guide, i) => (
              <Link key={`${guide.title}-${i}`} href={href(guide.href)} className="m-guide" data-tilt="1" data-rv={(i % 4) + 1}>
                <span className="m-guide-pic">
                  <img src={guide.img} alt="" />
                  {guide.icon ? (
                    <span className="m-guide-ic">
                      <Icon d={guide.icon} />
                    </span>
                  ) : null}
                </span>
                <span className="m-guide-body">
                  <b>{guide.title}</b>
                  <small>
                    {guide.excerpt}
                    {guide.minutes ? ` · ${guide.minutes} ${c("guides.readMin")}` : ""}
                  </small>
                  <span className="m-guide-more">
                    {c("guides.more")}
                    <Arrow />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    ) : null,

    // Questions + quote
    cta: c("cta.title") ? (
      <section id="quote" style={{ position: "relative" }}>
        <div className="m-wrap m-sec m-cta">
          {c("cta.qTitle") ? (
            <div className="m-cta-q" data-rv="1">
              <svg width="44" height="40" viewBox="0 0 44 40" fill="none" stroke="#d71635" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 4.5A2.5 2.5 0 0 1 5.5 2h20A2.5 2.5 0 0 1 28 4.5v13a2.5 2.5 0 0 1-2.5 2.5H12l-6 5v-5h-.5A2.5 2.5 0 0 1 3 17.5z" />
                <path d="M32 12h6.5a2.5 2.5 0 0 1 2.5 2.5v13a2.5 2.5 0 0 1-2.5 2.5H38v5l-6-5H19.5a2.5 2.5 0 0 1-2.5-2.5V24" />
              </svg>
              <h3>{c("cta.qTitle")}</h3>
              <p>{c("cta.qText")}</p>
              <Link href={href(c("cta.qHref"))} className="m-btn-outline">
                {c("cta.qBtn")}
                <Arrow />
              </Link>
            </div>
          ) : null}
          <div className="m-cta-red" data-rv="2" style={c("cta.qTitle") ? undefined : { gridColumn: "1 / -1" }}>
            <div>
              <span className="m-eyebrow">{c("cta.eyebrow")}</span>
              <h2 className="m-h2 is-tight">{c("cta.title")}</h2>
              <p>{c("cta.sub")}</p>
              <Link href={href(c("cta.href"))} className="m-cta-btn">
                {c("cta.btn")}
                <Arrow />
              </Link>
              <img className="m-cta-mark" data-par="1" src={SYMBOL} alt="" aria-hidden="true" />
            </div>
            {c("cta.img") ? <img src={c("cta.img")} alt="" /> : null}
          </div>
        </div>
      </section>
    ) : null,
  };

  return (
    <>
      {c("hero.headline") ? <h1 className="sr-only">{c("hero.headline")}</h1> : null}

      {/* In the order the homepage editor set, without the sections it switched off. */}
      {sectionOrder(copy).map((key) => (
        <Fragment key={key}>{blocks[key]}</Fragment>
      ))}
    </>
  );
}
