"use client";

import { PASSWORD_MIN_LENGTH } from "@mon/core";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { flashOnNextPage, useAccountText, useFlash } from "@/app/components/account/AccountShell";
import { accountKeys, useProfile, type Profile } from "@/app/components/account/data";
import { initials } from "@/app/components/account/model";
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

/** The photo's side in pixels once squared: sharp at the sidebar's and the profile's sizes. */
const AVATAR_SIDE = 256;

/**
 * The chosen picture, cropped to its centre square and shrunk to a JPEG data
 * URL, so the API stores a few dozen KB whatever the camera made.
 */
function squarePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      if (!side) return reject(new Error("empty"));
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_SIDE;
      canvas.height = AVATAR_SIDE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, AVATAR_SIDE, AVATAR_SIDE);
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, AVATAR_SIDE, AVATAR_SIDE);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

interface PersonalForm {
  first: string;
  last: string;
  phone: string;
  lang: string;
  street: string;
  houseNumber: string;
  zip: string;
  city: string;
  type: "private" | "business";
  company: string;
  taxNo: string;
}

function formOf(profile: Profile, locale: string): PersonalForm {
  const address = profile.profileAddress;
  return {
    first: profile.firstName ?? "",
    last: profile.lastName ?? "",
    phone: profile.phone ?? "",
    lang: profile.locale || locale,
    street: address?.street ?? "",
    houseNumber: address?.houseNumber ?? "",
    zip: address?.zip ?? "",
    city: address?.city ?? "",
    type: profile.customerType ?? "private",
    company: profile.companyName ?? "",
    taxNo: profile.taxNumber ?? "",
  };
}

/**
 * The photo, personal details with the address, and the password, as the prototype's Profile groups them.
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

  const [pf, setPf] = useState<PersonalForm | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [pfErr, setPfErr] = useState("");
  const [pfBusy, setPfBusy] = useState(false);
  const [pw, setPw] = useState({ cur: "", nw: "" });
  const [pwErr, setPwErr] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (profile.data && !pf) setPf(formOf(profile.data, locale));
  }, [profile.data, pf, locale]);

  function keep(updated: Profile) {
    queryClient.setQueryData(accountKeys.profile, (previous: Profile | undefined) => (previous ? { ...previous, ...updated } : updated));
  }

  async function savePhoto(avatar: string | null) {
    setPhotoBusy(true);
    setPhotoErr("");
    try {
      keep(await sdk.http.patch<Profile>("/api/users/me", { avatar }));
      say(tx(avatar ? "pfPhotoSaved" : "pfPhotoRemoved"));
    } catch {
      setPhotoErr(avatar ? tx("pfPhotoErr") : tx("errGeneric"));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!/^image\//.test(file.type)) return setPhotoErr(tx("pfPhotoErr"));
    let photo: string;
    try {
      photo = await squarePhoto(file);
    } catch {
      return setPhotoErr(tx("pfPhotoErr"));
    }
    await savePhoto(photo);
  }

  async function savePersonal() {
    if (!pf) return;
    const first = pf.first.trim();
    const last = pf.last.trim();
    const phone = pf.phone.trim();
    const address = { street: pf.street.trim(), houseNumber: pf.houseNumber.trim(), zip: pf.zip.trim(), city: pf.city.trim() };
    const filled = Object.values(address).filter(Boolean).length;
    if (!first || !last) return setPfErr(tx("errFill"));
    if (filled > 0 && filled < 4) return setPfErr(tx("pfAddrErr"));
    const business = pf.type === "business";
    const company = pf.company.trim();
    const taxNo = pf.taxNo.trim();
    if (business && (!company || !taxNo)) return setPfErr(tx("pfCompanyErr"));
    setPfBusy(true);
    setPfErr("");
    try {
      const updated = await sdk.http.patch<Profile>("/api/users/me", {
        firstName: first,
        lastName: last,
        phone: phone ? phone : null,
        profileAddress: filled ? address : null,
        customerType: pf.type,
        ...(business ? { companyName: company, taxNumber: taxNo } : {}),
        ...(isLocale(pf.lang) ? { locale: pf.lang } : {}),
      });
      keep(updated);
      await refreshUser();
      if (isLocale(pf.lang) && pf.lang !== locale) {
        // The page reloads in the new language; the message waits for it.
        flashOnNextPage(AC.pfSaved[pf.lang]);
        setLocale(pf.lang);
        return;
      }
      setPf({ first, last, phone, lang: pf.lang, ...address, type: pf.type, company: business ? company : "", taxNo: business ? taxNo : "" });
      say(tx("pfSaved"));
    } catch (caught) {
      setPfErr(
        caught instanceof ApiError && caught.code === "VALIDATION_FAILED"
          ? caught.fieldIssues.some((issue) => issue.path.includes("phone"))
            ? `${tx("fPhone")}: ${caught.fieldIssues[0]?.message ?? ""}`
            : caught.fieldIssues.some((issue) => issue.path.includes("taxNumber"))
              ? tx("pfTaxErr")
              : tx("errFill")
          : caught instanceof ApiError && caught.status === 422
            ? tx("pfCompanyErr")
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
        <div className="ac-pf-photo is-wide">
          <span className="ac-pf-av" aria-hidden="true">
            {profile.data?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.data.avatar} alt="" />
            ) : (
              initials(`${pf.first} ${pf.last}`.trim() || profile.data?.email || "")
            )}
          </span>
          <span className="ac-pf-photo-t">
            <b>{tx("pfPhoto")}</b>
            <span className="ac-pf-photo-btns">
              <button type="button" className="ac-pf-ghost is-red" disabled={photoBusy} onClick={() => fileRef.current?.click()}>
                {tx(profile.data?.avatar ? "pfPhotoChange" : "pfPhotoUp")}
              </button>
              {profile.data?.avatar ? (
                <button type="button" className="ac-pf-ghost" disabled={photoBusy} onClick={() => void savePhoto(null)}>
                  {tx("pfPhotoDel")}
                </button>
              ) : null}
            </span>
            <small>{tx("pfPhotoHint")}</small>
            {photoErr ? <small className="ac-err">{photoErr}</small> : null}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void pickPhoto(file);
            }}
          />
        </div>
        <div className="ac-fl is-wide">
          <span id="pf-type">{tx("pfType")}</span>
          <div className="ac-seg" role="group" aria-labelledby="pf-type" style={{ alignSelf: "flex-start" }}>
            {(["private", "business"] as const).map((type) => (
              <button key={type} type="button" aria-pressed={pf.type === type} onClick={() => setPf({ ...pf, type })}>
                {tx(type === "private" ? "pfPrivate" : "pfBusiness")}
              </button>
            ))}
          </div>
        </div>
        {pf.type === "business" ? (
          <>
            <label className="ac-fl">
              {tx("pfCompany")}
              <input dir="auto" autoComplete="organization" value={pf.company} onChange={(event) => setPf({ ...pf, company: event.target.value })} />
            </label>
            <label className="ac-fl">
              {tx("pfTaxNo")}
              <input dir="ltr" autoComplete="off" placeholder="12/345/67890 · DE123456789" value={pf.taxNo} onChange={(event) => setPf({ ...pf, taxNo: event.target.value })} />
            </label>
          </>
        ) : null}
        <label className="ac-fl">
          {tx("fFirstName")}
          <input dir="auto" autoComplete="given-name" value={pf.first} onChange={(event) => setPf({ ...pf, first: event.target.value })} />
        </label>
        <label className="ac-fl">
          {tx("fLastName")}
          <input dir="auto" autoComplete="family-name" value={pf.last} onChange={(event) => setPf({ ...pf, last: event.target.value })} />
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
        <div className="ac-pf-sub is-wide">
          <b>{tx("pfAddr")}</b>
          <small>{tx("pfAddrSub")}</small>
        </div>
        <label className="ac-fl">
          {tx("pfStreet")}
          <input dir="auto" autoComplete="address-line1" value={pf.street} onChange={(event) => setPf({ ...pf, street: event.target.value })} />
        </label>
        <label className="ac-fl">
          {tx("pfHouseNo")}
          <input dir="auto" autoComplete="address-line2" value={pf.houseNumber} onChange={(event) => setPf({ ...pf, houseNumber: event.target.value })} />
        </label>
        <label className="ac-fl">
          {tx("adCity")}
          <input dir="auto" autoComplete="address-level2" value={pf.city} onChange={(event) => setPf({ ...pf, city: event.target.value })} />
        </label>
        <label className="ac-fl">
          {tx("adZip")}
          <input dir="ltr" inputMode="numeric" autoComplete="postal-code" value={pf.zip} onChange={(event) => setPf({ ...pf, zip: event.target.value })} />
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
