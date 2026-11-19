"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminShell } from "@/app/components/admin/AdminShell";
import { formatDate, money } from "@/lib/admin/format";
import { ADMIN_PATHS } from "@/lib/admin/nav";
import { defineText, useText } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

import { CustomerDialog, type CustomerPrefill } from "./CustomerDialog";
import styles from "./page.module.css";

/**
 * Customers: everyone who has booked, grouped by email, as the admin
 * prototype lists them — name, company and email, phone, how many orders,
 * what they booked (cancelled orders left out) and when they last ordered,
 * with a way into their orders. Customer accounts that have not booked yet
 * follow at the end.
 *
 * A name opens the person's account (CustomerDialog): their profile, to read
 * or, with `customers.write`, to correct, give a new password or switch off.
 * Someone who booked without an account opens a new account prefilled from
 * their booking, and "New customer" makes one for anybody.
 */

const TEXT = defineText({
  title: { de: "Kunden", en: "Customers", ar: "الزبائن", tr: "Müşteriler" },
  sub: {
    de: "Alle, die gebucht haben, nach E-Mail gruppiert.",
    en: "Everyone who has booked, grouped by email.",
    ar: "كل من حجز عندك، مجمّعين حسب البريد الإلكتروني.",
    tr: "Rezervasyon yapan herkes, e-postaya göre gruplanmış.",
  },
  search: { de: "Kunden suchen", en: "Search customers", ar: "ابحث عن زبون", tr: "Müşteri ara" },
  customer: { de: "Kunde", en: "Customer", ar: "الزبون", tr: "Müşteri" },
  firstName: { de: "Vorname", en: "First name", ar: "الاسم الأول", tr: "Ad" },
  lastName: { de: "Nachname", en: "Last name", ar: "الكنية", tr: "Soyad" },
  phone: { de: "Telefon", en: "Phone", ar: "الهاتف", tr: "Telefon" },
  orders: { de: "Aufträge", en: "Orders", ar: "الطلبات", tr: "Siparişler" },
  spent: { de: "Buchungswert", en: "Booked value", ar: "قيمة الحجوزات", tr: "Rezervasyon tutarı" },
  last: { de: "Letzter Auftrag", en: "Last order", ar: "آخر طلب", tr: "Son sipariş" },
  view: { de: "Aufträge ansehen", en: "View orders", ar: "عرض الطلبات", tr: "Siparişleri gör" },
  add: { de: "Neuer Kunde", en: "New customer", ar: "زبون جديد", tr: "Yeni müşteri" },
  open: { de: "Profil öffnen", en: "Open profile", ar: "فتح الملف", tr: "Profili aç" },
  noAccount: { de: "Ohne Konto", en: "No account", ar: "بدون حساب", tr: "Hesapsız" },
  none: { de: "Keine passenden Kunden.", en: "No customers match.", ar: "لا يوجد زبائن مطابقون.", tr: "Eşleşen müşteri yok." },
  private: { de: "Privatkunde", en: "Private customer", ar: "زبون فرد", tr: "Bireysel müşteri" },
  business: { de: "Geschäftskunde", en: "Business", ar: "شركة", tr: "Kurumsal" },
  loadFailed: {
    de: "Die Kunden konnten nicht geladen werden.",
    en: "The customers could not be loaded.",
    ar: "تعذّر تحميل الزبائن.",
    tr: "Müşteriler yüklenemedi.",
  },
});

interface Customer {
  /** The customer account behind the row, or null for someone who booked without one. */
  userId: string | null;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  company: string;
  type: "private" | "business";
  orders: number;
  bookedValue: string;
  lastOrderAt: string | null;
  hasAccount: boolean;
}

const COLS = {
  who: { flex: "1 1 200px" },
  last2: { flex: "0 1 150px" },
  phone: { flex: "0 0 150px" },
  n: { flex: "0 0 70px" },
  spent: { flex: "0 0 110px", textAlign: "end" as const },
  last: { flex: "0 0 110px" },
  act: { flex: "0 0 120px" },
};

export default function CustomersPage() {
  const { sdk, can } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  /** The open account: an id, or a new one (possibly prefilled from a booking). */
  const [dialog, setDialog] = useState<{ id: string | null; prefill?: CustomerPrefill } | null>(null);

  // The list narrows as you type, as the prototype's does, without a request
  // per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(query.trim()), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const data = useQuery({
    queryKey: ["admin", "customers", term],
    queryFn: () =>
      sdk.http.get<{ customers: Customer[]; total: number }>("/api/admin/customers", term ? { q: term } : undefined),
    placeholderData: keepPreviousData,
  });

  const customers = data.data?.customers ?? [];
  const mayOpenOrders = can("orders.read");
  const canWrite = can("customers.write");

  /** What a name does: opens the account, or starts one from the booking when there is none. */
  function openRow(c: Customer) {
    if (c.userId) return setDialog({ id: c.userId });
    if (!canWrite) return;
    setDialog({
      id: null,
      prefill: {
        firstName: c.firstName || c.name,
        lastName: c.lastName ?? "",
        email: c.email,
        phone: c.phone,
        company: c.company,
        type: c.type,
      },
    });
  }

  return (
    <AdminShell view="customers">
      <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "var(--a-ls-h1)", lineHeight: 1.2 }}>{tx("title")}</h1>
            <p style={{ color: "#737870", fontSize: 13, marginTop: 6 }}>{tx("sub")}</p>
          </div>
          <div style={{ flex: "0 1 460px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <label style={{ flex: "1 1 220px", display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#737870" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tx("search")}
                aria-label={tx("search")}
                style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", fontSize: 13, boxShadow: "none" }}
              />
            </label>
            {canWrite ? (
              <button
                type="button"
                onClick={() => setDialog({ id: null })}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: "none", whiteSpace: "nowrap", minHeight: 38, padding: "0 16px", border: "1px solid #d71635", borderRadius: 6, background: "#d71635", color: "#ffffff", fontSize: 12, fontWeight: 600 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {tx("add")}
              </button>
            ) : null}
          </div>
        </div>

        {data.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}

        <div style={{ background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, overflow: "hidden", boxShadow: "0 12px 36px #202a2308" }}>
          <div
            className={styles.head}
            style={{ gap: 18, padding: "11px 20px", background: "#fafaf7", borderBottom: "1px solid #e3e5de", fontSize: 10.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#737870" }}
          >
            <span style={COLS.who}>{tx("firstName")}</span>
            <span style={COLS.last2}>{tx("lastName")}</span>
            <span style={COLS.phone}>{tx("phone")}</span>
            <span style={COLS.n}>{tx("orders")}</span>
            <span style={COLS.spent}>{tx("spent")}</span>
            <span style={COLS.last}>{tx("last")}</span>
            <span style={COLS.act} />
          </div>

          {data.isPending
            ? Array.from({ length: 5 }, (_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, padding: "13px 20px", borderBottom: "1px solid #eef0ea" }}>
                  <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#f1f1ea", flex: "none" }} />
                  <div className="a-skel" style={{ flex: 1, maxWidth: 260 }} />
                </div>
              ))
            : customers.map((c) => {
                const sub = [c.company, c.email].filter(Boolean).join(" · ");
                const opens = Boolean(c.userId) || canWrite;
                return (
                  <div key={c.email} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 18px", padding: "13px 20px", borderBottom: "1px solid #eef0ea" }}>
                    <button
                      type="button"
                      className={styles.who}
                      disabled={!opens}
                      onClick={() => openRow(c)}
                      title={opens ? tx("open") : undefined}
                      style={{ ...COLS.who, minWidth: 0, display: "flex", alignItems: "center", gap: 12, padding: 0, border: 0, background: "transparent", textAlign: "start", color: "inherit", cursor: opens ? "pointer" : "default" }}
                    >
                      <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff6f6", color: "#d71635", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700, flex: "none" }}>
                        {(c.name || "?").trim().charAt(0).toUpperCase()}
                      </span>
                      <span style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <b style={{ fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span className={styles.name}>{c.firstName || c.name || "—"}</span>
                          {c.userId ? null : (
                            <span style={{ padding: "1px 7px", borderRadius: 999, background: "#f5f5f0", color: "#737870", fontSize: 10, fontWeight: 650 }}>{tx("noAccount")}</span>
                          )}
                        </b>
                        <small style={{ fontSize: 11.5, color: "#737870", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <bdi>{sub}</bdi>
                        </small>
                      </span>
                    </button>
                    <span style={{ ...COLS.last2, fontSize: 13.5, fontWeight: 600, color: "#252b28" }}>{c.firstName || c.lastName ? c.lastName || "—" : ""}</span>
                    <span dir="ltr" style={{ ...COLS.phone, fontSize: 12.5, color: "#252b28" }}>
                      {c.phone}
                    </span>
                    <span style={{ ...COLS.n, fontSize: 13, fontWeight: 600 }}>{c.orders}</span>
                    <span style={{ ...COLS.spent, fontSize: 13, fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>
                      <bdi>{money(c.bookedValue)}</bdi>
                    </span>
                    <span style={{ ...COLS.last, fontSize: 12.5, color: "#737870" }}>
                      {c.lastOrderAt ? formatDate(c.lastOrderAt, locale, { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </span>
                    <span style={{ ...COLS.act, display: "flex", justifyContent: "flex-end" }}>
                      {mayOpenOrders && c.orders > 0 ? (
                        <button
                          type="button"
                          onClick={() => router.push(`/${locale}${ADMIN_PATHS.orders}?q=${encodeURIComponent(c.email)}`)}
                          style={{ minHeight: 34, padding: "0 12px", border: "1px solid #d71635", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 550, whiteSpace: "nowrap" }}
                        >
                          {tx("view")}
                        </button>
                      ) : null}
                    </span>
                  </div>
                );
              })}

          {!data.isPending && customers.length === 0 ? (
            <p style={{ padding: "44px 20px", textAlign: "center", color: "#737870", fontSize: 13 }}>{tx("none")}</p>
          ) : null}
        </div>
      </section>
      {dialog ? <CustomerDialog key={dialog.id ?? "new"} accountId={dialog.id} prefill={dialog.prefill} canWrite={canWrite} onClose={() => setDialog(null)} /> : null}
    </AdminShell>
  );
}
