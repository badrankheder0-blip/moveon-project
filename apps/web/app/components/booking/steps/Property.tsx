"use client";

import { useI18n } from "@/lib/i18n/provider";
import {
  FLOORS,
  LIFT_FIT,
  PARKING,
  emptyAccess,
  movingSelected,
  propertyKeys,
  validAddress,
  type Access,
  type Plan,
} from "@/lib/booking/plan";
import { usePlanner } from "../context";
import {
  ErrorText,
  Field,
  Icon,
  RadioCards,
  describedBy,
  inputClass,
  selectClass,
  selectStyle,
} from "../ui";

/**
 * Floor, lift and parking at every place the crew carries things.
 *
 * Only the floor and the lift reach the price (the engine's floor surcharge);
 * the lift's size, the parking and the notes travel to the crew with the
 * order. The step also asks how the move should be measured, as the
 * prototype does, because the next screen is built around the answer.
 */

export function floorLabel(t: (key: string, options?: { values?: Record<string, string | number> }) => string, floor: number) {
  if (floor < 0) return t("plan.floor.basement");
  if (floor === 0) return t("plan.floor.ground");
  if (floor >= 10) return t("plan.floor.tenPlus");
  return t("plan.floor.nth", { values: { n: floor } });
}

function setAccess(plan: Plan, key: string, patch: Partial<Access>): Partial<Plan> {
  return { access: { ...plan.access, [key]: { ...(plan.access[key] ?? emptyAccess()), ...patch } } };
}

export function PropertyStep() {
  const { t } = useI18n();
  const { plan, dispatch, errors, fieldRequired } = usePlanner();

  const keys = propertyKeys(plan);
  const notesRequired = fieldRequired("property.notes");
  const options = Object.entries(plan.addresses).filter(([, address]) => validAddress(address));
  const error = (key: string, field: string) => {
    const message = errors[`property.${key}.${field}`];
    return message ? t(message) : undefined;
  };

  const titleFor = (key: string) => (key === "from" ? "pickup" : key === "to" ? "delivery" : "collection");

  return (
    <div className="flex flex-col gap-6">
      <ErrorText>{errors.same ? t(errors.same) : undefined}</ErrorText>

      <div className="grid gap-5 lg:grid-cols-2">
        {keys.map((key) => {
          const access = plan.access[key] ?? emptyAccess();
          const upper = access.floor !== null && access.floor !== 0;
          const id = `property-${key.replace(/[^a-zA-Z0-9-]/g, "-")}`;
          const kind = titleFor(key);

          return (
            <section key={key} aria-labelledby={`${id}-title`} className="flex flex-col gap-4 rounded-lg border-2 border-border-subtle bg-surface-card p-4 md:p-5">
              <header className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-brand-red">
                  <Icon name="home" size={20} />
                </span>
                <div>
                  <h2 id={`${id}-title`} className="font-display text-body-lg font-bold text-text-heading">
                    {t(`plan.property.${kind}.title`)}
                  </h2>
                  <p className="text-body-sm text-text-default">{t(`plan.property.${kind}.sub`)}</p>
                </div>
              </header>

              <Field id={`${id}-address`} label={t("plan.property.address")} required error={error(key, "address")}>
                <p
                  id={`${id}-address`}
                  className={`${inputClass} truncate bg-surface-page`}
                  title={plan.addresses[key]?.text}
                >
                  {plan.addresses[key]?.text ?? options[0]?.[1].text ?? "—"}
                </p>
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field id={`${id}-floor`} label={t("plan.property.floor")} icon="stairs" required error={error(key, "floor")}>
                  <select
                    id={`${id}-floor`}
                    className={selectClass}
                    style={selectStyle}
                    value={access.floor === null ? "" : String(access.floor)}
                    onChange={(event) => {
                      const floor = Number(event.target.value);
                      dispatch({
                        type: "patch",
                        patch: (current) =>
                          setAccess(current, key, floor === 0 ? { floor, lift: false, fit: "" } : { floor }),
                      });
                    }}
                    {...describedBy(`${id}-floor`, error(key, "floor"))}
                  >
                    <option value="" disabled>
                      {t("plan.property.chooseFloor")}
                    </option>
                    {FLOORS.map((floor) => (
                      <option key={floor} value={floor}>
                        {floorLabel(t, floor)}
                      </option>
                    ))}
                  </select>
                </Field>

                {upper ? (
                  <div className="flex flex-col gap-2 md:pt-7">
                    <label className="flex cursor-pointer items-center gap-2.5 text-body-sm font-bold text-text-heading">
                      <input
                        type="checkbox"
                        checked={access.lift}
                        onChange={(event) =>
                          dispatch({
                            type: "patch",
                            patch: (current) => setAccess(current, key, { lift: event.target.checked, fit: "" }),
                          })
                        }
                        className="size-4 accent-brand-red"
                      />
                      {t("plan.property.lift")}
                    </label>

                    {access.lift ? (
                      <div className="flex flex-col gap-1">
                        <label htmlFor={`${id}-fit`} className="sr-only">
                          {t("plan.property.fit")}
                        </label>
                        <select
                          id={`${id}-fit`}
                          className={selectClass}
                          style={selectStyle}
                          value={access.fit}
                          onChange={(event) =>
                            dispatch({
                              type: "patch",
                              patch: (current) => setAccess(current, key, { fit: event.target.value as Access["fit"] }),
                            })
                          }
                          {...describedBy(`${id}-fit`, error(key, "fit"))}
                        >
                          <option value="" disabled>
                            {t("plan.property.fit")}
                          </option>
                          {LIFT_FIT.map((fit) => (
                            <option key={fit} value={fit}>
                              {t(`plan.property.fit.${fit}`)}
                            </option>
                          ))}
                        </select>
                        <ErrorText id={`${id}-fit-error`}>{error(key, "fit")}</ErrorText>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <Field id={`${id}-parking`} label={t("plan.property.parking")} icon="truck" required error={error(key, "parking")}>
                <select
                  id={`${id}-parking`}
                  className={selectClass}
                  style={selectStyle}
                  value={access.parking}
                  onChange={(event) =>
                    dispatch({
                      type: "patch",
                      patch: (current) => setAccess(current, key, { parking: event.target.value as Access["parking"] }),
                    })
                  }
                  {...describedBy(`${id}-parking`, error(key, "parking"))}
                >
                  <option value="" disabled>
                    {t("plan.property.chooseParking")}
                  </option>
                  {PARKING.map((parking) => (
                    <option key={parking} value={parking}>
                      {t(`plan.parking.${parking}`)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                id={`${id}-notes`}
                label={t("plan.property.notes")}
                icon="doc"
                required={notesRequired}
                {...(notesRequired ? {} : { optionalLabel: t("plan.optional") })}
                error={error(key, "notes")}
              >
                <textarea
                  id={`${id}-notes`}
                  rows={2}
                  maxLength={600}
                  className={inputClass}
                  placeholder={t("plan.property.notesPlaceholder")}
                  value={access.notes}
                  onChange={(event) =>
                    dispatch({ type: "patch", patch: (current) => setAccess(current, key, { notes: event.target.value }) })
                  }
                  {...describedBy(`${id}-notes`, error(key, "notes"))}
                />
              </Field>
            </section>
          );
        })}
      </div>

      {movingSelected(plan) ? (
        <section className="flex flex-col gap-3 rounded-lg border-2 border-border-subtle bg-surface-card p-4 md:p-5">
          <h2 className="font-display text-body-lg font-bold text-text-heading">{t("plan.property.methodTitle")}</h2>
          <RadioCards
            name="method"
            legend={t("plan.property.methodTitle")}
            value={plan.moving.method}
            onChange={(method) => dispatch({ type: "moving", patch: { method } })}
            options={[
              { value: "items", label: t("plan.property.byItems"), hint: t("plan.property.byItemsHint") },
              { value: "area", label: t("plan.property.byArea"), hint: t("plan.property.byAreaHint") },
            ]}
          />
          <ErrorText>{errors.method ? t(errors.method) : undefined}</ErrorText>
        </section>
      ) : null}
    </div>
  );
}
