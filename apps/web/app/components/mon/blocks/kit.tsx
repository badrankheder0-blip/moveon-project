import Link from "next/link";
import type { ReactNode } from "react";

import { Arrow } from "../Icons";

/**
 * Small pieces every block shares: a link that may leave the site, the
 * m.on symbol, a numbered label, the tick and pin icons.
 */

export const SYMBOL = "/images/mon/home/symbol.webp";

export interface LinkSpec {
  label: string;
  href: string;
}

/** A link from a resolved href; addresses off the site open in a new tab. */
export function SmartLink({ href, className, children, ...rest }: { href: string; className?: string; children: ReactNode } & Record<string, unknown>) {
  if (/^(https?:|mailto:|tel:)/i.test(href)) {
    const external = /^https?:/i.test(href);
    return (
      <a href={href} className={className} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  );
}

/** "01", "02", … as the prototype numbers every list. */
export const pad2 = (i: number) => String(i + 1).padStart(2, "0");

export function Tick({ size = 12, width = 3 }: { size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

export const PIN = "M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z";

export function ArrowLink({ link, className = "m-arrow-link" }: { link: LinkSpec; className?: string }) {
  return (
    <SmartLink href={link.href} className={className}>
      {link.label}
      <Arrow />
    </SmartLink>
  );
}

/** The bulb in the guides' tip box. */
export const BULB = "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z";
export const BULB2 = "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z";
