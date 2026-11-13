"use client";

import type { ReactNode } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { usePlanner } from "./context";
import { overview } from "./overview";
import { SERVICE_ICON } from "./steps/Start";
import { Icon, focusRing } from "./ui";

/**
 * "Your plan." — the answers so far, beside every step.
 *
 * It never shows a price while details are being collected; the prototype
 * draws the same line ("The details first"). On the review and payment screens
 * the planner passes the server's subtotal in through `total`.
 */
export function PlanSummary({
  total,
  action,
  next,
}: {
  /** The priced subtotal block, on review and payment only. */
  total?: ReactNode;
  /** The primary button. */
  action: ReactNode;
  /** "Next: Property", under the button. */
  next?: string | undefined;
}) {
  const { t, locale, formatDate } = useI18n();
  const { plan, go, catalog } = usePlanner();
  const blocks = overview(plan, t, formatDate, locale, catalog);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border-2 border-border-default bg-surface-card">
      <div className="flex max-h-[min(60vh,520px)] flex-col gap-4 overflow-y-auto p-5">
        <header>
          <h2 className="font-display text-h4 font-bold text-text-heading">{t("plan.summary.title")}</h2>
          <p className="text-caption text-text-default">{t("plan.summary.sub")}</p>
        </header>

        {blocks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="relative grid size-16 place-items-center rounded-lg border-2 border-border-default text-text-faint">
              <Icon name="list" size={26} />
              <span className="absolute -end-3 -bottom-3 grid size-8 place-items-center rounded-full bg-brand-red text-text-on-brand">
                <Icon name="plus" size={16} />
              </span>
            </span>
            <p className="text-body-sm text-text-heading">{t("plan.summary.empty")}</p>
          </div>
        ) : (
          blocks.map((block) => (
            <section key={block.id} className="flex flex-col gap-2 border-t border-red-100 pt-3 first:border-t-0 first:pt-0">
              <header className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-body-sm font-bold text-text-heading">
                  <span className="text-brand-red">
                    <Icon name={block.icon ?? SERVICE_ICON[block.service as keyof typeof SERVICE_ICON]} size={16} />
                  </span>
                  {block.title}
                </h3>
                <button
                  type="button"
                  onClick={() => go(block.editStep)}
                  aria-label={t("plan.review.edit", { values: { name: block.title } })}
                  className={`grid size-7 place-items-center rounded-md text-text-default hover:bg-surface-sunken ${focusRing}`}
                >
                  <Icon name="edit" size={13} />
                </button>
              </header>
              <dl className="flex flex-col gap-1.5">
                {block.rows.map((row) => (
                  <div key={row.label} className="flex justify-between gap-3 text-[12px] leading-4">
                    <dt className="shrink-0 text-text-default">{row.label}</dt>
                    <dd className="min-w-0 text-end break-words text-text-heading">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border-subtle p-5">
        {total ?? (
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md border border-brand-red text-brand-red">
              <Icon name="doc" size={17} />
            </span>
            <span className="flex flex-col">
              <span className="text-body-sm font-bold text-text-heading">{t("plan.summary.detailsFirst")}</span>
              <span className="text-caption text-text-default">{t("plan.summary.detailsFirstSub")}</span>
            </span>
          </div>
        )}
        {action}
        {next ? <p className="text-center text-caption text-text-default">{next}</p> : null}
      </div>
    </div>
  );
}
