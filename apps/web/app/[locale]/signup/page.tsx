"use client";

import { PASSWORD_MIN_LENGTH } from "@mon/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AuError, AuField, AuSubmit, AuthCard, FIELD_ICON, nextDestination, useCarriedQuery } from "@/app/components/account/AuthCard";
import { TermsDialog, type TermsDoc } from "@/app/components/account/TermsDialog";
import { Icon } from "@/app/components/account/Icon";
import { IC } from "@/app/components/account/model";
import { AC } from "@/app/components/account/text";
import { useText } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Create an account: first and last name, the email twice, the password
 * twice, and the terms box. No phone (the site has no phone contact). The
 * terms line is red, and "AGB" / "Datenschutzerklärung" open the document in
 * a popup (TermsDialog), so it can be read without leaving the form.
 *
 * A quote priced before signing up (`?quote=`) is attached to the new account
 * and the visitor goes straight back to it, so nothing is retyped.
 */
export default function SignupPage() {
  const { signUp, user, loading, isStaff } = useApi();
  const { locale } = useI18n();
  const tx = useText(AC);
  const router = useRouter();
  const query = useCarriedQuery();

  const [form, setForm] = useState({ first: "", last: "", email: "", email2: "", pass: "", pass2: "" });
  const [doc, setDoc] = useState<TermsDoc | null>(null);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && !busy) router.replace(nextDestination() ?? `/${locale}${isStaff ? "/admin" : "/konto"}`);
  }, [loading, user, isStaff, busy, router, locale]);

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const first = form.first.trim();
    const last = form.last.trim();
    const name = `${first} ${last}`;
    const email = form.email.trim().toLowerCase();
    const email2 = form.email2.trim().toLowerCase();

    const problem =
      !first || !last || !email || !email2 || !form.pass || !form.pass2
        ? tx("errFill")
        : !EMAIL.test(email)
          ? tx("errEmail")
          : email !== email2
            ? tx("errEmailMismatch")
            : form.pass.length < PASSWORD_MIN_LENGTH
              ? tx("errPass", { n: PASSWORD_MIN_LENGTH })
              : form.pass !== form.pass2
                ? tx("errMismatch")
                : !terms
                  ? tx("errTerms")
                  : "";
    if (problem) return setError(problem);

    const quoteId = new URLSearchParams(window.location.search).get("quote") ?? undefined;

    setBusy(true);
    try {
      await signUp({
        fullName: name,
        email,
        password: form.pass,
        locale,
        ...(quoteId ? { quoteId } : {}),
      });
      router.push(quoteId ? `/${locale}?quote=${encodeURIComponent(quoteId)}` : (nextDestination() ?? `/${locale}/konto`));
      router.refresh();
    } catch (caught) {
      setBusy(false);
      if (!(caught instanceof ApiError)) return setError(tx("errGeneric"));
      if (caught.code === "EMAIL_TAKEN") return setError(tx("errDup"));
      if (caught.code === "RATE_LIMITED") return setError(tx("errRate"));
      if (caught.code === "NETWORK_ERROR") return setError(tx("errNetwork"));
      if (caught.code === "VALIDATION_FAILED") {
        const path = caught.fieldIssues[0]?.path ?? "";
        return setError(
          path.includes("password")
            ? tx("errPass", { n: PASSWORD_MIN_LENGTH })
            : path.includes("email")
              ? tx("errEmail")
              : tx("errFill"),
        );
      }
      setError(tx("errGeneric"));
    }
  }

  return (
    <AuthCard tab="signup" title={tx("signupTitle")} sub={tx("signupSub")} onSubmit={(event) => void submit(event)} busy={busy}>
      <div className="au-pair">
        <AuField label={tx("fFirstName")} icon={FIELD_ICON.name} type="text" dir="auto" autoComplete="given-name" value={form.first} onChange={(event) => set("first")(event.target.value)} />
        <AuField label={tx("fLastName")} icon={FIELD_ICON.name} type="text" dir="auto" autoComplete="family-name" value={form.last} onChange={(event) => set("last")(event.target.value)} />
      </div>
      <AuField
        label={tx("fEmail")}
        icon={FIELD_ICON.email}
        type="email"
        dir="ltr"
        autoComplete="username"
        placeholder="name@email.com"
        value={form.email}
        onChange={(event) => set("email")(event.target.value)}
      />
      <AuField
        label={tx("fEmailRepeat")}
        icon={FIELD_ICON.email}
        type="email"
        dir="ltr"
        autoComplete="off"
        placeholder="name@email.com"
        value={form.email2}
        onChange={(event) => set("email2")(event.target.value)}
        onPaste={(event) => event.preventDefault()}
      />
      <AuField
        label={tx("fPassNew", { n: PASSWORD_MIN_LENGTH })}
        icon={FIELD_ICON.pass}
        type="password"
        dir="ltr"
        autoComplete="new-password"
        value={form.pass}
        onChange={(event) => set("pass")(event.target.value)}
      />
      <AuField
        label={tx("fPassRepeat")}
        icon={FIELD_ICON.pass}
        type="password"
        dir="ltr"
        autoComplete="new-password"
        value={form.pass2}
        onChange={(event) => set("pass2")(event.target.value)}
      />
      <div className="au-terms is-red">
        <button
          type="button"
          role="checkbox"
          aria-checked={terms}
          aria-label={tx("auTerms")}
          className="au-check-btn"
          onClick={() => {
            setTerms((value) => !value);
            setError("");
          }}
        >
          <span className="au-check">
            <Icon d={IC.check} size={11} sw={3.4} />
          </span>
        </button>
        <span>
          {tx("auTermsPre")}
          <button type="button" className="au-terms-link" onClick={() => setDoc("page-terms")}>
            {tx("auTermsAgb")}
          </button>
          {tx("auTermsMid")}
          <button type="button" className="au-terms-link" onClick={() => setDoc("page-privacy")}>
            {tx("auTermsPrivacy")}
          </button>
          {tx("auTermsPost")}
        </span>
      </div>
      {doc ? <TermsDialog section={doc} locale={locale} onClose={() => setDoc(null)} /> : null}
      <AuError text={error} />
      <AuSubmit label={tx("signUp")} busy={busy} />
      <p className="au-switch">
        {tx("hasAcc")} <Link href={`/${locale}/login${query}`}>{tx("signIn")}</Link>
      </p>
    </AuthCard>
  );
}
