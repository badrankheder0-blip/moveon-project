"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { isRequestOnly, pendingScope, type PricedJob } from "@/lib/booking/plan";
import type { QuoteResult, usePlanQuotes } from "@/lib/booking/useQuotes";
import { usePlanner } from "../context";
import { overview, type OverviewBlock } from "../overview";
import { SERVICE_ICON } from "./Start";
import { Checkbox, ErrorText, Field, Icon, Note, describedBy, focusRing, inputClass, secondaryButton, textButton } from "../ui";

type Quotes = ReturnType<typeof usePlanQuotes>;

/**
 * "Your plan. Ready to review." — every answer, and the server's price.
 *
 * A job the engine priced shows its own breakdown, line by line, from the
 * stored quote. Everything else says plainly who prices it and when: after
 * the site visit, after the team has checked. No figure here is computed in
 * the browser; the subtotal is the sum of the server's totals.
 */
export function ReviewStep({ quotes, priced }: { quotes: Quotes; priced: PricedJob[] }) {
  const { t, locale, formatDate, formatCurrency } = useI18n();
  const { plan, go, catalog, fieldShown } = usePlanner();
  const blocks = overview(plan, t, formatDate, locale, catalog);
  const pending = pendingScope(plan);
  const requestOnly = isRequestOnly(plan);

  return (
    <div className="flex flex-col gap-5">
      <article className="flex flex-col gap-0 rounded-xl border-2 border-border-subtle bg-surface-card p-5 md:p-7">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border-subtle pb-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-red-50 text-brand-red">
              <Icon name="doc" size={22} />
            </span>
            <span className="text-[11px] font-bold tracking-[0.12em] text-text-heading uppercase">{t("plan.review.kicker")}</span>
          </div>
          <div className="flex flex-col items-end gap-1 text-end">
            <span className="text-[11px] font-bold tracking-[0.12em] text-brand-red uppercase">
              {requestOnly ? t("plan.review.requestEyebrow") : t("plan.review.estimateEyebrow")}
            </span>
            <h2 className="font-display text-h4 font-bold text-text-heading">{t("plan.review.title")}</h2>
            <p className="text-caption text-text-default">{t("plan.review.sub")}</p>
          </div>
        </header>

        <p className="flex items-center justify-between border-b border-border-subtle py-3 text-caption font-bold tracking-[0.1em] text-text-heading uppercase">
          {t("plan.review.preview")}
          <span className="font-normal tracking-normal text-text-default normal-case">
            {t("plan.review.serviceCount", { count: blocks.length })}
          </span>
        </p>

        {blocks.map((block) => (
          <ServiceBlock
            key={block.id}
            block={block}
            onEdit={() => go(block.editStep)}
            priced={priced.find((job) => job.id === block.id)}
            quotes={quotes}
            pendingText={pendingFor(block, pending, t)}
          />
        ))}

        {priced.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle py-5">
              <span className="text-body font-bold text-text-heading">
                {pending.length > 0 ? t("plan.review.pricedSubtotal") : t("plan.review.total")}
              </span>
              <span className="font-display text-h3 font-extrabold text-text-heading tabular-nums">
                {quotes.ready ? formatCurrency(quotes.total) : quotes.loading ? t("plan.review.pricing") : "—"}
              </span>
            </div>
            {fieldShown("review.discount") ? <DiscountField /> : null}
          </>
        ) : null}

        {pending.length > 0 ? (
          <p className="border-t border-border-subtle pt-4 text-caption text-text-default">
            {priced.length > 0 ? t("plan.review.pendingExcluded") : t("plan.review.allPending")}
          </p>
        ) : null}
      </article>

      {requestOnly ? <RequestContact /> : null}

      {!requestOnly && !plan.services.moving && plan.services.cleaning && priced.length === 0 ? (
        <Note tone="warm">{t("plan.review.nothingPriced")}</Note>
      ) : null}

      <p className="flex flex-wrap gap-3">
        <button type="button" className={secondaryButton} onClick={() => window.print()}>
          <Icon name="doc" size={16} />
          {t("plan.review.print")}
        </button>
      </p>

      <span className="sr-only" aria-live="polite">
        {quotes.loading ? t("plan.review.pricing") : ""}
      </span>
    </div>
  );
}

function pendingFor(
  block: OverviewBlock,
  pending: ReturnType<typeof pendingScope>,
  t: (key: string) => string,
): string[] {
  return pending
    .filter((entry) => entry.id === block.id || (block.id === "moving" && entry.service === "moving"))
    .map((entry) => t(`plan.review.pending.${entry.kind}`));
}

function ServiceBlock({
  block,
  onEdit,
  priced,
  quotes,
  pendingText,
}: {
  block: OverviewBlock;
  onEdit: () => void;
  priced: PricedJob | undefined;
  quotes: Quotes;
  pendingText: string[];
}) {
  const { t, formatCurrency } = useI18n();
  const [open, setOpen] = useState(false);
  const state = priced ? quotes.stateOf(priced.id) : undefined;

  return (
    <section className="flex flex-col gap-3 border-b border-border-subtle py-5" aria-label={block.title}>
      <header className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-body-lg font-bold text-text-heading">
          <span className="text-brand-red">
            <Icon name={block.icon ?? SERVICE_ICON[block.service as keyof typeof SERVICE_ICON]} size={18} />
          </span>
          {block.title}
        </h3>
        <button type="button" onClick={onEdit} aria-label={t("plan.review.edit", { values: { name: block.title } })} className={`grid size-8 place-items-center rounded-md text-text-default hover:bg-surface-sunken ${focusRing}`}>
          <Icon name="edit" size={15} />
        </button>
      </header>

      <dl className="flex flex-col gap-2">
        {block.rows.map((row) => (
          <div key={row.label} className="flex flex-wrap justify-between gap-x-6 gap-y-0.5 text-body-sm">
            <dt className="text-text-default">{row.label}</dt>
            <dd className="text-end font-semibold text-text-heading">{row.value}</dd>
          </div>
        ))}
      </dl>

      {priced ? (
        <div className="flex flex-col gap-2 border-t border-dashed border-border-default pt-3">
          {state?.status === "ready" ? (
            <>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                className={`flex items-center justify-between gap-3 text-body-sm ${focusRing}`}
              >
                <span className="flex items-center gap-1.5 font-semibold text-text-heading">
                  {t("plan.review.breakdown")}
                  <Icon name="down" size={14} className={open ? "rotate-180" : ""} />
                </span>
                <span className="font-bold text-text-heading tabular-nums">{formatCurrency(state.quote.breakdown.totalGross)}</span>
              </button>
              <TravelSummary quote={state.quote} />
              {open ? <Breakdown quote={state.quote} /> : null}
              {state.quote.requiresReview ? (
                <div className="flex flex-col gap-1 rounded-md border border-warning bg-warning-soft px-3 py-2.5 text-caption text-warning-text">
                  <p className="font-bold">{t("plan.review.estimateNote")}</p>
                  {state.quote.reviewReasons.map((reason) => (
                    <p key={reason}>{t(`calc.review.${reason}`)}</p>
                  ))}
                </div>
              ) : null}
            </>
          ) : state?.status === "error" ? (
            <div className="flex flex-col gap-1.5">
              <ErrorText>{state.message || t("plan.review.priceFailed")}</ErrorText>
              <button type="button" className={`${textButton} self-start text-brand-red`} onClick={quotes.retry}>
                {t("plan.review.retry")}
              </button>
            </div>
          ) : (
            <p role="status" className="text-body-sm text-text-muted">
              {t("plan.review.pricing")}
            </p>
          )}
        </div>
      ) : null}

      {pendingText.length > 0 ? (
        <div className="flex flex-col gap-1 rounded-md bg-yellow-tint px-3 py-2.5">
          <p className="text-body-sm font-bold text-text-heading">{priced ? t("plan.review.someToQuote") : t("plan.review.toQuote")}</p>
          {pendingText.map((text) => (
            <p key={text} className="text-caption text-text-default">
              {text}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/** The server's own lines, in its order, with VAT and the deposit. */
type PriceLine = QuoteResult["breakdown"]["lines"][number];

const TRAVEL_LINES = new Set(["line.travel", "line.travel_long_distance"]);

/**
 * "42 km × €1.20 = €50.40" — the travel line as the server computed it.
 *
 * Both figures come from the line's own params (the road distance and the
 * per-km rate set under Dashboard → Preise), so the sentence can never
 * disagree with the amount beside it.
 */
function useTravelText() {
  const { t, locale, formatCurrency } = useI18n();

  return (line: PriceLine): string | null => {
    if (!TRAVEL_LINES.has(line.key)) return null;
    const km = Number.parseFloat(String(line.params?.km ?? ""));
    const rate = String(line.params?.rate ?? "");
    if (!Number.isFinite(km) || !rate) return null;

    return t("plan.review.travelCalc", {
      values: {
        km: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(km),
        rate: formatCurrency(rate),
        amount: formatCurrency(line.amount),
      },
    });
  };
}

/** The distance line, shown without opening the breakdown: it is what customers ask about. */
function TravelSummary({ quote }: { quote: QuoteResult }) {
  const { t } = useI18n();
  const travel = useTravelText();
  const line = quote.breakdown.lines.find((entry) => TRAVEL_LINES.has(entry.key));
  const text = line ? travel(line) : null;

  if (!text) return null;

  return (
    <p className="flex items-center gap-2 text-caption text-text-default">
      <Icon name="truck" size={14} />
      <span>
        {t("plan.review.distance")}: <b className="text-text-heading">{text}</b>
      </span>
    </p>
  );
}

/** The server's own lines, each with what it was worked out from. */
function Breakdown({ quote }: { quote: QuoteResult }) {
  const { t, formatCurrency } = useI18n();
  const travel = useTravelText();

  const caption = (line: PriceLine) =>
    travel(line) ??
    t(`${line.key}.caption`, {
      values: Object.fromEntries(
        Object.entries(line.params ?? {}).map(([name, value]) => [name, typeof value === "number" ? value : String(value)]),
      ),
    });

  return (
    <dl className="flex flex-col gap-1.5 rounded-md bg-surface-page p-3 text-caption">
      {quote.breakdown.lines.map((line, index) => (
        <div key={`${line.key}-${index}`} className="flex justify-between gap-4">
          <dt className="flex flex-col text-text-default">
            {t(line.key)}
            <span className="text-[11px] text-text-muted">{caption(line)}</span>
          </dt>
          <dd className="font-semibold text-text-heading tabular-nums">{formatCurrency(line.amount)}</dd>
        </div>
      ))}
      <div className="mt-1 flex justify-between gap-4 border-t border-border-subtle pt-1.5">
        <dt className="text-text-default">{t("plan.review.net")}</dt>
        <dd className="font-semibold text-text-heading tabular-nums">{formatCurrency(quote.breakdown.netAmount)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-text-default">{t("plan.review.vat", { values: { rate: Number.parseFloat(quote.breakdown.vatRate) } })}</dt>
        <dd className="font-semibold text-text-heading tabular-nums">{formatCurrency(quote.breakdown.vatAmount)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="font-bold text-text-heading">{t("plan.review.jobTotal")}</dt>
        <dd className="font-bold text-text-heading tabular-nums">{formatCurrency(quote.breakdown.totalGross)}</dd>
      </div>
      {Number.parseFloat(quote.breakdown.depositAmount) > 0 ? (
        <p className="pt-1 text-text-muted">
          {t("plan.review.deposit", { values: { amount: formatCurrency(quote.breakdown.depositAmount) } })}
        </p>
      ) : null}
    </dl>
  );
}

/**
 * The code is applied by the server, on the first priced job: a code is
 * redeemed once per order, so spreading it across several would spend it
 * several times.
 */
function DiscountField() {
  const { t } = useI18n();
  const { plan, dispatch, fieldLabel } = usePlanner();
  const [draft, setDraft] = useState(plan.discountCode);

  return (
    <div className="flex flex-col gap-2 border-t border-border-subtle py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="discount-code" className="text-body-sm font-bold text-text-heading">
          {fieldLabel("review.discount", t("plan.review.discount"))}
        </label>
        <div className="flex gap-2">
          <input
            id="discount-code"
            className={`${inputClass} w-44`}
            value={draft}
            maxLength={40}
            placeholder={t("plan.review.discountPlaceholder")}
            onChange={(event) => setDraft(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === "Enter") dispatch({ type: "patch", patch: { discountCode: draft.trim() } });
            }}
          />
          <button type="button" className={secondaryButton} onClick={() => dispatch({ type: "patch", patch: { discountCode: draft.trim() } })}>
            {plan.discountCode && plan.discountCode === draft.trim() ? t("plan.review.discountApplied") : t("plan.review.discountApply")}
          </button>
        </div>
      </div>
      <p className="text-caption text-text-muted">{t("plan.review.discountNote")}</p>
    </div>
  );
}

/** Who the team calls about a site-visit request. */
function RequestContact() {
  const { t, locale } = useI18n();
  const { plan, dispatch, errors, fieldLabel } = usePlanner();
  const { user } = useApi();

  useEffect(() => {
    if (!user) return;
    dispatch({
      type: "patch",
      patch: (current) => ({
        contact: {
          name: current.contact.name || user.fullName,
          email: current.contact.email || user.email,
          phone: current.contact.phone,
        },
      }),
    });
  }, [user, dispatch]);

  const error = (key: string) => (errors[key] ? t(errors[key]!) : undefined);
  const set = (patch: Partial<typeof plan.contact>) =>
    dispatch({ type: "patch", patch: (current) => ({ contact: { ...current.contact, ...patch } }) });

  return (
    <section className="flex flex-col gap-4 rounded-lg border-2 border-border-subtle bg-surface-card p-4 md:p-5">
      <header>
        <h2 className="font-display text-body-lg font-bold text-text-heading">{t("plan.request.title")}</h2>
        <p className="text-body-sm text-text-default">{t("plan.request.sub")}</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="request-name" label={fieldLabel("payment.name", t("plan.contact.name"))} required error={error("name")}>
          <input id="request-name" autoComplete="name" className={inputClass} value={plan.contact.name} onChange={(event) => set({ name: event.target.value })} {...describedBy("request-name", error("name"))} />
        </Field>
        <Field id="request-phone" label={fieldLabel("payment.phone", t("plan.contact.phone"))} required error={error("phone")}>
          <input id="request-phone" type="tel" autoComplete="tel" dir="ltr" className={inputClass} value={plan.contact.phone} onChange={(event) => set({ phone: event.target.value })} placeholder="+49 176 1234567" {...describedBy("request-phone", error("phone"))} />
        </Field>
        <div className="md:col-span-2">
          <Field id="request-email" label={fieldLabel("payment.email", t("plan.contact.email"))} required error={error("email")}>
            <input id="request-email" type="email" autoComplete="email" dir="ltr" className={inputClass} value={plan.contact.email} onChange={(event) => set({ email: event.target.value })} {...describedBy("request-email", error("email"))} />
          </Field>
        </div>
      </div>
      <Checkbox id="request-consent" checked={plan.requestConsent} onChange={(requestConsent) => dispatch({ type: "patch", patch: { requestConsent } })} error={error("consent")}>
        {t("plan.request.consent")}{" "}
        <Link href={`/${locale}/datenschutz`} className="font-semibold text-brand-red underline">
          {t("plan.request.privacy")}
        </Link>
      </Checkbox>
      <p className="flex items-center gap-2 text-body-sm text-text-default">
        <Icon name="clock" size={16} />
        {t("plan.request.response")}
      </p>
    </section>
  );
}
