"use client";

import { PASSWORD_MIN_LENGTH } from "@mon/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { useToast } from "@/app/components/admin/AdminShell";
import { formatDate } from "@/lib/admin/format";
import { defineText, useText } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

/**
 * A customer's account, opened from the Customers list: their photo, private
 * or company (with the company's name and tax number), first and last name,
 * email, phone, language and four-field address, as their own profile keeps
 * them, plus a new password and switching the account off.
 *
 * The same dialog makes an account for someone new. A password is suggested
 * in the field, so the office can read it out before saving; whatever
 * password was set is shown once afterwards, the only time it can be.
 *
 * Without `customers.write` it opens read-only.
 */

const TEXT = defineText({
  newTitle: { de: "Neuer Kunde", en: "New customer", ar: "زبون جديد", tr: "Yeni müşteri" },
  editTitle: { de: "Kundenprofil", en: "Customer profile", ar: "ملف الزبون", tr: "Müşteri profili" },
  close: { de: "Schließen", en: "Close", ar: "إغلاق", tr: "Kapat" },
  since: { de: "Kunde seit", en: "Customer since", ar: "زبون منذ", tr: "Müşteri olma tarihi" },
  lastLogin: { de: "Letzte Anmeldung", en: "Last sign-in", ar: "آخر دخول", tr: "Son giriş" },
  never: { de: "noch nie", en: "never", ar: "لم يدخل بعد", tr: "hiç" },
  blockedPill: { de: "Ausgeschaltet", en: "Turned off", ar: "موقوف", tr: "Kapalı" },
  type: { de: "Kundenart", en: "Customer type", ar: "نوع الزبون", tr: "Müşteri türü" },
  private: { de: "Privat", en: "Private", ar: "خاص", tr: "Bireysel" },
  business: { de: "Firma", en: "Company", ar: "شركة", tr: "Şirket" },
  company: { de: "Firmenname", en: "Company name", ar: "اسم الشركة", tr: "Şirket adı" },
  taxNo: { de: "Steuernummer / USt-IdNr.", en: "Tax number / VAT ID", ar: "الرقم الضريبي", tr: "Vergi numarası / KDV no." },
  firstName: { de: "Vorname", en: "First name", ar: "الاسم الأول", tr: "Ad" },
  lastName: { de: "Nachname", en: "Last name", ar: "الكنية", tr: "Soyad" },
  email: { de: "E-Mail", en: "Email", ar: "البريد الإلكتروني", tr: "E-posta" },
  phone: { de: "Telefon", en: "Phone", ar: "الهاتف", tr: "Telefon" },
  lang: { de: "Sprache", en: "Language", ar: "اللغة", tr: "Dil" },
  address: { de: "Adresse", en: "Address", ar: "العنوان", tr: "Adres" },
  street: { de: "Straße", en: "Street", ar: "اسم الشارع", tr: "Sokak" },
  houseNo: { de: "Hausnummer", en: "House number", ar: "رقم البناية", tr: "Bina no." },
  city: { de: "Stadt", en: "City", ar: "المدينة", tr: "Şehir" },
  zip: { de: "PLZ", en: "Postcode", ar: "الرقم البريدي", tr: "Posta kodu" },
  pass: { de: "Passwort", en: "Password", ar: "كلمة المرور", tr: "Şifre" },
  passNew: { de: "Neues Passwort", en: "New password", ar: "كلمة مرور جديدة", tr: "Yeni şifre" },
  passKeep: { de: "Leer lassen, um es nicht zu ändern", en: "Leave empty to keep it", ar: "اتركها فارغة لتبقى كما هي", tr: "Değiştirmemek için boş bırakın" },
  passHint: {
    de: "Ein neues Passwort meldet den Kunden überall ab.",
    en: "A new password signs the customer out everywhere.",
    ar: "كلمة المرور الجديدة تسجّل خروج الزبون من كل الأجهزة.",
    tr: "Yeni şifre müşterinin tüm oturumlarını kapatır.",
  },
  gen: { de: "Erzeugen", en: "Generate", ar: "توليد", tr: "Oluştur" },
  show: { de: "Passwort anzeigen", en: "Show password", ar: "إظهار كلمة المرور", tr: "Şifreyi göster" },
  hide: { de: "Passwort verbergen", en: "Hide password", ar: "إخفاء كلمة المرور", tr: "Şifreyi gizle" },
  blocked: { de: "Konto ausschalten", en: "Turn the account off", ar: "إيقاف الحساب", tr: "Hesabı kapat" },
  blockedSub: {
    de: "Der Kunde kann sich nicht mehr anmelden. Buchungen und Rechnungen bleiben.",
    en: "The customer can no longer sign in. Bookings and invoices stay.",
    ar: "لن يتمكن الزبون من تسجيل الدخول. الحجوزات والفواتير تبقى.",
    tr: "Müşteri artık giriş yapamaz. Rezervasyonlar ve faturalar kalır.",
  },
  cancel: { de: "Abbrechen", en: "Cancel", ar: "إلغاء", tr: "İptal" },
  create: { de: "Konto anlegen", en: "Create account", ar: "إنشاء الحساب", tr: "Hesap oluştur" },
  save: { de: "Speichern", en: "Save", ar: "حفظ", tr: "Kaydet" },
  done: { de: "Fertig", en: "Done", ar: "تم", tr: "Tamam" },
  copy: { de: "Kopieren", en: "Copy", ar: "نسخ", tr: "Kopyala" },
  copied: { de: "Kopiert", en: "Copied", ar: "تم النسخ", tr: "Kopyalandı" },
  created: { de: "Das Konto wurde angelegt.", en: "The account was created.", ar: "تم إنشاء الحساب.", tr: "Hesap oluşturuldu." },
  saved: { de: "Die Änderungen wurden gespeichert.", en: "The changes were saved.", ar: "تم حفظ التغييرات.", tr: "Değişiklikler kaydedildi." },
  passOnce: {
    de: "Geben Sie dem Kunden dieses Passwort. Es wird nur jetzt angezeigt.",
    en: "Give the customer this password. It is shown only now.",
    ar: "أعطِ الزبون كلمة المرور هذه. تظهر الآن فقط.",
    tr: "Bu şifreyi müşteriye verin. Yalnızca şimdi gösteriliyor.",
  },
  errFill: { de: "Bitte Vorname, Nachname und E-Mail ausfüllen.", en: "Fill in first name, last name and email.", ar: "املأ الاسم الأول والكنية والبريد.", tr: "Ad, soyad ve e-postayı doldurun." },
  errEmail: { de: "Die E-Mail-Adresse ist ungültig.", en: "The email address is not valid.", ar: "البريد الإلكتروني غير صحيح.", tr: "E-posta adresi geçersiz." },
  errAddr: {
    de: "Bitte alle vier Adressfelder ausfüllen oder alle leer lassen.",
    en: "Fill in all four address fields, or leave them all empty.",
    ar: "املأ خانات العنوان الأربع كلها أو اتركها كلها فارغة.",
    tr: "Dört adres alanının hepsini doldurun ya da hepsini boş bırakın.",
  },
  errCompany: { de: "Bitte Firmenname und Steuernummer angeben.", en: "Enter the company name and tax number.", ar: "أدخل اسم الشركة والرقم الضريبي.", tr: "Şirket adını ve vergi numarasını girin." },
  errTax: {
    de: "Die Steuernummer sieht nicht richtig aus. Erlaubt sind Buchstaben, Ziffern, Leerzeichen, / . und -.",
    en: "The tax number does not look right. Use letters, digits, spaces, / . and -.",
    ar: "الرقم الضريبي غير صحيح. المسموح: أحرف وأرقام ومسافات و / . -",
    tr: "Vergi numarası doğru görünmüyor. Harf, rakam, boşluk, / . ve - kullanın.",
  },
  errPhone: { de: "Die Telefonnummer ist zu kurz.", en: "The phone number is too short.", ar: "رقم الهاتف قصير جداً.", tr: "Telefon numarası çok kısa." },
  errPass: {
    de: "Das Passwort braucht mindestens {n} Zeichen.",
    en: "The password needs at least {n} characters.",
    ar: "كلمة المرور تحتاج {n} أحرف على الأقل.",
    tr: "Şifre en az {n} karakter olmalı.",
  },
  errTaken: {
    de: "Zu dieser E-Mail-Adresse gibt es schon ein Konto.",
    en: "There is already an account with this email address.",
    ar: "يوجد حساب بهذا البريد الإلكتروني مسبقاً.",
    tr: "Bu e-posta adresiyle zaten bir hesap var.",
  },
  errSave: { de: "Speichern fehlgeschlagen. Bitte erneut versuchen.", en: "Saving failed. Please try again.", ar: "تعذّر الحفظ. حاول مرة أخرى.", tr: "Kaydedilemedi. Lütfen tekrar deneyin." },
  errLoad: { de: "Das Konto konnte nicht geladen werden.", en: "The account could not be loaded.", ar: "تعذّر تحميل الحساب.", tr: "Hesap yüklenemedi." },
});

const LANGS = [
  { v: "de", l: "Deutsch" },
  { v: "en", l: "English" },
  { v: "tr", l: "Türkçe" },
  { v: "ar", l: "العربية" },
] as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EYE_ON = "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z";
const EYE_OFF =
  "M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7c1.9 0 3.6-.6 5-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2";

/** A readable password, ABCD-wxyz-23EF, from the browser's CSPRNG (as Admin users suggests one). */
function generatePassword(): string {
  const pick = (n: number, alphabet: string) => {
    const values = new Uint32Array(n);
    crypto.getRandomValues(values);
    return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
  };
  return `${pick(4, "ABCDEFGHJKLMNPQRSTUVWXYZ")}-${pick(4, "abcdefghijkmnpqrstuvwxyz23456789")}-${pick(4, "23456789ABCDEFGHJKLMNPQRSTUVWXYZ")}`;
}

/** The account as the API returns it. */
export interface CustomerAccount {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  locale: string;
  avatar: string | null;
  profileAddress: { street: string; houseNumber: string; zip: string; city: string } | null;
  customerType: "private" | "business";
  companyName: string | null;
  taxNumber: string | null;
  status: "active" | "blocked";
  lastLoginAt: string | null;
  createdAt: string;
}

/** What a new account starts from: empty, or a booking's contact details. */
export interface CustomerPrefill {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  type?: "private" | "business";
}

interface Draft {
  type: "private" | "business";
  company: string;
  taxNo: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  lang: string;
  street: string;
  houseNumber: string;
  city: string;
  zip: string;
  pass: string;
  show: boolean;
  blocked: boolean;
}

function draftOf(account: CustomerAccount): Draft {
  return {
    type: account.customerType,
    company: account.companyName ?? "",
    taxNo: account.taxNumber ?? "",
    first: account.firstName,
    last: account.lastName,
    email: account.email,
    phone: account.phone ?? "",
    lang: account.locale || "de",
    street: account.profileAddress?.street ?? "",
    houseNumber: account.profileAddress?.houseNumber ?? "",
    city: account.profileAddress?.city ?? "",
    zip: account.profileAddress?.zip ?? "",
    pass: "",
    show: false,
    blocked: account.status === "blocked",
  };
}

function draftFrom(prefill: CustomerPrefill, locale: string): Draft {
  return {
    type: prefill.type ?? "private",
    company: prefill.company ?? "",
    taxNo: "",
    first: prefill.firstName ?? "",
    last: prefill.lastName ?? "",
    email: prefill.email ?? "",
    phone: prefill.phone ?? "",
    lang: locale,
    street: "",
    houseNumber: "",
    city: "",
    zip: "",
    pass: generatePassword(),
    show: true,
    blocked: false,
  };
}

export const customerAccountKey = (id: string) => ["admin", "customers", "account", id] as const;

export function CustomerDialog({
  accountId,
  prefill,
  canWrite,
  onClose,
}: {
  /** The account to open; absent for a new one. */
  accountId: string | null;
  prefill?: CustomerPrefill | undefined;
  canWrite: boolean;
  onClose: () => void;
}) {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const toast = useToast();
  const queryClient = useQueryClient();
  const isNew = accountId === null;

  const account = useQuery({
    queryKey: customerAccountKey(accountId ?? "new"),
    queryFn: () => sdk.http.get<CustomerAccount>(`/api/admin/customers/accounts/${accountId}`),
    enabled: !isNew,
  });

  const [draft, setDraft] = useState<Draft | null>(() => (isNew ? draftFrom(prefill ?? {}, locale) : null));
  const [error, setError] = useState("");
  /** The password to hand over after a save; the dialog then shows only that. */
  const [handOver, setHandOver] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (account.data && !draft) setDraft(draftOf(account.data));
  }, [account.data, draft]);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const address = { street: d.street.trim(), houseNumber: d.houseNumber.trim(), zip: d.zip.trim(), city: d.city.trim() };
      const filled = Object.values(address).filter(Boolean).length;
      const business = d.type === "business";
      const body = {
        firstName: d.first.trim(),
        lastName: d.last.trim(),
        email: d.email.trim(),
        phone: d.phone.trim() || null,
        locale: d.lang,
        customerType: d.type,
        companyName: business ? d.company.trim() : null,
        taxNumber: business ? d.taxNo.trim() : null,
        profileAddress: filled ? address : null,
        ...(d.pass ? { password: d.pass } : {}),
        ...(isNew ? {} : { status: d.blocked ? "blocked" : "active" }),
      };
      if (isNew) {
        const result = await sdk.http.post<{ customer: CustomerAccount; temporaryPassword?: string }>("/api/admin/customers/accounts", body);
        return { customer: result.customer, password: d.pass || result.temporaryPassword || "" };
      }
      const customer = await sdk.http.patch<CustomerAccount>(`/api/admin/customers/accounts/${accountId}`, body);
      return { customer, password: d.pass };
    },
    onSuccess: ({ customer, password }) => {
      queryClient.setQueryData(customerAccountKey(customer.id), customer);
      void queryClient.invalidateQueries({ queryKey: ["admin", "customers"], exact: false });
      toast(tx(isNew ? "created" : "saved"));
      if (password) setHandOver(password);
      else onClose();
    },
    onError: (caught) => {
      if (caught instanceof ApiError && caught.status === 409) return setError(tx("errTaken"));
      if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED") {
        const paths = caught.fieldIssues.map((issue) => String(issue.path));
        if (paths.some((path) => path.includes("taxNumber"))) return setError(tx("errTax"));
        if (paths.some((path) => path.includes("companyName"))) return setError(tx("errCompany"));
        if (paths.some((path) => path.includes("phone"))) return setError(tx("errPhone"));
        if (paths.some((path) => path.includes("email"))) return setError(tx("errEmail"));
        if (paths.some((path) => path.includes("password"))) return setError(tx("errPass", { n: PASSWORD_MIN_LENGTH }));
      }
      setError(tx("errSave"));
    },
  });

  function submit() {
    if (!draft || !canWrite) return;
    setError("");
    if (!draft.first.trim() || !draft.last.trim() || !draft.email.trim()) return setError(tx("errFill"));
    if (!EMAIL.test(draft.email.trim())) return setError(tx("errEmail"));
    if (draft.type === "business" && (!draft.company.trim() || !draft.taxNo.trim())) return setError(tx("errCompany"));
    const filled = [draft.street, draft.houseNumber, draft.city, draft.zip].filter((value) => value.trim()).length;
    if (filled > 0 && filled < 4) return setError(tx("errAddr"));
    if (draft.pass && draft.pass.length < PASSWORD_MIN_LENGTH) return setError(tx("errPass", { n: PASSWORD_MIN_LENGTH }));
    save.mutate(draft);
  }

  const set = (patch: Partial<Draft>) => {
    setError("");
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const label: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5, fontWeight: 600, color: "#4a514d" };
  const input: CSSProperties = { height: 42, padding: "0 12px", border: "1px solid #cfd3cb", borderRadius: 8, background: canWrite ? "#ffffff" : "#f5f5f0", fontSize: 13.5, color: "#252b28", width: "100%" };
  const eyebrow: CSSProperties = { fontSize: 10.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#737870" };
  const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 12 };
  const data = account.data;
  const title = tx(isNew ? "newTitle" : "editTitle");

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 900, background: "#1d222066", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "clamp(12px,5vh,56px) 16px", overflowY: "auto" }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ width: "100%", maxWidth: 680, background: "#ffffff", borderRadius: 16, boxShadow: "0 30px 80px #0000003d", overflow: "hidden" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "18px 22px", borderBottom: "1px solid #eef0ea" }}>
          <h2 style={{ fontSize: 18, fontWeight: 650, letterSpacing: "var(--a-ls-h2)" }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={tx("close")}
            style={{ width: 34, height: 34, display: "grid", placeItems: "center", border: 0, borderRadius: 8, background: "#f5f5f0", color: "#252b28", padding: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {handOver ? (
          <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 13.5, color: "#252b28" }}>{tx("passOnce")}</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <code dir="ltr" style={{ flex: "1 1 200px", padding: "12px 14px", borderRadius: 8, background: "#edf5ed", color: "#1f5a3d", font: "600 16px ui-monospace,Menlo,monospace", letterSpacing: 1 }}>
                {handOver}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(handOver).then(() => setCopied(true), () => undefined);
                }}
                style={{ minHeight: 44, padding: "0 16px", border: "1px solid #d71635", borderRadius: 8, background: "#ffffff", color: "#252b28", fontSize: 12.5, fontWeight: 600 }}
              >
                {tx(copied ? "copied" : "copy")}
              </button>
            </div>
          </div>
        ) : !isNew && account.isError ? (
          <div style={{ padding: 22 }}>
            <div className="a-note is-error">{tx("errLoad")}</div>
          </div>
        ) : !draft ? (
          <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="a-skel" style={{ maxWidth: 260 }} />
            <div className="a-skel" />
            <div className="a-skel" />
          </div>
        ) : (
          <fieldset disabled={!canWrite || save.isPending} style={{ border: 0, margin: 0, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
            {data ? (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", flex: "none", display: "grid", placeItems: "center", background: "#fff6f6", color: "#d71635", fontSize: 20, fontWeight: 700 }}>
                  {data.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    (data.firstName || data.fullName || data.email).trim().charAt(0).toUpperCase()
                  )}
                </span>
                <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <b style={{ fontSize: 15, fontWeight: 650, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <bdi>{data.fullName}</bdi>
                    {data.status === "blocked" ? (
                      <span style={{ padding: "2px 8px", borderRadius: 999, background: "#fff1f3", color: "#b7122b", fontSize: 10.5, fontWeight: 650 }}>{tx("blockedPill")}</span>
                    ) : null}
                  </b>
                  <small style={{ fontSize: 12, color: "#737870" }}>
                    {tx("since")} {formatDate(data.createdAt, locale, { day: "numeric", month: "short", year: "numeric" })} · {tx("lastLogin")}{" "}
                    {data.lastLoginAt ? formatDate(data.lastLoginAt, locale, { day: "numeric", month: "short", year: "numeric" }) : tx("never")}
                  </small>
                </span>
              </div>
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={eyebrow}>{tx("type")}</span>
              <div role="group" aria-label={tx("type")} style={{ display: "inline-flex", alignSelf: "flex-start", padding: 4, borderRadius: 10, background: "#f1f3f0" }}>
                {(["private", "business"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={draft.type === type}
                    onClick={() => set({ type })}
                    style={{ minHeight: 34, padding: "0 16px", border: 0, borderRadius: 7, background: draft.type === type ? "#ffffff" : "transparent", color: draft.type === type ? "#1d2220" : "#737870", fontSize: 12.5, fontWeight: 650, boxShadow: draft.type === type ? "0 2px 8px #1d22201a" : "none" }}
                  >
                    {tx(type)}
                  </button>
                ))}
              </div>
            </div>

            {draft.type === "business" ? (
              <div style={grid}>
                <label style={label}>
                  {tx("company")}
                  <input dir="auto" value={draft.company} onChange={(event) => set({ company: event.target.value })} style={input} />
                </label>
                <label style={label}>
                  {tx("taxNo")}
                  <input dir="ltr" value={draft.taxNo} placeholder="12/345/67890 · DE123456789" onChange={(event) => set({ taxNo: event.target.value })} style={input} />
                </label>
              </div>
            ) : null}

            <div style={grid}>
              <label style={label}>
                {tx("firstName")}
                <input dir="auto" value={draft.first} onChange={(event) => set({ first: event.target.value })} style={input} />
              </label>
              <label style={label}>
                {tx("lastName")}
                <input dir="auto" value={draft.last} onChange={(event) => set({ last: event.target.value })} style={input} />
              </label>
              <label style={label}>
                {tx("email")}
                <input dir="ltr" type="email" value={draft.email} onChange={(event) => set({ email: event.target.value })} style={input} />
              </label>
              <label style={label}>
                {tx("phone")}
                <input dir="ltr" type="tel" value={draft.phone} onChange={(event) => set({ phone: event.target.value })} style={input} />
              </label>
              <label style={label}>
                {tx("lang")}
                <select value={draft.lang} onChange={(event) => set({ lang: event.target.value })} style={{ ...input, padding: "0 8px" }}>
                  {LANGS.map((lang) => (
                    <option key={lang.v} value={lang.v}>
                      {lang.l}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={eyebrow}>{tx("address")}</span>
              <div style={grid}>
                <label style={label}>
                  {tx("street")}
                  <input dir="auto" value={draft.street} onChange={(event) => set({ street: event.target.value })} style={input} />
                </label>
                <label style={label}>
                  {tx("houseNo")}
                  <input dir="auto" value={draft.houseNumber} onChange={(event) => set({ houseNumber: event.target.value })} style={input} />
                </label>
                <label style={label}>
                  {tx("city")}
                  <input dir="auto" value={draft.city} onChange={(event) => set({ city: event.target.value })} style={input} />
                </label>
                <label style={label}>
                  {tx("zip")}
                  <input dir="ltr" inputMode="numeric" value={draft.zip} onChange={(event) => set({ zip: event.target.value })} style={input} />
                </label>
              </div>
            </div>

            {canWrite ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#4a514d" }}>{tx(isNew ? "pass" : "passNew")}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <label style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", height: 42, border: "1px solid #cfd3cb", borderRadius: 8, background: "#ffffff", paddingInline: "12px 4px" }}>
                    <input
                      dir="ltr"
                      type={draft.show ? "text" : "password"}
                      value={draft.pass}
                      onChange={(event) => set({ pass: event.target.value })}
                      placeholder={isNew ? "" : tx("passKeep")}
                      autoComplete="new-password"
                      aria-label={tx(isNew ? "pass" : "passNew")}
                      style={{ flex: 1, width: "100%", minWidth: 0, border: 0, padding: 0, background: "transparent", font: "13.5px ui-monospace,Menlo,monospace", color: "#252b28", boxShadow: "none", outline: "none" }}
                    />
                    <button
                      type="button"
                      onClick={() => set({ show: !draft.show })}
                      aria-label={tx(draft.show ? "hide" : "show")}
                      title={tx(draft.show ? "hide" : "show")}
                      style={{ width: 34, height: 34, display: "grid", placeItems: "center", border: 0, borderRadius: 6, background: "transparent", color: "#737870", padding: 0, flex: "none" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d={draft.show ? EYE_OFF : EYE_ON} />
                      </svg>
                    </button>
                  </label>
                  <button
                    type="button"
                    onClick={() => set({ pass: generatePassword(), show: true })}
                    style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 42, padding: "0 14px", border: "1px solid #d71635", borderRadius: 8, background: "#ffffff", color: "#252b28", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5" />
                    </svg>
                    {tx("gen")}
                  </button>
                </div>
                {isNew ? null : <small style={{ fontSize: 11.5, color: "#737870" }}>{tx("passHint")}</small>}
              </div>
            ) : null}

            {!isNew && canWrite ? (
              <button
                type="button"
                role="checkbox"
                aria-checked={draft.blocked}
                onClick={() => set({ blocked: !draft.blocked })}
                style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", border: `1.5px solid ${draft.blocked ? "#d71635" : "#e3e5de"}`, borderRadius: 10, background: draft.blocked ? "#fff6f6" : "#ffffff", textAlign: "start", color: "#252b28" }}
              >
                <span style={{ width: 16, height: 16, marginTop: 2, borderRadius: 4, border: `1.5px solid ${draft.blocked ? "#d71635" : "#cfd3cb"}`, background: draft.blocked ? "#d71635" : "#ffffff", display: "grid", placeItems: "center", flex: "none", color: "#ffffff" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <b style={{ fontSize: 13, fontWeight: 650 }}>{tx("blocked")}</b>
                  <small style={{ fontSize: 11.5, color: "#737870", lineHeight: 1.4 }}>{tx("blockedSub")}</small>
                </span>
              </button>
            ) : null}
          </fieldset>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", padding: "14px 22px", borderTop: "1px solid #eef0ea", background: "#fafaf7" }}>
          {error ? (
            <small role="alert" style={{ marginInlineEnd: "auto", fontSize: 12, color: "#d71635", fontWeight: 600 }}>
              {error}
            </small>
          ) : null}
          {handOver || !canWrite ? (
            <button
              type="button"
              onClick={onClose}
              style={{ minHeight: 40, padding: "0 18px", border: "1px solid #252b28", borderRadius: 8, background: "#252b28", color: "#ffffff", fontSize: 12.5, fontWeight: 600 }}
            >
              {tx(handOver ? "done" : "close")}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                style={{ minHeight: 40, padding: "0 16px", border: "1px solid #e3e5de", borderRadius: 8, background: "#ffffff", color: "#252b28", fontSize: 12.5, fontWeight: 600 }}
              >
                {tx("cancel")}
              </button>
              <button
                type="button"
                disabled={save.isPending || !draft}
                onClick={submit}
                style={{ minHeight: 40, padding: "0 18px", border: "1px solid #d71635", borderRadius: 8, background: "#d71635", color: "#ffffff", fontSize: 12.5, fontWeight: 600, opacity: save.isPending ? 0.7 : 1 }}
              >
                {tx(isNew ? "create" : "save")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
