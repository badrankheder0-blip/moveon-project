"use client";

import { isStaffRole } from "@mon/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AuError, AuField, AuSubmit, AuthCard, FIELD_ICON, nextDestination, useCarriedQuery } from "@/app/components/account/AuthCard";
import { AC } from "@/app/components/account/text";
import { useText } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Sign in, as the website prototype's #/login draws it.
 *
 * Where the prototype offers its demo account, this offers signing in with an
 * emailed code instead: the real counterpart of "I don't want to type a
 * password", in the same place and style.
 *
 * The `next` destination is read from `window.location` inside the handler,
 * deliberately not with `useSearchParams()`: that hook opts the subtree out of
 * prerendering, and the route would ship an empty shell (no form, no copy) to
 * the server-rendered HTML. The handler runs in the browser after a click, so
 * reading the URL there costs nothing.
 */
export default function LoginPage() {
  const { signIn, user, loading, isStaff } = useApi();
  const { locale } = useI18n();
  const tx = useText(AC);
  const router = useRouter();
  const query = useCarriedQuery();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in: straight on, as the prototype's guard does.
  useEffect(() => {
    if (!loading && user && !busy) router.replace(nextDestination() ?? `/${locale}${isStaff ? "/admin" : "/konto"}`);
  }, [loading, user, isStaff, busy, router, locale]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) return setError(tx("errFill"));

    setBusy(true);
    try {
      const signedIn = await signIn(email.trim(), password);
      // Staff land on the board they work in, customers in their account.
      router.push(nextDestination() ?? `/${locale}${isStaffRole(signedIn.role) ? "/admin" : "/konto"}`);
      router.refresh();
    } catch (caught) {
      setBusy(false);
      // Branching on the machine-readable code, never the message text.
      const code = caught instanceof ApiError ? caught.code : "";
      setError(
        code === "INVALID_CREDENTIALS"
          ? tx("errLogin")
          : code === "EMAIL_NOT_VERIFIED"
            ? tx("errVerify")
            : code === "ACCOUNT_BLOCKED"
              ? tx("errBlocked")
              : code === "RATE_LIMITED"
                ? tx("errRate")
                : code === "NETWORK_ERROR"
                  ? tx("errNetwork")
                  : tx("errGeneric"),
      );
    }
  }

  return (
    <AuthCard tab="login" title={tx("loginTitle")} sub={tx("loginSub")} onSubmit={(event) => void submit(event)} busy={busy}>
      <AuField
        label={tx("fEmail")}
        icon={FIELD_ICON.email}
        type="email"
        dir="ltr"
        autoComplete="username"
        placeholder="name@email.com"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setError("");
        }}
        aria-invalid={Boolean(error) || undefined}
      />
      <AuField
        label={tx("fPass")}
        icon={FIELD_ICON.pass}
        type="password"
        dir="ltr"
        autoComplete="current-password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setError("");
        }}
        aria-invalid={Boolean(error) || undefined}
      />
      <div className="au-row">
        <Link href={`/${locale}/code-anmeldung${query}`} className="au-under">
          {tx("auCode")}
        </Link>
        <Link href={`/${locale}/passwort-vergessen`} className="au-small-link">
          {tx("auForgot")}
        </Link>
      </div>
      <AuError text={error} />
      <AuSubmit label={tx("signIn")} busy={busy} />
      <p className="au-switch">
        {tx("noAcc")} <Link href={`/${locale}/signup${query}`}>{tx("signUp")}</Link>
      </p>
    </AuthCard>
  );
}
