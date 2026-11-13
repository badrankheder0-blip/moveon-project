"use client";

import { PASSWORD_MIN_LENGTH } from "@mon/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AuError, AuField, AuSubmit, AuthCard, FIELD_ICON } from "@/app/components/account/AuthCard";
import { AC } from "@/app/components/account/text";
import { useText } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Set a new password from the emailed link, in the sign-in card.
 *
 * The token is read from the URL after mount rather than with
 * `useSearchParams()`, so the page still renders on the server. No session is
 * issued on success: whoever completed this proved control of the mailbox,
 * not of the account, so they sign in with the new password (the API takes
 * the same position).
 */
export default function ResetPasswordPage() {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const tx = useText(AC);
  const router = useRouter();

  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setToken(new URLSearchParams(window.location.search).get("token")), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (done) {
      router.push(`/${locale}/login`);
      return;
    }
    if (!token) return setError(tx("linkMissing"));
    if (password.length < PASSWORD_MIN_LENGTH) return setError(tx("errPass", { n: PASSWORD_MIN_LENGTH }));
    // Checked here too, so a mistyped repeat does not spend a rate-limited attempt.
    if (password !== repeat) return setError(tx("errMismatch"));

    setBusy(true);
    try {
      await sdk.auth.confirmPasswordReset({ token, newPassword: password });
      setDone(true);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : "";
      // One message for an unknown, used or expired token: telling them apart would say whether one existed.
      setError(
        code === "INVALID_INPUT"
          ? tx("linkInvalid")
          : code === "VALIDATION_FAILED"
            ? tx("errPass", { n: PASSWORD_MIN_LENGTH })
            : code === "RATE_LIMITED"
              ? tx("errRate")
              : tx("errGeneric"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard tab="login" title={tx("resetTitle")} sub={tx("resetSub")} onSubmit={(event) => void submit(event)} busy={busy}>
      {done ? (
        <p className="au-ok" role="status">
          {tx("resetDone")}
        </p>
      ) : (
        <>
          {token === null ? <AuError text={tx("linkMissing")} /> : null}
          <AuField
            label={tx("fPassNew", { n: PASSWORD_MIN_LENGTH })}
            icon={FIELD_ICON.pass}
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
          />
          <AuField
            label={tx("fPassRepeat")}
            icon={FIELD_ICON.pass}
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={repeat}
            onChange={(event) => {
              setRepeat(event.target.value);
              setError("");
            }}
          />
        </>
      )}
      <AuError text={error} />
      <AuSubmit label={done ? tx("signIn") : tx("resetBtn")} busy={busy || token === null} />
      <p className="au-switch">
        <Link href={`/${locale}/login`}>{tx("back")}</Link>
      </p>
    </AuthCard>
  );
}
