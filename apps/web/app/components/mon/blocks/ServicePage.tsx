import type { Locale } from "@/lib/i18n/config";

import { siteHref } from "../links";
import { FaqBlock, StepsBlock, StoryBlock } from "./client";
import { compareOf, ctaOf, loadPage, servicesOf, storiesOf, type PageCopy } from "./content";
import { serviceFaq } from "./faq";
import { blogText, serviceGuidesOf } from "./guides";
import { PageHero } from "./PageHero";
import { ReviewsBlock } from "./Reviews";
import { cmsReviews } from "./reviewFeed";
import { Audiences, Cards, ClosingCta, Compare, PhotoGrid, PriceFactors } from "./Sections";

/**
 * A service page (the prototype's `#/services/:id`), the same for all four
 * services, as the prototype's v14 draws it: the hero with the clip, the
 * facts and the request toggle; what is included, as photo cards; private
 * or business; how it works, by customer type; the service's own day,
 * hour by hour; what the price is made of; for moving, before & after;
 * reviews and guides for this service; its FAQ; the services often booked
 * with it; the closing card.
 */

export function heroOf(page: PageCopy) {
  const { c, items, link, img } = page;
  const crumbs = items("crumb", ["label", "href"]).map((crumb) => ({ label: crumb.label, href: siteHref(page.locale, crumb.href) }));
  return {
    crumbs,
    eyebrow: c("hero.eyebrow"),
    title: c("hero.title"),
    sub: c("hero.sub"),
    img: img("hero.img"),
    video: c("hero.video") || undefined,
    btn: link("hero.btn"),
    btn2: link("hero.btn2"),
    facts: items("hero.facts", ["value", "label"]),
  };
}

export function cardItems(page: PageCopy, prefix: string) {
  return page.items(prefix, ["icon", "title", "text", "href", "more", "pos"]).map((item, i) => ({
    ...item,
    href: item.href ? siteHref(page.locale, item.href) : "",
    img: page.img(`${prefix}.${i + 1}.img`) ?? "",
  }));
}

/**
 * `compare`: the moving page's before & after. (The prototype's v14 also
 * repeats the moving day after the prices there; it is shown once.)
 */
export async function ServicePage({ locale, section, compare = false }: { locale: Locale; section: string; compare?: boolean }) {
  const page = await loadPage(locale, section);
  const { c, items, link, img } = page;
  const id = c("hero.id");
  const included = cardItems(page, "included");
  const pb = items("pb", ["tab", "title", "body", "btn", "btnHref"]).map((tab, i) => ({
    tab: tab.tab,
    title: tab.title,
    body: tab.body,
    linkText: "",
    linkHref: "",
    after: "",
    btn: tab.btn,
    btnHref: siteHref(locale, tab.btnHref),
    img: img(`pb.${i + 1}.img`) ?? "",
  }));
  const reviews = cmsReviews(page, id);
  const names = new Map(servicesOf(page).map((s) => [s.id, s]));
  const guides = serviceGuidesOf(page)
    .filter((guide) => guide.service === id)
    .map((guide) => ({
      href: siteHref(locale, `/ratgeber/${guide.slug}`),
      img: guide.img,
      icon: guide.icon,
      name: guide.title,
      short: `${guide.excerpt} · ${guide.minutes} ${blogText(page, "svc.readMin")}`,
    }));
  const together = items("together", ["name", "short", "icon", "href"]).map((item, i) => ({
    ...item,
    href: siteHref(locale, item.href),
    img: img(`together.${i + 1}.img`) ?? "",
  }));
  const faq = await serviceFaq(page, section);
  const story = storiesOf(page.sections).find((entry) => entry.id === id);

  return (
    <>
      <PageHero
        {...heroOf(page)}
        cart={id && names.has(id) ? { id, add: c("hero.cartAdd"), added: c("hero.cartIn") } : undefined}
      />
      <Cards eyebrow={c("included.eyebrow")} title={c("included.title")} items={included} imaged />
      <Audiences eyebrow={c("pb.eyebrow")} title={c("pb.title")} sub="" tabs={pb} />
      <section style={{ position: "relative" }}>
        <StepsBlock
          eyebrow={c("steps.eyebrow")}
          title={c("steps.title")}
          img={img("steps.img")}
          tabs={c("steps.tab1") && c("steps.tab2") ? [c("steps.tab1"), c("steps.tab2")] : undefined}
          sets={[
            { items: items("steps", ["title", "text"]), btn: link("steps.btn") },
            { items: items("steps.biz", ["title", "text"]), btn: link("steps.bizBtn") },
          ]}
        />
      </section>
      {story ? <StoryBlock stories={[story]} /> : null}
      <PriceFactors
        eyebrow={c("price.eyebrow")}
        title={c("price.title")}
        sub={c("price.sub")}
        img={img("price.img")}
        factors={items("price", ["text"]).map((factor) => factor.text)}
        btn={link("price.btn")}
      />
      {compare ? <Compare {...compareOf(page)} /> : null}
      <ReviewsBlock eyebrow={c("reviews.eyebrow")} title={c("reviews.title")} items={reviews} max={3} more={link("reviews.more")} />
      <PhotoGrid eyebrow={c("guides.eyebrow")} title={c("guides.title")} items={guides} more={blogText(page, "svc.more")} ratio="16 / 10" />
      {faq.length ? (
        <section style={{ position: "relative" }}>
          <FaqBlock eyebrow={c("faq.eyebrow")} eyebrowHref={siteHref(locale, "/faq")} title={c("faq.title")} items={faq} />
        </section>
      ) : null}
      <PhotoGrid eyebrow={c("together.eyebrow")} title={c("together.title")} items={together} more={c("together.more")} minW="260px" ratio="16 / 10" />
      <ClosingCta cta={ctaOf(page)} />
    </>
  );
}
