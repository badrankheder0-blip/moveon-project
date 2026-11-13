import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";
import { ctaOf, pageCopy, servicesOf, type PageCopy } from "@/app/components/mon/blocks/content";
import { guidesOf, serviceGuidesOf, type Guide, type ServiceGuide } from "@/app/components/mon/blocks/guides";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { ArticleBody, ArticleCards, ArticleWithAside, ClosingCta, PhotoGrid } from "@/app/components/mon/blocks/Sections";
import { siteHref } from "@/app/components/mon/links";

/**
 * One guide (the prototype's `#/guides/:id`).
 *
 * A guide of the Guides page reads as the prototype's article: the hero with
 * its topic and reading time, numbered sections, a tip, then the other
 * guides and the closing card. A service guide — the ones the homepage and
 * the service pages link to — reads with its service beside it and three
 * more service guides under it, as the prototype's second article layout
 * draws it. Both from the CMS section `page-blog`.
 */

const SECTION = "page-blog";

type Found = { kind: "guide"; guide: Guide } | { kind: "service"; guide: ServiceGuide };

function find(page: PageCopy, slug: string): Found | null {
  const guide = guidesOf(page).find((g) => g.slug === slug);
  if (guide) return { kind: "guide", guide };
  const service = serviceGuidesOf(page).find((g) => g.slug === slug);
  return service ? { kind: "service", guide: service } : null;
}

export async function generateMetadata({ params }: { params: { locale: Locale; slug: string } }): Promise<Metadata> {
  const page = pageCopy(params.locale, await fetchSiteContent(params.locale), SECTION);
  const found = find(page, decodeURIComponent(params.slug));
  return found ? { title: found.guide.title, description: found.guide.excerpt } : {};
}

export default async function GuidePage({ params }: { params: { locale: Locale; slug: string } }) {
  const page = pageCopy(params.locale, await fetchSiteContent(params.locale), SECTION);
  const found = find(page, decodeURIComponent(params.slug));
  if (!found) notFound();

  const { c } = page;
  const href = (path: string) => siteHref(page.locale, path);
  const crumbs = [
    { label: c("article.crumbHome"), href: href("/") },
    { label: c("article.crumbGuides"), href: href("/ratgeber") },
    { label: found.guide.title, href: href(`/ratgeber/${found.guide.slug}`) },
  ];

  if (found.kind === "guide") {
    const { guide } = found;
    const read = `${guide.minutes} ${c("list.minRead")}`;
    const others = guidesOf(page)
      .filter((g) => g.slug !== guide.slug)
      .map((g) => ({ href: href(`/ratgeber/${g.slug}`), img: g.img, cat: g.cat, read: `${g.minutes} ${c("list.minRead")}`, title: g.title, excerpt: g.excerpt }));
    const upper = page.locale === "ar" ? guide.cat : guide.cat.toLocaleUpperCase(page.locale === "tr" ? "tr" : page.locale);
    return (
      <>
        <PageHero crumbs={crumbs} eyebrow={`${upper} · ${read}`} title={guide.title} sub={guide.excerpt} img={guide.img} />
        <ArticleBody secs={guide.secs} tipLabel={c("article.tip")} tip={guide.tip} />
        <ArticleCards items={others} more={c("list.more")} head={{ eyebrow: c("more.eyebrow"), title: c("more.title") }} />
        <ClosingCta cta={ctaOf(page)} />
      </>
    );
  }

  const { guide } = found;
  const service = servicesOf(page).find((s) => s.id === guide.service) ?? servicesOf(page)[0];
  const name = service?.name ?? "";
  const upper = page.locale === "ar" ? name : name.toLocaleUpperCase(page.locale === "tr" ? "tr" : page.locale);
  const more = serviceGuidesOf(page)
    .filter((g) => g.slug !== guide.slug)
    .slice(0, 3)
    .map((g) => ({ href: href(`/ratgeber/${g.slug}`), img: g.img, icon: g.icon, name: g.title, short: `${g.excerpt} · ${g.minutes} ${c("svc.readMin")}` }));

  return (
    <>
      <PageHero crumbs={crumbs} eyebrow={`${upper} · ${guide.minutes} ${c("svc.readMin")}`} title={guide.title} sub={guide.excerpt} img={guide.img} />
      <ArticleWithAside
        secs={guide.secs}
        tipLabel={c("svc.tip")}
        tip={guide.tip}
        related={service ? { label: c("svc.related"), name: service.name, img: service.img, href: service.href, more: c("svc.more") } : undefined}
        book={c("svc.book") ? { label: c("svc.book"), href: href(c("svc.bookHref")) } : undefined}
      />
      <PhotoGrid eyebrow={c("more.eyebrow")} title={c("svc.moreTitle")} items={more} more={c("svc.more")} ratio="16 / 10" />
      <ClosingCta cta={ctaOf(page)} />
    </>
  );
}
