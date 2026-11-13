"use client";

import { PASSWORD_MIN_LENGTH } from "@mon/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AuError, AuField, AuSubmit, AuthCard, FIELD_ICON, nextDestination, useCarriedQuery } from "@/app/components/account/AuthCard";
import { Icon } from "@/app/components/account/Icon";
import { IC } from "@/app/components/account/model";
import { AC } from "@/app/components/account/text";
import { useText } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Create an account, as the prototype's #/signup draws it: name, email,
 * phone and password, and the terms box.
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

  const [form, setForm] = useState({ name: "", email: "", phone: "", pass: "" });
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
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    const problem =
      !name || !email || !form.pass
        ? tx("errFill")
        : !EMAIL.test(email)
          ? tx("errEmail")
          : form.pass.length < PASSWORD_MIN_LENGTH
            ? tx("errPass", { n: PASSWORD_MIN_LENGTH })
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
        ...(phone ? { phone } : {}),
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
              : path.includes("phone")
                ? `${tx("fPhone")}: ${caught.fieldIssues[0]?.message ?? ""}`
                : tx("errFill"),
        );
      }
      setError(tx("errGeneric"));
    }
  }

  return (
    <AuthCard tab="signup" title={tx("signupTitle")} sub={tx("signupSub")} onSubmit={(event) => void submit(event)} busy={busy}>
      <AuField label={tx("fName")} icon={FIELD_ICON.name} type="text" dir="auto" autoComplete="name" value={form.name} onChange={(event) => set("name")(event.target.value)} />
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
      <AuField label={tx("fPhone")} icon={FIELD_ICON.phone} type="tel" dir="ltr" autoComplete="tel" value={form.phone} onChange={(event) => set("phone")(event.target.value)} />
      <AuField
        label={tx("fPassNew", { n: PASSWORD_MIN_LENGTH })}
        icon={FIELD_ICON.pass}
        type="password"
        dir="ltr"
        autoComplete="new-password"
        value={form.pass}
        onChange={(event) => set("pass")(event.target.value)}
      />
      <button
        type="button"
        role="checkbox"
        aria-checked={terms}
        className="au-terms"
        onClick={() => {
          setTerms((value) => !value);
          setError("");
        }}
      >
        <span className="au-check">
          <Icon d={IC.check} size={11} sw={3.4} />
        </span>
        {tx("auTerms")}
      </button>
      <AuError text={error} />
      <AuSubmit label={tx("signUp")} busy={busy} />
      <p className="au-switch">
        {tx("hasAcc")} <Link href={`/${locale}/login${query}`}>{tx("signIn")}</Link>
      </p>
    </AuthCard>
  );
}
