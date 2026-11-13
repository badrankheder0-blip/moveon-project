"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { inventoryVolume, recommendedCrew, recommendsSecondVan } from "@/lib/booking/plan";
import { plannerCopy, usePlanner } from "../context";
import { Counter, Field, Icon, Section, ToggleCard, describedBy, inputClass, textButton } from "../ui";

/**
 * Crew and extras: the add-ons the engine prices, and the size of the team.
 *
 * The prototype's crew counter ran from one to eight. The engine prices a crew
 * of two or three and a second van, so that is what this offers — a counter
 * that reached five would quote three. The advice comes from the inventory's
 * own volume.
 *
 * The add-ons' names, descriptions and whether each is offered at all come
 * from Dashboard → Booking site (`planner` section, `extras.<id>.*`); their
 * prices from the rate card, through the one public read of it.
 */

const EXTRA_IDS = ["insurance", "packing", "parkingZone", "secondVan"] as const;
type ExtraId = (typeof EXTRA_IDS)[number];

/** The add-ons the office took off the screen (`extras.<id>.shown` = "0"). */
export function hiddenExtras(images: Record<string, string>): ExtraId[] {
  return EXTRA_IDS.filter((id) => images[`extras.${id}.shown`]?.trim() === "0");
}

interface AddonPrices {
  transportInsurance: string;
  parkingZone: string;
  packingPerM3: string;
}

function useAddonPrices() {
  const { sdk } = useApi();
  return useQuery({
    queryKey: ["booking", "addon-prices"],
    queryFn: () => sdk.http.get<AddonPrices>("/api/pricing/addons"),
    staleTime: 60_000,
    retry: 1,
  }).data;
}

export function ExtrasStep() {
  const { t, locale, formatCurrency } = useI18n();
  const { plan, dispatch, images, errors, fieldRequired } = usePlanner();
  const prices = useAddonPrices();

  const m = plan.moving;
  const volume = inventoryVolume(plan);
  const crew = recommendedCrew(volume);
  const volumeText = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(volume);
  const hidden = new Set(hiddenExtras(images));
  const notesRequired = fieldRequired("extras.notes");
  const notesError = errors.extrasNotes ? t(errors.extrasNotes) : undefined;

  const name = (id: ExtraId, fallback: string) => plannerCopy(images, `extras.${id}.name`, t(fallback));
  const desc = (id: ExtraId, fallback: string) => plannerCopy(images, `extras.${id}.desc`, t(fallback));

  /** "+ 49,00 €" — what the add-on adds to the move, VAT included. */
  const flat = (amount: string | undefined) =>
    amount && Number.parseFloat(amount) > 0 ? t("plan.extras.priceFlat", { values: { amount: formatCurrency(amount) } }) : undefined;
  const perM3 = (amount: string | undefined) =>
    amount && Number.parseFloat(amount) > 0 ? t("plan.extras.pricePerM3", { values: { amount: formatCurrency(amount) } }) : undefined;

  return (
    <Section title={t("plan.extras.title")} sub={t("plan.extras.sub")}>
      {hidden.has("insurance") ? null : (
        <ToggleCard
          id="extra-insurance"
          icon="shield"
          title={name("insurance", "plan.extras.insurance")}
          description={desc("insurance", "plan.extras.insuranceHint")}
          price={flat(prices?.transportInsurance)}
          checked={m.insurance}
          onChange={(insurance) => dispatch({ type: "moving", patch: { insurance } })}
        />
      )}
      {hidden.has("packing") ? null : (
        <ToggleCard
          id="extra-packing"
          icon="box"
          title={name("packing", "plan.extras.packing")}
          description={desc("packing", "plan.extras.packingHint")}
          price={perM3(prices?.packingPerM3)}
          checked={m.packing}
          onChange={(packing) => dispatch({ type: "moving", patch: { packing } })}
        />
      )}
      {hidden.has("parkingZone") ? null : (
        <ToggleCard
          id="extra-parking"
          icon="truck"
          title={name("parkingZone", "plan.extras.parkingZone")}
          description={desc("parkingZone", "plan.extras.parkingZoneHint")}
          price={flat(prices?.parkingZone)}
          checked={m.parkingZone}
          onChange={(parkingZone) => dispatch({ type: "moving", patch: { parkingZone } })}
        />
      )}

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border-default p-4">
        <span className="text-brand-red">
          <Icon name="user" size={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body font-bold text-text-heading">{t("plan.extras.team")}</span>
          <span className="text-body-sm text-text-default">
            {volume > 0
              ? t("plan.extras.teamAdvice", { values: { volume: volumeText, crew } })
              : t("plan.extras.teamHint")}
            {m.crewSize !== crew && volume > 0 ? (
              <>
                {" "}
                <button type="button" className={`${textButton} text-brand-red`} onClick={() => dispatch({ type: "moving", patch: { crewSize: crew } })}>
                  {t("plan.extras.useAdvice")}
                </button>
              </>
            ) : null}
          </span>
        </span>
        <Counter
          value={m.crewSize}
          min={2}
          max={3}
          label={t("plan.extras.team")}
          decreaseLabel={t("plan.decrease", { values: { name: t("plan.extras.team") } })}
          increaseLabel={t("plan.increase", { values: { name: t("plan.extras.team") } })}
          onChange={(value) => dispatch({ type: "moving", patch: { crewSize: value >= 3 ? 3 : 2 } })}
        />
      </div>

      {hidden.has("secondVan") ? null : (
        <ToggleCard
          id="extra-van"
          icon="truck"
          title={name("secondVan", "plan.extras.secondVan")}
          description={
            recommendsSecondVan(volume)
              ? t("plan.extras.secondVanAdvice", { values: { volume: volumeText } })
              : desc("secondVan", "plan.extras.secondVanHint")
          }
          checked={m.secondVan}
          onChange={(secondVan) => dispatch({ type: "moving", patch: { secondVan } })}
        />
      )}

      <Field
        id="extras-notes"
        label={t("plan.extras.notes")}
        required={notesRequired}
        {...(notesRequired ? {} : { optionalLabel: t("plan.optional") })}
        error={notesError}
      >
        <textarea
          id="extras-notes"
          rows={3}
          maxLength={800}
          className={inputClass}
          placeholder={t("plan.extras.notesPlaceholder")}
          value={m.notes}
          onChange={(event) => dispatch({ type: "moving", patch: { notes: event.target.value } })}
          {...describedBy("extras-notes", notesError)}
        />
      </Field>
    </Section>
  );
}
