"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ApiError, useApi } from "@/lib/api";
import type { PricedJob } from "./plan";

/**
 * Server quotes for the plan's priced jobs.
 *
 * The rule the calculator kept is kept here: the number on screen is the
 * number the server stated. Each priced job is one `POST /api/quotes`; its
 * answers are the cache key, so stepping back and forth between review and
 * payment costs nothing, and only a changed job is priced again. The quote
 * rows are what the orders are booked from, so the price the customer accepts
 * is the price on the order.
 *
 * Asked for only on the review and payment screens, where the prototype shows
 * prices too — the details screens never show a figure.
 */

export interface QuoteResult {
  id: string;
  expiresAt: string;
  /** Set by the server when a person has to confirm this estimate (a 400 km move, a 250 m² home…). */
  requiresReview: boolean;
  reviewReasons: string[];
  breakdown: {
    lines: Array<{ key: string; amount: string; params?: Record<string, unknown> }>;
    netAmount: string;
    vatRate: string;
    vatAmount: string;
    totalGross: string;
    depositAmount: string;
    estimatedHours?: string;
    distanceKm?: string;
  };
}

export type QuoteState =
  | { status: "loading" }
  | { status: "ready"; quote: QuoteResult }
  | { status: "error"; message: string; code?: string | undefined };

export function usePlanQuotes(jobs: PricedJob[], active: boolean) {
  const { sdk } = useApi();
  const [states, setStates] = useState<Record<string, QuoteState>>({});
  const priced = useRef(new Map<string, string>());
  const [retry, setRetry] = useState(0);

  // One stable signature per job: its own answers, nothing else.
  const signatures = useMemo(
    () => jobs.map((job) => ({ job, signature: JSON.stringify(job.input) })),
    [jobs],
  );

  useEffect(() => {
    if (!active) return;

    // No cancellation on re-run: a request still in flight for the same
    // answers is still the right answer, and asking again would write a second
    // quote row. Only a changed signature makes an answer stale.
    for (const { job, signature } of signatures) {
      if (priced.current.get(job.id) === signature) continue;
      priced.current.set(job.id, signature);

      setStates((current) => ({ ...current, [job.id]: { status: "loading" } }));

      sdk.http
        .post<QuoteResult>("/api/quotes", { input: job.input })
        .then((quote) => {
          if (priced.current.get(job.id) !== signature) return;
          setStates((current) => ({ ...current, [job.id]: { status: "ready", quote } }));
        })
        .catch((caught: unknown) => {
          if (priced.current.get(job.id) !== signature) return;
          // Forgotten, so the next visit to the screen (or Retry) asks again.
          priced.current.delete(job.id);
          setStates((current) => ({
            ...current,
            [job.id]: {
              status: "error",
              message: caught instanceof ApiError && caught.message ? caught.message : "",
              code: caught instanceof ApiError ? caught.code : undefined,
            },
          }));
        });
    }
  }, [active, signatures, sdk, retry]);

  const current = (id: string): QuoteState | undefined => {
    const entry = signatures.find((candidate) => candidate.job.id === id);
    if (!entry || priced.current.get(id) !== entry.signature) return states[id]?.status === "error" ? states[id] : undefined;
    return states[id];
  };

  const ready = signatures.every(({ job }) => current(job.id)?.status === "ready");
  const total = signatures.reduce((sum, { job }) => {
    const state = current(job.id);
    return state?.status === "ready" ? sum + Number.parseFloat(state.quote.breakdown.totalGross) : sum;
  }, 0);

  return {
    stateOf: current,
    ready,
    loading: signatures.some(({ job }) => current(job.id)?.status === "loading"),
    total,
    retry: () => setRetry((n) => n + 1),
    /** Drops a stored quote so the next run prices the job again (an expired or used one). */
    invalidate: (id: string) => {
      priced.current.delete(id);
      setRetry((n) => n + 1);
    },
  };
}
