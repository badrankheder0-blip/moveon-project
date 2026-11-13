import { imageSrc } from "@/lib/site/image";

import { readItems } from "../links";
import type { PageCopy } from "./content";

/**
 * The guides, from the Guides page's CMS section (`page-blog`).
 *
 * Two sets, as in the prototype: the guides the Guides page lists
 * (`guides.N.*`, sections `guideN.M.*`) and the shorter service guides the
 * homepage and the service pages link to (`svc.N.*`, sections
 * `svcguideN.M.*`), each read with its service beside it. Both live at
 * /ratgeber/<slug>; a slug in the first set wins.
 */

export interface Guide {
  slug: string;
  cat: string;
  minutes: string;
  title: string;
  excerpt: string;
  img: string;
  tip: string;
  secs: { h: string; p: string }[];
}

export interface ServiceGuide extends Omit<Guide, "cat"> {
  service: string;
  icon: string;
}

const blog = (page: PageCopy) => page.sections["page-blog"] ?? {};

export function guidesOf(page: PageCopy): Guide[] {
  const copy = blog(page);
  return readItems(copy, "guides", ["slug", "cat", "minutes", "title", "excerpt", "tip"])
    .map((guide, i) => ({
      ...guide,
      img: imageSrc(copy, `guides.${i + 1}.img`) ?? "",
      secs: readItems(copy, `guide${i + 1}`, ["h", "p"]),
    }))
    .filter((guide) => guide.slug && guide.title);
}

export function serviceGuidesOf(page: PageCopy): ServiceGuide[] {
  const copy = blog(page);
  return readItems(copy, "svc", ["slug", "service", "icon", "minutes", "title", "excerpt", "tip"])
    .map((guide, i) => ({
      ...guide,
      img: imageSrc(copy, `svc.${i + 1}.img`) ?? "",
      secs: readItems(copy, `svcguide${i + 1}`, ["h", "p"]),
    }))
    .filter((guide) => guide.slug && guide.title);
}

/** A slot of the Guides page's section. */
export function blogText(page: PageCopy, slot: string): string {
  return blog(page)[slot]?.trim() ?? "";
}
