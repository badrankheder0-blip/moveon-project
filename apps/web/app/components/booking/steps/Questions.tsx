"use client";

import { useRef, type ReactNode } from "react";

import { useI18n } from "@/lib/i18n/provider";
import {
  customStepId,
  optionValue,
  photoNames,
  stepQuestions,
  textAny,
  type AskedQuestion,
} from "@/lib/booking/catalog";
import type { Errors, StepId } from "@/lib/booking/plan";
import { usePlanner } from "../context";
import { AddressInput } from "./Address";
import { customIcon } from "./Start";
import {
  Counter,
  ErrorText,
  Field,
  Icon,
  Note,
  RadioCards,
  Section,
  UnitInput,
  describedBy,
  focusRing,
  inputClass,
  secondaryButton,
} from "../ui";

/**
 * The questions the office added to the booking flow (Dashboard → Services):
 * under a built-in step's own questions, or as a custom service's whole
 * step. Drawn with the planner's own fields, so an added question reads like
 * one the planner always asked.
 *
 * Answers live in `plan.answers` under `extra.<step>.<question id>`, which is
 * also how they reach the order (`orders.answers`) and the request.
 */

const MAX_PHOTOS = 10;
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * The added questions of a built-in step, if any: the Booking site's for
 * everyone, then the selected services'. `step` may be "type", the start
 * screen, which is not a planner step; `errors` then comes from the caller.
 */
export function StepQuestions({ step, errors }: { step: StepId | "type"; errors?: Errors }) {
  const { t } = useI18n();
  const { plan, catalog, common } = usePlanner();
  const asked = stepQuestions(plan, catalog, step as StepId, common);

  if (asked.length === 0) return null;

  return (
    <Section title={t("plan.questions.title")} sub={t("plan.questions.sub")}>
      {asked.map((entry) => (
        <QuestionField key={entry.key} asked={entry} errors={errors} />
      ))}
    </Section>
  );
}

/** A custom service's own step: what it is, and the office's questions about it. */
export function CustomServiceStep({ serviceKey }: { serviceKey: string }) {
  const { t, locale } = useI18n();
  const { plan, catalog, common, customService } = usePlanner();
  const service = customService(serviceKey);
  const asked = stepQuestions(plan, catalog, customStepId(serviceKey), common);

  return (
    <div className="flex flex-col gap-4">
      <Section
        title={
          <span className="flex items-center gap-2">
            <span className="text-brand-red">
              <Icon name={customIcon(service)} size={18} />
            </span>
            {textAny(service?.name, locale) || serviceKey}
          </span>
        }
        sub={textAny(service?.tagline, locale) || undefined}
      >
        {asked.length > 0 ? (
          asked.map((entry) => <QuestionField key={entry.key} asked={entry} />)
        ) : (
          <p className="text-body-sm text-text-default">{t("plan.custom.noQuestions")}</p>
        )}
      </Section>
      <Note tone="warm">{t("plan.custom.quoteNote")}</Note>
    </div>
  );
}

const fieldId = (key: string) => `q-${key.replace(/[^a-zA-Z0-9-]/g, "-")}`;

/** A label for a group of choices, drawn like <FieldLabel>. */
function GroupLabel({ id, required, optional, children }: { id: string; required: boolean; optional: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-center justify-between gap-2 text-body-sm font-semibold text-text-heading">
      <span className="flex items-center gap-1.5">
        {children}
        {required ? (
          <span aria-hidden="true" className="text-brand-red">
            *
          </span>
        ) : null}
      </span>
      {required ? null : <span className="text-caption font-normal text-text-muted">{optional}</span>}
    </p>
  );
}

function QuestionField({ asked, errors: given }: { asked: AskedQuestion; errors?: Errors | undefined }) {
  const { t, locale } = useI18n();
  const { plan, dispatch, errors: stepErrors } = usePlanner();
  const errors = given ?? stepErrors;
  const { key, question } = asked;

  const id = fieldId(key);
  const label = textAny(question.label, locale) || t("plan.questions.untitled");
  const value = plan.answers[key] ?? "";
  const error = errors[`q.${key}`] ? t(errors[`q.${key}`]!) : undefined;
  const optional = t("plan.optional");

  const set = (next: string) => dispatch({ type: "patch", patch: (current) => ({ answers: { ...current.answers, [key]: next } }) });

  const field = (control: ReactNode) => (
    <Field id={id} label={label} required={question.required} {...(question.required ? {} : { optionalLabel: optional })} error={error}>
      {control}
    </Field>
  );

  switch (question.type) {
    case "text":
      return field(<input id={id} className={inputClass} maxLength={500} value={value} onChange={(event) => set(event.target.value)} {...describedBy(id, error)} />);

    case "number":
      return field(
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          className={`${inputClass} [appearance:textfield] md:max-w-xs [&::-webkit-inner-spin-button]:appearance-none`}
          value={value}
          onChange={(event) => set(event.target.value)}
          {...describedBy(id, error)}
        />,
      );

    case "area":
      return field(
        <div className="md:max-w-xs">
          <UnitInput id={id} value={value} onChange={set} unit="m²" max={100000} error={error} />
        </div>,
      );

    case "address":
      return field(
        <AddressInput
          id={id}
          address={value ? { text: value, nrw: true } : undefined}
          label={label}
          invalid={Boolean(error)}
          onConfirm={(address) => set(address.text)}
        />,
      );

    case "select":
    case "yesno": {
      const options =
        question.type === "yesno"
          ? [
              { value: "yes", label: t("plan.answer.yes") },
              { value: "no", label: t("plan.answer.no") },
            ]
          : (question.options ?? []).map((option) => ({ value: optionValue(option), label: textAny(option, locale) }));
      return (
        <div className="flex min-w-0 flex-col gap-1.5" role="group" aria-labelledby={`${id}-label`}>
          <GroupLabel id={`${id}-label`} required={question.required} optional={optional}>
            {label}
          </GroupLabel>
          <RadioCards name={id} legend={label} value={value} options={options} onChange={set} columns={question.type === "yesno" || options.length > 1 ? 2 : 1} />
          <ErrorText id={`${id}-error`}>{error}</ErrorText>
        </div>
      );
    }

    case "counter": {
      const count = Number.parseInt(value, 10) || 0;
      return (
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className={`flex items-center justify-between gap-4 rounded-lg border p-3 ${count > 0 ? "border-brand-red bg-red-50" : error ? "border-danger" : "border-border-default"}`}>
            <span className="flex items-center gap-1.5 text-body-sm font-bold text-text-heading">
              {label}
              {question.required ? (
                <span aria-hidden="true" className="text-brand-red">
                  *
                </span>
              ) : null}
            </span>
            <Counter
              value={count}
              max={999}
              label={label}
              decreaseLabel={t("plan.decrease", { values: { name: label } })}
              increaseLabel={t("plan.increase", { values: { name: label } })}
              onChange={(next) => set(String(next))}
            />
          </div>
          <ErrorText id={`${id}-error`}>{error}</ErrorText>
        </div>
      );
    }

    case "photos":
      return <PhotoQuestion id={id} answerKey={key} label={label} required={question.required} error={error} value={value} onChange={set} />;
  }
}

/**
 * Photos for one question. Like the Photos step they stay in this browser —
 * there is no customer upload — and the office is told how many were chosen.
 */
function PhotoQuestion({
  id,
  answerKey,
  label,
  required,
  error,
  value,
  onChange,
}: {
  id: string;
  answerKey: string;
  label: string;
  required: boolean;
  error: string | undefined;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const { photoFiles } = usePlanner();
  const input = useRef<HTMLInputElement>(null);
  const names = photoNames(value);

  function accept(list: FileList | null) {
    const incoming = Array.from(list ?? []).filter((file) => file.type.startsWith("image/") && file.size <= MAX_BYTES);
    const next = [...names];
    for (const file of incoming.slice(0, Math.max(0, MAX_PHOTOS - names.length))) {
      let name = file.name;
      let n = 2;
      while (next.includes(name)) name = `${n++}-${file.name}`;
      next.push(name);
      photoFiles.current.set(`${answerKey}/${name}`, file);
    }
    onChange(next.join("\n"));
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5" role="group" aria-labelledby={`${id}-label`}>
      <GroupLabel id={`${id}-label`} required={required} optional={t("plan.optional")}>
        {label}
      </GroupLabel>
      <div className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-4 py-6 text-center ${error ? "border-danger" : "border-border-default"} bg-surface-page`}>
        <span className="grid size-11 place-items-center rounded-xl bg-surface-card text-brand-red shadow-sm">
          <Icon name="photo" size={22} />
        </span>
        <input
          ref={input}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          className="sr-only"
          aria-label={label}
          onChange={(event) => {
            accept(event.target.files);
            event.target.value = "";
          }}
        />
        <button type="button" className={secondaryButton} disabled={names.length >= MAX_PHOTOS} onClick={() => input.current?.click()}>
          <Icon name="plus" size={16} />
          {t("plan.photos.add")}
        </button>
        <p className="text-caption text-text-default">{t("plan.photos.limits", { values: { max: MAX_PHOTOS } })}</p>
      </div>
      {names.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {names.map((name) => (
            <li key={name} className="flex items-center gap-1.5 rounded-md border border-border-default bg-surface-card py-1 ps-2.5 pe-1 text-caption text-text-heading">
              <Icon name="photo" size={13} />
              <span className="max-w-[12rem] truncate">{name}</span>
              <button
                type="button"
                aria-label={t("plan.photos.remove", { values: { name } })}
                onClick={() => {
                  photoFiles.current.delete(`${answerKey}/${name}`);
                  onChange(names.filter((entry) => entry !== name).join("\n"));
                }}
                className={`grid size-6 place-items-center rounded-full text-text-default hover:text-brand-red ${focusRing}`}
              >
                <Icon name="close" size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <ErrorText id={`${id}-error`}>{error}</ErrorText>
    </div>
  );
}
