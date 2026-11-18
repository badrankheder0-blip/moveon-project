"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { PAY_METHODS } from "@/lib/booking/plan";
import { usePlanner } from "../context";
import {
  Checkbox,
  ErrorText,
  Field,
  Icon,
  Note,
  RadioCards,
  Section,
  describedBy,
  focusRing,
  inputClass,
  primaryButton,
  textButton,
} from "../ui";
import { joinName, splitName } from "@/lib/name";

/** Mirrors PASSWORD_MIN_LENGTH in `@mon/auth`, which is server-only. */
const PASSWORD_MIN_LENGTH = 10;

/**
 * Sign in or create an account, without leaving the planner.
 *
 * The prototype simulated both with a timeout. These are the real endpoints
 * through `useApi`, so the session is the site's session: the dashboard
 * shows the orders the planner books, and a customer who is already signed
 * in is never asked.
 */
/** The contact's own name if typed, else the account's, split into its halves. */
function nameOr(contact: { firstName: string; lastName: string }, fullName: string | null | undefined) {
  if (contact.firstName.trim() || contact.lastName.trim()) return { firstName: contact.firstName, lastName: contact.lastName };
  const parts = splitName(fullName);
  return { firstName: parts.first, lastName: parts.last };
}

export function AuthPanel({ intro }: { intro?: string }) {
  const { t, locale } = useI18n();
  const { user, signIn, signUp, signOut } = useApi();
  const { dispatch } = usePlanner();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (user) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border-default p-4">
        <span className="grid size-10 place-items-center rounded-full bg-red-50 text-brand-red">
          <Icon name="user" size={18} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-sm font-bold text-text-heading">{user.fullName}</span>
          <span className="truncate text-caption text-text-default">{user.email}</span>
        </span>
        <button type="button" className={textButton} onClick={() => void signOut()}>
          {t("plan.account.notYou")}
        </button>
      </div>
    );
  }

  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (mode === "signup") {
      if (!form.firstName.trim()) return setError(t("plan.error.firstName"));
      if (!form.lastName.trim()) return setError(t("plan.error.lastName"));
      if (form.password.length < PASSWORD_MIN_LENGTH) return setError(t("plan.account.passwordShort", { values: { min: PASSWORD_MIN_LENGTH } }));
      if (form.password !== form.confirm) return setError(t("plan.account.passwordMismatch"));
    }

    setBusy(true);

    try {
      const signed =
        mode === "signup"
          ? await signUp({
              email: form.email.trim(),
              password: form.password,
              fullName: joinName(form.firstName, form.lastName),
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              locale,
              ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
            })
          : await signIn(form.email.trim(), form.password);

      dispatch({
        type: "patch",
        patch: (current) => ({
          contact: {
            ...nameOr(current.contact, signed.fullName),
            email: signed.email,
            phone: current.contact.phone || form.phone.trim(),
          },
        }),
      });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.code === "EMAIL_TAKEN"
            ? t("plan.account.emailTaken")
            : caught.code === "INVALID_CREDENTIALS" || caught.status === 401
              ? t("plan.account.wrongPassword")
              : caught.code === "RATE_LIMITED"
                ? t("error.rateLimited")
                : caught.message || t("error.generic")
          : t("error.generic"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {intro ? <p className="text-body-sm text-text-default">{intro}</p> : null}

      <div role="tablist" aria-label={t("plan.account.title")} className="inline-flex w-fit rounded-md border border-border-default p-1">
        {(["signup", "signin"] as const).map((entry) => (
          <button
            key={entry}
            type="button"
            role="tab"
            aria-selected={mode === entry}
            onClick={() => {
              setMode(entry);
              setError("");
            }}
            className={`rounded-[6px] px-4 py-1.5 text-body-sm font-bold ${focusRing} ${
              mode === entry ? "bg-brand-red text-text-on-brand" : "text-text-heading"
            }`}
          >
            {t(entry === "signup" ? "plan.account.create" : "plan.account.signIn")}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {mode === "signup" ? (
          <>
            <Field id="auth-first-name" label={t("plan.contact.firstName")} required>
              <input id="auth-first-name" autoComplete="given-name" className={inputClass} value={form.firstName} onChange={(event) => set({ firstName: event.target.value })} />
            </Field>
            <Field id="auth-last-name" label={t("plan.contact.lastName")} required>
              <input id="auth-last-name" autoComplete="family-name" className={inputClass} value={form.lastName} onChange={(event) => set({ lastName: event.target.value })} />
            </Field>
            <Field id="auth-phone" label={t("plan.contact.phone")} required>
              <input id="auth-phone" type="tel" dir="ltr" autoComplete="tel" className={inputClass} value={form.phone} placeholder="+49 176 1234567" onChange={(event) => set({ phone: event.target.value })} />
            </Field>
          </>
        ) : null}
        <div className="md:col-span-2">
          <Field id="auth-email" label={t("plan.contact.email")} required>
            <input id="auth-email" type="email" dir="ltr" autoComplete="email" className={inputClass} value={form.email} onChange={(event) => set({ email: event.target.value })} />
          </Field>
        </div>
        <Field id="auth-password" label={t("plan.account.password")} required hint={mode === "signup" ? t("plan.account.passwordHint", { values: { min: PASSWORD_MIN_LENGTH } }) : undefined}>
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className={inputClass}
            value={form.password}
            onChange={(event) => set({ password: event.target.value })}
          />
        </Field>
        {mode === "signup" ? (
          <Field id="auth-confirm" label={t("plan.account.confirm")} required>
            <input id="auth-confirm" type="password" autoComplete="new-password" className={inputClass} value={form.confirm} onChange={(event) => set({ confirm: event.target.value })} />
          </Field>
        ) : (
          <div className="flex items-end pb-3">
            <Link href={`/${locale}/passwort-vergessen`} className={`${textButton} text-brand-red`}>
              {t("plan.account.forgot")}
            </Link>
          </div>
        )}
      </div>

      <ErrorText>{error}</ErrorText>

      <button type="submit" className={`${primaryButton} self-start`} disabled={busy} data-loading={busy ? "true" : undefined}>
        {busy ? t("plan.account.busy") : t(mode === "signup" ? "plan.account.create" : "plan.account.signIn")}
      </button>
    </form>
  );
}

/** The business flow's second screen: an account, and the company it books for. */
export function BusinessAccountStep() {
  const { t } = useI18n();
  const { plan, dispatch, errors, fieldRequired, fieldShown, fieldLabel } = usePlanner();
  const { user } = useApi();
  const phoneRequired = fieldRequired("account.phone");
  const phoneError = errors.companyPhone ? t(errors.companyPhone) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <Section
        title={user ? t("plan.business.accountTitle") : t("plan.business.signInTitle")}
        sub={user ? t("plan.business.accountSub") : t("plan.business.signInSub")}
      >
        <AuthPanel />
        <ErrorText>{errors.auth && !user ? t(errors.auth) : undefined}</ErrorText>
      </Section>

      <Section title={t("plan.business.companyTitle")}>
        <Field id="company-name" label={fieldLabel("account.company", t("plan.business.company"))} required error={errors.company ? t(errors.company) : undefined}>
          <input
            id="company-name"
            autoComplete="organization"
            className={inputClass}
            value={plan.company}
            maxLength={160}
            placeholder={t("plan.business.companyPlaceholder")}
            onChange={(event) => dispatch({ type: "patch", patch: { company: event.target.value } })}
            {...describedBy("company-name", errors.company)}
          />
        </Field>
        {fieldShown("account.phone") ? (
          <Field
            id="company-phone"
            label={fieldLabel("account.phone", t("plan.contact.phone"))}
            required={phoneRequired}
            hint={t("plan.business.phoneHint")}
            error={phoneError}
          >
            <input
              id="company-phone"
              type="tel"
              dir="ltr"
              autoComplete="tel"
              className={inputClass}
              value={plan.contact.phone}
              onChange={(event) => dispatch({ type: "patch", patch: (current) => ({ contact: { ...current.contact, phone: event.target.value } }) })}
              {...describedBy("company-phone", phoneError)}
            />
          </Field>
        ) : null}
        <Note>{t("plan.business.next")}</Note>
      </Section>
    </div>
  );
}

const PAY_ICON = { bank_transfer: "bank", card: "card", paypal: "wallet", cash: "cash" } as const;

/**
 * The last details: who books, who is billed, how they would like to pay.
 *
 * There is no checkout behind this — `payments` is a ledger the office posts
 * to once money arrives — so the method is a preference that travels with
 * the order, and nothing on this screen asks for card details. The prototype
 * drew card fields marked "preview only"; a real site must not collect card
 * numbers it cannot process.
 */
export function PaymentStep() {
  const { t, locale } = useI18n();
  const { plan, dispatch, errors, fieldShown, fieldLabel } = usePlanner();
  const { user } = useApi();

  useEffect(() => {
    if (!user) return;
    dispatch({
      type: "patch",
      patch: (current) => ({
        contact: {
          ...nameOr(current.contact, user.fullName),
          email: user.email,
          phone: current.contact.phone,
        },
      }),
    });
  }, [user, dispatch]);

  const error = (key: string) => (errors[key] ? t(errors[key]!) : undefined);
  const setContact = (patch: Partial<typeof plan.contact>) =>
    dispatch({ type: "patch", patch: (current) => ({ contact: { ...current.contact, ...patch } }) });
  const setOther = (patch: Partial<typeof plan.other>) =>
    dispatch({ type: "patch", patch: (current) => ({ other: { ...current.other, ...patch } }) });

  return (
    <div className="flex flex-col gap-5">
      <Note>{t("plan.payment.noCharge")}</Note>

      <Section title={t("plan.account.title")} sub={user ? undefined : t("plan.account.sub")}>
        <AuthPanel />
        <ErrorText>{error("auth") && !user ? error("auth") : undefined}</ErrorText>
      </Section>

      <Section title={t("plan.payment.whoTitle")} sub={t("plan.payment.whoSub")}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="contact-first-name" label={fieldLabel("payment.firstName", t("plan.contact.firstName"))} required error={error("firstName")}>
            <input id="contact-first-name" autoComplete="given-name" className={inputClass} value={plan.contact.firstName} onChange={(event) => setContact({ firstName: event.target.value })} {...describedBy("contact-first-name", error("firstName"))} />
          </Field>
          <Field id="contact-last-name" label={fieldLabel("payment.lastName", t("plan.contact.lastName"))} required error={error("lastName")}>
            <input id="contact-last-name" autoComplete="family-name" className={inputClass} value={plan.contact.lastName} onChange={(event) => setContact({ lastName: event.target.value })} {...describedBy("contact-last-name", error("lastName"))} />
          </Field>
          <Field id="contact-phone" label={fieldLabel("payment.phone", t("plan.contact.phone"))} required error={error("phone")} hint={t("plan.payment.phoneHint")}>
            <input id="contact-phone" type="tel" dir="ltr" autoComplete="tel" className={inputClass} value={plan.contact.phone} placeholder="+49 176 1234567" onChange={(event) => setContact({ phone: event.target.value })} {...describedBy("contact-phone", error("phone"))} />
          </Field>
        </div>

        {/* Booking site → "Bill someone else" may be taken off the screen. */}
        {fieldShown("payment.billTo") ? (
          <RadioCards
            name="bill-to"
            legend={t("plan.payment.billTo")}
            value={plan.billTo}
            onChange={(billTo) => dispatch({ type: "patch", patch: { billTo } })}
            options={[
              { value: "me", label: t("plan.payment.me"), hint: user ? user.email : t("plan.payment.meHint") },
              { value: "other", label: fieldLabel("payment.billTo", t("plan.payment.other")), hint: t("plan.payment.otherHint") },
            ]}
          />
        ) : null}

        {plan.billTo === "other" && fieldShown("payment.billTo") ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="other-first-name" label={t("plan.contact.firstName")} required error={error("otherFirstName")}>
              <input id="other-first-name" className={inputClass} value={plan.other.firstName} onChange={(event) => setOther({ firstName: event.target.value })} {...describedBy("other-first-name", error("otherFirstName"))} />
            </Field>
            <Field id="other-last-name" label={t("plan.contact.lastName")} required error={error("otherLastName")}>
              <input id="other-last-name" className={inputClass} value={plan.other.lastName} onChange={(event) => setOther({ lastName: event.target.value })} {...describedBy("other-last-name", error("otherLastName"))} />
            </Field>
            <Field id="other-email" label={t("plan.payment.otherEmail")} required error={error("otherEmail")}>
              <input id="other-email" type="email" dir="ltr" className={inputClass} value={plan.other.email} onChange={(event) => setOther({ email: event.target.value })} {...describedBy("other-email", error("otherEmail"))} />
            </Field>
            <Field id="other-phone" label={t("plan.contact.phone")} optionalLabel={t("plan.optional")}>
              <input id="other-phone" type="tel" dir="ltr" className={inputClass} value={plan.other.phone} onChange={(event) => setOther({ phone: event.target.value })} />
            </Field>
            <Field id="other-address" label={t("plan.payment.billingAddress")} required error={error("otherAddress")}>
              <input id="other-address" className={inputClass} value={plan.other.address} placeholder={t("plan.payment.billingAddressPlaceholder")} onChange={(event) => setOther({ address: event.target.value })} {...describedBy("other-address", error("otherAddress"))} />
            </Field>
          </div>
        ) : null}
      </Section>

      {fieldShown("payment.method") ? (
      <Section title={fieldLabel("payment.method", t("plan.payment.methodTitle"))} sub={t("plan.payment.methodSub")}>
        <RadioCards
          name="pay-method"
          legend={fieldLabel("payment.method", t("plan.payment.methodTitle"))}
          value={plan.payMethod}
          onChange={(payMethod) => dispatch({ type: "patch", patch: { payMethod } })}
          options={PAY_METHODS.map((method) => ({
            value: method,
            label: t(`plan.pay.${method}`),
            hint: t(`plan.pay.${method}Hint`),
            icon: (
              <span className="text-brand-red">
                <Icon name={PAY_ICON[method]} size={20} />
              </span>
            ),
          }))}
        />
      </Section>
      ) : null}

      <Section title={fieldLabel("payment.terms", t("plan.payment.confirmTitle"))}>
        <Checkbox id="terms" checked={plan.terms} onChange={(terms) => dispatch({ type: "patch", patch: { terms } })} error={error("terms")}>
          {t("plan.payment.termsBefore")}{" "}
          <Link href={`/${locale}/agb`} className="font-semibold text-brand-red underline">
            {t("plan.payment.terms")}
          </Link>{" "}
          {t("plan.payment.and")}{" "}
          <Link href={`/${locale}/datenschutz`} className="font-semibold text-brand-red underline">
            {t("plan.payment.privacy")}
          </Link>
          {t("plan.payment.termsAfter")}
        </Checkbox>
      </Section>

    </div>
  );
}
