"use client";

import { PASSWORD_MIN_LENGTH } from "@mon/core";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { flashOnNextPage, useAccountText, useFlash } from "@/app/components/account/AccountShell";
import { accountKeys, useProfile, type Profile } from "@/app/components/account/data";
import { AC } from "@/app/components/account/text";
import { ApiError, useApi } from "@/lib/api";
import { isLocale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

const LANGS = [
  { v: "de", l: "Deutsch" },
  { v: "en", l: "English" },
  { v: "tr", l: "Türkçe" },
  { v: "ar", l: "العربية" },
] as const;

/**
 * Personal details and the password, as the prototype's Profile groups them.
 *
 * The email is the account's identity and stays read-only. Changing the
 * password ends every session (the API's rule), so this one signs straight
 * back in with the new password rather than dropping the customer at the
 * sign-in page on their next click.
 */
export default function AccountProfilePage() {
  const { sdk, user, signIn, refreshUser } = useApi();
  const { locale, setLocale } = useI18n();
  const tx = useAccountText();
  const say = useFlash();
  const queryClient = useQueryClient();
  const profile = useProfile();

  const [pf, setPf] = useState<{ name: string; phone: string; lang: string } | null>(null);
  const [pfErr, setPfErr] = useState("");
  const [pfBusy, setPfBusy] = useState(false);
  const [pw, setPw] = useState({ cur: "", nw: "" });
  const [pwErr, setPwErr] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (profile.data && !pf) setPf({ name: profile.data.fullName, phone: profile.data.phone ?? "", lang: profile.data.locale || locale });
  }, [profile.data, pf, locale]);

  async function savePersonal() {
    if (!pf) return;
    const name = pf.name.trim();
    const phone = pf.phone.trim();
    if (name.length < 2) return setPfErr(tx("errFill"));
    setPfBusy(true);
    setPfErr("");
    try {
      const updated = await sdk.http.patch<Profile>("/api/users/me", {
        fullName: name,
        phone: phone ? phone : null,
        ...(isLocale(pf.lang) ? { locale: pf.lang } : {}),
      });
      queryClient.setQueryData(accountKeys.profile, (previous: Profile | undefined) => (previous ? { ...previous, ...updated } : previous));
      await refreshUser();
      if (isLocale(pf.lang) && pf.lang !== locale) {
        // The page reloads in the new language; the message waits for it.
        flashOnNextPage(AC.pfSaved[pf.lang]);
        setLocale(pf.lang);
        return;
      }
      setPf({ name, phone, lang: pf.lang });
      say(tx("pfSaved"));
    } catch (caught) {
      setPfErr(
        caught instanceof ApiError && caught.code === "VALIDATION_FAILED"
          ? caught.fieldIssues.some((issue) => issue.path.includes("phone"))
            ? `${tx("fPhone")}: ${caught.fieldIssues[0]?.message ?? ""}`
            : tx("errFill")
          : tx("errGeneric"),
      );
    } finally {
      setPfBusy(false);
    }
  }

  async function savePassword() {
    if (!user) return;
    if (pw.nw.length < PASSWORD_MIN_LENGTH) return setPwErr(tx("errPass", { n: PASSWORD_MIN_LENGTH }));
    setPwBusy(true);
    setPwErr("");
    try {
      await sdk.auth.changePassword({ currentPassword: pw.cur, newPassword: pw.nw });
      // Every session ended with the old password, this one included.
      await signIn(user.email, pw.nw).catch(() => undefined);
      setPw({ cur: "", nw: "" });
      say(tx("pwSaved"));
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "INVALID_CREDENTIALS") setPwErr(tx("pwWrong"));
      else if (caught instanceof ApiError && caught.code === "RATE_LIMITED") setPwErr(tx("errRate"));
      else if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED") setPwErr(caught.fieldIssues[0]?.message ?? tx("errPass", { n: PASSWORD_MIN_LENGTH }));
      else setPwErr(tx("errGeneric"));
    } finally {
      setPwBusy(false);
    }
  }

  if (profile.isLoading || !pf) {
    return (
      <>
        <h1 className="ac-h1">{tx("profile")}</h1>
        <div className="ac-skel" style={{ height: 300 }} />
      </>
    );
  }

  return (
    <>
      <h1 className="ac-h1">{tx("profile")}</h1>

      <form
        className="ac-pf"
        data-rv="1"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void savePersonal();
        }}
      >
        <div className="ac-pf-head is-wide">
          <b className="ac-panel-title">{tx("pfPersonal")}</b>
          <small>{tx("pfPersonalSub")}</small>
        </div>
        <label className="ac-fl">
          {tx("fName")}
          <input dir="auto" autoComplete="name" value={pf.name} onChange={(event) => setPf({ ...pf, name: event.target.value })} />
        </label>
        <label className="ac-fl">
          {tx("fPhone")}
          <input type="tel" dir="ltr" autoComplete="tel" value={pf.phone} onChange={(event) => setPf({ ...pf, phone: event.target.value })} />
        </label>
        <label className="ac-fl">
          {tx("fEmail")}
          <input type="email" dir="ltr" readOnly value={profile.data?.email ?? user?.email ?? ""} />
        </label>
        <label className="ac-fl">
          {tx("pfLang")}
          <select value={pf.lang} onChange={(event) => setPf({ ...pf, lang: event.target.value })}>
            {LANGS.map((lang) => (
              <option key={lang.v} value={lang.v}>
                {lang.l}
              </option>
            ))}
          </select>
        </label>
        {pfErr ? <p className="ac-err is-wide">{pfErr}</p> : null}
        <div className="is-wide">
          <button type="submit" className="ac-pf-btn" disabled={pfBusy}>
            {tx("pfSave")}
          </button>
        </div>
      </form>

      <form
        className="ac-pf"
        data-rv="2"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void savePassword();
        }}
      >
        <div className="ac-pf-head is-wide">
          <b className="ac-panel-title">{tx("pwTitle")}</b>
          <small>{tx("pwSub")}</small>
        </div>
        {/* For password managers: the account the passwords belong to. */}
        <input type="text" autoComplete="username" value={user?.email ?? ""} readOnly hidden />
        <label className="ac-fl">
          {tx("pwCur")}
          <input type="password" dir="ltr" autoComplete="current-password" value={pw.cur} onChange={(event) => setPw({ ...pw, cur: event.target.value })} />
        </label>
        <label className="ac-fl">
          {tx("pwNew")}
          <input type="password" dir="ltr" autoComplete="new-password" value={pw.nw} onChange={(event) => setPw({ ...pw, nw: event.target.value })} />
        </label>
        {pwErr ? <p className="ac-err is-wide">{pwErr}</p> : null}
        <div className="is-wide">
          <button type="submit" className="ac-pf-btn" disabled={pwBusy}>
            {tx("pwBtn")}
          </button>
        </div>
      </form>
    </>
  );
}
