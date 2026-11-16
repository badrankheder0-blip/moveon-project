"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Arrow } from "../Icons";
import { MovingDay, type StoryStep } from "../home/Interactive";
import { CART_KEY } from "../SiteHeader";
import { pad2, type LinkSpec } from "./kit";

/**
 * The inner pages' small moving parts, each a client island inside an
 * otherwise server-rendered page: the hero clip, the request toggle, the
 * steps with their filling line, the FAQ rows and the services panels.
 */

// ── Hero: the clip fades in over its poster once it actually plays ───────

export function HeroVideo({ src }: { src: string }) {
  return (
    <video
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      onPlaying={(event) => {
        event.currentTarget.style.opacity = "1";
      }}
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
}

// ── "Add to request": the basket the header's cart button shows ─────────

function readCart(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as unknown;
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function CartToggle({ id, add, added }: { id: string; add: string; added: string }) {
  const [inCart, setInCart] = useState(false);

  useEffect(() => {
    const sync = () => setInCart(readCart().includes(id));
    sync();
    window.addEventListener("mon:cart", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("mon:cart", sync);
      window.removeEventListener("storage", sync);
    };
  }, [id]);

  const toggle = () => {
    const cart = readCart();
    const next = cart.includes(id) ? cart.filter((item) => item !== id) : [...cart, id];
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(next));
    } catch {
      // A blocked storage only means the basket is not remembered.
    }
    setInCart(next.includes(id));
    window.dispatchEvent(new Event("mon:cart"));
  };

  return (
    <button type="button" className="mp-cart" aria-pressed={inCart} onClick={toggle}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={inCart ? "M5 12l5 5L20 7" : "M12 5v14M5 12h14"} />
      </svg>
      {inCart ? added : add}
    </button>
  );
}

// ── Steps: private / business tabs and a line that fills on scroll ──────

export interface StepSet {
  items: { title: string; text: string }[];
  btn?: LinkSpec | undefined;
}

export function StepsBlock({
  eyebrow,
  title,
  img,
  tabs,
  sets,
}: {
  eyebrow: string;
  title: string;
  img?: string | undefined;
  /** Two labels when the block switches between private and business steps. */
  tabs?: [string, string] | undefined;
  sets: StepSet[];
}) {
  const [tab, setTab] = useState(0);
  const list = useRef<HTMLOListElement>(null);
  const current = sets[tabs ? Math.min(tab, sets.length - 1) : 0] ?? sets[0];

  // The prototype's steps(): a dot turns red once it passes 62% of the
  // window, and the line below it fills in proportion.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const update = () => {
      frame = 0;
      const threshold = window.innerHeight * 0.62;
      list.current?.querySelectorAll<HTMLLIElement>(":scope > li").forEach((li) => {
        const box = li.getBoundingClientRect();
        const dot = li.querySelector<HTMLElement>("[data-sdot]");
        const fill = li.querySelector<HTMLElement>("[data-sfill]");
        const on = reduced || box.top + 23 < threshold;
        dot?.classList.toggle("is-on", on);
        if (fill) {
          const p = reduced ? 1 : Math.max(0, Math.min(1, (threshold - box.top - 46) / Math.max(1, box.height - 42)));
          fill.style.transform = `scaleY(${p.toFixed(3)})`;
        }
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [tab]);

  if (!current) return null;

  return (
    <div className="mp-sec mp-steps">
      {img ? (
        <div className="mp-steps-img" data-rv="1">
          <img src={img} alt="" />
        </div>
      ) : null}
      <div className="mp-steps-body">
        <div className="mp-steps-head" data-rv="1">
          <span className="m-eyebrow">{eyebrow}</span>
          <h2 className="m-h2">{title}</h2>
        </div>
        {tabs ? (
          <div className="mp-pills" role="tablist" data-rv="1">
            {tabs.map((label, i) => (
              <button key={label} type="button" role="tab" aria-selected={i === tab} onClick={() => setTab(i)}>
                {label}
              </button>
            ))}
          </div>
        ) : null}
        <ol ref={list}>
          {current.items.map((step, i) => (
            <li key={`${tab}-${i}`} data-rv={(i % 4) + 1}>
              <span className="mp-step-rail">
                <span className="mp-step-dot" data-sdot="1">
                  {pad2(i)}
                </span>
                {i < current.items.length - 1 ? (
                  <span className="mp-step-line">
                    <span data-sfill="1" />
                  </span>
                ) : null}
              </span>
              <span className="mp-step-text">
                <b>{step.title}</b>
                <small>{step.text}</small>
              </span>
            </li>
          ))}
        </ol>
        {current.btn?.label ? (
          <Link href={current.btn.href} className="mp-steps-btn">
            {current.btn.label}
            <Arrow />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

// ── FAQ: one question per row; the first open unless the list is small ──

export function FaqBlock({
  eyebrow,
  title,
  items,
  small = false,
  eyebrowHref,
}: {
  eyebrow?: string | undefined;
  title: string;
  items: { q: string; a: string }[];
  small?: boolean;
  /** The label is a pill linking to the FAQ page (the prototype's "FAQS →"). */
  eyebrowHref?: string | undefined;
}) {
  const [open, setOpen] = useState<Record<number, boolean>>(small ? {} : { 0: true });

  return (
    <div className={`mp-faq${small ? " is-small" : ""}`}>
      <div className="mp-faq-head" data-rv="1">
        {eyebrow && eyebrowHref ? (
          <Link href={eyebrowHref} className={`m-faq-pill${small ? " is-start" : ""}`}>
            {eyebrow}
            <svg className="m-flip" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        ) : eyebrow ? (
          <span className="m-eyebrow">{eyebrow}</span>
        ) : null}
        <h2>{title}</h2>
      </div>
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
    </div>
  );
}

// ── The moving day: one service's day, or every service's behind tabs ────

export interface StoryData {
  id: string;
  /** The tab's label: the service's name. */
  name: string;
  eyebrow: string;
  title: string;
  sub: string;
  steps: StoryStep[];
}

export function StoryBlock({ stories, tabs = false }: { stories: StoryData[]; tabs?: boolean }) {
  const list = stories.filter((story) => story.steps.length);
  const [index, setIndex] = useState(0);
  const current = list[Math.min(index, list.length - 1)];
  if (!current) return null;

  return (
    <section id="moving-day" style={{ position: "relative" }}>
      <div className="m-wrap m-sec">
        <div className="m-story-head" data-rv="1">
          <span className="m-eyebrow">{current.eyebrow}</span>
          <h2 className="m-h2 is-tight">{current.title}</h2>
          <p className="m-lead is-l">{current.sub}</p>
        </div>
        {tabs && list.length > 1 ? (
          <div className="m-story-tabs" role="tablist" aria-label={current.eyebrow}>
            {list.map((story, i) => (
              <button key={story.id} type="button" role="tab" aria-selected={story.id === current.id} onClick={() => setIndex(i)}>
                <span dir="ltr">{pad2(i)}</span>
                {story.name}
              </button>
            ))}
          </div>
        ) : null}
        <MovingDay key={current.id} steps={current.steps} />
      </div>
    </section>
  );
}

// ── Services overview: photo panels, the hovered one opens ───────────────

export function ServicePanels({ items, more }: { items: { name: string; short: string; img: string; href: string }[]; more: string }) {
  const [active, setActive] = useState(0);

  return (
    <div className="mp-acc-wrap">
      <div className="mp-acc" data-rv="1" style={{ ["--acc-h" as string]: `${items.length * 100 + 300}px` }}>
        {items.map((item, i) => (
          <Link
            key={`${item.href}-${i}`}
            href={item.href}
            className={i === active ? "is-on" : undefined}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
          >
            <img className="mp-acc-img" src={item.img} alt="" />
            <span className="mp-acc-shade" />
            <span className="mp-acc-n">{pad2(i)}</span>
            <span className="mp-acc-body">
              <b>{item.name}</b>
              <span className="mp-acc-more">
                <small>{item.short}</small>
                <span>
                  {more}
                  <Arrow />
                </span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
