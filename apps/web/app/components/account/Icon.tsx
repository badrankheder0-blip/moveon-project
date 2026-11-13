"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/** A stroked 24×24 icon from one path, as the prototype draws them. */
export function Icon({
  d,
  size = 17,
  sw = 1.8,
  color = "currentColor",
  flip = false,
  fill = "none",
  style,
  className,
}: {
  d: string;
  size?: number;
  sw?: number;
  color?: string;
  /** Mirrors in right-to-left pages (arrows, chevrons, the truck). */
  flip?: boolean;
  fill?: string;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={fill === "none" ? color : "none"}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={[flip ? "m-flip" : "", className ?? ""].join(" ").trim() || undefined}
      style={style}
    >
      <path d={d} />
    </svg>
  );
}

const TRUCK = "M1 6h13v10H1zM14 9h4l3 3v4h-7M5.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z";

/**
 * The little truck that drives along a tracker to the booking's step: it
 * starts at the beginning and rolls to `position` over 1.9s, as the
 * prototype's `trucks()` does. Hidden when there is nowhere to park it.
 */
export function Truck({ position }: { position: string | null }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !position) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.insetInlineStart = position;
      return;
    }
    el.style.transition = "none";
    el.style.insetInlineStart = "0px";
    const timer = window.setTimeout(() => {
      el.style.transition = "inset-inline-start 1.9s cubic-bezier(.3,.7,.2,1)";
      el.style.insetInlineStart = position;
    }, 150);
    return () => window.clearTimeout(timer);
  }, [position]);

  if (!position) return null;

  return (
    <span ref={ref} className="ac-truck" aria-hidden="true">
      <Icon d={TRUCK} size={28} sw={1.9} flip style={{ width: 28, height: 24 }} />
    </span>
  );
}
