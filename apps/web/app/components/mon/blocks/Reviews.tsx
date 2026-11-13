"use client";

import Link from "next/link";
import { useState } from "react";

import { Arrow } from "../Icons";
import { initialsOf } from "../links";
import { SYMBOL, type LinkSpec } from "./kit";

/**
 * Review cards (the prototype's `revB`): a centred head, optional chips that
 * filter by service, the quote cards and a button to all reviews.
 */

export interface ReviewItem {
  text: string;
  name: string;
  meta: string;
  /** The chip this review belongs to; empty when it belongs to none. */
  group: string;
}

export function ReviewsBlock({
  eyebrow,
  title,
  sub,
  items,
  allLabel,
  chips = false,
  max,
  more,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  items: ReviewItem[];
  allLabel?: string;
  chips?: boolean;
  max?: number;
  more?: LinkSpec | undefined;
}) {
  const [filter, setFilter] = useState("");
  if (!items.length) return null;

  const groups = chips ? Array.from(new Set(items.map((item) => item.group).filter(Boolean))) : [];
  const list = (filter ? items.filter((item) => item.group === filter) : items).slice(0, max ?? items.length);

  return (
    <section style={{ position: "relative" }}>
      <div className="m-wrap m-sec" style={{ position: "relative" }}>
        <div className="m-head-c" data-rv="1" style={{ maxWidth: 660 }}>
          <span className="m-eyebrow">{eyebrow}</span>
          <h2 className="m-h2">{title}</h2>
          {sub ? <p className="m-lead">{sub}</p> : null}
        </div>
        {chips && groups.length ? (
          <div className="mp-chips">
            {[{ id: "", label: allLabel ?? "" }, ...groups.map((group) => ({ id: group, label: group }))].map((chip) => (
              <button key={chip.id || "all"} type="button" aria-pressed={filter === chip.id} onClick={() => setFilter(chip.id)}>
                {chip.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="m-revs">
          {list.map((review, i) => (
            <figure key={`${filter}-${review.name}-${i}`} className="m-rev" data-rv={(i % 4) + 1}>
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
        {more?.label ? (
          <div className="m-revs-more">
            <Link href={more.href} className="m-btn-outline">
              {more.label}
              <Arrow />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
