"use client";

import {
  answerText,
  customStepId,
  findService,
  optionValue,
  serviceQuestions,
  textAny,
  textIn,
  type BookingCatalog,
} from "@/lib/booking/catalog";
import {
  CLEAN_WINDOWS,
  DISPOSAL_TYPES,
  customLocation,
  customTaskId,
  emptyAccess,
  inventoryCount,
  inventoryVolume,
  isBusiness,
  jobsFor,
  windowLabel,
  type CustomStepId,
  type Plan,
  type ServiceKey,
  type Slot,
} from "@/lib/booking/plan";
import { floorLabel } from "./steps/Property";
import { customIcon } from "./steps/Start";

/**
 * The plan read back as labelled rows, per service.
 *
 * The summary rail and the review both draw these, so the two cannot
 * disagree about what the customer asked for. Only answers — never a price.
 */

type T = (key: string, options?: { values?: Record<string, string | number>; count?: number }) => string;

export interface OverviewRow {
  label: string;
  value: string;
}

export interface OverviewBlock {
  /** The service, plus the job id for located services. */
  id: string;
  service: ServiceKey | "visit" | "custom";
  /** The icon, for a custom service (the built-ins have their own). */
  icon?: string;
  title: string;
  /** The address, for a service that happens in several places. */
  place?: string | undefined;
  rows: OverviewRow[];
  editStep: "home" | "renovation" | "cleaning" | "disposal" | "address" | CustomStepId;
}

export function slotText(t: T, formatDate: (day: string) => string, slot: Slot): string {
  if (!slot.date) return t("plan.schedule.notChosen");
  return `${formatDate(slot.date)}${slot.window !== null ? ` · ${windowLabel(slot.window)}` : ""}`;
}

export function overview(
  plan: Plan,
  t: T,
  formatDate: (day: string) => string,
  locale: string,
  catalog: BookingCatalog = null,
): OverviewBlock[] {
  const number = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  const address = (key: string) => plan.addresses[key]?.text ?? t("plan.overview.noAddress");
  const lang = locale as Parameters<typeof textIn>[1];
  /** A built-in service's name as the office wrote it, or the planner's own. */
  const name = (key: ServiceKey) => textIn(findService(catalog, key)?.name, lang) || t(`plan.service.${key}`);
  const customName = (key: string) => textAny(findService(catalog, key)?.name, lang) || key;

  const accessText = (key: string) => {
    const access = plan.access[key] ?? emptyAccess();
    if (access.floor === null) return t("plan.overview.accessOpen");
    const lift =
      access.floor !== 0 ? (access.lift ? t("plan.overview.lift") : t("plan.overview.noLift")) : "";
    return [floorLabel(t, access.floor), lift].filter(Boolean).join(", ");
  };

  const blocks: OverviewBlock[] = [];

  if (isBusiness(plan)) {
    blocks.push({
      id: "visit",
      service: "visit",
      title: t("plan.overview.businessVisit"),
      rows: [
        { label: t("plan.overview.company"), value: plan.company || "—" },
        {
          label: t("plan.overview.services"),
          value: [
            ...(["moving", "renovation", "cleaning", "disposal"] as const).filter((key) => plan.services[key]).map(name),
            ...plan.customServices.map(customName),
          ].join(", "),
        },
        { label: t("plan.overview.location"), value: address("service") },
        { label: t("plan.overview.siteVisit"), value: slotText(t, formatDate, plan.visit) },
        { label: t("plan.overview.quotation"), value: t("plan.overview.afterAssessment") },
      ],
      editStep: "address",
    });
    return blocks;
  }

  if (plan.services.moving) {
    const m = plan.moving;
    const assembly = m.rooms.flatMap((room) => room.items).concat(m.method === "area" ? m.areaAssemblyItems : []);
    const dis = assembly.filter((item) => item.prep === "dis" || item.prep === "both").reduce((sum, item) => sum + item.count, 0);
    const re = assembly.filter((item) => item.prep === "re" || item.prep === "both").reduce((sum, item) => sum + item.count, 0);

    const rows: OverviewRow[] = [
      { label: t("plan.overview.from"), value: address("from") },
      { label: t("plan.overview.to"), value: address("to") },
      { label: t("plan.overview.access"), value: `A: ${accessText("from")} / B: ${accessText("to")}` },
    ];

    if (m.method === "area") {
      rows.push({
        label: t("plan.overview.inventory"),
        value: m.areaSqm ? t("plan.overview.byArea", { values: { area: m.areaSqm, volume: number(inventoryVolume(plan)) } }) : "—",
      });
    } else if (m.method === "items") {
      rows.push({
        label: t("plan.overview.inventory"),
        value: t("plan.overview.byItems", {
          values: { rooms: m.rooms.length, items: inventoryCount(plan), volume: number(inventoryVolume(plan)) },
        }),
      });
    }

    rows.push({ label: t("plan.overview.team"), value: t("plan.overview.movers", { values: { crew: m.crewSize } }) + (m.secondVan ? ` · ${t("plan.overview.secondVan")}` : "") });
    if (dis + re > 0) rows.push({ label: t("plan.overview.assembly"), value: t("plan.overview.assemblyValue", { values: { dis, re } }) });

    const extras = [
      m.packing ? t("plan.extras.packing") : "",
      m.insurance ? t("plan.extras.insurance") : "",
      m.parkingZone ? t("plan.extras.parkingZone") : "",
    ].filter(Boolean);
    if (extras.length > 0) rows.push({ label: t("plan.overview.extras"), value: extras.join(", ") });

    if (m.specials.length > 0) {
      rows.push({
        label: t("plan.overview.specials"),
        // The six the product shipped with still have a translation; one the
        // office added does not, and `t` returns the key, so the stored name
        // falls back to the code rather than printing "plan.special.billard".
        value: m.specials
          .map((special) => {
            const key = `plan.special.${special.kind}`;
            const name = t(key);
            return `${name === key ? special.kind : name} × ${special.count}`;
          })
          .join(", "),
      });
    }

    rows.push({ label: t("plan.overview.moveDate"), value: slotText(t, formatDate, m.slot) });

    blocks.push({ id: "moving", service: "moving", title: name("moving"), rows, editStep: "home" });
  }

  for (const job of jobsFor(plan, "renovation")) {
    const work = job.details.work.map((entry) => `${t(`plan.renovation.${entry}`)} · ${job.details.areas[entry] || "?"} m²`);
    blocks.push({
      id: job.id,
      service: "renovation",
      title: name("renovation"),
      place: job.address?.text,
      rows: [
        { label: t("plan.overview.location"), value: job.address?.text ?? "—" },
        { label: t("plan.overview.work"), value: work.join("; ") || "—" },
        { label: t("plan.overview.siteVisit"), value: slotText(t, formatDate, job.slot) },
        { label: t("plan.overview.quotation"), value: t("plan.overview.afterAssessment") },
      ],
      editStep: "renovation",
    });
  }

  for (const job of jobsFor(plan, "cleaning")) {
    const d = job.details;
    const kinds = [d.moveClean ? t("plan.cleaning.moveClean") : "", d.windows ? t("plan.cleaning.windows") : ""].filter(Boolean);
    const scope = [
      d.moveClean && d.areaSqm ? t("plan.overview.floorArea", { values: { area: d.areaSqm } }) : "",
      d.windows
        ? CLEAN_WINDOWS.filter((key) => d.windowCounts[key])
            .map((key) => `${d.windowCounts[key]} × ${t(`plan.cleaning.window.${key}`)}`)
            .join(", ")
        : "",
    ].filter(Boolean);

    blocks.push({
      id: job.id,
      service: "cleaning",
      title: name("cleaning"),
      place: job.address?.text,
      rows: [
        { label: t("plan.overview.location"), value: job.address?.text ?? "—" },
        { label: t("plan.overview.clean"), value: kinds.join(" + ") || "—" },
        { label: t("plan.overview.scope"), value: scope.join(" · ") || "—" },
        { label: t("plan.overview.cleaningDate"), value: slotText(t, formatDate, job.slot) },
      ],
      editStep: "cleaning",
    });
  }

  for (const job of jobsFor(plan, "disposal")) {
    blocks.push({
      id: job.id,
      service: "disposal",
      title: name("disposal"),
      place: job.address?.text,
      rows: [
        { label: t("plan.overview.location"), value: job.address?.text ?? "—" },
        {
          label: t("plan.overview.items"),
          value:
            DISPOSAL_TYPES.filter((key) => job.details.counts[key])
              .map((key) => `${t(`plan.disposal.${key}`)} × ${job.details.counts[key]}`)
              .join(" · ") || "—",
        },
        { label: t("plan.overview.collection"), value: slotText(t, formatDate, job.slot) },
        { label: t("plan.overview.quotation"), value: t("plan.overview.afterTeam") },
      ],
      editStep: "disposal",
    });
  }

  // Services the office added: the place, the answers given, the wished date.
  for (const key of plan.customServices) {
    const service = findService(catalog, key);
    const place = plan.addresses[customLocation(plan, key)]?.text;
    const answers = service
      ? serviceQuestions(service)
          .map(({ key: answer, question }): OverviewRow | null => {
            const raw = plan.answers[answer];
            if (!answerText(question, raw)) return null;
            const option = question.type === "select" ? question.options?.find((entry) => optionValue(entry) === raw) : undefined;
            const value =
              question.type === "yesno"
                ? t(raw === "yes" ? "plan.answer.yes" : "plan.answer.no")
                : question.type === "photos"
                  ? t("plan.overview.photosChosen", { count: (raw ?? "").split("\n").filter(Boolean).length })
                  : question.type === "area"
                    ? `${raw} m²`
                    : option
                      ? textAny(option, lang)
                      : (raw ?? "");
            return { label: textAny(question.label, lang) || question.id, value };
          })
          .filter((row): row is OverviewRow => row !== null)
      : [];

    blocks.push({
      id: customTaskId(key),
      service: "custom",
      icon: customIcon(service),
      title: customName(key),
      place,
      rows: [
        { label: t("plan.overview.location"), value: place ?? "—" },
        ...answers,
        { label: t("plan.overview.preferredDate"), value: slotText(t, formatDate, plan.customSlots[key] ?? { date: "", window: null }) },
        { label: t("plan.overview.quotation"), value: t("plan.overview.afterTeam") },
      ],
      editStep: customStepId(key) as CustomStepId,
    });
  }

  return blocks;
}
