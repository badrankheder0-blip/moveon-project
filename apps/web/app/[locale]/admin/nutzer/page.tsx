"use client";

import {
  ADMIN_PAGE_GROUPS,
  ADMIN_PAGES,
  PASSWORD_MIN_LENGTH,
  can as roleCan,
  canManageAccount,
  type AdminPage,
  type Role,
} from "@mon/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { permissionFor } from "@/lib/access/staff-routes";
import { dateTag } from "@/lib/admin/format";
import { ADMIN_ICONS, ADMIN_PATHS, NAV_TEXT } from "@/lib/admin/nav";
import { defineText, useText, type TextFn } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

import styles from "./page.module.css";

/**
 * User management: the staff accounts and what each may open, as the admin
 * prototype draws it — one row per account with its access, its pages, when
 * it last signed in and an on/off switch, and the account dialog with the
 * three access levels and the page tiles.
 *
 * The access levels sit on the role enum: Owner is `super_admin`, Full access
 * is `admin`, Selected pages is `operator` with the ticked pages stored on the
 * account. The page tiles are real: the API resolves a member's ticked pages
 * to capabilities (`effectivePermissions` in @mon/core) on every request.
 *
 * What the screen offers follows `canManageAccount`, the rule the API applies:
 * nobody changes the owner but the owner, only the owner gives full access,
 * and you cannot switch yourself off.
 */

const TEXT = defineText({
  title: { de: "Benutzerverwaltung", en: "User management", ar: "إدارة المستخدمين", tr: "Kullanıcı yönetimi" },
  crumb: { de: "Benutzer", en: "Users", ar: "المستخدمون", tr: "Kullanıcılar" },
  sub: {
    de: "Legen Sie Konten für Ihr Team an und bestimmen Sie, welche Seiten jede Person öffnen darf.",
    en: "Create accounts for your team and choose which pages each person can open.",
    ar: "أنشئ حسابات لفريقك واختر الصفحات التي يستطيع كل شخص فتحها.",
    tr: "Ekibiniz için hesaplar oluşturun ve her kişinin hangi sayfaları açabileceğini seçin.",
  },
  newAcc: { de: "Neues Konto", en: "New account", ar: "حساب جديد", tr: "Yeni hesap" },
  editAcc: { de: "Konto bearbeiten", en: "Edit account", ar: "تعديل الحساب", tr: "Hesabı düzenle" },
  name: { de: "Vollständiger Name", en: "Full name", ar: "الاسم الكامل", tr: "Ad soyad" },
  email: { de: "E-Mail", en: "Email", ar: "البريد الإلكتروني", tr: "E-posta" },
  pass: { de: "Passwort", en: "Password", ar: "كلمة المرور", tr: "Şifre" },
  passKeep: {
    de: "Leer lassen, um das aktuelle Passwort zu behalten",
    en: "Leave empty to keep the current password",
    ar: "اتركها فارغة للإبقاء على كلمة المرور الحالية",
    tr: "Mevcut şifreyi korumak için boş bırakın",
  },
  gen: { de: "Erzeugen", en: "Generate", ar: "توليد", tr: "Oluştur" },
  show: { de: "Passwort anzeigen", en: "Show password", ar: "إظهار كلمة المرور", tr: "Şifreyi göster" },
  hide: { de: "Passwort verbergen", en: "Hide password", ar: "إخفاء كلمة المرور", tr: "Şifreyi gizle" },
  access: { de: "ZUGRIFF", en: "ACCESS", ar: "الصلاحية", tr: "ERİŞİM" },
  roleOwner: { de: "Inhaber", en: "Owner", ar: "المالك", tr: "Sahip" },
  roleAdmin: { de: "Vollzugriff", en: "Full access", ar: "صلاحية كاملة", tr: "Tam erişim" },
  roleAdminSub: {
    de: "Alle Seiten, einschließlich der Benutzerverwaltung.",
    en: "Every page, including User management.",
    ar: "كل الصفحات، ومنها إدارة المستخدمين.",
    tr: "Kullanıcı yönetimi dahil tüm sayfalar.",
  },
  roleAdminOwner: {
    de: "Nur der Inhaber kann Vollzugriff vergeben.",
    en: "Only the owner can give full access.",
    ar: "المالك فقط يستطيع منح صلاحية كاملة.",
    tr: "Tam erişimi yalnızca sahip verebilir.",
  },
  roleMember: { de: "Ausgewählte Seiten", en: "Selected pages", ar: "صفحات محددة", tr: "Seçili sayfalar" },
  roleMemberSub: {
    de: "Nur die Seiten, die Sie unten ankreuzen.",
    en: "Only the pages you tick below.",
    ar: "فقط الصفحات التي تحددها أدناه.",
    tr: "Yalnızca aşağıda işaretlediğiniz sayfalar.",
  },
  pages: { de: "SEITEN", en: "PAGES", ar: "الصفحات", tr: "SAYFALAR" },
  all: { de: "Alle auswählen", en: "Select all", ar: "تحديد الكل", tr: "Tümünü seç" },
  none: { de: "Leeren", en: "Clear", ar: "مسح", tr: "Temizle" },
  allPages: { de: "Alle Seiten", en: "All pages", ar: "كل الصفحات", tr: "Tüm sayfalar" },
  active: { de: "AKTIV", en: "ACTIVE", ar: "مفعّل", tr: "AKTİF" },
  last: { de: "LETZTE ANMELDUNG", en: "LAST SIGN-IN", ar: "آخر دخول", tr: "SON GİRİŞ" },
  never: { de: "Nie", en: "Never", ar: "أبداً", tr: "Hiç" },
  you: { de: "Sie", en: "You", ar: "أنت", tr: "Siz" },
  save: { de: "Konto speichern", en: "Save account", ar: "حفظ الحساب", tr: "Hesabı kaydet" },
  create: { de: "Konto anlegen", en: "Create account", ar: "إنشاء الحساب", tr: "Hesap oluştur" },
  cancel: { de: "Abbrechen", en: "Cancel", ar: "إلغاء", tr: "İptal" },
  close: { de: "Schließen", en: "Close", ar: "إغلاق", tr: "Kapat" },
  remove: { de: "Löschen", en: "Remove", ar: "حذف", tr: "Sil" },
  saved: { de: "Konto gespeichert.", en: "Account saved.", ar: "تم حفظ الحساب.", tr: "Hesap kaydedildi." },
  switchedOn: { de: "Konto eingeschaltet.", en: "Account switched on.", ar: "تم تفعيل الحساب.", tr: "Hesap açıldı." },
  switchedOff: {
    de: "Konto ausgeschaltet. Die Person kann sich nicht mehr anmelden.",
    en: "Account switched off. The person can no longer sign in.",
    ar: "تم إيقاف الحساب. لن يتمكن الشخص من الدخول.",
    tr: "Hesap kapatıldı. Kişi artık giriş yapamaz.",
  },
  deleted: { de: "Konto gelöscht.", en: "Account deleted.", ar: "تم حذف الحساب.", tr: "Hesap silindi." },
  done: {
    de: "Konto bereit. Geben Sie diese Anmeldedaten weiter. Das Passwort wird nur jetzt angezeigt.",
    en: "Account ready. Share these sign-in details. The password is shown only now.",
    ar: "الحساب جاهز. أرسل بيانات الدخول هذه. كلمة المرور تظهر الآن فقط.",
    tr: "Hesap hazır. Bu giriş bilgilerini paylaşın. Şifre yalnızca şimdi gösteriliyor.",
  },
  copy: { de: "Daten kopieren", en: "Copy details", ar: "نسخ البيانات", tr: "Bilgileri kopyala" },
  copied: { de: "Kopiert", en: "Copied", ar: "تم النسخ", tr: "Kopyalandı" },
  errName: { de: "Geben Sie einen Namen ein.", en: "Enter a name.", ar: "أدخل الاسم.", tr: "Bir ad girin." },
  errEmail: { de: "Geben Sie eine gültige E-Mail ein.", en: "Enter a valid email.", ar: "أدخل بريداً صحيحاً.", tr: "Geçerli bir e-posta girin." },
  errDup: {
    de: "Ein Konto mit dieser E-Mail gibt es bereits.",
    en: "An account with this email already exists.",
    ar: "يوجد حساب بهذا البريد.",
    tr: "Bu e-postayla bir hesap zaten var.",
  },
  errPass: {
    de: "Verwenden Sie mindestens {n} Zeichen.",
    en: "Use at least {n} characters.",
    ar: "استخدم {n} أحرف على الأقل.",
    tr: "En az {n} karakter kullanın.",
  },
  errPages: { de: "Wählen Sie mindestens eine Seite.", en: "Choose at least one page.", ar: "اختر صفحة واحدة على الأقل.", tr: "En az bir sayfa seçin." },
  errSave: {
    de: "Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.",
    en: "Saving failed. Please try again.",
    ar: "تعذّر الحفظ. حاول مرة أخرى.",
    tr: "Kaydedilemedi. Lütfen tekrar deneyin.",
  },
  errDel: {
    de: "Dieses Konto hat Aufträge. Schalten Sie es stattdessen aus.",
    en: "This account has orders attached. Switch it off instead.",
    ar: "لهذا الحساب طلبات مرتبطة. أوقفه بدلاً من حذفه.",
    tr: "Bu hesaba bağlı siparişler var. Bunun yerine kapatın.",
  },
  confirmDel: {
    de: "Dieses Konto löschen? Die Person kann sich danach nicht mehr anmelden.",
    en: "Delete this account? The person will no longer be able to sign in.",
    ar: "حذف هذا الحساب؟ لن يتمكن الشخص من الدخول بعد الآن.",
    tr: "Bu hesap silinsin mi? Kişi artık giriş yapamayacak.",
  },
  note: {
    de: "Ausgeschaltete Konten können sich erst wieder anmelden, wenn sie eingeschaltet werden. Ein Passwort wird nur einmal angezeigt, wenn es gesetzt wird.",
    en: "Switched-off accounts cannot sign in until they are switched on again. A password is shown once, when it is set.",
    ar: "الحسابات الموقوفة لا تستطيع الدخول حتى يُعاد تفعيلها. كلمة المرور تظهر مرة واحدة فقط عند تعيينها.",
    tr: "Kapatılan hesaplar yeniden açılana kadar giriş yapamaz. Şifre yalnızca belirlendiğinde bir kez gösterilir.",
  },
  loadFailed: {
    de: "Die Konten konnten nicht geladen werden.",
    en: "The accounts could not be loaded.",
    ar: "تعذّر تحميل الحسابات.",
    tr: "Hesaplar yüklenemedi.",
  },
});

/** The password policy the API enforces; the prototype's 8 is below it. */
const MIN_PASSWORD = PASSWORD_MIN_LENGTH;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PALETTE = ["#d71635", "#252b28", "#3f705a", "#a0661c", "#3d5a99", "#7a3e8f"];
const EYE_ON = "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z";
const EYE_OFF =
  "M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7c1.9 0 3.6-.6 5-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2";

type Access = "owner" | "admin" | "member";

interface Account {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  status: "active" | "blocked";
  pagePermissions: AdminPage[] | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface Draft {
  id: string | null;
  name: string;
  email: string;
  access: Access;
  pages: AdminPage[];
  pass: string;
  show: boolean;
}

interface Done {
  name: string;
  email: string;
  pass: string;
  copied: boolean;
}

const accessOf = (role: Role): Access => (role === "super_admin" ? "owner" : role === "admin" ? "admin" : "member");

/** A member's pages; for one without a list, the pages their role opens on its own. */
function pagesOf(account: Account): AdminPage[] {
  if (account.pagePermissions) return account.pagePermissions;
  return ADMIN_PAGES.filter((page) => roleCan(account.role, permissionFor(ADMIN_PATHS[page])));
}

/** The prototype's avatar colour: a hash of the email over six brand colours. */
function avatarColour(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "·"
  );
}

/** The prototype's generated password: ABCD-wxyz-23EF, from the browser's CSPRNG. */
function generatePassword(): string {
  const pick = (n: number, alphabet: string) => {
    const values = new Uint32Array(n);
    crypto.getRandomValues(values);
    return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
  };
  return `${pick(4, "ABCDEFGHJKLMNPQRSTUVWXYZ")}-${pick(4, "abcdefghijkmnpqrstuvwxyz23456789")}-${pick(4, "23456789ABCDEFGHJKLMNPQRSTUVWXYZ")}`;
}

export default function UsersPage() {
  const { sdk, user, can } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const nx = useText(NAV_TEXT);
  const toast = useToast();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done | null>(null);

  const myRole = user?.role;
  const amOwner = myRole === "super_admin";
  const mayWrite = can("users.write");

  const list = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => sdk.http.get<{ items: Account[] }>("/api/users", { staff: "1", limit: 200 }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const before = list.data?.items.find((account) => account.id === d.id);
      const self = d.id !== null && d.id === user?.id;
      const member = d.access === "member";

      if (!d.id) {
        const result = await sdk.http.post<{ user: Account; temporaryPassword?: string }>("/api/users", {
          email: d.email.trim().toLowerCase(),
          fullName: d.name.trim(),
          role: member ? "operator" : "admin",
          locale,
          ...(member ? { pagePermissions: d.pages } : {}),
          ...(d.pass ? { password: d.pass } : {}),
        });
        return { pass: d.pass || result.temporaryPassword || "" };
      }

      // Only what changed, so an edit never sends a role or pages it was not
      // asked to touch — which also keeps your own edits to your name.
      const body: Record<string, unknown> = {};
      if (d.name.trim() !== before?.fullName) body.fullName = d.name.trim();
      if (d.email.trim().toLowerCase() !== before?.email) body.email = d.email.trim().toLowerCase();
      if (!self && before && before.role !== "super_admin") {
        const wasMember = accessOf(before.role) === "member";
        if (d.access === "admin" && before.role !== "admin") body.role = "admin";
        // A member keeps whichever member role they had; full access steps down to operator.
        if (member && !wasMember) body.role = "operator";
        if (member) body.pagePermissions = d.pages;
      }
      if (d.pass && !self) body.password = d.pass;

      if (Object.keys(body).length > 0) await sdk.http.patch(`/api/users/${d.id}`, body);
      return { pass: typeof body.password === "string" ? body.password : "" };
    },
    onSuccess: ({ pass }, d) => {
      setDraft(null);
      void refresh();
      if (pass) setDone({ name: d.name.trim(), email: d.email.trim().toLowerCase(), pass, copied: false });
      else toast(tx("saved"));
    },
    onError: (err) => {
      setError(err instanceof ApiError && err.code === "EMAIL_TAKEN" ? tx("errDup") : err instanceof ApiError && err.status !== 500 ? err.message : tx("errSave"));
    },
  });

  const toggle = useMutation({
    mutationFn: (account: Account) =>
      sdk.http.patch<Account>(`/api/users/${account.id}`, { status: account.status === "blocked" ? "active" : "blocked" }),
    onSuccess: (account) => {
      void refresh();
      toast(tx(account.status === "blocked" ? "switchedOff" : "switchedOn"));
    },
    onError: () => toast(tx("errSave")),
  });

  const remove = useMutation({
    mutationFn: (account: Account) => sdk.http.delete(`/api/users/${account.id}`),
    onSuccess: () => {
      void refresh();
      toast(tx("deleted"));
    },
    onError: (err) => toast(err instanceof ApiError && err.status === 409 ? tx("errDel") : tx("errSave")),
  });

  const open = (account: Account | null) => {
    setError("");
    setDraft(
      account
        ? {
            id: account.id,
            name: account.fullName,
            email: account.email,
            access: accessOf(account.role),
            pages: pagesOf(account),
            pass: "",
            show: false,
          }
        : { id: null, name: "", email: "", access: "member", pages: ["overview", "orders", "calendar"], pass: generatePassword(), show: true },
    );
  };

  const submit = () => {
    if (!draft) return;
    // An empty password on a new account is fine: the API generates one.
    const problem = !draft.name.trim()
      ? tx("errName")
      : !EMAIL.test(draft.email.trim())
        ? tx("errEmail")
        : draft.pass && draft.pass.length < MIN_PASSWORD
          ? tx("errPass", { n: MIN_PASSWORD })
          : draft.access === "member" && draft.pages.length === 0
            ? tx("errPages")
            : "";
    if (problem) {
      setError(problem);
      return;
    }
    save.mutate(draft);
  };

  const loc = dateTag(locale);
  const lastSeen = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : tx("never");
  const accessLabel = (access: Access) => tx(access === "owner" ? "roleOwner" : access === "admin" ? "roleAdmin" : "roleMember");

  const accounts = list.data?.items ?? [];

  return (
    <AdminShell view="users" crumb={tx("crumb")}>
      <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "var(--a-ls-h1)", lineHeight: 1.2 }}>{tx("title")}</h1>
            <p style={{ color: "#737870", fontSize: 13, marginTop: 6, maxWidth: 560 }}>{tx("sub")}</p>
          </div>
          {mayWrite ? (
            <button
              type="button"
              className={styles.red}
              onClick={() => open(null)}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 41, padding: "0 16px", border: "1px solid #d71635", borderRadius: 8, background: "#d71635", color: "#ffffff", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {tx("newAcc")}
            </button>
          ) : null}
        </div>

        {done ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "16px 20px", border: "1px solid #cfe3d6", borderRadius: 12, background: "#f3faf5" }}>
            <span style={{ width: 38, height: 38, borderRadius: "50%", background: "#3f705a", color: "#ffffff", display: "grid", placeItems: "center", flex: "none" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </span>
            <div style={{ flex: "1 1 280px", minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
              <b style={{ fontSize: 13.5, fontWeight: 650 }}>{done.name}</b>
              <small style={{ fontSize: 12, color: "#4a514d" }}>{tx("done")}</small>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <code dir="ltr" style={{ padding: "6px 10px", borderRadius: 6, background: "#ffffff", border: "1px solid #d9e6dd", font: "12.5px ui-monospace,Menlo,monospace" }}>
                  {done.email}
                </code>
                <code dir="ltr" style={{ padding: "6px 10px", borderRadius: 6, background: "#ffffff", border: "1px solid #d9e6dd", font: "700 12.5px ui-monospace,Menlo,monospace", letterSpacing: ".5px" }}>
                  {done.pass}
                </code>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => {
                  const text = `m.on Admin\n${window.location.origin}/${locale}/login\n${tx("email")}: ${done.email}\n${tx("pass")}: ${done.pass}`;
                  void navigator.clipboard
                    ?.writeText(text)
                    .then(() => setDone((current) => (current ? { ...current, copied: true } : current)))
                    .catch(() => undefined);
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 38, padding: "0 14px", border: "1px solid #3f705a", borderRadius: 8, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="12" height="12" rx="2" />
                  <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
                </svg>
                {tx(done.copied ? "copied" : "copy")}
              </button>
              <button
                type="button"
                onClick={() => setDone(null)}
                aria-label={tx("close")}
                style={{ width: 38, height: 38, display: "grid", placeItems: "center", border: 0, borderRadius: 8, background: "transparent", color: "#4a514d", padding: 0 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          </div>
        ) : null}

        {list.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}

        <div style={{ background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 12, boxShadow: "0 12px 36px #202a2308", overflow: "hidden" }}>
          <div
            className={styles.head}
            style={{ gap: 14, padding: "11px 20px", background: "#fafaf7", borderBottom: "1px solid #e3e5de", fontSize: 10.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#737870" }}
          >
            <span style={{ flex: "1 1 240px" }}>{tx("name")}</span>
            <span style={{ flex: "0 0 130px" }}>{tx("access")}</span>
            <span style={{ flex: "2 1 260px" }}>{tx("pages")}</span>
            <span style={{ flex: "0 0 130px" }}>{tx("last")}</span>
            <span style={{ flex: "0 0 70px" }}>{tx("active")}</span>
            <span style={{ width: 72 }} />
          </div>

          {list.isPending
            ? Array.from({ length: 2 }, (_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid #eef0ea" }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: "#f1f1ea", flex: "none" }} />
                  <div className="a-skel" style={{ flex: 1, maxWidth: 240 }} />
                </div>
              ))
            : accounts.map((account) => {
                const access = accessOf(account.role);
                const isMe = account.id === user?.id;
                const on = account.status !== "blocked";
                const manageable = Boolean(myRole && mayWrite && canManageAccount(myRole, account.role));
                const canEdit = isMe || manageable;
                const canToggle = !isMe && manageable;
                const chip =
                  access === "owner" ? { bg: "#252b28", fg: "#ffffff" } : access === "admin" ? { bg: "#fff6f6", fg: "#b7122b" } : { bg: "#f1f1ea", fg: "#4a514d" };
                return (
                  <div key={account.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 14px", padding: "14px 20px", borderBottom: "1px solid #eef0ea" }}>
                    <div style={{ flex: "1 1 240px", minWidth: 0, display: "flex", alignItems: "center", gap: 12, opacity: on ? 1 : 0.5 }}>
                      <span style={{ width: 38, height: 38, borderRadius: 10, background: avatarColour(account.email), color: "#ffffff", display: "grid", placeItems: "center", fontSize: 12.5, fontWeight: 700, flex: "none" }}>
                        {initials(account.fullName)}
                      </span>
                      <span style={{ minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.35 }}>
                        <b style={{ fontSize: 13.5, fontWeight: 650, display: "flex", alignItems: "center", gap: 6 }}>
                          <bdi>{account.fullName}</bdi>
                          {isMe ? (
                            <span style={{ padding: "1px 7px", borderRadius: 999, background: "#f1f1ea", color: "#4a514d", fontSize: 10, fontWeight: 650 }}>{tx("you")}</span>
                          ) : null}
                        </b>
                        <small style={{ fontSize: 12, color: "#737870", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <bdi>{account.email}</bdi>
                        </small>
                      </span>
                    </div>
                    <span style={{ flex: "0 0 130px" }}>
                      <span style={{ display: "inline-flex", padding: "4px 10px", borderRadius: 999, background: chip.bg, color: chip.fg, fontSize: 11, fontWeight: 650, whiteSpace: "nowrap" }}>
                        {accessLabel(access)}
                      </span>
                    </span>
                    <div style={{ flex: "2 1 260px", minWidth: 0, display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {access !== "member" ? (
                        <span style={{ fontSize: 12, color: "#4a514d", fontWeight: 550 }}>{tx("allPages")}</span>
                      ) : (
                        pagesOf(account).map((page) => (
                          <span key={page} style={{ padding: "3px 8px", border: "1px solid #e3e5de", borderRadius: 6, background: "#fafaf7", fontSize: 11, fontWeight: 550, whiteSpace: "nowrap" }}>
                            {nx(page)}
                          </span>
                        ))
                      )}
                    </div>
                    <span style={{ flex: "0 0 130px", fontSize: 12, color: "#737870", whiteSpace: "nowrap" }}>{lastSeen(account.lastLoginAt)}</span>
                    <span style={{ flex: "0 0 70px" }}>
                      {canToggle ? (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={tx("active")}
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate(account)}
                          style={{ display: "flex", border: 0, background: "transparent", padding: 0 }}
                        >
                          <span style={{ width: 34, height: 20, borderRadius: 10, background: on ? "#3f705a" : "#d6d9d1", display: "flex", justifyContent: on ? "flex-end" : "flex-start", padding: 2, transition: "background .2s" }}>
                            <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#ffffff", boxShadow: "0 1px 2px #00000033" }} />
                          </span>
                        </button>
                      ) : null}
                    </span>
                    <span style={{ width: 72, display: "flex", justifyContent: "flex-end", gap: 2 }}>
                      {canEdit ? (
                        <button
                          type="button"
                          className={styles.icon}
                          onClick={() => open(account)}
                          aria-label={tx("editAcc")}
                          title={tx("editAcc")}
                          style={{ width: 32, height: 32, display: "grid", placeItems: "center", border: 0, borderRadius: 6, background: "transparent", color: "#737870", padding: 0 }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                          </svg>
                        </button>
                      ) : null}
                      {canToggle ? (
                        <button
                          type="button"
                          className={styles.trash}
                          onClick={() => {
                            if (window.confirm(tx("confirmDel"))) remove.mutate(account);
                          }}
                          aria-label={tx("remove")}
                          title={tx("remove")}
                          style={{ width: 32, height: 32, display: "grid", placeItems: "center", border: 0, borderRadius: 6, background: "transparent", color: "#92958e", padding: 0 }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                          </svg>
                        </button>
                      ) : null}
                    </span>
                  </div>
                );
              })}
        </div>
        <p style={{ fontSize: 11.5, color: "#92958e" }}>{tx("note")}</p>

        {draft ? (
          <AccountDialog
            draft={draft}
            self={draft.id !== null && draft.id === user?.id}
            amOwner={amOwner}
            error={error}
            busy={save.isPending}
            tx={tx}
            nx={nx}
            onChange={(patch) => {
              setError("");
              setDraft((current) => (current ? { ...current, ...patch } : current));
            }}
            onCancel={() => setDraft(null)}
            onSave={submit}
          />
        ) : null}
      </section>
    </AdminShell>
  );
}

function AccountDialog({
  draft,
  self,
  amOwner,
  error,
  busy,
  tx,
  nx,
  onChange,
  onCancel,
  onSave,
}: {
  draft: Draft;
  self: boolean;
  amOwner: boolean;
  error: string;
  busy: boolean;
  tx: TextFn<typeof TEXT>;
  nx: TextFn<typeof NAV_TEXT>;
  onChange: (patch: Partial<Draft>) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const isNew = draft.id === null;
  // Your own access is not yours to change, and the owner's is nobody's.
  const showAccess = !self && draft.access !== "owner";
  const label = { display: "flex", flexDirection: "column" as const, gap: 6, fontSize: 11.5, fontWeight: 600, color: "#4a514d" };
  const input = { height: 42, padding: "0 12px", border: "1px solid #cfd3cb", borderRadius: 8, background: "#ffffff", fontSize: 13.5, color: "#252b28" };
  const eyebrow = { fontSize: 10.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#737870" };

  const togglePage = (page: AdminPage) =>
    onChange({ pages: draft.pages.includes(page) ? draft.pages.filter((p) => p !== page) : [...draft.pages, page] });

  return (
    <div
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, zIndex: 900, background: "#1d222066", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "clamp(12px,5vh,56px) 16px", overflowY: "auto" }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={tx(isNew ? "newAcc" : "editAcc")}
        style={{ width: "100%", maxWidth: 660, background: "#ffffff", borderRadius: 16, boxShadow: "0 30px 80px #0000003d", overflow: "hidden" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "18px 22px", borderBottom: "1px solid #eef0ea" }}>
          <h2 style={{ fontSize: 18, fontWeight: 650, letterSpacing: "var(--a-ls-h2)" }}>{tx(isNew ? "newAcc" : "editAcc")}</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label={tx("close")}
            style={{ width: 34, height: 34, display: "grid", placeItems: "center", border: 0, borderRadius: 8, background: "#f5f5f0", color: "#252b28", padding: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", gap: 12 }}>
            <label style={label}>
              {tx("name")}
              <input ref={nameRef} value={draft.name} onChange={(event) => onChange({ name: event.target.value })} style={input} />
            </label>
            <label style={label}>
              {tx("email")}
              <input dir="ltr" type="email" value={draft.email} onChange={(event) => onChange({ email: event.target.value })} style={input} />
            </label>
          </div>

          {self ? null : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#4a514d" }}>{tx("pass")}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", height: 42, border: "1px solid #cfd3cb", borderRadius: 8, background: "#ffffff", paddingInline: "12px 4px" }}>
                  <input
                    dir="ltr"
                    type={draft.show ? "text" : "password"}
                    value={draft.pass}
                    onChange={(event) => onChange({ pass: event.target.value })}
                    placeholder={isNew ? "" : tx("passKeep")}
                    autoComplete="new-password"
                    aria-label={tx("pass")}
                    style={{ flex: 1, width: "100%", minWidth: 0, border: 0, padding: 0, background: "transparent", font: "13.5px ui-monospace,Menlo,monospace", color: "#252b28", boxShadow: "none", outline: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ show: !draft.show })}
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
                  onClick={() => onChange({ pass: generatePassword(), show: true })}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 42, padding: "0 14px", border: "1px solid #d71635", borderRadius: 8, background: "#ffffff", color: "#252b28", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5" />
                  </svg>
                  {tx("gen")}
                </button>
              </div>
            </div>
          )}

          {showAccess ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={eyebrow}>{tx("access")}</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 10 }}>
                {(["admin", "member"] as const).map((key) => {
                  const on = draft.access === key;
                  // Full access is the owner's to give; anyone else sees why it is out of reach.
                  const locked = key === "admin" && !amOwner && !on;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={locked}
                      onClick={() => onChange({ access: key })}
                      style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", border: `1.5px solid ${on ? "#d71635" : "#e3e5de"}`, borderRadius: 10, background: on ? "#fff6f6" : "#ffffff", textAlign: "start", color: "#252b28", opacity: locked ? 0.45 : 1, cursor: locked ? "not-allowed" : "pointer" }}
                    >
                      <span style={{ width: 16, height: 16, marginTop: 2, borderRadius: "50%", border: `1.5px solid ${on ? "#d71635" : "#cfd3cb"}`, display: "grid", placeItems: "center", flex: "none" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: on ? "#d71635" : "#ffffff" }} />
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <b style={{ fontSize: 13, fontWeight: 650 }}>{tx(key === "admin" ? "roleAdmin" : "roleMember")}</b>
                        <small style={{ fontSize: 11.5, color: "#737870", lineHeight: 1.4 }}>
                          {tx(key === "member" ? "roleMemberSub" : locked ? "roleAdminOwner" : "roleAdminSub")}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {showAccess && draft.access === "member" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={eyebrow}>{tx("pages")}</span>
                <span style={{ display: "flex", gap: 2 }}>
                  <button
                    type="button"
                    onClick={() => onChange({ pages: [...ADMIN_PAGES] })}
                    style={{ padding: "4px 8px", border: 0, borderRadius: 6, background: "transparent", color: "#d71635", fontSize: 12, fontWeight: 600 }}
                  >
                    {tx("all")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ pages: [] })}
                    style={{ padding: "4px 8px", border: 0, borderRadius: 6, background: "transparent", color: "#737870", fontSize: 12, fontWeight: 600 }}
                  >
                    {tx("none")}
                  </button>
                </span>
              </div>
              {ADMIN_PAGE_GROUPS.map((group) => (
                <div key={group.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <small style={{ fontSize: 9.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#92958e" }}>{nx(group.key)}</small>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,180px),1fr))", gap: 6 }}>
                    {group.pages.map((page) => {
                      const on = draft.pages.includes(page);
                      return (
                        <button
                          key={page}
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          onClick={() => togglePage(page)}
                          style={{ display: "flex", alignItems: "center", gap: 9, minHeight: 42, padding: "0 12px", border: `1px solid ${on ? "#d71635" : "#e3e5de"}`, borderRadius: 9, background: on ? "#fff6f6" : "#ffffff", color: on ? "#252b28" : "#4a514d", fontSize: 12.5, fontWeight: 550, textAlign: "start" }}
                        >
                          <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${on ? "#d71635" : "#cfd3cb"}`, background: on ? "#d71635" : "#ffffff", display: "grid", placeItems: "center", flex: "none", color: "#ffffff" }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M5 12l5 5L20 7" />
                            </svg>
                          </span>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", opacity: 0.7 }} aria-hidden="true">
                            <path d={ADMIN_ICONS[page]} />
                          </svg>
                          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nx(page)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", padding: "14px 22px", borderTop: "1px solid #eef0ea", background: "#fafaf7" }}>
          {error ? <small style={{ marginInlineEnd: "auto", fontSize: 12, color: "#d71635", fontWeight: 600 }}>{error}</small> : null}
          <button
            type="button"
            onClick={onCancel}
            style={{ minHeight: 40, padding: "0 16px", border: "1px solid #e3e5de", borderRadius: 8, background: "#ffffff", color: "#252b28", fontSize: 12.5, fontWeight: 600 }}
          >
            {tx("cancel")}
          </button>
          <button
            type="button"
            className={styles.red}
            disabled={busy}
            onClick={onSave}
            style={{ minHeight: 40, padding: "0 18px", border: "1px solid #d71635", borderRadius: 8, background: "#d71635", color: "#ffffff", fontSize: 12.5, fontWeight: 600, opacity: busy ? 0.7 : 1 }}
          >
            {tx(isNew ? "create" : "save")}
          </button>
        </div>
      </div>
    </div>
  );
}
