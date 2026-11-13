"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { googleMapsEnabled } from "@/lib/booking/googleMaps";
import { useAddressLookup, type AddressCandidate } from "@/lib/booking/lookups";
import {
  LOCATED_SERVICES,
  customLocation,
  isBusiness,
  locationKeys,
  movingSelected,
  uid,
  validAddress,
  type LocatedService,
  type Plan,
  type PlanAddress,
} from "@/lib/booking/plan";
import { useSiteSettings } from "@/lib/site/useSiteSettings";
import { usePlanner } from "../context";
import { GoogleRouteMap, MapPickerDialog } from "../GoogleMap";
import { PlanMap, type MapPoint } from "../PlanMap";
import { SERVICE_ICON, customIcon } from "./Start";
import { ErrorText, Icon, Note, Section, focusRing, inputClass, textButton } from "../ui";

/**
 * Addresses: both ends of a move, and where every other service happens.
 *
 * Search as you type, through our geocoding endpoint; a result inside NRW is
 * taken as checked. An address the lookup cannot match is still accepted when
 * the customer presses Enter or leaves the field — the prototype accepts it
 * too, and the quote's own geocoding has the final word on a move.
 */

/** An address field with suggestions underneath. */
export function AddressInput({
  id,
  address,
  label,
  placeholder,
  onConfirm,
  onCancel,
  autoFocus = false,
  invalid = false,
}: {
  id: string;
  address: PlanAddress | undefined;
  label: string;
  placeholder?: string;
  onConfirm: (address: PlanAddress) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  invalid?: boolean;
}) {
  const { t } = useI18n();
  const lookup = useAddressLookup();
  const listId = useId();

  const [query, setQuery] = useState(address?.text ?? "");
  const [results, setResults] = useState<AddressCandidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const sequence = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const picking = useRef(false);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(address?.text ?? "");
  }, [address?.text]);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!host.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  async function search(text: string) {
    const ticket = ++sequence.current;
    setBusy(true);
    setError("");

    try {
      const found = await lookup.search(text);
      if (ticket !== sequence.current) return;
      setResults(found);
      setOpen(true);
      if (found.length === 0) setError(t("plan.address.noResults"));
    } catch {
      if (ticket === sequence.current) setError(t("plan.address.unavailable"));
    } finally {
      if (ticket === sequence.current) setBusy(false);
    }
  }

  function change(value: string) {
    sequence.current += 1;
    clearTimeout(timer.current);
    setQuery(value);
    setResults([]);
    setBusy(false);
    setError("");
    if (value.trim().length >= 3) timer.current = setTimeout(() => void search(value.trim()), 600);
  }

  function adopt(candidate: AddressCandidate) {
    sequence.current += 1;
    clearTimeout(timer.current);
    setResults([]);
    setOpen(false);
    setBusy(false);

    if (!candidate.nrw) {
      setError(t("plan.address.outsideNrw"));
      return;
    }

    setQuery(candidate.text);
    onConfirm({ ...candidate, manual: false });
  }

  /** Keeps what was typed when no suggestion was picked. */
  function keepTyped() {
    const text = query.trim();
    if (picking.current || !text || text === address?.text.trim()) return;
    if (text.length < 5) return setError(t("plan.address.tooShort"));

    sequence.current += 1;
    clearTimeout(timer.current);
    setBusy(false);
    setOpen(false);
    onConfirm({ text, line1: text, nrw: false, manual: true });
  }

  const confirmed = validAddress(address) && query.trim() === address.text.trim();

  return (
    <div ref={host} className="relative flex flex-col gap-1.5">
      <div className="relative">
        <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-default">
          <Icon name="search" size={16} />
        </span>
        <input
          id={id}
          type="text"
          role="combobox"
          aria-label={label}
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={invalid || Boolean(error)}
          autoComplete="off"
          autoFocus={autoFocus}
          value={query}
          placeholder={placeholder ?? t("plan.address.placeholder")}
          onChange={(event) => change(event.target.value)}
          onBlur={keepTyped}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              keepTyped();
            }
            if (event.key === "Escape") {
              setOpen(false);
              onCancel?.();
            }
          }}
          className={`${inputClass} ps-9 pe-10`}
        />
        <span className="absolute end-3 top-1/2 -translate-y-1/2">
          {busy ? (
            <span role="status" className="text-caption text-text-muted">
              {t("plan.address.searching")}
            </span>
          ) : confirmed ? (
            <span
              title={address.manual ? t("plan.address.typed") : t("plan.address.confirmed")}
              className={`grid size-6 place-items-center rounded-full ${address.manual ? "bg-yellow-tint text-text-heading" : "bg-success-soft text-success"}`}
            >
              <Icon name="check" size={14} />
            </span>
          ) : null}
        </span>
      </div>

      {open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-md border border-border-default bg-surface-card py-1 shadow-lg"
        >
          {results.map((result) => (
            <li key={`${result.lat},${result.lng},${result.text}`} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={() => {
                  picking.current = true;
                }}
                onClick={() => {
                  picking.current = false;
                  adopt(result);
                }}
                className={`flex w-full items-start gap-2.5 px-3 py-2 text-start hover:bg-surface-sunken ${focusRing}`}
              >
                <span className="mt-0.5 text-brand-red">
                  <Icon name="pin" size={15} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body-sm font-semibold text-text-heading">{result.line1 || result.text}</span>
                  {result.line2 ? <span className="text-caption text-text-muted">{result.line2}</span> : null}
                </span>
                {result.nrw ? null : (
                  <span className="shrink-0 text-caption font-semibold text-danger-text">{t("plan.address.outside")}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <ErrorText>{error}</ErrorText>
      {confirmed && address.manual ? (
        <p className="text-caption text-text-muted">{t("plan.address.typedHint")}</p>
      ) : null}
    </div>
  );
}

/** Saves an address under a key; a different place resets that place's access answers. */
export function saveAddress(plan: Plan, key: string, address: PlanAddress): Partial<Plan> {
  const old = plan.addresses[key];
  const moved = !old || old.text.trim().toLowerCase() !== address.text.trim().toLowerCase();

  const access = { ...plan.access };
  if (moved) delete access[key];

  return { addresses: { ...plan.addresses, [key]: address }, access };
}

/** Reuses a key that already holds this address, so one place is one record. */
function keyFor(plan: Plan, address: PlanAddress): string | null {
  const match = Object.entries(plan.addresses).find(
    ([, existing]) => existing.text.trim().toLowerCase() === address.text.trim().toLowerCase(),
  );
  return match ? match[0] : null;
}

/**
 * Why an address cannot be used under Settings → Company "Only accept
 * addresses in the service areas" — with the areas the office serves and a
 * way to reach it, since a customer just outside may still be helped.
 */
export function AreaError({ addressKey }: { addressKey: string }) {
  const { t, locale } = useI18n();
  const { errors, plan } = usePlanner();
  const { serviceAreas, onlyInsideAreas } = useSiteSettings();
  // Said as soon as the check comes back, not only on "Continue".
  const message =
    errors[`area.${addressKey}`] ?? (onlyInsideAreas && plan.addresses[addressKey]?.area === "outside" ? "plan.error.outsideArea" : undefined);

  if (!message) return null;
  if (message !== "plan.error.outsideArea") return <ErrorText>{t(message)}</ErrorText>;

  const areas = serviceAreas
    .split(/[,\n]/)
    .map((area) => area.trim())
    .filter(Boolean)
    .join(", ");

  return (
    <div role="alert" className="flex flex-col gap-1 rounded-md border border-danger bg-danger-soft px-3 py-2.5 text-body-sm text-danger-text">
      <p className="flex items-center gap-1.5 font-semibold">
        <Icon name="info" size={14} />
        {t("plan.error.outsideArea")}
      </p>
      <p className="text-caption">
        {plan.addresses[addressKey]?.text ? (
          <>
            <bdi className="font-semibold">{plan.addresses[addressKey]!.text}</bdi>.{" "}
          </>
        ) : null}
        {/* First-strong isolates keep a list of Latin place names in order inside an Arabic sentence. */}
        {areas ? t("plan.area.served", { values: { areas: `⁨${areas}⁩` } }) : null}{" "}
        <Link href={`/${locale}/kontakt`} className="font-semibold underline underline-offset-2">
          {t("plan.area.contact")}
        </Link>
      </p>
    </div>
  );
}

export function AddressStep() {
  const { t } = useI18n();
  const { plan, dispatch, errors, addressLabel } = usePlanner();

  const moving = movingSelected(plan);
  const primary = moving ? ["from", "to"] : ["service"];
  // A private plan without a move asks for each service's places instead.
  const showPrimary = moving || isBusiness(plan);
  const located = isBusiness(plan) ? [] : LOCATED_SERVICES.filter((service) => plan.services[service]);
  const custom = isBusiness(plan) ? [] : plan.customServices;
  const [picking, setPicking] = useState<{ key: string; title: string } | null>(null);

  const points: MapPoint[] = Object.entries(plan.addresses)
    .filter(([key, address]) => {
      if (typeof address.lat !== "number" || typeof address.lng !== "number") return false;
      if (showPrimary && primary.includes(key)) return true;
      return (
        located.some((service) => locationKeys(plan, service).includes(key)) ||
        custom.some((service) => customLocation(plan, service) === key)
      );
    })
    .map(([key, address]) => ({
      lat: address.lat as number,
      lng: address.lng as number,
      label: addressLabel(key),
      caption: address.city,
      tone: key === "to" ? "destination" : "origin",
    }));

  return (
    <div className="flex flex-col gap-6">
      <div className={`grid gap-5 ${showPrimary ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" : ""}`}>
        {showPrimary ? (
          <div className="flex flex-col gap-4">
            {primary.map((key, index) => {
              const title = moving ? t(index === 0 ? "plan.address.collectFrom" : "plan.address.deliverTo") : t("plan.address.serviceAddress");

              return (
                <div key={key} className="flex flex-col gap-3 rounded-lg border-2 border-border-subtle bg-surface-card p-4">
                  <label htmlFor={`address-${key}`} className="flex items-center gap-2.5 text-body-sm font-bold text-text-heading">
                    <span
                      aria-hidden="true"
                      className={`grid size-6 place-items-center rounded-full text-[11px] font-bold ${
                        index === 0 ? "bg-brand-red text-text-on-brand" : "bg-yellow-tint text-text-heading ring-1 ring-brand-yellow"
                      }`}
                    >
                      {index === 0 ? "A" : "B"}
                    </span>
                    {title}
                  </label>
                  <AddressInput
                    id={`address-${key}`}
                    address={plan.addresses[key]}
                    label={title}
                    invalid={Boolean(errors[`address.${key}`])}
                    onConfirm={(address) => dispatch({ type: "patch", patch: (current) => saveAddress(current, key, address) })}
                  />
                  {googleMapsEnabled ? (
                    <button type="button" className={`${textButton} self-start text-brand-red`} onClick={() => setPicking({ key, title })}>
                      <Icon name="pin" size={14} />
                      {t("plan.map.pick")}
                    </button>
                  ) : null}
                  <ErrorText>{errors[`address.${key}`] ? t(errors[`address.${key}`]!) : undefined}</ErrorText>
                  <AreaError addressKey={key} />
                </div>
              );
            })}
            <ErrorText>{errors.same ? t(errors.same) : undefined}</ErrorText>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-lg border-2 border-border-subtle bg-surface-card">
          <header className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
            <span className="flex items-center gap-2 text-body-sm font-semibold text-text-heading">
              <Icon name="pin" size={16} />
              {moving ? t("plan.address.yourRoute") : t("plan.address.location")}
            </span>
            {moving && points.length === 2 ? (
              <span className="text-caption text-text-muted">{t("plan.address.distanceLater")}</span>
            ) : null}
          </header>
          {googleMapsEnabled ? (
            <GoogleRouteMap points={points} line={moving} />
          ) : points.length === 0 ? (
            <div className="flex h-[300px] flex-col items-center justify-center gap-2 px-6 text-center md:h-[340px]">
              <span className="grid size-12 place-items-center rounded-full bg-red-50 text-brand-red">
                <Icon name="pin" size={22} />
              </span>
              <b className="text-body font-bold text-text-heading">
                {moving ? t("plan.address.emptyRouteTitle") : t("plan.address.emptyLocationTitle")}
              </b>
              <span className="text-body-sm text-text-default">
                {moving ? t("plan.address.emptyRouteText") : t("plan.address.emptyLocationText")}
              </span>
            </div>
          ) : (
            <PlanMap points={points} line={moving} />
          )}
        </section>
      </div>

      <Note>{t("plan.address.nrwOnly")}</Note>

      {located.length > 0 || custom.length > 0 ? (
        <Section title={t("plan.address.whereEach")} sub={t("plan.address.whereEachSub")}>
          {located.map((service) => (
            <ServiceLocations key={service} service={service} />
          ))}
          {custom.map((key) => (
            <CustomLocation key={key} serviceKey={key} />
          ))}
        </Section>
      ) : null}

      {picking ? (
        <MapPickerDialog
          title={picking.title}
          address={plan.addresses[picking.key]}
          onClose={() => setPicking(null)}
          onConfirm={(address) => {
            dispatch({ type: "patch", patch: (current) => saveAddress(current, picking.key, address) });
            setPicking(null);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Where one service happens: any of the plan's addresses, or a new one.
 *
 * Each chosen place becomes its own job with its own details and date, which
 * is how the prototype models cleaning both the old and the new home.
 */
function ServiceLocations({ service }: { service: LocatedService }) {
  const { t } = useI18n();
  const { plan, dispatch, errors, serviceName } = usePlanner();
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState(false);

  const chosen = locationKeys(plan, service).filter((key) => validAddress(plan.addresses[key]));
  const options = Object.entries(plan.addresses).filter(([, address]) => validAddress(address));
  const error = errors[`locations.${service}`];

  const setKeys = (keys: string[]) =>
    dispatch({ type: "patch", patch: (current) => ({ locations: { ...current.locations, [service]: keys } }) });

  const toggle = (key: string) =>
    setKeys(chosen.includes(key) ? chosen.filter((entry) => entry !== key) : [...chosen, key]);

  /** A new place for this service, typed or picked on the map; one place is one record. */
  const addLocation = (address: PlanAddress) =>
    dispatch({
      type: "patch",
      patch: (current) => {
        const key = keyFor(current, address) ?? uid("loc");
        const keys = locationKeys(current, service).filter((entry) => validAddress(current.addresses[entry]));
        return {
          ...saveAddress(current, key, address),
          locations: { ...current.locations, [service]: keys.includes(key) ? keys : [...keys, key] },
        };
      },
    });

  return (
    <div className={`grid gap-3 rounded-lg border p-4 md:grid-cols-[180px_minmax(0,1fr)] ${error ? "border-danger" : "border-border-default"}`}>
      <p className="flex items-center gap-2 text-body font-bold text-text-heading">
        <span className="text-brand-red">
          <Icon name={SERVICE_ICON[service]} size={18} />
        </span>
        {serviceName(service)}
      </p>

      <div className="flex flex-col gap-2.5">
        {options.length > 0 ? (
          <fieldset className="flex flex-col gap-2 border-0 p-0">
            <legend className="sr-only">{t("plan.address.chooseFor", { values: { service: serviceName(service) } })}</legend>
            {options.map(([key, address]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border-subtle px-3 py-2 text-body-sm text-text-heading has-[:checked]:border-brand-red has-[:checked]:bg-red-50">
                <input
                  type="checkbox"
                  checked={chosen.includes(key)}
                  // A service needs somewhere to happen; the last place stays until another is ticked.
                  disabled={chosen.length === 1 && chosen.includes(key)}
                  onChange={() => toggle(key)}
                  className="size-4 accent-brand-red"
                />
                <Icon name="pin" size={14} />
                <span className="min-w-0 flex-1 truncate">{address.text}</span>
              </label>
            ))}
          </fieldset>
        ) : null}

        {adding ? (
          <div className="flex flex-col gap-2">
            <AddressInput
              id={`new-address-${service}`}
              address={undefined}
              autoFocus
              label={t("plan.address.newFor", { values: { service: serviceName(service) } })}
              onCancel={() => setAdding(false)}
              onConfirm={(address) => {
                addLocation(address);
                setAdding(false);
              }}
            />
            <button type="button" className={`${textButton} self-start`} onClick={() => setAdding(false)}>
              {t("common.cancel")}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <button type="button" className={`${textButton} text-brand-red`} onClick={() => setAdding(true)}>
              <Icon name="plus" size={14} />
              {t("plan.address.addNew")}
            </button>
            {googleMapsEnabled ? (
              <button type="button" className={`${textButton} text-brand-red`} onClick={() => setPicking(true)}>
                <Icon name="pin" size={14} />
                {t("plan.map.pick")}
              </button>
            ) : null}
          </div>
        )}

        {picking ? (
          <MapPickerDialog
            title={t("plan.address.newFor", { values: { service: serviceName(service) } })}
            address={undefined}
            onClose={() => setPicking(false)}
            onConfirm={(address) => {
              addLocation(address);
              setPicking(false);
            }}
          />
        ) : null}

        <ErrorText>{error ? t(error) : undefined}</ErrorText>
        {chosen.map((key) => (
          <AreaError key={key} addressKey={key} />
        ))}
      </div>
    </div>
  );
}

/**
 * Where a service the office added happens: one of the plan's addresses, or
 * a new one. One place per custom service — the team visits or calls about
 * it before pricing anything.
 */
function CustomLocation({ serviceKey }: { serviceKey: string }) {
  const { t } = useI18n();
  const { plan, dispatch, errors, customName, customService } = usePlanner();
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState(false);

  const name = customName(serviceKey);
  const chosen = customLocation(plan, serviceKey);
  const options = Object.entries(plan.addresses).filter(([, address]) => validAddress(address));
  const error = errors[`locations.custom:${serviceKey}`];

  const choose = (key: string) =>
    dispatch({ type: "patch", patch: (current) => ({ customLocations: { ...current.customLocations, [serviceKey]: key } }) });

  const addLocation = (address: PlanAddress) =>
    dispatch({
      type: "patch",
      patch: (current) => {
        const key = keyFor(current, address) ?? uid("loc");
        return { ...saveAddress(current, key, address), customLocations: { ...current.customLocations, [serviceKey]: key } };
      },
    });

  return (
    <div className={`grid gap-3 rounded-lg border p-4 md:grid-cols-[180px_minmax(0,1fr)] ${error ? "border-danger" : "border-border-default"}`}>
      <p className="flex items-center gap-2 text-body font-bold text-text-heading">
        <span className="text-brand-red">
          <Icon name={customIcon(customService(serviceKey))} size={18} />
        </span>
        {name}
      </p>

      <div className="flex flex-col gap-2.5">
        {options.length > 0 ? (
          <fieldset className="flex flex-col gap-2 border-0 p-0">
            <legend className="sr-only">{t("plan.address.chooseFor", { values: { service: name } })}</legend>
            {options.map(([key, address]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border-subtle px-3 py-2 text-body-sm text-text-heading has-[:checked]:border-brand-red has-[:checked]:bg-red-50">
                <input
                  type="radio"
                  name={`custom-location-${serviceKey}`}
                  checked={chosen === key}
                  onChange={() => choose(key)}
                  className="size-4 accent-brand-red"
                />
                <Icon name="pin" size={14} />
                <span className="min-w-0 flex-1 truncate">{address.text}</span>
              </label>
            ))}
          </fieldset>
        ) : null}

        {adding ? (
          <div className="flex flex-col gap-2">
            <AddressInput
              id={`new-address-${serviceKey}`}
              address={undefined}
              autoFocus
              label={t("plan.address.newFor", { values: { service: name } })}
              onCancel={() => setAdding(false)}
              onConfirm={(address) => {
                addLocation(address);
                setAdding(false);
              }}
            />
            <button type="button" className={`${textButton} self-start`} onClick={() => setAdding(false)}>
              {t("common.cancel")}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <button type="button" className={`${textButton} text-brand-red`} onClick={() => setAdding(true)}>
              <Icon name="plus" size={14} />
              {t("plan.address.addNew")}
            </button>
            {googleMapsEnabled ? (
              <button type="button" className={`${textButton} text-brand-red`} onClick={() => setPicking(true)}>
                <Icon name="pin" size={14} />
                {t("plan.map.pick")}
              </button>
            ) : null}
          </div>
        )}

        {picking ? (
          <MapPickerDialog
            title={t("plan.address.newFor", { values: { service: name } })}
            address={undefined}
            onClose={() => setPicking(false)}
            onConfirm={(address) => {
              addLocation(address);
              setPicking(false);
            }}
          />
        ) : null}

        <ErrorText>{error ? t(error) : undefined}</ErrorText>
        {validAddress(plan.addresses[chosen]) ? <AreaError addressKey={chosen} /> : null}
      </div>
    </div>
  );
}
