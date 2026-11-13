"use client";

import { useI18n } from "@/lib/i18n/provider";
import { textAny, textIn, type CatalogService } from "@/lib/booking/catalog";
import { SERVICE_KEYS, type CustomerType, type ServiceKey } from "@/lib/booking/plan";
import { imageSrc } from "@/lib/site/image";
import { plannerCopy, usePlanner } from "../context";
import { ErrorText, ForwardIcon, Icon, focusRing } from "../ui";

/**
 * The first two screens: who is booking, and what for.
 */

const CUSTOMER_CARDS: Array<{ type: CustomerType; image: string; fallback: string }> = [
  { type: "private", image: "welcome.private.image", fallback: "/images/planner/private.webp" },
  { type: "business", image: "welcome.business.image", fallback: "/images/planner/business.webp" },
];

/**
 * The two big cards of the welcome screen.
 *
 * Buttons, not radios: picking one is the whole answer and moves straight on,
 * as the prototype does — there is no "Continue" under them to press. Their
 * words are the Booking site screen's (`welcome.<type>.*`), the catalogue's
 * where the office left a slot empty.
 */
export function CustomerTypeCards({ onPick }: { onPick: (type: CustomerType) => void }) {
  const { t } = useI18n();
  const { plan, images } = usePlanner();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {CUSTOMER_CARDS.map((card) => {
        const selected = plan.customerType === card.type;
        const copy = (part: string) => plannerCopy(images, `welcome.${card.type}.${part}`, t(`plan.welcome.${card.type}.${part}`));

        return (
          <button
            key={card.type}
            type="button"
            onClick={() => onPick(card.type)}
            className={`group flex flex-col overflow-hidden rounded-xl border-2 bg-surface-card text-start transition-colors ${focusRing} ${
              selected ? "border-brand-red" : "border-border-default hover:border-border-strong"
            }`}
          >
            <span className="flex items-center justify-between px-5 pt-5">
              <span className="text-[10px] font-bold tracking-[0.14em] text-text-heading uppercase">{copy("tag")}</span>
              <span className="grid size-8 place-items-center rounded-full border border-brand-yellow bg-yellow-tint text-brand-red transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                <ForwardIcon size={18} />
              </span>
            </span>

            <span className="mx-5 mt-4 overflow-hidden rounded-lg border border-red-200">
              <img
                src={imageSrc(images, card.image, card.fallback)}
                alt=""
                width={672}
                height={280}
                className="aspect-[672/280] w-full object-cover"
              />
            </span>

            <span className="flex flex-col gap-3 px-5 pt-5 pb-4">
              <span className="font-display text-h4 font-bold text-text-heading">{copy("title")}</span>
              <span className="max-w-md text-body-sm text-text-default">{copy("desc")}</span>
            </span>

            <span className="mx-5 flex flex-col gap-2 border-t border-brand-red py-4">
              {[1, 2, 3].map((n) => (
                <span key={n} className="flex items-center gap-2 text-[13px] text-text-heading">
                  <Icon name="check" size={14} />
                  {copy(`point${n}`)}
                </span>
              ))}
            </span>

            <span className="mt-auto flex items-center justify-between border-t border-border-default px-5 py-3.5 text-body-sm font-bold text-text-heading">
              {copy("cta")}
              <ForwardIcon size={18} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

const SERVICE_IMAGES: Record<ServiceKey, string> = {
  moving: "/images/planner/service-moving.webp",
  renovation: "/images/planner/service-renovation.webp",
  cleaning: "/images/planner/service-cleaning.webp",
  disposal: "/images/planner/service-disposal.webp",
};

export const SERVICE_ICON: Record<ServiceKey | "visit", string> = {
  moving: "truck",
  renovation: "paint",
  cleaning: "clean",
  disposal: "trash",
  visit: "business",
};

/** The dashboard's service icons (Services → icon) in the planner's own set. */
const CATALOG_ICON: Record<string, string> = {
  box: "box",
  truck: "truck",
  tool: "tool",
  sparkle: "clean",
  roller: "paint",
  trash: "trash",
  leaf: "leaf",
  key: "key",
};

/** A custom service's icon; a box until the office picks one. */
export const customIcon = (service: CatalogService | undefined) => CATALOG_ICON[service?.icon ?? ""] ?? "box";

const isBuiltin = (key: string): key is ServiceKey => (SERVICE_KEYS as readonly string[]).includes(key);

/** The photo the API fills in for a built-in service the office gave none. */
const apiDefaultImage = (key: string) => `/images/mon/art/service-${key}.webp`;

interface Card {
  key: string;
  builtin: boolean;
  name: string;
  tagline: string;
  image: string | undefined;
  icon: string;
}

/**
 * The service cards: what the office offers (Dashboard → Services), in its
 * order, with its names and photos — or the planner's four when the
 * catalogue could not be read.
 *
 * Toggle buttons with `aria-pressed`, because any number may be chosen and
 * each card is one control — the "Get started" strip under the photo is part
 * of the button, not a second one nested inside it.
 */
export function ServicesStep() {
  const { t, locale } = useI18n();
  const { plan, dispatch, errors, images, catalog } = usePlanner();

  const plannerImage = (key: ServiceKey) => imageSrc(images, `services.${key}.image`, SERVICE_IMAGES[key]);

  const cards: Card[] = catalog
    ? catalog.map((service) => {
        if (isBuiltin(service.key)) {
          const own = service.image && service.image !== apiDefaultImage(service.key) ? service.image : null;
          return {
            key: service.key,
            builtin: true,
            name: textIn(service.name, locale) || t(`plan.service.${service.key}`),
            tagline: textIn(service.tagline, locale) || t(`plan.service.${service.key}.tagline`),
            image: own ? imageSrc({ own }, "own", plannerImage(service.key)) : plannerImage(service.key),
            icon: SERVICE_ICON[service.key],
          };
        }
        return {
          key: service.key,
          builtin: false,
          name: textAny(service.name, locale),
          tagline: textAny(service.tagline, locale) || t("plan.services.customTagline"),
          image: service.image ? imageSrc({ own: service.image }, "own") : undefined,
          icon: customIcon(service),
        };
      })
    : SERVICE_KEYS.map((key) => ({
        key,
        builtin: true,
        name: t(`plan.service.${key}`),
        tagline: t(`plan.service.${key}.tagline`),
        image: plannerImage(key),
        icon: SERVICE_ICON[key],
      }));

  const isSelected = (card: Card) => (card.builtin ? plan.services[card.key as ServiceKey] : plan.customServices.includes(card.key));

  const toggle = (card: Card) =>
    dispatch({
      type: "patch",
      patch: (current) =>
        card.builtin
          ? { services: { ...current.services, [card.key]: !current.services[card.key as ServiceKey] } }
          : {
              customServices: current.customServices.includes(card.key)
                ? current.customServices.filter((key) => key !== card.key)
                : [...current.customServices, card.key],
            },
    });

  return (
    <div className="flex flex-col gap-5">
      <div role="group" aria-label={t("plan.services.groupLabel")} className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const selected = isSelected(card);

          return (
            <button
              key={card.key}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(card)}
              className={`flex flex-col overflow-hidden rounded-lg border-2 bg-surface-card p-1.5 text-center transition-colors ${focusRing} ${
                selected
                  ? "border-brand-red bg-red-50"
                  : errors.services
                    ? "border-danger"
                    : "border-border-default hover:border-border-strong"
              }`}
            >
              {card.image ? (
                <img
                  src={card.image}
                  alt=""
                  width={375}
                  height={200}
                  className="aspect-[375/160] w-full rounded-md object-cover object-top"
                />
              ) : (
                <span aria-hidden="true" className="grid aspect-[375/160] w-full place-items-center rounded-md bg-red-50 text-brand-red">
                  <span className="grid size-16 place-items-center rounded-full bg-surface-card">
                    <Icon name={card.icon} size={30} strokeWidth={1.8} />
                  </span>
                </span>
              )}
              <span className="flex flex-col items-center gap-1 px-3 pt-3 pb-2">
                <span className="flex items-center gap-2 font-display text-h5 font-bold text-text-heading">
                  <span className="text-brand-red">
                    <Icon name={card.icon} size={20} strokeWidth={2.2} />
                  </span>
                  {card.name}
                </span>
                <span className="text-body-sm text-text-default">{card.tagline}</span>
              </span>
              <span
                className={`mx-3 mb-3 flex items-center justify-center gap-2 rounded-md py-2.5 text-body-sm font-bold ${
                  selected ? "border border-brand-red bg-surface-card text-brand-red" : "bg-brand-red text-text-on-brand"
                }`}
              >
                {selected ? <Icon name="check" size={16} /> : null}
                {selected ? t("plan.services.selected") : t("plan.services.getStarted")}
                {selected ? null : <ForwardIcon size={15} />}
              </span>
            </button>
          );
        })}
      </div>

      <ErrorText>{errors.services ? t(errors.services) : undefined}</ErrorText>

      <p className="flex items-center gap-2 text-body-sm text-text-default">
        <Icon name="layers" size={16} />
        {plan.customerType === "business" ? t("plan.services.businessHint") : t("plan.services.hint")}
      </p>
    </div>
  );
}
