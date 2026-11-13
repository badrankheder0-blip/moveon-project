"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * The booking planner's building blocks.
 *
 * Every screen of the planner is made of these, so a change to how a card,
 * a counter or an error looks happens once. Utilities against the M.io theme
 * only: a raw hex here would be out of reach of the dashboard's theme editor.
 */

// ── Buttons ─────────────────────────────────────────────────────────────

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-md bg-brand-red px-5 py-3 text-body-sm font-bold text-text-on-brand transition-colors " +
  "hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow";

export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-md border border-border-default bg-surface-card px-4 py-2.5 text-body-sm font-bold text-text-heading transition-colors " +
  "hover:border-border-strong disabled:cursor-not-allowed disabled:text-text-faint " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow";

export const textButton =
  "inline-flex items-center gap-1.5 rounded-sm text-[13px] font-semibold text-text-heading underline-offset-2 hover:underline " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow";

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow";

// ── Icons ───────────────────────────────────────────────────────────────

/**
 * The planner's line icons, from the prototype's own set.
 *
 * Inline rather than a package, as everywhere else in this app; `currentColor`
 * lets the card that owns an icon decide whether it is red.
 */
const PATHS: Record<string, string[]> = {
  arrow: ["M4 12h15", "m13 5 7 7-7 7"],
  back: ["M20 12H5", "m11 5-7 7 7 7"],
  down: ["m6 9 6 6 6-6"],
  plus: ["M12 5v14", "M5 12h14"],
  minus: ["M5 12h14"],
  close: ["M6 6l12 12", "M18 6 6 18"],
  check: ["m5 12 4 4L19 6"],
  search: ["M21 21l-5-5", "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0"],
  home: ["m3 10 9-7 9 7", "M5 9v12h14V9", "M9 21v-7h6v7"],
  business: ["M4 21V5h10v16", "M14 10h6v11", "M7 9h4", "M7 13h4", "M7 17h4", "M17 14h1", "M17 18h1"],
  box: ["m3 7 9-4 9 4v10l-9 4-9-4z", "m3 7 9 4 9-4", "M12 11v10", "m7 5 10 4"],
  truck: ["M2 5h12v12H2z", "M14 9h4l4 4v4h-8", "M8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0", "M20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0"],
  sofa: ["M5 12V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5", "M5 11H3v7h18v-7h-2v3H5z", "M5 18v3", "M19 18v3"],
  bed: ["M3 8v13", "M21 8v13", "M3 17h18", "M3 13h18v4H3z", "M5 13V6h14v7", "M7 9h3v4", "M14 9h3v4"],
  kitchen: ["M3 4h18v6H3z", "M3 14h18v7H3z", "M10 14v7", "M15 14v7", "M6 7h2", "M16 7h2"],
  bath: ["M3 12h18l-2 7H5z", "M5 12V5a2 2 0 0 1 4 0", "M7 19v2", "M17 19v2"],
  desk: ["M2 10h20", "M4 10v11", "M20 10v11", "M7 10V3h10v7", "M12 10v3"],
  table: ["M3 6h18v6H3z", "M5 12v9", "M19 12v9", "M9 12v6", "M15 12v6"],
  chair: ["M7 3h10v9H7z", "M5 12h14v4H5z", "M7 16v5", "M17 16v5"],
  tv: ["M3 4h18v13H3z", "M12 17v4", "M7 21h10"],
  washer: ["M4 3h16v18H4z", "M4 7h16", "M8 5h1", "M17 14a5 5 0 1 1-10 0 5 5 0 0 1 10 0"],
  plant: ["M7 15h10l-2 7H9z", "M12 15V7", "M12 11c-7 0-7-7-7-7 7 0 7 7 7 7", "M12 8c7 0 7-6 7-6-7 0-7 6-7 6"],
  garage: ["M3 9l9-6 9 6v12H3z", "M7 12h10v9", "M7 15h10", "M7 18h10"],
  stairs: ["M3 21h6v-6h6V9h6V3"],
  child: ["M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6", "M5 12l7 2 7-2", "M12 14v5", "M8 22l4-3 4 3"],
  paint: ["M3 3h13v7H3z", "M16 6h4v7h-9v3", "M9 16h4v6H9z"],
  clean: ["m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"],
  trash: ["M3 6h18", "M9 6V3h6v3", "M5 6l1 15h12l1-15", "M10 10v7", "M14 10v7"],
  calendar: ["M4 5h16v16H4z", "M8 2v6", "M16 2v6", "M4 10h16", "M8 14h2", "M14 14h2"],
  tool: ["M14 3a5 5 0 0 0-6 7L2 16a3 3 0 0 0 4 4l6-6a5 5 0 0 0 7-6l-4 4-3-3z"],
  info: ["M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", "M12 11v6", "M12 7h.01"],
  shield: ["m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6z", "m8 12 3 3 5-6"],
  user: ["M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0", "M4 22v-4a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v4"],
  clock: ["M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", "M12 6v6l4 2"],
  pin: ["M19 9c0 6-7 13-7 13S5 15 5 9a7 7 0 0 1 14 0", "M14 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0"],
  grid: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M3 14h7v7H3z", "M14 14h7v7h-7z"],
  list: ["M8 5h13", "M8 12h13", "M8 19h13", "M3 5h.1", "M3 12h.1", "M3 19h.1"],
  copy: ["M8 8h13v13H8z", "M16 8V3H3v13h5"],
  edit: ["m15 4 5 5", "M3 21l1-6L17 2l5 5L9 20z"],
  photo: ["M3 6h4l2-3h6l2 3h4v15H3z", "M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0"],
  layers: ["m12 3 10 5-10 5L2 8z", "m2 12 10 5 10-5", "m2 16 10 5 10-5"],
  headphones: ["M3 14v-3a9 9 0 0 1 18 0v3", "M3 12h4v8H3z", "M17 12h4v8h-4z"],
  doc: ["M5 2h9l5 5v15H5z", "M14 2v6h5", "M8 12h8", "M8 16h8"],
  weight: ["M4 8h16l2 13H2z", "M15 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0"],
  piano: ["M3 5h18v14H3z", "M3 12h18", "M7 12v7M12 12v7M17 12v7", "M7 5v5M12 5v5M17 5v5"],
  fish: ["M3 4h18v16H3z", "M3 8h18", "M9 14c3-4 6-4 9 0-3 4-6 4-9 0z", "m9 14-4-3v6z"],
  dumbbell: ["M2 9v6M5 6v12M8 8v8M8 12h8M16 8v8M19 6v12M22 9v6"],
  art: ["M3 3h18v18H3z", "m3 17 6-6 5 5 3-3 4 4", "M16 7h.01"],
  panel: ["M3 3h18v18H3z", "M15 3v18"],
  collapse: ["M3 3h18v18H3z", "M16 3v18", "M6 12h7", "m10 9 3 3-3 3"],
  wallet: ["M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1", "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"],
  card: ["M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", "M2 10h20"],
  bank: ["M3 22h18", "M6 18v-7", "M10 18v-7", "M14 18v-7", "M18 18v-7", "M12 2 20 7H4z"],
  cash: ["M2 6h20v12H2z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6", "M6 12h.01M18 12h.01"],
  // The dashboard's service icons that the set above had no match for.
  key: ["M21 2l-2 2", "M11.39 11.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78z", "M15.5 7.5l3 3L22 7l-3-3", "M11.4 11.6 19 4"],
  leaf: ["M11 20A7 7 0 0 1 4 13c0-6 7-10 16-10 0 9-4 17-9 17z", "M2 22c4-4 7-7 11-10"],
};

export function Icon({
  name,
  size = 18,
  className,
  strokeWidth = 1.85,
}: {
  name: string;
  size?: number;
  className?: string | undefined;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...(className ? { className } : {})}
    >
      {(PATHS[name] ?? PATHS.box ?? []).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** An arrow that points the way the reader is going, in either direction of text. */
export function ForwardIcon({ size = 16 }: { size?: number }) {
  return <Icon name="arrow" size={size} className="rtl:-scale-x-100" />;
}

export function BackIcon({ size = 16 }: { size?: number }) {
  return <Icon name="back" size={size} className="rtl:-scale-x-100" />;
}

// ── Containers ──────────────────────────────────────────────────────────

export const cardClass = "rounded-lg border border-border-default bg-surface-card";

/** A titled block of questions: the prototype's 2px-hairline card. */
export function Section({
  title,
  sub,
  actions,
  children,
  className = "",
  id,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  id?: string;
}) {
  const headingId = useId();

  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={`flex flex-col gap-4 rounded-lg border-2 border-border-subtle bg-surface-card p-4 md:p-5 ${className}`}
    >
      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            {title ? (
              <h2 id={headingId} className="font-display text-body-lg leading-6 font-bold text-text-heading">
                {title}
              </h2>
            ) : null}
            {sub ? <p className="text-body-sm text-text-default">{sub}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** A quiet line with an icon: notices, area hints, "preview only". */
export function Note({
  icon = "info",
  tone = "plain",
  children,
}: {
  icon?: string;
  tone?: "plain" | "warm" | "warning";
  children: ReactNode;
}) {
  const skin =
    tone === "warm"
      ? "rounded-md border border-brand-yellow bg-yellow-tint px-3 py-2.5"
      : tone === "warning"
        ? "rounded-md border border-warning bg-warning-soft px-3 py-2.5 text-warning-text"
        : "";

  return (
    <p className={`flex items-start gap-2 text-[13px] leading-[18px] text-text-default ${skin}`}>
      <span className="mt-px shrink-0 text-brand-red">
        <Icon name={icon} size={15} />
      </span>
      <span>{children}</span>
    </p>
  );
}

/** Space is reserved only when there is something to say. */
export function ErrorText({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;

  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-caption font-semibold text-danger-text">
      <Icon name="info" size={13} />
      {children}
    </p>
  );
}

// ── Fields ──────────────────────────────────────────────────────────────

export const inputClass =
  "w-full rounded-md border border-border-default bg-surface-card px-3 py-2.5 text-body-sm text-text-strong " +
  "placeholder:text-text-faint aria-[invalid=true]:border-danger " +
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-yellow";

const CHEVRON =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%234b5563%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E";

export const selectClass = `${inputClass} appearance-none bg-no-repeat bg-[length:16px_16px] bg-[right_0.75rem_center] rtl:bg-[left_0.75rem_center] pe-10`;

export const selectStyle = { backgroundImage: `url("${CHEVRON}")` };

export function FieldLabel({
  htmlFor,
  icon,
  required,
  optional,
  optionalLabel,
  children,
}: {
  htmlFor: string;
  icon?: string;
  required?: boolean;
  optional?: boolean;
  optionalLabel?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex items-center justify-between gap-2 text-body-sm font-semibold text-text-heading">
      <span className="flex items-center gap-1.5">
        {icon ? (
          <span className="text-text-default">
            <Icon name={icon} size={15} />
          </span>
        ) : null}
        {children}
        {required ? (
          <span aria-hidden="true" className="text-brand-red">
            *
          </span>
        ) : null}
      </span>
      {optional ? <span className="text-caption font-normal text-text-muted">{optionalLabel}</span> : null}
    </label>
  );
}

/** A label, a control and its error, with the error tied to the control. */
export function Field({
  id,
  label,
  icon,
  required,
  optionalLabel,
  error,
  hint,
  children,
}: {
  id: string;
  label: ReactNode;
  icon?: string;
  required?: boolean;
  /** Set to show "Optional" at the end of the label. */
  optionalLabel?: string;
  error?: string | undefined;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <FieldLabel
        htmlFor={id}
        {...(icon ? { icon } : {})}
        {...(required ? { required } : {})}
        {...(optionalLabel ? { optional: true, optionalLabel } : {})}
      >
        {label}
      </FieldLabel>
      {children}
      {hint ? <p className="text-caption text-text-muted">{hint}</p> : null}
      <ErrorText id={`${id}-error`}>{error}</ErrorText>
    </div>
  );
}

/** Props that tie a control to its <Field> error. */
export const describedBy = (id: string, error: string | undefined) =>
  error ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {};

/** A number with its unit written inside the box, as the prototype draws m². */
export function UnitInput({
  id,
  value,
  onChange,
  unit,
  error,
  placeholder,
  max,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
  error?: string | undefined;
  placeholder?: string;
  max?: number;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        {...(max ? { max } : {})}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} pe-12 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
        {...describedBy(id, error)}
      />
      <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-body-sm text-text-default">
        {unit}
      </span>
    </div>
  );
}

// ── Choices ─────────────────────────────────────────────────────────────

/**
 * A quantity stepper: a typeable number between two buttons.
 *
 * The input stays the source of truth so it can be typed into and read by
 * assistive technology; the buttons are conveniences around it.
 */
export function Counter({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
  decreaseLabel,
  increaseLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.trunc(next)));
  const button =
    "grid size-8 place-items-center transition-colors disabled:cursor-not-allowed disabled:text-text-faint " + focusRing;

  return (
    <div className="inline-flex w-fit shrink-0 items-center overflow-hidden rounded-md border border-border-default bg-surface-card">
      <button
        type="button"
        className={`${button} text-text-default hover:bg-surface-sunken`}
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label={decreaseLabel}
      >
        <Icon name="minus" size={14} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(clamp(next));
        }}
        className={`h-8 w-10 border-x border-border-subtle bg-transparent text-center text-body-sm font-bold text-text-heading [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none ${focusRing}`}
      />
      <button
        type="button"
        className={`${button} text-brand-red hover:bg-red-50`}
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label={increaseLabel}
      >
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}

/**
 * An on/off option drawn as a card with a switch.
 *
 * A checkbox underneath rather than `role="switch"`: these are answers sent
 * with the rest of the plan, not settings that act the moment they flip.
 */
export function ToggleCard({
  id,
  icon,
  title,
  description,
  price,
  checked,
  onChange,
}: {
  id: string;
  icon?: string;
  title: ReactNode;
  description?: ReactNode;
  /** What the option costs ("+ 49,00 €"), set beside the switch. */
  price?: ReactNode | undefined;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-yellow ${
        checked ? "border-brand-red bg-red-50" : "border-border-default bg-surface-card hover:border-border-strong"
      }`}
    >
      {icon ? (
        <span className="shrink-0 text-brand-red">
          <Icon name={icon} size={20} />
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-bold text-text-heading">{title}</span>
        {description ? <span className="text-body-sm text-text-default">{description}</span> : null}
        {/* On a phone the price goes under the words, so they keep the width. */}
        {price ? (
          <span className="text-body-sm font-bold text-text-heading tabular-nums md:hidden">
            <bdi dir="ltr">{price}</bdi>
          </span>
        ) : null}
      </span>
      {price ? (
        // An amount reads left to right in every language; "+ €45" must not become "€45 +".
        <span className="hidden shrink-0 text-body-sm font-bold whitespace-nowrap text-text-heading tabular-nums md:inline">
          <bdi dir="ltr">{price}</bdi>
        </span>
      ) : null}
      <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-brand-red bg-surface-card p-0.5 transition-colors peer-checked:justify-end peer-checked:bg-brand-red"
      >
        <span className={`size-4 rounded-full ${checked ? "bg-neutral-0" : "bg-brand-red"}`} />
      </span>
    </label>
  );
}

/** A checkbox drawn as a card: the cleaning type and renovation work tiles. */
export function CheckCard({
  id,
  icon,
  title,
  description,
  checked,
  onChange,
  children,
}: {
  id: string;
  icon?: string;
  title: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Questions that only apply once ticked, drawn inside the card. */
  children?: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-lg border p-4 transition-colors ${
        checked ? "border-brand-red bg-red-50" : "border-border-default bg-surface-card"
      }`}
    >
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        {icon ? (
          <span className="mt-0.5 shrink-0 text-brand-red">
            <Icon name={icon} size={18} />
          </span>
        ) : null}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-body font-bold text-text-heading">{title}</span>
          {description ? <span className="text-body-sm text-text-default">{description}</span> : null}
        </span>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className={`mt-0.5 size-5 shrink-0 accent-brand-red ${focusRing}`}
        />
      </label>
      {checked && children ? <div className="flex flex-col gap-3">{children}</div> : null}
    </div>
  );
}

/** A radio drawn as a card with a title and a line, the dot at the start. */
export function RadioCards<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
  columns = 2,
}: {
  name: string;
  legend: string;
  value: T | "";
  options: Array<{ value: T; label: ReactNode; hint?: ReactNode; icon?: ReactNode }>;
  onChange: (value: T) => void;
  columns?: 1 | 2;
}) {
  return (
    <fieldset className={`grid gap-3 border-0 p-0 ${columns === 2 ? "md:grid-cols-2" : ""}`}>
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => {
        const checked = value === option.value;
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-yellow ${
              checked ? "border-brand-red bg-red-50" : "border-border-default bg-surface-card hover:border-border-strong"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="size-4 shrink-0 accent-brand-red"
            />
            {option.icon}
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-body-sm font-bold text-text-heading">{option.label}</span>
              {option.hint ? <span className="text-caption text-text-default">{option.hint}</span> : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

export function Checkbox({
  id,
  checked,
  onChange,
  children,
  error,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  error?: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-body-sm text-text-heading">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className={`mt-0.5 size-4 shrink-0 accent-brand-red ${focusRing}`}
          {...describedBy(id, error)}
        />
        <span>{children}</span>
      </label>
      <ErrorText id={`${id}-error`}>{error}</ErrorText>
    </div>
  );
}

// ── Dialog ──────────────────────────────────────────────────────────────

/**
 * A modal dialog that keeps focus inside and gives it back when it closes.
 *
 * The native `<dialog>` would do most of this, but its backdrop click and
 * scroll locking still need code, and its top layer escapes the planner's RTL
 * container in some browsers.
 */
export function Dialog({
  title,
  kicker,
  onClose,
  closeLabel,
  wide = false,
  children,
  footer,
}: {
  title: string;
  kicker?: string;
  onClose: () => void;
  closeLabel: string;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ) ?? [],
      ).filter((element) => element.offsetParent !== null);

    const timer = setTimeout(() => focusable()[0]?.focus({ preventScroll: true }), 30);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
      if (event.key !== "Tab") return;

      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-neutral-900/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl bg-surface-card shadow-xl ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border-subtle p-5">
          <div className="flex flex-col gap-1">
            {kicker ? (
              <span className="text-[11px] font-bold tracking-[0.12em] text-brand-red uppercase">{kicker}</span>
            ) : null}
            <h2 className="font-display text-h5 font-bold text-text-heading">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className={`grid size-9 shrink-0 place-items-center rounded-full text-text-default hover:bg-surface-sunken ${focusRing}`}
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="flex flex-col gap-4 overflow-y-auto p-5">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap justify-end gap-3 border-t border-border-subtle p-4">{footer}</footer>
        ) : null}
      </section>
    </div>
  );
}
