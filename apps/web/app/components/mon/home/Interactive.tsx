"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";

import { Arrow } from "../Icons";

/**
 * The homepage's moving parts, each a small client island inside an
 * otherwise server-rendered page. The markup and every number are the
 * website prototype's; see mon.css for the styles.
 */

// ── Hero: four photo panels, the hovered one opens ───────────────────────

export interface HeroPanel {
  label: string;
  title: string;
  short: string;
  href: string;
  poster: string;
  video: string;
}

export function HeroPanels({ panels, cta, symbol }: { panels: HeroPanel[]; cta: string; symbol: string }) {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const touchedAt = useRef(0);
  const tapped = useRef<number | null>(null);

  // Only the open panel's clip plays, and only while the pointer is on it;
  // it fades in once it actually plays and stops shortly after leaving.
  useEffect(() => {
    videos.current.forEach((video, i) => {
      if (!video) return;
      const on = hovered && i === active;
      if (on && !video.dataset.on) {
        video.dataset.on = "1";
        video.muted = true;
        try {
          video.currentTime = 0;
        } catch {
          // Not seekable yet; it starts from wherever it is.
        }
        void video.play().catch(() => undefined);
        if (video.readyState > 2) video.style.opacity = "1";
      } else if (!on && video.dataset.on) {
        delete video.dataset.on;
        video.style.opacity = "0";
        setTimeout(() => {
          if (video.dataset.on) return;
          video.pause();
          try {
            video.currentTime = 0;
          } catch {
            // Nothing to rewind.
          }
        }, 900);
      }
    });
  }, [active, hovered]);

  const open = (i: number) => {
    setActive(i);
    setHovered(true);
  };

  // On touch the first tap opens a closed panel; the second follows it.
  const onClick = (event: MouseEvent, i: number) => {
    const touch = Date.now() - touchedAt.current < 900;
    if (active !== i || (touch && tapped.current !== i)) {
      event.preventDefault();
      tapped.current = i;
      open(i);
    }
  };

  return (
    <div className="m-hero">
      <div className="m-hero-row" onMouseLeave={() => setHovered(false)}>
        {panels.map((panel, i) => {
          const n = String(i + 1).padStart(2, "0");
          return (
            <Link
              key={`${panel.label}-${i}`}
              href={panel.href}
              aria-label={panel.label}
              className={`m-panel${i === active ? " is-on" : ""}`}
              onMouseEnter={() => open(i)}
              onFocus={() => open(i)}
              onTouchStart={() => {
                touchedAt.current = Date.now();
              }}
              onClick={(event) => onClick(event, i)}
            >
              <img className="m-panel-img" src={panel.poster} alt="" draggable={false} />
              {panel.video ? (
                <video
                  ref={(el) => {
                    videos.current[i] = el;
                  }}
                  className="m-panel-vid"
                  src={panel.video}
                  muted
                  loop
                  playsInline
                  preload="auto"
                  onPlaying={(event) => {
                    if (event.currentTarget.dataset.on) event.currentTarget.style.opacity = "1";
                  }}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
              <span className="m-panel-dim" />
              <span className="m-panel-grad" />
              <span className="m-panel-foot" />
              <div className="m-panel-top">
                <span style={{ flex: 1 }} />
                <img src={symbol} alt="m.on" />
              </div>
              <div className="m-panel-body">
                <span className="m-chip">
                  <b>{n}</b>
                  {panel.label}
                </span>
                <b className="m-panel-title">{panel.title || panel.label}</b>
                <span className="m-panel-line" />
                {panel.short ? <p className="m-panel-short">{panel.short}</p> : null}
                <span className="m-panel-cta">
                  {cta}
                  <Arrow />
                </span>
              </div>
              <span className="m-panel-tag">
                <b>{n}</b>
                <span>{panel.label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Services: a horizontal scroll-snap row with dots and "next" ──────────

export interface ServiceCard {
  title: string;
  link: string;
  href: string;
  img: string;
}

/**
 * The service cards in one row that scrolls sideways when they don't fit
 * (swipe on a phone). No arrow button or dots under it: the owner asked for
 * the red arrow and the red dot to go.
 */
export function ServicesCarousel({ cards }: { cards: ServiceCard[] }) {
  return (
    <div className="m-car">
      {cards.map((card, i) => (
        <Link key={`${card.title}-${i}`} href={card.href} className="m-card" data-tilt="1">
          <img src={card.img} alt="" />
          <span className="m-card-shade" />
          <b>{card.title}</b>
          <span className="m-card-link">
            {card.link}
            <Arrow />
          </span>
        </Link>
      ))}
    </div>
  );
}

// ── Before / after: a photo pair split by a draggable handle ─────────────

export function CompareSlider(props: { before: string; after: string; beforeLabel: string; afterLabel: string; label: string }) {
  const [value, setValue] = useState(50);

  return (
    <div className="m-cmp" data-rv="2" dir="ltr">
      <img src={props.after} alt="" draggable={false} />
      <img src={props.before} alt="" draggable={false} style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }} />
      <span className="m-cmp-l is-before">{props.beforeLabel}</span>
      <span className="m-cmp-l is-after">{props.afterLabel}</span>
      <span className="m-cmp-bar" style={{ left: `${value}%` }} />
      <span className="m-cmp-knob" style={{ left: `${value}%` }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
        </svg>
      </span>
      <input type="range" min={0} max={100} value={value} aria-label={props.label} onChange={(event) => setValue(Number(event.target.value))} />
    </div>
  );
}

// ── Moving types: tabs over a photo and a text panel ─────────────────────

export interface AudienceTab {
  tab: string;
  title: string;
  body: string;
  linkText: string;
  linkHref: string;
  after: string;
  btn: string;
  btnHref: string;
  img: string;
}

export function AudienceTabs({ tabs }: { tabs: AudienceTab[] }) {
  const [index, setIndex] = useState(0);
  const current = tabs[Math.min(index, tabs.length - 1)];
  if (!current) return null;

  return (
    <>
      <div className="m-tabs" role="tablist" style={{ gridTemplateColumns: `repeat(${tabs.length || 1},minmax(0,1fr))` }}>
        {tabs.map((tab, i) => (
          <button key={`${tab.tab}-${i}`} type="button" role="tab" aria-selected={i === index} onClick={() => setIndex(i)}>
            {tab.tab}
          </button>
        ))}
      </div>
      <div className="m-aud" role="tabpanel">
        <div className="m-aud-img">
          <img src={current.img} alt="" />
        </div>
        <div className="m-aud-text">
          <h3>
            {current.title
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => (
                <span key={line}>{line}</span>
              ))}
          </h3>
          <p className="m-lead">{current.body}</p>
          {current.linkText || current.after ? (
            <p className="m-lead">
              {current.linkText ? <Link href={current.linkHref}>{current.linkText}</Link> : null}
              {current.after}
            </p>
          ) : null}
          <Link href={current.btnHref} className="m-btn-outline">
            {current.btn}
            <Arrow />
          </Link>
        </div>
      </div>
    </>
  );
}

// ── Expectations: cards that turn over on hover or tap ───────────────────

export function MythCards({
  items,
  frontLabel,
  backLabel,
  hint,
  symbol,
}: {
  items: { front: string; back: string }[];
  frontLabel: string;
  backLabel: string;
  hint: string;
  symbol: string;
}) {
  const [turned, setTurned] = useState<Record<number, boolean>>({});
  const set = (i: number, value: boolean) => setTurned((current) => ({ ...current, [i]: value }));
  // Hover turns a card only where the header is wide, as in the prototype.
  const canHover = () => window.matchMedia("(hover: hover) and (min-width: 1100px)").matches;

  return (
    <div className="m-myths">
      {items.map((item, i) => (
        <button
          key={`${item.front}-${i}`}
          type="button"
          className="m-myth"
          data-rv={(i % 4) + 1}
          aria-pressed={!!turned[i]}
          onClick={() => set(i, !turned[i])}
          onMouseEnter={() => canHover() && set(i, true)}
          onMouseLeave={() => canHover() && set(i, false)}
        >
          <span className="m-myth-in">
            <span className="m-myth-face m-myth-front">
              <small>{frontLabel}</small>
              <b>“{item.front}”</b>
              <span className="m-myth-hint">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5" />
                </svg>
                {hint}
              </span>
            </span>
            <span className="m-myth-face m-myth-back">
              <img src={symbol} alt="" aria-hidden="true" />
              <small>{backLabel}</small>
              <span>{item.back}</span>
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Moving day: a sticky photo that follows the step in the middle ───────

export interface StoryStep {
  time: string;
  title: string;
  text: string;
  img: string;
}

export function MovingDay({ steps }: { steps: StoryStep[] }) {
  const [current, setCurrent] = useState(0);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const items = list.current?.querySelectorAll<HTMLElement>("[data-story]");
      if (!items?.length) return;
      const middle = window.innerHeight * 0.5;
      let best = 0;
      let distance = Number.POSITIVE_INFINITY;
      items.forEach((item) => {
        const box = item.getBoundingClientRect();
        const d = Math.abs(box.top + box.height / 2 - middle);
        if (d < distance) {
          distance = d;
          best = Number(item.dataset.story) || 0;
        }
      });
      setCurrent(best);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const now = steps[Math.min(current, steps.length - 1)];

  return (
    <div className="m-story">
      <div className="m-story-pic">
        {steps.map((step, i) => (
          <img key={`${step.time}-${i}`} src={step.img} alt="" className={i === current ? "is-on" : undefined} />
        ))}
        <span className="m-shade" />
        <div className="m-story-now">
          <b dir="ltr">{now?.time}</b>
          <div className="m-story-bars" style={{ gridTemplateColumns: `repeat(${steps.length},minmax(0,1fr))` }}>
            {steps.map((step, i) => (
              <span key={`${step.time}-${i}`} className={i <= current ? "is-done" : undefined} />
            ))}
          </div>
        </div>
      </div>
      <ol ref={list}>
        {steps.map((step, i) => (
          <li key={`${step.time}-${i}`} data-story={i} className={i === current ? "is-on" : undefined}>
            <span className="m-story-time" dir="ltr">
              {step.time}
            </span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── FAQ: the first answer open, one button per question ──────────────────

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });

  return (
    <div className="m-faq-list">
      {items.map((item, i) => (
        <div key={`${item.q}-${i}`} className="m-faq-item">
          <button type="button" aria-expanded={!!open[i]} onClick={() => setOpen((current) => ({ ...current, [i]: !current[i] }))}>
            <span className="m-faq-q">{item.q}</span>
            <span className="m-faq-pm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </button>
          {open[i] ? <p className="m-faq-a">{item.a}</p> : null}
        </div>
      ))}
    </div>
  );
}
