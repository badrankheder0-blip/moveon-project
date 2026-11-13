"use client";

import { isStaffRole } from "@mon/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuError, AuField, AuSubmit, AuthCard, FIELD_ICON, nextDestination, useCarriedQuery } from "@/app/components/account/AuthCard";
import { AC } from "@/app/components/account/text";
import { useText } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign in with a six-digit code emailed to the address, in the sign-in card.
 *
 * Two steps in one route: the address typed first is the one the code is
 * checked against, and carrying it through a navigation would put it in the
 * URL. The "code sent" note is conditional, as the API answers the same for
 * every address. `next` is read from `window.location` in the handler, as on
 * the password sign-in.
 */
export default function CodeSignInPage() {
  const { sdk, signInWithCode } = useApi();
  const { locale } = useI18n();
  const tx = useText(AC);
  const router = useRouter();
  const query = useCarriedQuery();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [notDelivered, setNotDelivered] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (stage === "email") {
      const address = email.trim();
      if (!EMAIL.test(address)) return setError(tx("errEmail"));
      setBusy(true);
      try {
        const challenge = await sdk.auth.requestOtp({ email: address });
        // A development server records the mail instead of sending it; say so.
        setNotDelivered(!challenge.delivered);
        setStage("code");
      } catch (caught) {
        const reason = caught instanceof ApiError ? caught.code : "";
        setError(reason === "RATE_LIMITED" ? tx("errRate") : reason === "NETWORK_ERROR" ? tx("errNetwork") : tx("errGeneric"));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (code.length < 6) return setError(tx("otpInvalid"));
    setBusy(true);
    try {
      const signedIn = await signInWithCode(email.trim(), code);
      router.push(nextDestination() ?? `/${locale}${isStaffRole(signedIn.role) ? "/admin" : "/konto"}`);
      router.refresh();
    } catch (caught) {
      setBusy(false);
      const reason = caught instanceof ApiError ? caught.code : "";
      // One message for a wrong, expired or exhausted code: telling them apart would say how close a guess was.
      setError(
        reason === "INVALID_CREDENTIALS" || reason === "VALIDATION_FAILED"
          ? tx("otpInvalid")
          : reason === "ACCOUNT_BLOCKED"
            ? tx("errBlocked")
            : reason === "RATE_LIMITED"
              ? tx("errRate")
              : tx("errGeneric"),
      );
    }
  }

  return (
    <AuthCard tab="login" title={tx("auCode")} sub={tx("otpSub")} onSubmit={(event) => void submit(event)} busy={busy}>
      <AuField
        label={tx("fEmail")}
        icon={FIELD_ICON.email}
        type="email"
        dir="ltr"
        autoComplete="username"
        placeholder="name@email.com"
        value={email}
        readOnly={stage === "code"}
        onChange={(event) => {
          setEmail(event.target.value);
          setError("");
        }}
      />
      {stage === "code" ? (
        <>
          <p className="au-note" role="status">
            {tx("otpSent")}
            {notDelivered ? ` ${tx("otpNotDelivered")}` : ""}
          </p>
          {/* Digits in the order issued even in a right-to-left page; the
              phone offers the code from the notification. */}
          <AuField
            label={tx("otpCode")}
            icon={FIELD_ICON.code}
            className="is-code"
            type="text"
            dir="ltr"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            autoFocus
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
          />
          <div className="au-row">
            <button
              type="button"
              className="au-under"
              onClick={() => {
                setStage("email");
                setCode("");
                setError("");
                setNotDelivered(false);
              }}
            >
              {tx("otpChange")}
            </button>
          </div>
        </>
      ) : null}
      <AuError text={error} />
      <AuSubmit label={stage === "email" ? tx("otpSend") : tx("signIn")} busy={busy} />
      <p className="au-switch">
        <Link href={`/${locale}/login${query}`}>{tx("usePassword")}</Link>
      </p>
    </AuthCard>
  );
}
