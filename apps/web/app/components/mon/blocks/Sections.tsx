import { Fragment, type ReactNode } from "react";

import { Arrow, Icon } from "../Icons";
import { CoverageMap } from "../home/Coverage";
import { AudienceTabs, CompareSlider, MythCards, type AudienceTab } from "../home/Interactive";
import { ArrowLink, BULB, BULB2, SYMBOL, SmartLink, Tick, pad2, type LinkSpec } from "./kit";

/**
 * The prototype's server-drawn blocks (splitB, cardsB with its photo cards,
 * gridB, the pricing, article, legal and closing blocks). Each takes resolved words,
 * hrefs and photos; the pages read those from the CMS.
 */

// ── Split: a photo (or the NRW map) beside a text with ticks ─────────────

export function Split({
  eyebrow,
  title,
  paras,
  bullets = [],
  link,
  img,
  map = false,
  flip = false,
}: {
  eyebrow: string;
  title: string;
  paras: string[];
  bullets?: string[];
  link?: LinkSpec | undefined;
  img: string;
  map?: boolean;
  flip?: boolean;
}) {
  return (
    <section style={{ position: "relative" }}>
      <div className={`mp-sec mp-split${flip ? " is-flip" : ""}`}>
        <div data-rv="1">{map ? <CoverageMap map={img} symbol={SYMBOL} /> : img ? <img className="mp-split-img" src={img} alt="" /> : null}</div>
        <div className="mp-split-text" data-rv="2">
          <span className="m-eyebrow">{eyebrow}</span>
          <h2 className="m-h2">{title}</h2>
          <div className="m-paras">
            {paras.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
          {bullets.length ? (
            <ul className="mp-ticks">
              {bullets.map((bullet, i) => (
                <li key={i}>
                  <span>
                    <Tick />
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>
          ) : null}
          {link?.label ? <ArrowLink link={link} /> : null}
        </div>
      </div>
    </section>
  );
}

// ── Cards: numbered with photos, or white cards with an icon ─────────────

export interface CardItem {
  icon?: string;
  title: string;
  text: string;
  img?: string;
  /** Where a photo card's picture is anchored (CSS object-position). */
  pos?: string;
  href?: string;
  more?: string;
}

export function Cards({
  id,
  eyebrow,
  title,
  sub,
  center = false,
  numbered = false,
  imaged = false,
  minW,
  items,
  link,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  sub?: string;
  center?: boolean;
  numbered?: boolean;
  /** Photo cards: a 16:10 picture with the icon in its red corner (v14 "What's included"). */
  imaged?: boolean;
  minW?: string;
  items: CardItem[];
  link?: LinkSpec | undefined;
}) {
  if (!items.length) return null;
  return (
    <section id={id} style={{ position: "relative" }}>
      <div className="mp-sec">
        <img className="m-why-mark" src={SYMBOL} alt="" aria-hidden="true" />
        <div className={`mp-cards-head${center ? " is-center" : ""}`} data-rv="1">
          <span className="m-eyebrow">{eyebrow}</span>
          <h2 className="m-h2">{title}</h2>
          {sub ? <p>{sub}</p> : null}
        </div>
        <div className={`mp-cards${numbered ? " is-num" : ""}`} style={{ ["--min" as string]: minW ?? (numbered ? "300px" : "260px") }}>
          {items.map((item, i) =>
            numbered ? (
              <div key={i} className="m-why-item" data-rv={(i % 4) + 1}>
                {item.img ? (
                  <span className="m-why-img" data-tilt="1">
                    <img src={item.img} alt="" loading="lazy" />
                    <span className="m-shade" />
                    <span className="m-corner" />
                  </span>
                ) : null}
                <span className="m-num" dir="ltr">
                  {pad2(i)}
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ) : imaged ? (
              <PhotoCard key={i} item={item} rv={(i % 4) + 1} />
            ) : (
              <IconCard key={i} item={item} rv={(i % 4) + 1} />
            ),
          )}
        </div>
        {link?.label ? <ArrowLink link={link} /> : null}
      </div>
    </section>
  );
}

function PhotoCard({ item, rv }: { item: CardItem; rv: number }) {
  const body = (
    <>
      <span className="mp-pcard-pic">
        {item.img ? <img src={item.img} alt={item.title} loading="lazy" style={item.pos ? { objectPosition: item.pos } : undefined} /> : null}
        <span>{item.icon ? <Icon d={item.icon} size={17} width={1.9} /> : null}</span>
      </span>
      <span className="mp-pcard-body">
        <h3>{item.title}</h3>
        <p>{item.text}</p>
      </span>
    </>
  );
  return item.href ? (
    <SmartLink href={item.href} className="mp-pcard" data-rv={rv}>
      {body}
    </SmartLink>
  ) : (
    <div className="mp-pcard" data-rv={rv}>
      {body}
    </div>
  );
}

function IconCard({ item, rv }: { item: CardItem; rv: number }) {
  const body = (
    <>
      <span className="mp-card-ic">{item.icon ? <Icon d={item.icon} size={22} /> : null}</span>
      <h3>{item.title}</h3>
      <p>{item.text}</p>
      {item.more ? (
        <span className="mp-card-more">
          {item.more}
          <Arrow />
        </span>
      ) : null}
    </>
  );
  return item.href ? (
    <SmartLink href={item.href} className="mp-card" data-rv={rv}>
      {body}
    </SmartLink>
  ) : (
    <div className="mp-card" data-rv={rv}>
      {body}
    </div>
  );
}

// ── Grid of photo cards: related services, guides ────────────────────────

export interface GridItem {
  href: string;
  img: string;
  icon?: string;
  name: string;
  short: string;
}

export function PhotoGrid({
  eyebrow,
  title,
  items,
  more,
  minW = "300px",
  ratio = "4 / 3",
}: {
  eyebrow: string;
  title: string;
  items: GridItem[];
  more: string;
  minW?: string;
  ratio?: string;
}) {
  if (!items.length) return null;
  return (
    <section style={{ position: "relative" }}>
      <div className="mp-sec">
        <div className="m-guides-head" data-rv="1">
          <div>
            <span className="m-eyebrow">{eyebrow}</span>
            <h2 className="m-h2">{title}</h2>
          </div>
        </div>
        <div className="m-guides" style={{ gridTemplateColumns: `repeat(auto-fit,minmax(min(100%,${minW}),1fr))` }}>
          {items.map((item, i) => (
            <SmartLink key={`${item.href}-${i}`} href={item.href} className="m-guide" data-tilt="1" data-rv={(i % 4) + 1}>
              <span className="m-guide-pic" style={{ aspectRatio: ratio }}>
                <img src={item.img} alt="" />
                {item.icon ? (
                  <span className="m-guide-ic">
                    <Icon d={item.icon} />
                  </span>
                ) : null}
              </span>
              <span className="m-guide-body">
                <b>{item.name}</b>
                <small>{item.short}</small>
                <span className="m-guide-more">
                  {more}
                  <Arrow />
                </span>
              </span>
            </SmartLink>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How the price is made up ─────────────────────────────────────────────

export function PriceFactors({
  eyebrow,
  title,
  sub,
  img,
  factors,
  btn,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  img?: string | undefined;
  factors: string[];
  btn?: LinkSpec | undefined;
}) {
  if (!title) return null;
  return (
    <section style={{ position: "relative" }}>
      <div className="mp-sec">
        <div className="mp-price" data-rv="1">
          <div className="mp-price-media">
            {img ? <img data-zoom="1" src={img} alt="" /> : null}
            <span aria-hidden="true" />
          </div>
          <div className="mp-price-body">
            <span className="m-eyebrow">{eyebrow}</span>
            <h2 className="m-h2">{title}</h2>
            <p>{sub}</p>
            <ul>
              {factors.map((factor, i) => (
                <li key={i}>
                  <span dir="ltr">{pad2(i)}</span>
                  {factor}
                </li>
              ))}
            </ul>
            {btn?.label ? (
              <SmartLink href={btn.href} className="mp-price-btn">
                {btn.label}
                <Arrow size={15} />
              </SmartLink>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Guides: the cards of the list, the article, the longer article ───────

export interface ArticleCard {
  href: string;
  img: string;
  cat: string;
  read: string;
  title: string;
  excerpt: string;
}

export function ArticleCards({
  items,
  more,
  head,
  pt = "clamp(56px,6vw,88px)",
}: {
  items: ArticleCard[];
  more: string;
  head?: { eyebrow: string; title: string } | undefined;
  pt?: string;
}) {
  if (!items.length) return null;
  return (
    <section style={{ position: "relative" }}>
      <div className="mp-sec" style={{ paddingTop: pt }}>
        {head ? (
          <div className="mp-arts-head" data-rv="1">
            <span className="m-eyebrow">{head.eyebrow}</span>
            <h2 className="m-h2">{head.title}</h2>
          </div>
        ) : null}
        <div className="mp-arts">
          {items.map((item, i) => (
            <SmartLink key={`${item.href}-${i}`} href={item.href} className="mp-art" data-tilt="1" data-rv={(i % 4) + 1}>
              <span className="mp-art-pic">
                <img src={item.img} alt="" loading="lazy" />
                {item.cat ? <span>{item.cat}</span> : null}
              </span>
              <span className="mp-art-body">
                <small>{item.read}</small>
                <b>{item.title}</b>
                <small>{item.excerpt}</small>
                <span className="m-guide-more">
                  {more}
                  <Arrow />
                </span>
              </span>
            </SmartLink>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ArticleBody({ secs, tipLabel, tip }: { secs: { h: string; p: string }[]; tipLabel: string; tip: string }) {
  return (
    <section style={{ position: "relative" }}>
      <article className="mp-article">
        {secs.map((sec, i) => (
          <div key={i} className="mp-article-sec" data-rv="1">
            <span dir="ltr">{pad2(i)}</span>
            <div>
              <h2>{sec.h}</h2>
              <p>{sec.p}</p>
            </div>
          </div>
        ))}
        {tip ? (
          <div className="mp-tip" data-rv="1">
            <span>
              <Icon d={BULB} size={18} width={2} />
            </span>
            <div>
              <b>{tipLabel}</b>
              <p>{tip}</p>
            </div>
          </div>
        ) : null}
      </article>
    </section>
  );
}

export function ArticleWithAside({
  secs,
  tipLabel,
  tip,
  related,
  book,
}: {
  secs: { h: string; p: string }[];
  tipLabel: string;
  tip: string;
  related?: { label: string; name: string; img: string; href: string; more: string } | undefined;
  book?: LinkSpec | undefined;
}) {
  return (
    <section style={{ position: "relative" }}>
      <div className="mp-sec mp-article2">
        <article>
          {secs.map((sec, i) => (
            <div key={i} className="mp-article-sec" data-rv="1">
              <span dir="ltr">{pad2(i)}</span>
              <div>
                <h2>{sec.h}</h2>
                <p>{sec.p}</p>
              </div>
            </div>
          ))}
          {tip ? (
            <div className="mp-tip" data-rv="1">
              <span>
                <Icon d={BULB2} size={20} width={2} />
              </span>
              <div>
                <b>{tipLabel}</b>
                <p>{tip}</p>
              </div>
            </div>
          ) : null}
        </article>
        <aside>
          {related ? (
            <SmartLink href={related.href} className="mp-rel" data-rv="2">
              <span>
                <img src={related.img} alt="" />
              </span>
              <span>
                <small>{related.label}</small>
                <b>{related.name}</b>
                <span className="m-guide-more" style={{ paddingTop: 0 }}>
                  {related.more}
                  <Arrow />
                </span>
              </span>
            </SmartLink>
          ) : null}
          {book?.label ? (
            <SmartLink href={book.href} className="mp-rel-book">
              {book.label}
            </SmartLink>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

// ── Numbers in rings ─────────────────────────────────────────────────────

export function Stats({ items }: { items: { value: string; label: string }[] }) {
  if (!items.length) return null;
  return (
    <section style={{ position: "relative" }}>
      <div className="m-stats">
        {items.map((stat, i) => (
          <div key={`${stat.value}-${i}`} className="m-stat" data-rv={(i % 4) + 1}>
            <span className="m-stat-ring" data-count={stat.value}>
              {stat.value}
            </span>
            <span className="m-stat-label">{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Tabs over a photo and a text (moving types, private / business) ──────

export function Audiences({ eyebrow, title, sub, tabs }: { eyebrow: string; title: string; sub: string; tabs: AudienceTab[] }) {
  if (!tabs.length) return null;
  return (
    <section style={{ position: "relative" }}>
      <div className="m-wrap m-sec" style={{ position: "relative" }}>
        <div className="m-head-c" data-rv="1" style={{ maxWidth: 640 }}>
          <span className="m-eyebrow">{eyebrow}</span>
          <h2 className="m-h2" style={{ textWrap: "wrap" }}>
            {title}
          </h2>
          <p className="m-lead">{sub}</p>
        </div>
        <AudienceTabs tabs={tabs} />
      </div>
    </section>
  );
}

// ── The homepage's expectation cards and before & after ──────────────────

export function Myths({
  eyebrow,
  title,
  sub,
  items,
  frontLabel,
  backLabel,
  hint,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  items: { front: string; back: string }[];
  frontLabel: string;
  backLabel: string;
  hint: string;
}) {
  if (!items.length) return null;
  return (
    <section style={{ position: "relative" }}>
      <div className="m-wrap m-sec">
        <div className="m-head-c is-12" data-rv="1" style={{ maxWidth: 700 }}>
          <span className="m-eyebrow">{eyebrow}</span>
          <h2 className="m-h2 is-tight">{title}</h2>
          <p className="m-lead is-l">{sub}</p>
        </div>
        <MythCards items={items} frontLabel={frontLabel} backLabel={backLabel} hint={hint} symbol={SYMBOL} />
      </div>
    </section>
  );
}

export function Compare(props: { eyebrow: string; title: string; sub: string; before: string; after: string; beforeLabel: string; afterLabel: string }) {
  if (!props.before || !props.after) return null;
  return (
    <section style={{ position: "relative" }}>
      <div className="m-wrap m-sec">
        <div className="m-head-c is-12" data-rv="1" style={{ maxWidth: 700 }}>
          <span className="m-eyebrow">{props.eyebrow}</span>
          <h2 className="m-h2 is-tight">{props.title}</h2>
          <p className="m-lead is-l">{props.sub}</p>
        </div>
        <CompareSlider before={props.before} after={props.after} beforeLabel={props.beforeLabel} afterLabel={props.afterLabel} label={props.title} />
      </div>
    </section>
  );
}

// ── Legal: the documents' rail beside numbered sections ──────────────────

export function LegalDoc({
  docs,
  note,
  sections,
  children,
}: {
  docs: (LinkSpec & { current: boolean })[];
  note?: string | undefined;
  sections: { title: string; body: string }[];
  /** Anything after the sections, inside the document column. */
  children?: ReactNode;
}) {
  return (
    <section style={{ position: "relative" }}>
      <div className="mp-legal">
        <nav aria-label="Legal">
          {docs.map((doc) => (
            <SmartLink key={doc.href} href={doc.href} aria-current={doc.current ? "page" : undefined}>
              {doc.label}
            </SmartLink>
          ))}
        </nav>
        <article>
          {note ? (
            <p className="mp-legal-note">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9.5" />
                <path d="M12 7.5v5.5M12 16.5h.01" />
              </svg>
              {note}
            </p>
          ) : null}
          {sections.map((sec, i) => (
            <div key={i} className="mp-legal-sec" data-rv="1">
              <h2>
                <span dir="ltr">{pad2(i)}</span>
                {sec.title}
              </h2>
              <p>{sec.body}</p>
            </div>
          ))}
          {children}
        </article>
      </div>
    </section>
  );
}

// ── The closing pair: a questions card and the red quote card ────────────

export interface CtaCopy {
  qTitle: string;
  qText: string;
  qBtn: string;
  qHref: string;
  eyebrow: string;
  title: string;
  sub: string;
  btn: string;
  href: string;
  img: string;
}

export function ClosingCta({ cta, question = false }: { cta: CtaCopy; question?: boolean }) {
  if (!cta.title) return null;
  const withQuestion = question && Boolean(cta.qTitle);
  return (
    <section style={{ position: "relative" }}>
      <div className="m-wrap m-sec m-cta">
        {withQuestion ? (
          <div className="m-cta-q" data-rv="1">
            <svg width="44" height="40" viewBox="0 0 44 40" fill="none" stroke="#d71635" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 4.5A2.5 2.5 0 0 1 5.5 2h20A2.5 2.5 0 0 1 28 4.5v13a2.5 2.5 0 0 1-2.5 2.5H12l-6 5v-5h-.5A2.5 2.5 0 0 1 3 17.5z" />
              <path d="M32 12h6.5a2.5 2.5 0 0 1 2.5 2.5v13a2.5 2.5 0 0 1-2.5 2.5H38v5l-6-5H19.5a2.5 2.5 0 0 1-2.5-2.5V24" />
            </svg>
            <h3>{cta.qTitle}</h3>
            <p>{cta.qText}</p>
            <SmartLink href={cta.qHref} className="m-btn-outline">
              {cta.qBtn}
              <Arrow />
            </SmartLink>
          </div>
        ) : null}
        <div className="m-cta-red" data-rv="2" style={withQuestion ? undefined : { gridColumn: "1 / -1" }}>
          <div>
            <span className="m-eyebrow">{cta.eyebrow}</span>
            <h2 className="m-h2 is-tight">{cta.title}</h2>
            <p>{cta.sub}</p>
            <SmartLink href={cta.href} className="m-cta-btn">
              {cta.btn}
              <Arrow />
            </SmartLink>
            <img className="m-cta-mark" data-par="1" src={SYMBOL} alt="" aria-hidden="true" />
          </div>
          {cta.img ? <img src={cta.img} alt="" /> : null}
        </div>
      </div>
    </section>
  );
}

/** Keeps a page's blocks in order without a wrapper element. */
export function Blocks({ children }: { children: ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
