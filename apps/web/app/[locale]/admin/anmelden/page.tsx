"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { rememberSignIn } from "@/lib/admin/session";
import { defineText, useText } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";
import { LOCALE_META, LOCALES } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { useSiteSettings } from "@/lib/site/useSiteSettings";

/**
 * The dashboard's own sign-in, as the admin prototype draws it: a photo
 * panel with the lockup and "Every move. All planned out." beside a form of
 * 56px fields, Caps Lock warning, show/hide password, "Keep me signed in"
 * and "Forgot password?".
 *
 * Customers keep signing in on the website's /login; this is for the office.
 * "Keep me signed in" unticked ends the session when the browser closes
 * (lib/admin/session).
 */

const TEXT = defineText({
  lgPanel: { de: "M.ON ADMIN", en: "M.ON ADMIN", ar: "لوحة M.ON", tr: "M.ON YÖNETİM" },
  lgHead1: { de: "Jeder Umzug.", en: "Every move.", ar: "كل نقلة.", tr: "Her taşınma." },
  lgHead2: { de: "Komplett geplant.", en: "All planned out.", ar: "مخطّطة بالكامل.", tr: "Tamamen planlı." },
  lgFoot: {
    de: "Buchungen, Teams, Preise und Ihre Website an einem Ort.",
    en: "Bookings, crews, prices and your website in one place.",
    ar: "الحجوزات والفرق والأسعار وموقعك في مكان واحد.",
    tr: "Rezervasyonlar, ekipler, fiyatlar ve web siteniz tek yerde.",
  },
  lgWelcome: { de: "Willkommen zurück", en: "Welcome back", ar: "أهلاً بعودتك", tr: "Tekrar hoş geldiniz" },
  lgSub: {
    de: "Melden Sie sich an, um Buchungen, Preise und Ihre Website zu verwalten.",
    en: "Sign in to manage bookings, prices and your website.",
    ar: "سجّل الدخول لإدارة الحجوزات والأسعار وموقعك.",
    tr: "Rezervasyonları, fiyatları ve web sitenizi yönetmek için giriş yapın.",
  },
  lgEmail: { de: "E-Mail", en: "Email", ar: "البريد الإلكتروني", tr: "E-posta" },
  lgPass: { de: "Passwort", en: "Password", ar: "كلمة المرور", tr: "Şifre" },
  lgRemember: { de: "Angemeldet bleiben", en: "Keep me signed in", ar: "تذكّرني", tr: "Oturumum açık kalsın" },
  lgForgot: { de: "Passwort vergessen?", en: "Forgot password?", ar: "نسيت كلمة المرور؟", tr: "Şifremi unuttum?" },
  lgForgotNote: {
    de: "Bitten Sie den Inhaber des Kontos, Ihnen in der Benutzerverwaltung ein neues Passwort zu setzen.",
    en: "Ask the account owner to set a new password for you in User management.",
    ar: "اطلب من مالك الحساب تعيين كلمة مرور جديدة لك من إدارة المستخدمين.",
    tr: "Hesap sahibinden Kullanıcı yönetiminde size yeni bir şifre belirlemesini isteyin.",
  },
  lgBtn: { de: "Anmelden", en: "Sign in", ar: "تسجيل الدخول", tr: "Giriş yap" },
  lgBusy: { de: "Anmeldung läuft…", en: "Signing in…", ar: "جارٍ الدخول…", tr: "Giriş yapılıyor…" },
  lgWrong: { de: "E-Mail oder Passwort ist falsch.", en: "The email or password is incorrect.", ar: "البريد أو كلمة المرور غير صحيحة.", tr: "E-posta veya şifre yanlış." },
  lgDisabled: {
    de: "Dieses Konto ist ausgeschaltet. Wenden Sie sich an den Inhaber.",
    en: "This account is turned off. Contact the account owner.",
    ar: "هذا الحساب موقوف. تواصل مع مالك الحساب.",
    tr: "Bu hesap kapatıldı. Hesap sahibiyle iletişime geçin.",
  },
  lgMissing: { de: "Geben Sie E-Mail und Passwort ein.", en: "Enter your email and password.", ar: "أدخل البريد وكلمة المرور.", tr: "E-posta ve şifrenizi girin." },
  lgNotStaff: {
    de: "Dieses Konto hat keinen Zugang zum Dashboard.",
    en: "This account has no access to the dashboard.",
    ar: "هذا الحساب لا يملك صلاحية الدخول إلى لوحة التحكم.",
    tr: "Bu hesabın panele erişimi yok.",
  },
  lgTooMany: {
    de: "Zu viele Versuche. Bitte warten Sie ein paar Minuten.",
    en: "Too many attempts. Please wait a few minutes.",
    ar: "محاولات كثيرة. انتظر بضع دقائق من فضلك.",
    tr: "Çok fazla deneme. Lütfen birkaç dakika bekleyin.",
  },
  lgFailed: { de: "Die Anmeldung ist fehlgeschlagen.", en: "Signing in failed.", ar: "تعذّر تسجيل الدخول.", tr: "Giriş başarısız oldu." },
  lgCaps: { de: "Feststelltaste ist an", en: "Caps Lock is on", ar: "زر الأحرف الكبيرة مفعّل", tr: "Caps Lock açık" },
  lgShow: { de: "Passwort anzeigen", en: "Show password", ar: "إظهار كلمة المرور", tr: "Şifreyi göster" },
  lgHide: { de: "Passwort verbergen", en: "Hide password", ar: "إخفاء كلمة المرور", tr: "Şifreyi gizle" },
  language: { de: "Sprache", en: "Language", ar: "اللغة", tr: "Dil" },
});

const EYE_ON = "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z";
const EYE_OFF =
  "M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7c1.9 0 3.6-.6 5-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2";

const field: React.CSSProperties = {
  width: "100%",
  height: 56,
  paddingInline: "48px 16px",
  border: "1.5px solid #eceee9",
  borderRadius: 14,
  background: "#f4f5f2",
  fontSize: 15,
  fontWeight: 500,
  color: "#1d2220",
  outline: "none",
  transition: "background .18s,border-color .18s,box-shadow .18s",
  textAlign: "start",
};

export default function AdminSignInPage() {
  const { signIn, signOut, user, loading, isStaff } = useApi();
  const { locale, setLocale } = useI18n();
  const site = useSiteSettings();
  const tx = useText(TEXT);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [remember, setRemember] = useState(true);
  const [forgot, setForgot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [langOpen, setLangOpen] = useState(false);

  const rtl = LOCALE_META[locale].dir === "rtl";

  /** Where they were going, read when needed (as /login does) so the page still prerenders. */
  function target(): string {
    const next = new URLSearchParams(window.location.search).get("next");
    return next && next.startsWith(`/${locale}/admin`) && !next.startsWith(`/${locale}/admin/anmelden`) ? next : `/${locale}/admin`;
  }

  // Already signed in as staff: straight through.
  useEffect(() => {
    if (!loading && user && isStaff) router.replace(target());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, isStaff, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError(tx("lgMissing"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const signedIn = await signIn(email.trim(), password);
      if (signedIn.role === "customer") {
        await signOut();
        setError(tx("lgNotStaff"));
        return;
      }
      rememberSignIn(remember);
      router.replace(target());
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "ACCOUNT_BLOCKED") setError(tx("lgDisabled"));
      else if (caught instanceof ApiError && caught.status === 429) setError(tx("lgTooMany"));
      else if (caught instanceof ApiError && (caught.status === 401 || caught.code === "INVALID_CREDENTIALS")) setError(tx("lgWrong"));
      else setError(tx("lgFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm a-login" dir={rtl ? "rtl" : "ltr"}>
      <div className="a-login-brand">
        <img src="/images/mon/photos/admin-login.webp" alt="" aria-hidden="true" className="a-login-photo" />
        <div aria-hidden="true" className="a-login-shade" />
        <div aria-hidden="true" className="a-login-stripe" />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", padding: "10px 16px", borderRadius: 14, background: "#ffffff", boxShadow: "0 12px 32px #00000033" }}>
            <img src={site.logo} alt="m.on" style={{ display: "block", height: 32, width: "auto" }} />
          </span>
          <div style={{ position: "relative" }}>
            <button type="button" className="a-login-lang" aria-haspopup="true" aria-expanded={langOpen} aria-label={tx("language")} onClick={() => setLangOpen((open) => !open)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <circle cx="12" cy="12" r="9.5" />
                <path d="M2.5 12h19M12 2.5c2.6 2.8 3.9 6 3.9 9.5s-1.3 6.7-3.9 9.5c-2.6-2.8-3.9-6-3.9-9.5s1.3-6.7 3.9-9.5z" />
              </svg>
              {LOCALE_META[locale].label}
            </button>
            {langOpen ? (
              <div className="a-lang-list" style={{ color: "var(--a-ink)" }}>
                {LOCALES.map((code) => (
                  <button key={code} type="button" lang={code} aria-current={code === locale} onClick={() => setLocale(code)}>
                    <span>{LOCALE_META[code].label}</span>
                    <small style={{ fontSize: 10.5, fontWeight: 700, color: "var(--a-muted2)" }}>{code.toUpperCase()}</small>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div style={{ position: "relative", maxWidth: 540, display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 11, fontWeight: 700, letterSpacing: rtl ? 0 : "1.5px" }}>
            <span style={{ width: 26, height: 3, borderRadius: 2, background: "#ffcb08" }} />
            {tx("lgPanel")}
          </span>
          <h2 style={{ fontFamily: "'Outfit','IBM Plex Sans Arabic',sans-serif", fontSize: "clamp(38px,4.6vw,68px)", fontWeight: 700, color: "#ffffff", lineHeight: 1.04, letterSpacing: rtl ? 0 : "-0.035em" }}>
            <span style={{ display: "block" }}>{tx("lgHead1")}</span>
            <span style={{ display: "block" }}>{tx("lgHead2")}</span>
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.6, maxWidth: 400, color: "#ffffffe0" }}>{tx("lgFoot")}</p>
        </div>
      </div>

      <div className="a-login-side">
        <form onSubmit={(event) => void submit(event)} noValidate style={{ position: "relative", width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            <h1 style={{ fontFamily: "'Outfit','IBM Plex Sans Arabic',sans-serif", fontSize: 36, fontWeight: 700, letterSpacing: rtl ? 0 : "-0.035em", lineHeight: 1.1, color: "#1d2220" }}>
              {tx("lgWelcome")}
            </h1>
            <p style={{ color: "#5b625e", fontSize: 14, lineHeight: 1.55, textWrap: "pretty" }}>{tx("lgSub")}</p>
          </div>

          <label className="a-login-label">
            {tx("lgEmail")}
            <span style={{ position: "relative", display: "block" }}>
              <svg className="a-login-ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#92958e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2.5" />
                <path d="M3.5 6.5 12 13l8.5-6.5" />
              </svg>
              <input
                className="a-login-input"
                dir="ltr"
                type="email"
                value={email}
                autoComplete="username"
                placeholder="name@m-on.de"
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                style={field}
              />
            </span>
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#252b28" }}>{tx("lgPass")}</span>
              {caps ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 999, background: "#fff7d6", color: "#7a5a00", fontSize: 11, fontWeight: 650 }}>
                  {tx("lgCaps")}
                </span>
              ) : null}
            </div>
            <span style={{ position: "relative", display: "block" }}>
              <svg className="a-login-ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#92958e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="10" width="16" height="11" rx="2.5" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              <input
                className="a-login-input"
                dir="ltr"
                type={show ? "text" : "password"}
                value={password}
                autoComplete="current-password"
                aria-label={tx("lgPass")}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                onKeyUp={(event) => setCaps(event.getModifierState?.("CapsLock") ?? false)}
                style={{ ...field, paddingInline: "48px 54px" }}
              />
              <button type="button" className="a-login-eye" aria-label={show ? tx("lgHide") : tx("lgShow")} title={show ? tx("lgHide") : tx("lgShow")} onClick={() => setShow((value) => !value)}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={show ? EYE_OFF : EYE_ON} />
                </svg>
              </button>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <button type="button" role="checkbox" aria-checked={remember} onClick={() => setRemember((value) => !value)} style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "4px 0", border: 0, background: "transparent", color: "#252b28", fontSize: 13, fontWeight: 550 }}>
              <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${remember ? "#d71635" : "#cfd3cb"}`, background: remember ? "#d71635" : "#ffffff", display: "grid", placeItems: "center", color: "#ffffff" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </span>
              {tx("lgRemember")}
            </button>
            <button type="button" onClick={() => setForgot((value) => !value)} style={{ padding: "4px 0", border: 0, background: "transparent", color: "#d71635", fontSize: 13, fontWeight: 600 }}>
              {tx("lgForgot")}
            </button>
          </div>

          {forgot ? <p style={{ padding: "12px 14px", borderRadius: 10, background: "#f5f6f2", color: "#4a514d", fontSize: 12.5, lineHeight: 1.5 }}>{tx("lgForgotNote")}</p> : null}

          {error ? (
            <p role="alert" style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 14px", border: "1px solid #f3c7cd", borderRadius: 10, background: "#fff6f6", color: "#b7122b", fontSize: 13, fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flex: "none" }} aria-hidden="true">
                <circle cx="12" cy="12" r="9.5" />
                <path d="M12 7.5v5.5M12 16.5h.01" />
              </svg>
              {error}
            </p>
          ) : null}

          <button type="submit" className="a-login-submit" disabled={busy}>
            {busy ? <span className="a-spin" /> : null}
            {busy ? tx("lgBusy") : tx("lgBtn")}
            {busy ? null : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `scaleX(${rtl ? -1 : 1})` }} aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
