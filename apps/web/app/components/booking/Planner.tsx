"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";

import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { useSiteSettings } from "@/lib/site/useSiteSettings";
import {
  answerProblem,
  commonHidden,
  commonLabel,
  commonQuestions,
  customKeyOf,
  fieldRequired,
  findService,
  stepOverride,
  textAny,
  textIn,
  type BookingCatalog,
  type CatalogService,
  type CommonFlow,
} from "@/lib/booking/catalog";
import { cleaningNotes, commonAnswerLines, movingNotes, orderAnswers, requestJobs } from "@/lib/booking/handover";
import {
  INITIAL_PLAN,
  PHASES,
  SERVICE_KEYS,
  WINDOWS,
  firstIncomplete,
  flow,
  inventoryCount,
  isBusiness,
  isCustomStep,
  isRequestOnly,
  jobsFor,
  pendingScope,
  phaseOf,
  planReducer,
  pricedJobs,
  restorePlan,
  roomDisplayName,
  validateStep,
  type CustomerType,
  type Plan,
  type RoomType,
  type ServiceKey,
  type StepId,
  type ValidationContext,
} from "@/lib/booking/plan";
import { usePlanQuotes } from "@/lib/booking/useQuotes";
import { useAreaChecks } from "@/lib/booking/useAreaChecks";
import { PlannerContext, plannerCopy, usePlanner, type PlannerContextValue } from "./context";
import { PlanSummary } from "./PlanSummary";
import { BusinessAccountStep, PaymentStep } from "./steps/Account";
import { AddressStep } from "./steps/Address";
import { ExtrasStep, hiddenExtras } from "./steps/Extras";
import { HomeStep } from "./steps/Home";
import { CleaningStep, DisposalStep, RenovationStep } from "./steps/Jobs";
import { PhotosStep } from "./steps/Photos";
import { PropertyStep } from "./steps/Property";
import { CustomServiceStep, StepQuestions } from "./steps/Questions";
import { ReviewStep } from "./steps/Review";
import { ScheduleStep } from "./steps/Schedule";
import { CustomerTypeCards, ServicesStep } from "./steps/Start";
import { BackIcon, Dialog, ForwardIcon, Icon, focusRing, primaryButton, secondaryButton, textButton } from "./ui";
import { joinName, splitName } from "@/lib/name";

/**
 * The booking planner.
 *
 * Three things carried over from the calculator it replaces, because they
 * were right there too:
 *
 *   1. The step lives in the URL (`?step=address`), so refresh, sharing and
 *      the browser's back button all work.
 *   2. The answers are kept in session storage, so following a link away and
 *      back does not lose a half-listed home.
 *   3. No price is ever computed here. The review asks the server for one
 *      quote per job it can price, and payment books orders from those rows.
 */

const STORAGE_KEY = "mon.planner.v1";

interface Booked {
  orders: Array<{ service: "moving" | "cleaning"; reference: string; date: string }>;
  request: string | null;
}

/**
 * The offered services, as the server render read them and then fresh from
 * the API: an office that just hid a service sees it gone without waiting
 * out the page cache. Null when neither read worked — the planner then
 * offers its own four, as it did before the catalogue existed.
 */
function useCatalog(initial: BookingConfig | null): { catalog: BookingCatalog; common: CommonFlow } {
  const { sdk } = useApi();
  const { data } = useQuery({
    queryKey: ["booking", "services"],
    queryFn: () => sdk.http.get<BookingConfig>("/api/services"),
    ...(initial ? { initialData: initial, initialDataUpdatedAt: 0 } : {}),
    staleTime: 0,
    retry: 1,
  });
  const config = data ?? initial;
  // A stable empty list: effects keyed on `common` must not re-run every render.
  return { catalog: config?.services ?? null, common: config?.common ?? NO_COMMON };
}

const NO_COMMON: CommonFlow = [];

/** `GET /api/services`: the services on offer and the common steps' settings. */
export interface BookingConfig {
  services: CatalogService[];
  common?: CommonFlow;
}

/** The website's service ids (CMS, service pages) → the planner's service keys. */
const SITE_SERVICE_KEYS: Record<string, ServiceKey> = {
  moving: "moving",
  painting: "renovation",
  renovation: "renovation",
  cleaning: "cleaning",
  clearance: "disposal",
  disposal: "disposal",
};

export function Planner({
  images,
  services,
  footer,
}: {
  images: Record<string, string>;
  /** `GET /api/services` as the server read it, or null. */
  services: BookingConfig | null;
  footer: ReactNode;
}) {
  const { t, locale } = useI18n();
  const { sdk, user, loading: sessionLoading } = useApi();
  const { onlyInsideAreas } = useSiteSettings();
  const { catalog, common } = useCatalog(services);
  const router = useRouter();
  const params = useSearchParams();

  const [plan, dispatch] = useReducer(planReducer, INITIAL_PLAN);
  const [restored, setRestored] = useState(false);
  const [attempted, setAttempted] = useState<Partial<Record<StepId, boolean>>>({});
  const [typeAttempted, setTypeAttempted] = useState(false);
  const [notice, setNotice] = useState("");
  const [help, setHelp] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [booked, setBooked] = useState<Booked | null>(null);
  // Orders already placed in this attempt, so a retry never books a job twice.
  const placed = useRef(new Map<string, string>());
  const photoFiles = useRef(new Map<string, File>());

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) dispatch({ type: "restore", plan: restorePlan(JSON.parse(saved)) });
    } catch {
      // A blocked or corrupt store is not a reason to fail the page.
    }
    setRestored(true);
  }, []);

  // A link from a service page names the customer type and the service
  // (/rechner?type=business&services=renovation): the start screen is
  // answered for the visitor and they land on "Wobei dürfen wir helfen?"
  // with that service chosen. The site's own ids are accepted as well.
  // A link with the type only (/rechner?type=business, e.g. "Angebot
  // anfordern" on Geschäftskunden) lands there with nothing chosen, so the
  // visitor picks the services themselves.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (!restored || deepLinked.current) return;
    deepLinked.current = true;
    const type = params.get("type");
    if (type !== "private" && type !== "business") return;
    const wanted = (params.get("services") ?? "")
      .split(",")
      .map((id) => SITE_SERVICE_KEYS[id.trim()] ?? id.trim())
      .filter((key): key is ServiceKey => (SERVICE_KEYS as readonly string[]).includes(key));
    const base = plan.customerType === type ? plan : { ...INITIAL_PLAN, answers: plan.answers };
    dispatch({
      type: "restore",
      plan: {
        ...base,
        customerType: type,
        services: { ...INITIAL_PLAN.services, ...Object.fromEntries(wanted.map((key) => [key, true])) },
      },
    });
    router.replace(`/${locale}/rechner?step=services`, { scroll: false });
    // Once, on arriving with the link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored]);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch {
      // Private browsing: the planner still works, it just will not survive.
    }
  }, [plan, restored]);

  // What the office changed since this plan was started: a service it hid
  // is no longer chosen, a custom service it removed drops out, and an
  // add-on it took off the extras screen is no longer priced.
  useEffect(() => {
    if (!restored) return;
    const hidden = hiddenExtras(images);
    dispatch({
      type: "patch",
      patch: (current) => {
        const patch: Partial<Plan> = {};
        if (catalog) {
          const offered = new Set(catalog.map((service) => service.key));
          const services = { ...current.services };
          let changed = false;
          for (const key of Object.keys(services) as ServiceKey[]) {
            if (services[key] && !offered.has(key)) {
              services[key] = false;
              changed = true;
            }
          }
          if (changed) patch.services = services;
          const custom = current.customServices.filter((key) => catalog.some((service) => service.key === key && !service.isBuiltin));
          if (custom.length !== current.customServices.length) patch.customServices = custom;
        }
        const extras = Object.fromEntries(hidden.filter((flag) => current.moving[flag]).map((flag) => [flag, false]));
        if (Object.keys(extras).length) patch.moving = { ...current.moving, ...extras };
        // Booking site → Common steps: an answer the office took off the screen is not sent.
        if (commonHidden(common, "payment.billTo") && current.billTo !== "me") patch.billTo = "me";
        if (commonHidden(common, "review.discount") && current.discountCode) patch.discountCode = "";
        if (commonHidden(common, "payment.method") && current.payMethod !== INITIAL_PLAN.payMethod) patch.payMethod = INITIAL_PLAN.payMethod;
        return patch;
      },
    });
  }, [catalog, common, images, restored]);

  // Settings → Company: whether each address is inside a service zone.
  useAreaChecks(plan, dispatch, onlyInsideAreas && restored);

  const context: ValidationContext = { signedIn: Boolean(user), catalog, onlyInsideAreas, common };
  const steps = flow(plan, context);
  const requested = params.get("step") as StepId | null;
  const welcome = !plan.customerType || !requested || requested === ("type" as StepId);
  const step: StepId = requested && steps.includes(requested) ? requested : steps[0]!;
  const index = steps.indexOf(step);
  const requestOnly = isRequestOnly(plan);

  const errors = attempted[step] ? validateStep(plan, step, context) : {};

  const priced = useMemo(() => pricedJobs(plan), [plan]);
  const quotes = usePlanQuotes(priced, !welcome && (step === "review" || step === "payment"));

  const customName = useCallback(
    (key: string) => textAny(findService(catalog, key)?.name, locale) || key,
    [catalog, locale],
  );

  const stepLabel = useCallback(
    (id: StepId) => {
      const custom = customKeyOf(id);
      if (custom) return customName(custom);
      if (id === "schedule" && requestOnly) return t("plan.step.visit");
      if (id === "review" && requestOnly) return t("plan.step.reviewRequest");
      return t(`plan.step.${id}`);
    },
    [t, requestOnly, customName],
  );

  const navigate = useCallback(
    (target: StepId | "type") => {
      router.push(`/${locale}/rechner?step=${target}`, { scroll: false });
      setStepsOpen(false);
      setPlanOpen(false);
      window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    },
    [router, locale],
  );

  /** Goes to a step, unless the price screens are asked for with gaps before them. */
  const go = useCallback(
    (target: StepId) => {
      if (target === "review" || target === "payment") {
        const missing = firstIncomplete(plan, context, target);
        if (missing) {
          setAttempted((current) => ({ ...current, [missing]: true }));
          setNotice(t("plan.notice.complete", { values: { step: stepLabel(missing) } }));
          return navigate(missing);
        }
      }
      setNotice("");
      navigate(target);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, user, navigate, stepLabel, t],
  );

  // A shared or bookmarked link straight to the price screens gets the same
  // check as the Continue button: the first unanswered step comes first.
  useEffect(() => {
    if (!restored || sessionLoading || welcome || booked || (step !== "review" && step !== "payment")) return;
    const missing = firstIncomplete(plan, context, step);
    if (!missing) return;
    setAttempted((current) => ({ ...current, [missing]: true }));
    setNotice(t("plan.notice.complete", { values: { step: stepLabel(missing) } }));
    navigate(missing);
    // Only on arriving at a step; edits on the step itself must not bounce away.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, sessionLoading, step, welcome]);

  function pickCustomer(type: CustomerType) {
    // The start screen's own questions (Booking site → Customer type) come first.
    const unanswered = commonQuestions(common, "type").some((asked) => answerProblem(asked.question, plan.answers[asked.key]));
    if (unanswered) {
      setTypeAttempted(true);
      setTimeout(() => document.querySelector('[aria-invalid="true"], [role="alert"]')?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
      return;
    }
    if (plan.customerType && plan.customerType !== type) {
      // A business plan and a home plan share nothing but the services.
      dispatch({
        type: "restore",
        plan: {
          ...INITIAL_PLAN,
          customerType: type,
          services: plan.services,
          // The start screen's answers were just given; they stay.
          answers: Object.fromEntries(Object.entries(plan.answers).filter(([key]) => key.startsWith("extra.type."))),
        },
      });
    } else {
      dispatch({ type: "patch", patch: { customerType: type } });
    }
    setAttempted({});
    navigate("services");
  }

  function scrollToError() {
    setTimeout(() => {
      document
        .querySelector('[aria-invalid="true"], [role="alert"]')
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 50);
  }

  async function next() {
    const found = validateStep(plan, step, context);

    if (Object.keys(found).length > 0) {
      setAttempted((current) => ({ ...current, [step]: true }));
      scrollToError();
      return;
    }

    if (step === "review" && requestOnly) return void guardedRequest();
    if (step === "payment") return void submitBooking();

    const following = steps[index + 1];
    if (following) go(following);
  }

  /** Maps the failures booking can provoke onto something the customer can act on. */
  function describe(caught: unknown): string {
    if (!(caught instanceof ApiError)) return t("error.generic");
    switch (caught.code) {
      case "SLOT_TAKEN":
        return t("plan.submit.slotTaken");
      case "QUOTE_EXPIRED":
      case "QUOTE_ALREADY_USED":
        return t("plan.submit.quoteStale");
      case "RATE_LIMITED":
        return t("error.rateLimited");
      case "NETWORK_ERROR":
        return t("error.network");
      default:
        return caught.message || t("error.generic");
    }
  }

  async function submitRequest(extra: Booked["orders"] = []) {
    const jobs = requestJobs(plan, catalog);

    if (jobs.length === 0) {
      setBooked({ orders: extra, request: null });
      return;
    }

    const contact = plan.contact;
    // Answers to the questions every customer is asked travel as notes.
    const everyone = commonAnswerLines(plan, common);
    const notes = [plan.scheduleNotes.trim() ? plan.scheduleNotes.trim() : "", everyone.length ? `Weitere Angaben:\n${everyone.join("\n")}` : ""]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 3990);
    const response = await sdk.http.post<{ reference: string }>("/api/requests", {
      customerType: isBusiness(plan) ? "business" : "private",
      ...(plan.company.trim() ? { company: plan.company.trim() } : {}),
      ...(() => {
        const fallback = splitName(user?.fullName);
        const firstName = contact.firstName.trim() || fallback.first;
        const lastName = contact.lastName.trim() || fallback.last;
        return {
          contactName: joinName(firstName, lastName),
          ...(firstName ? { contactFirstName: firstName } : {}),
          ...(lastName ? { contactLastName: lastName } : {}),
        };
      })(),
      contactEmail: contact.email.trim() || user?.email || "",
      contactPhone: contact.phone.trim(),
      locale,
      jobs,
      ...(notes ? { notes } : {}),
    });

    finish({ orders: extra, request: response.reference });
  }

  async function submitBooking() {
    const missing = firstIncomplete(plan, context, "payment");
    if (missing) return go(missing);

    if (!quotes.ready) {
      setSubmitError(t("plan.submit.waitForPrice"));
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    const orders: Booked["orders"] = [];

    try {
      for (const job of priced) {
        const state = quotes.stateOf(job.id);
        if (state?.status !== "ready") throw new Error("unpriced");

        const slot = job.service === "moving" ? plan.moving.slot : jobsFor(plan, "cleaning").find((entry) => entry.id === job.id)?.slot;
        if (!slot?.date || slot.window === null) throw new Error("unscheduled");

        // The office's own questions — this service's and everyone's — land in `orders.answers`.
        const answers = orderAnswers(plan, catalog, job.service, common);

        const reference =
          placed.current.get(job.id) ??
          (
            await sdk.orders.create({
              quoteId: state.quote.id,
              contactName: joinName(plan.contact.firstName, plan.contact.lastName),
              contactFirstName: plan.contact.firstName.trim(),
              contactLastName: plan.contact.lastName.trim(),
              contactEmail: (user?.email ?? plan.contact.email).trim(),
              contactPhone: plan.contact.phone.trim(),
              scheduledDate: slot.date,
              scheduledTime: WINDOWS[slot.window] ?? WINDOWS[0],
              locale,
              notes:
                job.service === "moving"
                  ? movingNotes(plan, (room) => roomDisplayName(room, (type) => t(`plan.room.${type}`)))
                  : cleaningNotes(plan, job.id),
              ...(Object.keys(answers).length ? { answers } : {}),
            })
          ).reference;

        placed.current.set(job.id, reference);
        orders.push({ service: job.service, reference, date: slot.date });
      }

      await submitRequest(orders);
    } catch (caught) {
      if (caught instanceof ApiError && (caught.code === "QUOTE_EXPIRED" || caught.code === "QUOTE_ALREADY_USED")) {
        for (const job of priced) if (!placed.current.has(job.id)) quotes.invalidate(job.id);
      }
      setSubmitError(
        orders.length > 0 || placed.current.size > 0
          ? `${t("plan.submit.partly", { values: { references: [...placed.current.values()].join(", ") } })} ${describe(caught)}`
          : describe(caught),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function finish(result: Booked) {
    placed.current.clear();
    photoFiles.current.clear();
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clean up if the store was never writable.
    }
    setBooked(result);
    window.scrollTo({ top: 0 });
  }

  async function guardedRequest() {
    setSubmitting(true);
    setSubmitError("");
    try {
      await submitRequest();
    } catch (caught) {
      setSubmitError(describe(caught));
    } finally {
      setSubmitting(false);
    }
  }

  const value: PlannerContextValue = {
    plan,
    dispatch,
    errors,
    go,
    images,
    catalog,
    photoFiles,
    serviceName: (service: ServiceKey | "visit") =>
      service === "visit"
        ? t("plan.overview.businessVisit")
        : textIn(findService(catalog, service)?.name, locale) || t(`plan.service.${service}`),
    customName,
    customService: (key: string) => findService(catalog, key),
    common,
    fieldRequired: (fieldId: string) => fieldRequired(plan, catalog, fieldId, common),
    // Hidden by the office, unless a service still needs the answer.
    fieldShown: (fieldId: string) => !commonHidden(common, fieldId) || fieldRequired(plan, catalog, fieldId, common),
    fieldLabel: (fieldId: string, fallback: string) => commonLabel(common, fieldId, locale) || fallback,
    roomTypeName: (type: RoomType) => t(`plan.room.${type}`),
    addressLabel: (key: string) => (key === "to" ? "B" : key === "from" || key === "service" ? "A" : "•"),
  };

  if (!restored) return <div className="min-h-screen bg-surface-page" aria-busy="true" />;

  if (welcome) {
    return (
      <PlannerContext.Provider value={value}>
        <Shell footer={footer} onHelp={() => setHelp(true)} plan={plan} onCustomer={() => navigate("type")} welcome>
          <main id="planner-main" className="mx-auto flex w-full max-w-[1040px] flex-col gap-8 px-4 py-10 md:px-6 lg:py-14">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="flex flex-col gap-3">
                <span className="flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] text-text-heading uppercase">
                  <span className="size-1.5 rounded-full bg-brand-red" />
                  {t("plan.welcome.eyebrow")}
                </span>
                <h1 className="font-display text-[2.25rem] leading-tight font-bold text-text-heading">
                  {cmsHeadline(images, "type") || t("plan.welcome.title")}
                </h1>
              </div>
              <p className="max-w-xs text-body-sm text-text-heading">{plannerCopy(images, "steps.type.lead", t("plan.welcome.lead"))}</p>
            </div>

            <CustomerTypeCards onPick={pickCustomer} />

            {/* Booking site → Customer type: questions asked before anything else. */}
            <StepQuestions
              step="type"
              errors={
                typeAttempted
                  ? Object.fromEntries(
                      commonQuestions(common, "type").flatMap((asked) => {
                        const problem = answerProblem(asked.question, plan.answers[asked.key]);
                        return problem ? [[`q.${asked.key}`, problem]] : [];
                      }),
                    )
                  : {}
              }
            />

            <div className="flex flex-wrap items-start justify-between gap-4">
              <p className="flex items-start gap-3 text-body-sm text-text-heading">
                <Icon name="layers" size={22} />
                <span>
                  <b>{t("plan.welcome.footTitle")}</b>
                  <br />
                  <span className="text-caption">{t("plan.welcome.footServices")}</span>
                </span>
              </p>
              <span className="flex items-center gap-2 text-caption text-text-default">
                <span className="size-1.5 rounded-full bg-brand-red" />
                {t("plan.nrw")}
              </span>
            </div>
          </main>
          {help ? <HelpDialog onClose={() => setHelp(false)} welcome /> : null}
        </Shell>
      </PlannerContext.Provider>
    );
  }

  const phase = phaseOf(step);
  const nextStep = steps[index + 1];
  const continueLabel =
    step === "payment"
      ? t("plan.cta.confirm")
      : step === "review"
        ? requestOnly
          ? t("plan.cta.request")
          : t("plan.cta.toPayment")
        : step === "schedule"
          ? stepLabel("review")
          : t("plan.cta.continue");

  const primary = (
    <button
      type="button"
      className={`${primaryButton} w-full justify-between`}
      onClick={() => void next()}
      disabled={submitting || (step === "payment" && !quotes.ready)}
      data-loading={submitting ? "true" : undefined}
    >
      {submitting ? t("plan.cta.sending") : continueLabel}
      <ForwardIcon size={18} />
    </button>
  );

  const total =
    (step === "review" || step === "payment") && priced.length > 0 ? (
      <div className="flex items-end justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-body-sm font-semibold text-text-heading">
            {pendingScope(plan).length > 0 ? t("plan.review.pricedSubtotal") : t("plan.review.total")}
          </span>
          <span className="text-[11px] text-text-default">{t("plan.summary.inclVat")}</span>
        </span>
        <span className="font-display text-h3 font-bold text-text-heading tabular-nums">
          {quotes.ready ? new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(quotes.total) : "…"}
        </span>
      </div>
    ) : undefined;

  const copyKey =
    step === "address" && !plan.services.moving
      ? "addressAlt"
      : step === "schedule" && requestOnly
        ? "visit"
        : step === "review" && requestOnly
          ? "reviewRequest"
          : isCustomStep(step)
            ? "custom"
            : step;

  // The headline: what a selected service's flow says for this step
  // (Dashboard → Services), else the Booking site copy for the steps every
  // customer sees, else the planner's own wording.
  const override = stepOverride(plan, catalog, step, locale);
  const customHere = customKeyOf(step);
  const title =
    override.title ||
    (BOOKING_SITE_STEPS.has(copyKey) ? cmsHeadline(images, copyKey) : "") ||
    t(`plan.copy.${copyKey}.title`);
  const lead =
    override.hint ||
    (BOOKING_SITE_STEPS.has(copyKey) ? images[`steps.${copyKey}.lead`]?.trim() ?? "" : "") ||
    (customHere ? textAny(findService(catalog, customHere)?.description, locale) : "") ||
    t(`plan.copy.${copyKey}.lead`);

  return (
    <PlannerContext.Provider value={value}>
      <Shell footer={footer} onHelp={() => setHelp(true)} plan={plan} onCustomer={() => navigate("type")}>
        <div className="mx-auto grid w-full max-w-[1440px] lg:grid-cols-[210px_minmax(0,1fr)]">
          <Sidebar steps={steps} current={step} label={stepLabel} plan={plan} onGo={go} open={stepsOpen} onClose={() => setStepsOpen(false)} />

          <div className="flex min-w-0 flex-col">
            <PhaseBar phase={phase} onSteps={() => setStepsOpen(true)} />

            {booked ? (
              <Confirmation booked={booked} onRestart={() => {
                dispatch({ type: "reset" });
                setBooked(null);
                setAttempted({});
                navigate("type");
              }} />
            ) : (
              <div className="grid gap-6 px-4 py-6 md:px-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:py-8">
                <main id="planner-main" className="flex min-w-0 flex-col gap-6">
                  <header className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3 text-[11px] font-bold tracking-[0.14em] text-text-heading uppercase">
                      <span>
                        {String(index + 1).padStart(2, "0")} / {stepLabel(step)}
                      </span>
                      <span>{t("plan.stepOf", { values: { current: index + 1, total: steps.length } })}</span>
                    </div>
                    <h1 id="planner-title" tabIndex={-1} className="font-display text-[1.75rem] leading-tight font-bold text-text-heading md:text-[2rem]">
                      {title}
                    </h1>
                    <p className="text-body text-text-heading">{lead}</p>
                  </header>

                  {notice ? (
                    <p role="status" className="flex items-center gap-2 rounded-md border border-brand-yellow bg-yellow-tint px-3 py-2.5 text-body-sm text-text-heading">
                      <Icon name="info" size={15} />
                      <span className="flex-1">{notice}</span>
                      <button type="button" aria-label={t("plan.close")} onClick={() => setNotice("")} className={focusRing}>
                        <Icon name="close" size={14} />
                      </button>
                    </p>
                  ) : null}

                  {Object.keys(errors).length > 0 ? (
                    <p role="alert" className="rounded-md border border-danger bg-danger-soft px-3 py-2.5 text-body-sm font-semibold text-danger-text">
                      {t("plan.fixFields")}
                    </p>
                  ) : null}

                  <StepView step={step} quotes={quotes} priced={priced} />

                  {submitError ? (
                    <p role="alert" className="rounded-md border border-danger bg-danger-soft px-3 py-2.5 text-body-sm text-danger-text">
                      {submitError}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-5">
                    {index > 0 ? (
                      <button type="button" className={textButton} onClick={() => go(steps[index - 1]!)}>
                        <BackIcon />
                        {t("plan.previous")}
                      </button>
                    ) : (
                      <span className="text-caption text-text-default">{t("plan.madeForYou")}</span>
                    )}
                    <div className="flex items-center gap-4">
                      <span className="text-caption text-text-default">
                        <b className="text-text-heading">{index + 1}</b> / {steps.length}
                      </span>
                      <button
                        type="button"
                        className={`${primaryButton} hidden md:inline-flex xl:hidden`}
                        onClick={() => void next()}
                        disabled={submitting}
                      >
                        {continueLabel}
                        <ForwardIcon />
                      </button>
                    </div>
                  </div>
                </main>

                <aside className="hidden xl:block" aria-label={t("plan.summary.label")}>
                  <div className="sticky top-4">
                    <PlanSummary
                      total={total}
                      action={primary}
                      next={nextStep ? t("plan.summary.next", { values: { step: stepLabel(nextStep) } }) : undefined}
                    />
                  </div>
                </aside>
              </div>
            )}
          </div>
        </div>

        {!booked ? (
          <div className="sticky bottom-0 z-30 flex items-center gap-3 border-t border-border-subtle bg-surface-card px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] xl:hidden">
            <button type="button" onClick={() => setPlanOpen(true)} className={`flex min-w-0 flex-1 flex-col text-start ${focusRing}`} aria-haspopup="dialog">
              <span className="flex items-center gap-1 text-[11px] text-text-default">
                {t("plan.summary.title")}
                <Icon name="down" size={12} />
              </span>
              <b className="truncate text-body-sm text-text-heading">
                {(step === "review" || step === "payment") && quotes.ready && priced.length > 0
                  ? new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(quotes.total)
                  : plan.services.moving && inventoryCount(plan) > 0
                    ? t("plan.home.itemsCount", { count: inventoryCount(plan) })
                    : t("plan.summary.view")}
              </b>
            </button>
            <button type="button" className={primaryButton} onClick={() => void next()} disabled={submitting}>
              {submitting ? t("plan.cta.sending") : continueLabel}
              <ForwardIcon />
            </button>
          </div>
        ) : null}

        {planOpen ? (
          <Dialog title={t("plan.summary.title")} onClose={() => setPlanOpen(false)} closeLabel={t("plan.close")}>
            <PlanSummary total={total} action={primary} />
          </Dialog>
        ) : null}

        {help ? <HelpDialog onClose={() => setHelp(false)} /> : null}

      </Shell>
    </PlannerContext.Provider>
  );

}

/** The steps whose copy the Booking site screen edits (`planner` section, `steps.<id>.*`). */
const BOOKING_SITE_STEPS = new Set(["services", "account", "address", "schedule", "photos", "review", "payment"]);

/** "title1 title2" of a Booking site headline, or "" when the office left both empty. */
function cmsHeadline(images: Record<string, string>, id: string): string {
  return [images[`steps.${id}.title1`], images[`steps.${id}.title2`]]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
}

function StepView({
  step,
  quotes,
  priced,
}: {
  step: StepId;
  quotes: ReturnType<typeof usePlanQuotes>;
  priced: ReturnType<typeof pricedJobs>;
}) {
  const custom = customKeyOf(step);
  if (custom) return <CustomServiceStep serviceKey={custom} />;

  // The questions the office added to a built-in step follow its own. The
  // start screen's are asked there; they show here only when one was
  // skipped (a shared link straight to this step).
  return (
    <>
      <BuiltinStepView step={step} quotes={quotes} priced={priced} />
      {step === "services" ? <SkippedStartQuestions /> : null}
      <StepQuestions step={step} />
    </>
  );
}

function SkippedStartQuestions() {
  const { errors } = usePlanner();
  return Object.keys(errors).some((key) => key.startsWith("q.extra.type.")) ? <StepQuestions step="type" /> : null;
}

function BuiltinStepView({
  step,
  quotes,
  priced,
}: {
  step: StepId;
  quotes: ReturnType<typeof usePlanQuotes>;
  priced: ReturnType<typeof pricedJobs>;
}) {
  switch (step) {
    case "services":
      return <ServicesStep />;
    case "account":
      return <BusinessAccountStep />;
    case "address":
      return <AddressStep />;
    case "property":
      return <PropertyStep />;
    case "home":
      return <HomeStep />;
    case "extras":
      return <ExtrasStep />;
    case "renovation":
      return <RenovationStep />;
    case "cleaning":
      return <CleaningStep />;
    case "disposal":
      return <DisposalStep />;
    case "photos":
      return <PhotosStep />;
    case "schedule":
      return <ScheduleStep />;
    case "review":
      return <ReviewStep quotes={quotes} priced={priced} />;
    case "payment":
      return <PaymentStep />;
    default:
      return null;
  }
}

// ── Chrome ──────────────────────────────────────────────────────────────

function Shell({
  children,
  footer,
  onHelp,
  onCustomer,
  plan,
  welcome = false,
}: {
  children: ReactNode;
  footer: ReactNode;
  onHelp: () => void;
  onCustomer: () => void;
  plan: Plan;
  welcome?: boolean;
}) {
  const { t, locale } = useI18n();
  const { user, signOut } = useApi();
  const { logo, brandName } = useSiteSettings();

  const pill = `inline-flex items-center gap-2 rounded-full px-3 py-2 text-body-sm font-semibold text-text-heading hover:text-brand-red ${focusRing}`;

  return (
    <div className="relative flex min-h-screen flex-col bg-surface-card">
      <a href="#planner-main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface-card focus:px-4 focus:py-2">
        {t("plan.skip")}
      </a>

      {/* The designer's network backdrop, faint, behind the white space. */}
      <img
        src="/images/Q_plexus_network_red_transparent.gif"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-0 size-full object-cover opacity-[0.07] motion-reduce:hidden"
      />

      <header className="relative z-10 flex h-16 items-center justify-between gap-3 border-b border-border-default bg-surface-card px-4 md:h-[72px] md:px-6">
        <div className="flex items-center gap-5">
          <Link href={`/${locale}`} className={`rounded-sm ${focusRing}`} aria-label={t("plan.homeLink")}>
            <img src={logo} alt={brandName} className="h-9 w-auto md:h-11" />
          </Link>
          {welcome ? null : (
            <>
              <span className="hidden h-[72px] items-center border-b-2 border-brand-red text-body-sm font-semibold text-text-heading md:flex">
                {t("plan.header.booking")}
              </span>
              <button type="button" onClick={onCustomer} className={`hidden items-center gap-1.5 rounded-md px-2 py-1 text-caption font-semibold text-text-heading hover:bg-surface-sunken md:flex ${focusRing}`}>
                <Icon name={plan.customerType === "business" ? "business" : "home"} size={14} />
                {t(plan.customerType === "business" ? "plan.header.business" : "plan.header.private")}
                <Icon name="down" size={12} />
              </button>
            </>
          )}
        </div>

        <nav aria-label={t("plan.header.site")} className="flex items-center gap-1 rounded-full bg-surface-page p-1 md:px-2">
          <Link href={`/${locale}`} className={pill}>
            <span className="text-brand-red">
              <Icon name="home" size={17} />
            </span>
            <span className="hidden md:inline">{t("plan.header.home")}</span>
          </Link>
          <span aria-hidden="true" className="hidden h-5 w-px bg-border-default md:block" />
          <button type="button" onClick={onHelp} className={pill}>
            <Icon name="headphones" size={17} />
            <span className="hidden md:inline">{welcome ? t("plan.header.guide") : t("plan.header.help")}</span>
          </button>
          {welcome ? null : user ? (
            <button type="button" onClick={() => void signOut()} className={pill}>
              <Icon name="user" size={17} />
              <span className="hidden md:inline">{t("plan.header.signOut")}</span>
            </button>
          ) : (
            <Link href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/rechner`)}`} className={pill}>
              <Icon name="user" size={17} />
              <span className="hidden md:inline">{t("plan.header.signIn")}</span>
            </Link>
          )}
        </nav>
      </header>

      <div className="relative z-[1] flex flex-1 flex-col">{children}</div>

      <div className="relative z-[1]">{footer}</div>
    </div>
  );
}

function Sidebar({
  steps,
  current,
  label,
  plan,
  onGo,
  open,
  onClose,
}: {
  steps: StepId[];
  current: StepId;
  label: (step: StepId) => string;
  plan: Plan;
  onGo: (step: StepId) => void;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { user } = useApi();
  const { onlyInsideAreas } = useSiteSettings();
  const { catalog, common } = usePlanner();
  const index = steps.indexOf(current);

  const list = (
    <nav aria-label={t("plan.sidebar.steps")}>
      <ol className="flex flex-col gap-1">
        {steps.map((step, position) => {
          const active = step === current;
          const done = position < index && Object.keys(validateStep(plan, step, { signedIn: Boolean(user), catalog, onlyInsideAreas, common })).length === 0;
          return (
            <li key={step}>
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => onGo(step)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-body-sm ${focusRing} ${
                  active ? "bg-red-50 font-bold text-text-heading" : "text-text-heading hover:bg-surface-sunken"
                }`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                    active
                      ? "bg-brand-red text-text-on-brand"
                      : done
                        ? "bg-yellow-tint text-text-heading ring-1 ring-brand-yellow"
                        : "border border-border-strong text-text-default"
                  }`}
                >
                  {done && !active ? <Icon name="check" size={13} /> : String(position + 1).padStart(2, "0")}
                </span>
                {label(step)}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );

  return (
    <>
      <aside className="hidden border-e border-border-default bg-surface-card/80 lg:flex lg:flex-col lg:justify-between lg:gap-8 lg:px-3 lg:py-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 px-3">
            <span className="text-[11px] font-bold tracking-[0.14em] text-text-heading uppercase">{t("plan.sidebar.eyebrow")}</span>
            <p className="text-body-sm text-text-heading">{t("plan.sidebar.title")}</p>
          </div>
          {list}
        </div>
        <div className="flex flex-col gap-3 px-3">
          <Icon name="box" size={24} />
          <p className="text-body text-text-heading">{t("plan.sidebar.motto")}</p>
          <span className="flex items-center gap-2 text-[11px] text-text-default">
            <span className="size-1.5 rounded-full bg-brand-red" />
            {t("plan.nrw")}
          </span>
        </div>
      </aside>

      {open ? (
        <Dialog title={t("plan.sidebar.steps")} kicker={t("plan.sidebar.eyebrow")} onClose={onClose} closeLabel={t("plan.close")}>
          {list}
        </Dialog>
      ) : null}
    </>
  );
}

function PhaseBar({ phase, onSteps }: { phase: number; onSteps: () => void }) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-3 overflow-x-auto border-b border-border-default bg-surface-card/90 px-4 py-3 md:px-6">
      <button type="button" onClick={onSteps} className={`${secondaryButton} shrink-0 px-3 py-1.5 lg:hidden`}>
        <Icon name="list" size={16} />
        {t("plan.sidebar.stepsShort")}
      </button>
      <ol className="flex flex-1 items-center gap-3">
        {PHASES.map((entry, position) => {
          const active = position === phase;
          const passed = position < phase;
          return (
            <li key={entry.key} className={`flex items-center gap-2 ${active ? "" : "hidden md:flex"} md:flex-1`}>
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                  active ? "bg-brand-red text-text-on-brand" : passed ? "bg-yellow-tint text-text-heading ring-1 ring-brand-yellow" : "border border-text-heading text-text-heading"
                }`}
              >
                {passed ? <Icon name="check" size={12} /> : position + 1}
              </span>
              <span className={`text-body-sm whitespace-nowrap text-text-heading ${active ? "font-bold" : ""}`}>{t(entry.key)}</span>
              {position < PHASES.length - 1 ? <span aria-hidden="true" className="hidden h-px flex-1 bg-border-default md:block" /> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Confirmation({ booked, onRestart }: { booked: Booked; onRestart: () => void }) {
  const { t, locale, formatDate } = useI18n();
  const { user } = useApi();
  const { serviceName } = usePlanner();
  const first = splitName(user?.fullName).first;

  return (
    <main id="planner-main" className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 py-10 md:px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-success-soft text-success">
          <Icon name="check" size={30} strokeWidth={2.4} />
        </span>
        <h1 className="font-display text-h2 font-bold text-text-heading">
          {booked.orders.length > 0
            ? first
              ? t("plan.done.titleNamed", { values: { name: first } })
              : t("plan.done.title")
            : first
              ? t("plan.done.requestTitleNamed", { values: { name: first } })
              : t("plan.done.requestTitle")}
        </h1>
        <p className="max-w-lg text-body text-text-default">
          {booked.orders.length > 0 ? t("plan.done.ordersLead") : t("plan.done.requestLead")}
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border-subtle rounded-xl border-2 border-border-subtle bg-surface-card">
        {booked.orders.map((order) => (
          <div key={order.reference} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <span className="flex flex-col">
              <span className="text-body-sm font-bold text-text-heading">{serviceName(order.service)}</span>
              <span className="text-caption text-text-default">{formatDate(order.date)}</span>
            </span>
            <span className="rounded-md bg-surface-page px-3 py-1.5 font-mono text-body-sm font-bold text-text-heading">{order.reference}</span>
          </div>
        ))}
        {booked.request ? (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <span className="flex flex-col">
              <span className="text-body-sm font-bold text-text-heading">{t("plan.done.request")}</span>
              <span className="text-caption text-text-default">{t("plan.done.requestHint")}</span>
            </span>
            <span className="rounded-md bg-surface-page px-3 py-1.5 font-mono text-body-sm font-bold text-text-heading">{booked.request}</span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {booked.orders.length > 0 ? (
          <Link href={`/${locale}/konto/auftraege`} className={primaryButton}>
            {t("plan.done.myOrders")}
            <ForwardIcon />
          </Link>
        ) : null}
        <button type="button" className={secondaryButton} onClick={onRestart}>
          {t("plan.done.restart")}
        </button>
      </div>
    </main>
  );
}

function HelpDialog({ onClose, welcome = false }: { onClose: () => void; welcome?: boolean }) {
  const { t } = useI18n();
  const { phone } = useSiteSettings();
  const topics = welcome ? ["start"] : ["inventory", "missing", "assembly", "price", "photos", "contact"];

  return (
    <Dialog
      title={welcome ? t("plan.help.welcomeTitle") : t("plan.help.title")}
      kicker={t("plan.help.kicker")}
      onClose={onClose}
      closeLabel={t("plan.close")}
      footer={
        <button type="button" className={primaryButton} onClick={onClose}>
          {welcome ? t("plan.help.start") : t("plan.help.back")}
        </button>
      }
    >
      {topics.map((topic, position) => (
        <details key={topic} open={position === 0} className="rounded-md border border-border-subtle p-3">
          <summary className="cursor-pointer text-body-sm font-bold text-text-heading">{t(`plan.help.${topic}.q`)}</summary>
          <p className="mt-2 text-body-sm text-text-default">
            {t(`plan.help.${topic}.a`, { values: { phone: phone || "—" } })}
          </p>
        </details>
      ))}
    </Dialog>
  );
}
