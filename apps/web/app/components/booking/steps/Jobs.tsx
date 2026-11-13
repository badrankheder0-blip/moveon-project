"use client";

import { useState, type ReactNode } from "react";

import { useI18n } from "@/lib/i18n/provider";
import {
  CLEAN_WINDOWS,
  DISPOSAL_TYPES,
  RENOVATION_WORK,
  disposalCount,
  jobErrors,
  jobsFor,
  updateJob,
  windowCount,
  type CleaningDetails,
  type DisposalDetails,
  type JobRef,
  type LocatedService,
  type RenovationDetails,
} from "@/lib/booking/plan";
import { usePlanner } from "../context";
import {
  CheckCard,
  Counter,
  ErrorText,
  Field,
  Icon,
  Note,
  Section,
  UnitInput,
  describedBy,
  focusRing,
  inputClass,
  textButton,
} from "../ui";

/**
 * Renovation, cleaning and junk removal: one form per place.
 *
 * A service booked at two addresses is two jobs with their own answers and
 * their own date, so the form sits under a row of location tabs, as the
 * prototype draws it.
 */
function JobShell<S extends LocatedService>({
  service,
  children,
}: {
  service: S;
  children: (job: JobRef<S>) => ReactNode;
}) {
  const { t } = useI18n();
  const { plan, go, serviceName } = usePlanner();
  const jobs = jobsFor(plan, service);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = jobs.find((job) => job.id === activeId) ?? jobs[0];

  if (!active) {
    return (
      <Note tone="warm">
        {t("plan.jobs.noLocation")}{" "}
        <button type="button" className={`${textButton} text-brand-red`} onClick={() => go("address")}>
          {t("plan.jobs.chooseLocation")}
        </button>
      </Note>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-body-sm font-semibold text-text-heading">
            <Icon name="pin" size={15} />
            {jobs.length > 1
              ? t("plan.jobs.atLocations", { values: { service: serviceName(service), count: jobs.length } })
              : t("plan.jobs.location")}
          </span>
          <button type="button" className={`${textButton} text-brand-red`} onClick={() => go("address")}>
            {t("plan.jobs.editLocations")}
          </button>
        </div>

        {jobs.length > 1 ? (
          <div role="tablist" aria-label={t("plan.jobs.chooseTab")} className="grid gap-2 md:grid-cols-2">
            {jobs.map((job, index) => {
              const selected = job.id === active.id;
              const done = Object.keys(jobErrors(job)).length === 0;
              return (
                <button
                  key={job.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveId(job.id)}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-start text-body-sm font-semibold ${focusRing} ${
                    selected ? "border-brand-red bg-red-50 text-text-heading" : "border-border-default text-text-default hover:border-border-strong"
                  }`}
                >
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full text-caption ${done ? "bg-yellow-tint text-text-heading ring-1 ring-brand-yellow" : "border border-border-strong"}`}>
                    {done ? <Icon name="check" size={13} /> : index + 1}
                  </span>
                  <span className="truncate">{job.address?.text ?? t("plan.jobs.chooseAddress")}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-body-sm font-semibold text-text-heading">{active.address?.text ?? "—"}</p>
        )}
      </div>

      <div role={jobs.length > 1 ? "tabpanel" : undefined} key={active.id}>
        {children(active)}
      </div>

      {jobs.length > 1 ? (
        <p className="text-caption text-text-default">
          {t("plan.jobs.position", { values: { index: jobs.findIndex((job) => job.id === active.id) + 1, total: jobs.length } })}
        </p>
      ) : null}
    </div>
  );
}

function useJobError(job: JobRef) {
  const { t } = useI18n();
  const { errors } = usePlanner();
  return (field: string) => {
    const message = errors[`${job.id}.${field}`];
    return message ? t(message) : undefined;
  };
}

// ── Renovation ──────────────────────────────────────────────────────────

const WORK_ICON = { painting: "paint", flooring: "layers", repairs: "tool" } as const;

export function RenovationStep() {
  return <JobShell service="renovation">{(job) => <RenovationForm job={job} />}</JobShell>;
}

function RenovationForm({ job }: { job: JobRef<"renovation"> }) {
  const { t } = useI18n();
  const { dispatch } = usePlanner();
  const error = useJobError(job);
  const details = job.details;

  const patch = (change: Partial<RenovationDetails>) =>
    dispatch({ type: "patch", patch: (current) => updateJob<"renovation">(current, job.id, { details: change }) });

  return (
    <Section title={t("plan.renovation.title")} sub={t("plan.renovation.sub")}>
      {RENOVATION_WORK.map((work) => (
        <CheckCard
          key={work}
          id={`${job.id}-${work}`}
          icon={WORK_ICON[work]}
          title={t(`plan.renovation.${work}`)}
          checked={details.work.includes(work)}
          onChange={(checked) =>
            patch({ work: checked ? [...details.work, work] : details.work.filter((entry) => entry !== work) })
          }
        >
          <Field
            id={`${job.id}-${work}-area`}
            label={t(`plan.renovation.${work}Area`)}
            required
            hint={t(`plan.renovation.${work}Hint`)}
            error={error(`area.${work}`)}
          >
            <UnitInput
              id={`${job.id}-${work}-area`}
              value={details.areas[work] ?? ""}
              onChange={(value) => patch({ areas: { ...details.areas, [work]: value } })}
              unit="m²"
              max={10000}
              error={error(`area.${work}`)}
            />
          </Field>
        </CheckCard>
      ))}
      <ErrorText>{error("work")}</ErrorText>
      <Note icon="calendar">{t("plan.renovation.next")}</Note>
    </Section>
  );
}

// ── Cleaning ────────────────────────────────────────────────────────────

export function CleaningStep() {
  return <JobShell service="cleaning">{(job) => <CleaningForm job={job} />}</JobShell>;
}

function CleaningForm({ job }: { job: JobRef<"cleaning"> }) {
  const { t } = useI18n();
  const { dispatch } = usePlanner();
  const error = useJobError(job);
  const details = job.details;

  const patch = (change: Partial<CleaningDetails>) =>
    dispatch({ type: "patch", patch: (current) => updateJob<"cleaning">(current, job.id, { details: change }) });

  return (
    <div className="flex flex-col gap-4">
      <Section title={t("plan.cleaning.title")} sub={t("plan.cleaning.sub")}>
        <div className="grid gap-3 md:grid-cols-2">
          <CheckCard
            id={`${job.id}-move`}
            icon="home"
            title={t("plan.cleaning.moveClean")}
            description={t("plan.cleaning.moveCleanHint")}
            checked={details.moveClean}
            onChange={(moveClean) => patch({ moveClean })}
          />
          <CheckCard
            id={`${job.id}-windows`}
            icon="grid"
            title={t("plan.cleaning.windows")}
            description={t("plan.cleaning.windowsHint")}
            checked={details.windows}
            onChange={(windows) => patch({ windows })}
          />
        </div>
        <ErrorText>{error("type")}</ErrorText>
      </Section>

      {details.moveClean ? (
        <Section title={t("plan.cleaning.spaceTitle")}>
          <Field id={`${job.id}-area`} label={t("plan.cleaning.area")} required error={error("area")}>
            <UnitInput id={`${job.id}-area`} value={details.areaSqm} onChange={(areaSqm) => patch({ areaSqm })} unit="m²" max={2000} error={error("area")} />
          </Field>
          <Note>{details.windows ? t("plan.cleaning.includedWithWindows") : t("plan.cleaning.included")}</Note>
        </Section>
      ) : null}

      {details.windows ? (
        <Section
          title={t("plan.cleaning.windowsTitle")}
          sub={t("plan.cleaning.windowsSub")}
          actions={<span className="text-body-sm font-bold text-text-heading">{t("plan.cleaning.windowCount", { count: windowCount(details) })}</span>}
        >
          {CLEAN_WINDOWS.map((kind) => (
            <div key={kind} className="flex items-center justify-between gap-4 rounded-lg border border-border-default p-3">
              <span className="text-body-sm font-semibold text-text-heading">{t(`plan.cleaning.window.${kind}`)}</span>
              <Counter
                value={details.windowCounts[kind]}
                max={150}
                label={t(`plan.cleaning.window.${kind}`)}
                decreaseLabel={t("plan.decrease", { values: { name: t(`plan.cleaning.window.${kind}`) } })}
                increaseLabel={t("plan.increase", { values: { name: t(`plan.cleaning.window.${kind}`) } })}
                onChange={(count) => patch({ windowCounts: { ...details.windowCounts, [kind]: count } })}
              />
            </div>
          ))}
          <ErrorText>{error("windows")}</ErrorText>
          <Note tone="warm">{t("plan.cleaning.windowsQuote")}</Note>
        </Section>
      ) : null}
    </div>
  );
}

// ── Junk removal ────────────────────────────────────────────────────────

const DISPOSAL_ICON = {
  largeFurniture: "sofa",
  smallFurniture: "chair",
  largeElectronics: "washer",
  smallElectronics: "tv",
} as const;

export function DisposalStep() {
  return <JobShell service="disposal">{(job) => <DisposalForm job={job} />}</JobShell>;
}

function DisposalForm({ job }: { job: JobRef<"disposal"> }) {
  const { t } = useI18n();
  const { dispatch, fieldRequired } = usePlanner();
  const error = useJobError(job);
  const details = job.details;
  const notesRequired = fieldRequired("disposal.notes");

  const patch = (change: Partial<DisposalDetails>) =>
    dispatch({ type: "patch", patch: (current) => updateJob<"disposal">(current, job.id, { details: change }) });

  return (
    <Section title={t("plan.disposal.title")} sub={t("plan.disposal.sub")}>
      {DISPOSAL_TYPES.map((kind) => {
        const count = details.counts[kind];
        return (
          <div
            key={kind}
            className={`flex items-center gap-3 rounded-lg border p-3 ${count > 0 ? "border-brand-red bg-red-50" : "border-border-default"}`}
          >
            <span className="text-brand-red">
              <Icon name={DISPOSAL_ICON[kind]} size={19} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-body-sm font-bold text-text-heading">{t(`plan.disposal.${kind}`)}</span>
              <span className="text-caption text-text-default">{t(`plan.disposal.${kind}Hint`)}</span>
            </span>
            <Counter
              value={count}
              max={200}
              label={t(`plan.disposal.${kind}`)}
              decreaseLabel={t("plan.decrease", { values: { name: t(`plan.disposal.${kind}`) } })}
              increaseLabel={t("plan.increase", { values: { name: t(`plan.disposal.${kind}`) } })}
              onChange={(value) => patch({ counts: { ...details.counts, [kind]: value } })}
            />
          </div>
        );
      })}
      <ErrorText>{error("counts")}</ErrorText>

      <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm">
        <b className="text-text-heading">{t("plan.disposal.total", { count: disposalCount(details) })}</b>
        <span className="text-caption text-text-default">{t("plan.disposal.quoteNote")}</span>
      </div>

      <Field
        id={`${job.id}-notes`}
        label={t("plan.disposal.notes")}
        required={notesRequired}
        {...(notesRequired ? {} : { optionalLabel: t("plan.optional") })}
        error={error("notes")}
      >
        <textarea
          id={`${job.id}-notes`}
          rows={2}
          maxLength={600}
          className={inputClass}
          placeholder={t("plan.disposal.notesPlaceholder")}
          value={details.notes}
          onChange={(event) => patch({ notes: event.target.value })}
          {...describedBy(`${job.id}-notes`, error("notes"))}
        />
      </Field>
    </Section>
  );
}
