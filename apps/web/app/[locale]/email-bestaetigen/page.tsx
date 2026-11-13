"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { AuError, AuSubmit, AuthCard } from "@/app/components/account/AuthCard";
import { AC } from "@/app/components/account/text";
import { useText } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

type State = "checking" | "done" | "invalid" | "missing";

/**
 * Confirms an email address from the emailed link, in the sign-in card.
 *
 * Runs on arrival: clicking the link was the confirmation. Anonymous, since
 * the link is often opened on a device that never signed in — the token is the
 * proof. A signed-in visitor whose link failed can ask for a new one.
 */
export default function VerifyEmailPage() {
  const { sdk, user } = useApi();
  const { locale } = useI18n();
  const tx = useText(AC);
  const router = useRouter();

  const [state, setState] = useState<State>("checking");
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);

  // The token is single-use and React runs effects twice in development; the
  // second run would report a fresh success as an invalid link.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setState("missing");
      return;
    }
    sdk.auth
      .verifyEmail({ token })
      .then(() => setState("done"))
      .catch(() => setState("invalid"));
  }, [sdk]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (state === "done" || !user || resent) {
      router.push(user ? `/${locale}/konto` : `/${locale}/login`);
      return;
    }
    setBusy(true);
    try {
      await sdk.auth.sendVerification();
      setResent(true);
    } catch (caught) {
      // Already confirmed is what they wanted.
      if (caught instanceof ApiError && caught.code === "CONFLICT") setState("done");
    } finally {
      setBusy(false);
    }
  }

  const failed = state === "invalid" || state === "missing";

  return (
    <AuthCard tab={null} title={tx("verifyTitle")} sub={tx("verifySub")} onSubmit={(event) => void submit(event)} busy={busy}>
      {state === "checking" ? (
        <p className="au-note" role="status">
          {tx("verifyChecking")}
        </p>
      ) : null}
      {state === "done" ? (
        <p className="au-ok" role="status">
          {tx("verifyDone")}
        </p>
      ) : null}
      {failed && !resent ? <AuError text={state === "invalid" ? tx("linkInvalid") : tx("linkMissing")} /> : null}
      {resent ? (
        <p className="au-ok" role="status">
          {tx("verifySent")}
        </p>
      ) : null}
      {state !== "checking" ? (
        <AuSubmit label={!user ? tx("signIn") : state === "done" || resent ? tx("myAccount") : tx("verifyResend")} busy={busy} />
      ) : null}
      <p className="au-switch">
        <Link href={`/${locale}/login`}>{tx("back")}</Link>
      </p>
    </AuthCard>
  );
}
