"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AuError, AuField, AuSubmit, AuthCard, FIELD_ICON } from "@/app/components/account/AuthCard";
import { AC } from "@/app/components/account/text";
import { useText } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Ask for a reset link, as the prototype's #/forgot draws it. Where the
 * prototype's grey note says the team resets passwords by hand, this one says
 * a link is on its way — conditionally: the API answers the same for an
 * address with and without an account, so the page never confirms which
 * addresses are registered.
 */
export default function ForgotPasswordPage() {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const tx = useText(AC);

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const address = email.trim();
    if (!address) return setError(tx("errFill"));
    if (!EMAIL.test(address)) return setError(tx("errEmail"));

    setBusy(true);
    try {
      await sdk.auth.requestPasswordReset({ email: address });
      setSent(true);
    } catch (caught) {
      // Only a rate limit or an unreachable API lands here: an unknown address is a success by design.
      const code = caught instanceof ApiError ? caught.code : "";
      setError(code === "RATE_LIMITED" ? tx("errRate") : code === "NETWORK_ERROR" ? tx("errNetwork") : tx("errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard tab="login" title={tx("forgotTitle")} sub={tx("forgotSub")} onSubmit={(event) => void submit(event)} busy={busy}>
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
          setSent(false);
        }}
      />
      {sent ? (
        <p className="au-note" role="status">
          {tx("forgotSent")}
        </p>
      ) : null}
      <AuError text={error} />
      <AuSubmit label={sent ? tx("sendAgain") : tx("send")} busy={busy} />
      <p className="au-switch">
        <Link href={`/${locale}/login`}>{tx("back")}</Link>
      </p>
    </AuthCard>
  );
}
