import { Fragment } from "react";

import { Arrow } from "../Icons";
import { CartToggle, HeroVideo } from "./client";
import { SYMBOL, SmartLink, type LinkSpec } from "./kit";
import "./blocks.css";

/**
 * The top of every inner page (the prototype's `heroB`): breadcrumbs, the
 * red-dashed label, the title, a line, up to two buttons — and on a service
 * page the "Add to request" toggle — beside a photo with the red corner and
 * the m.on symbol, then an optional strip of three facts. Without a photo the
 * text centres.
 */

export interface HeroProps {
  crumbs?: LinkSpec[];
  eyebrow: string;
  title: string;
  sub?: string;
  img?: string | undefined;
  video?: string | undefined;
  btn?: LinkSpec | undefined;
  btn2?: LinkSpec | undefined;
  cart?: { id: string; add: string; added: string } | undefined;
  facts?: { value: string; label: string }[];
}

export function PageHero({ crumbs, eyebrow, title, sub, img, video, btn, btn2, cart, facts }: HeroProps) {
  const hasImg = Boolean(img);

  return (
    <section style={{ position: "relative" }}>
      <div className="mp-hero">
        {crumbs?.length ? (
          <nav className="mp-crumbs" aria-label="Breadcrumb">
            {crumbs.map((crumb, i) => (
              <Fragment key={`${crumb.href}-${i}`}>
                <SmartLink href={crumb.href} aria-current={i === crumbs.length - 1 ? "page" : undefined}>
                  {crumb.label}
                </SmartLink>
                {i < crumbs.length - 1 ? (
                  <svg className="m-flip" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a0a49c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                ) : null}
              </Fragment>
            ))}
          </nav>
        ) : null}

        <div className={`mp-hero-grid${hasImg ? " has-img" : ""}`}>
          <div className="mp-hero-text" data-rv="1">
            <span className="mp-hero-ey">
              <span />
              {eyebrow}
            </span>
            <h1>{title}</h1>
            <p className="mp-hero-sub">{sub}</p>
            {btn?.label ? (
              <div className="mp-hero-btns">
                <SmartLink href={btn.href} className="mp-btn">
                  {btn.label}
                  <Arrow size={15} />
                </SmartLink>
                {btn2?.label ? (
                  <SmartLink href={btn2.href} className="mp-btn2">
                    {btn2.label}
                  </SmartLink>
                ) : null}
                {cart ? <CartToggle id={cart.id} add={cart.add} added={cart.added} /> : null}
              </div>
            ) : null}
          </div>

          {img ? (
            <div className="mp-hero-media" data-rv="2">
              <img data-zoom="1" src={img} alt="" />
              {video ? <HeroVideo src={video} /> : null}
              <span className="m-corner" />
              <img className="mp-hero-sym" src={SYMBOL} alt="" aria-hidden="true" />
            </div>
          ) : null}
        </div>

        {facts?.length ? (
          <div className="mp-facts" data-rv="3">
            {facts.map((fact, i) => (
              <div key={`${fact.value}-${i}`}>
                <b>{fact.value}</b>
                <small>{fact.label}</small>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
