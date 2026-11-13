"use client";

import { useMemo, useState } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { useLiveAvailability } from "@/lib/live/useLiveData";
import {
  WINDOWS,
  cleaningPriceable,
  jobsFor,
  scheduleTasks,
  setSlot,
  todayIso,
  windowLabel,
  type ScheduleTask,
} from "@/lib/booking/plan";
import { usePlanner } from "../context";
import { SERVICE_ICON, customIcon } from "./Start";
import { ErrorText, Field, Icon, Note, describedBy, focusRing, inputClass } from "../ui";

/**
 * One date and one two-hour arrival window per job.
 *
 * A job the planner books (a move, a priced cleaning) is offered only the days
 * `GET /api/availability` calls free — lead time, the closed weekday, holidays
 * and capacity, the rules the order is checked against again when it is
 * placed. A site visit or a job the team prices is a preferred date the office
 * confirms, so any future working day is offered, as the prototype says:
 * "Preferred dates · subject to confirmation".
 */
export function ScheduleStep() {
  const { t, formatDate } = useI18n();
  const { plan, dispatch, errors, serviceName, customName, customService, fieldRequired, fieldShown, fieldLabel } = usePlanner();

  const tasks = scheduleTasks(plan);
  const notesRequired = fieldRequired("schedule.notes");
  const notesError = errors.scheduleNotes ? t(errors.scheduleNotes) : undefined;
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = tasks.find((task) => task.id === activeId) ?? tasks.find((task) => !task.slot.date || task.slot.window === null) ?? tasks[0];

  if (!active) return <Note tone="warm">{t("plan.schedule.nothing")}</Note>;

  const booked = (task: ScheduleTask) =>
    task.service === "moving" ||
    (task.service === "cleaning" && jobsFor(plan, "cleaning").some((job) => job.id === task.id && cleaningPriceable(job.details)));

  const capacity = active.service === "moving" && plan.moving.secondVan ? 2 : 1;
  const where = (task: ScheduleTask) => plan.addresses[task.addressKey]?.text ?? "—";
  const taskName = (task: ScheduleTask) =>
    task.service === "custom"
      ? customName(task.customKey ?? "")
      : task.service === "renovation"
        ? t("plan.schedule.renovationVisit")
        : serviceName(task.service);
  const taskIcon = (task: ScheduleTask) => (task.service === "custom" ? customIcon(customService(task.customKey ?? "")) : SERVICE_ICON[task.service]);

  const set = (patch: { date?: string; window?: number | null }) =>
    dispatch({ type: "patch", patch: (current) => setSlot(current, active.id, patch) });

  const dateError = errors[`date.${active.id}`];
  const windowError = errors[`window.${active.id}`];

  return (
    <div className="flex flex-col gap-5">
      <Note>{t("plan.schedule.preview")}</Note>
      {plan.services.renovation ? <Note icon="calendar">{t("plan.schedule.renovationNote")}</Note> : null}

      {tasks.length > 1 ? (
        <div className="flex flex-col gap-2 rounded-lg border-2 border-border-subtle bg-surface-card p-2">
          {tasks.map((task) => {
            const selected = task.id === active.id;
            const done = Boolean(task.slot.date && task.slot.window !== null);
            const failed = errors[`date.${task.id}`] || errors[`window.${task.id}`];
            return (
              <button
                key={task.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setActiveId(task.id)}
                className={`flex flex-wrap items-center gap-3 rounded-md border px-3 py-2.5 text-start ${focusRing} ${
                  selected ? "border-brand-red bg-red-50" : failed ? "border-danger" : "border-border-subtle hover:border-border-strong"
                }`}
              >
                <span className={done ? "text-brand-red" : "text-text-faint"}>
                  <Icon name={done ? "check" : taskIcon(task)} size={16} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body-sm font-bold text-text-heading">{taskName(task)}</span>
                  <span className="truncate text-caption text-text-default">{where(task)}</span>
                </span>
                <span className="text-caption text-text-default">
                  {done ? `${formatDate(task.slot.date)} · ${windowLabel(task.slot.window ?? 0)}` : t("plan.schedule.notChosen")}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="flex flex-wrap items-baseline gap-2 text-body-sm">
        <b className="text-text-heading">{taskName(active)}</b>
        <span className="text-caption text-text-default">{where(active)}</span>
      </p>

      <div className="grid gap-6 rounded-lg border-2 border-border-subtle bg-surface-card p-4 md:p-5 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-body font-bold text-text-heading">{t("plan.schedule.chooseDate")}</h2>
          {booked(active) ? (
            <AvailabilityMonth value={active.slot.date} capacity={capacity} onChange={(date) => set({ date })} />
          ) : (
            <PreferredMonth value={active.slot.date} onChange={(date) => set({ date })} />
          )}
          <p className="text-caption text-text-default">
            {booked(active) ? t("plan.schedule.bookedNote") : t("plan.schedule.preferredNote")}
          </p>
          <ErrorText>{dateError ? t(dateError) : undefined}</ErrorText>
        </div>

        <fieldset className="flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-1 text-body font-bold text-text-heading">{t("plan.schedule.window")}</legend>
          <p className="text-caption text-text-default">
            {active.slot.date
              ? t("plan.schedule.windowFor", { values: { name: taskName(active), date: formatDate(active.slot.date) } })
              : t("plan.schedule.windowHint")}
          </p>
          {WINDOWS.map((start, index) => (
            <label
              key={start}
              className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-body-sm font-bold text-text-heading has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-yellow ${
                active.slot.window === index ? "border-brand-red bg-red-50" : "border-border-default hover:border-border-strong"
              }`}
            >
              <input
                type="radio"
                name={`window-${active.id}`}
                checked={active.slot.window === index}
                onChange={() => set({ window: index })}
                className="size-4 accent-brand-red"
              />
              <span dir="ltr">{windowLabel(index)}</span>
            </label>
          ))}
          <ErrorText>{windowError ? t(windowError) : undefined}</ErrorText>
        </fieldset>
      </div>

      {fieldShown("schedule.notes") ? (
        <Field
          id="schedule-notes"
          label={fieldLabel("schedule.notes", t("plan.schedule.notes"))}
          required={notesRequired}
          {...(notesRequired ? {} : { optionalLabel: t("plan.optional") })}
          error={notesError}
        >
          <textarea
            id="schedule-notes"
            rows={2}
            maxLength={600}
            className={inputClass}
            placeholder={t("plan.schedule.notesPlaceholder")}
            value={plan.scheduleNotes}
            onChange={(event) => dispatch({ type: "patch", patch: { scheduleNotes: event.target.value } })}
            {...describedBy("schedule-notes", notesError)}
          />
        </Field>
      ) : null}
    </div>
  );
}

function useMonthCursor(value: string) {
  return useState(() => {
    const base = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date();
    return { year: base.getUTCFullYear(), month: base.getUTCMonth() + 1 };
  });
}

/** The month grid both calendars draw; they differ only in which days are open. */
function MonthGrid({
  year,
  month,
  value,
  open,
  marker,
  onShift,
  onChange,
  busy = false,
}: {
  year: number;
  month: number;
  value: string;
  open: (iso: string) => boolean;
  marker?: (iso: string) => "free" | "limited" | null;
  onShift: (by: number) => void;
  onChange: (iso: string) => void;
  busy?: boolean;
}) {
  const { t, locale } = useI18n();

  const weekdays = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
    // 1 January 2024 was a Monday, and the grid starts on Monday.
    return Array.from({ length: 7 }, (_, index) => format.format(new Date(Date.UTC(2024, 0, 1 + index))));
  }, [locale]);

  const first = new Date(Date.UTC(year, month - 1, 1));
  const title = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const leading = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const nav = `grid size-8 place-items-center rounded-md text-text-default hover:bg-surface-sunken ${focusRing}`;

  return (
    <div className="flex flex-col gap-3" aria-busy={busy}>
      <div className="flex items-center justify-between">
        <button type="button" className={nav} onClick={() => onShift(-1)} aria-label={t("plan.schedule.prevMonth")}>
          <Icon name="back" size={16} className="rtl:-scale-x-100" />
        </button>
        <p className="font-display text-body font-bold text-text-heading">{title}</p>
        <button type="button" className={nav} onClick={() => onShift(1)} aria-label={t("plan.schedule.nextMonth")}>
          <Icon name="arrow" size={16} className="rtl:-scale-x-100" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((day) => (
          <span key={day} className="py-1 text-caption font-semibold text-text-default">
            {day}
          </span>
        ))}
        {Array.from({ length: leading }, (_, index) => (
          <span key={`lead-${index}`} aria-hidden="true" />
        ))}
        {Array.from({ length }, (_, index) => {
          const day = index + 1;
          const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const selectable = open(iso);
          const chosen = iso === value;
          const mark = selectable ? marker?.(iso) : null;

          return (
            <button
              key={iso}
              type="button"
              disabled={!selectable}
              aria-pressed={chosen}
              onClick={() => onChange(iso)}
              className={`flex h-10 flex-col items-center justify-center rounded-md text-body-sm ${focusRing} ${
                chosen
                  ? "bg-brand-red font-bold text-text-on-brand"
                  : selectable
                    ? "font-semibold text-text-heading hover:bg-red-50"
                    : "cursor-not-allowed text-text-faint"
              }`}
            >
              {day}
              {mark && !chosen ? (
                <span aria-hidden="true" className={`size-1 rounded-full ${mark === "limited" ? "bg-brand-yellow" : "bg-brand-red"}`} />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function shiftCursor(current: { year: number; month: number }, by: number) {
  const next = new Date(Date.UTC(current.year, current.month - 1 + by, 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 };
}

function AvailabilityMonth({ value, capacity, onChange }: { value: string; capacity: number; onChange: (iso: string) => void }) {
  const { t } = useI18n();
  const [cursor, setCursor] = useMonthCursor(value);
  const { data, isLoading, isError } = useLiveAvailability(cursor.year, cursor.month, capacity);

  const days = useMemo(() => {
    const map = new Map<string, { status: string; remainingCapacity: number }>();
    for (const day of data?.days ?? []) map.set(String(day.date), day);
    return map;
  }, [data]);

  return (
    <>
      <MonthGrid
        year={cursor.year}
        month={cursor.month}
        value={value}
        busy={isLoading}
        open={(iso) => days.get(iso)?.status === "free"}
        marker={(iso) => ((days.get(iso)?.remainingCapacity ?? 0) <= 1 ? "limited" : "free")}
        onShift={(by) => setCursor((current) => shiftCursor(current, by))}
        onChange={onChange}
      />
      {isError ? <ErrorText>{t("plan.schedule.availabilityFailed")}</ErrorText> : null}
    </>
  );
}

function PreferredMonth({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [cursor, setCursor] = useMonthCursor(value);
  const today = todayIso();

  return (
    <MonthGrid
      year={cursor.year}
      month={cursor.month}
      value={value}
      // Any working day after today; Sunday is the company's closed day.
      open={(iso) => iso > today && new Date(`${iso}T00:00:00Z`).getUTCDay() !== 0}
      onShift={(by) => setCursor((current) => shiftCursor(current, by))}
      onChange={onChange}
    />
  );
}
