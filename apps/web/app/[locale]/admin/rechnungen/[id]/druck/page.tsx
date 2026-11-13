"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { euroDe } from "@/lib/admin/format";
import { defineText, useText } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { LOCALE_META } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { useSiteSettings } from "@/lib/site/useSiteSettings";

import type { Invoice } from "../../invoice-types";

/**
 * The printable Rechnung: one A4 page in German whatever the dashboard's
 * language, opened in its own tab from the invoices list and printed (or
 * saved as PDF) from the browser, as the prototype's print window was.
 *
 * Everything on it comes from the invoice's snapshot, so a reprint a year
 * later shows what was issued. The amounts are gross, VAT included: the net
 * and the VAT are worked back out of the total and the VAT is shown as
 * contained in it, never as "zzgl." on top of an amount that already holds it.
 */

const TEXT = defineText({
  print: { de: "Drucken / als PDF speichern", en: "Print / save as PDF", ar: "طباعة / حفظ كملف PDF", tr: "Yazdır / PDF olarak kaydet" },
  close: { de: "Schließen", en: "Close", ar: "إغلاق", tr: "Kapat" },
  loading: { de: "Rechnung wird geladen…", en: "Loading the invoice…", ar: "جارٍ تحميل الفاتورة…", tr: "Fatura yükleniyor…" },
  missing: { de: "Diese Rechnung wurde nicht gefunden.", en: "This invoice was not found.", ar: "لم يتم العثور على هذه الفاتورة.", tr: "Bu fatura bulunamadı." },
  noTax: {
    de: "Hinweis: Steuernummer und USt-IdNr. fehlen. Eine Rechnung muss eine davon tragen (Einstellungen).",
    en: "Note: the tax number and the VAT ID are missing. An invoice must carry one of them (Settings).",
    ar: "تنبيه: الرقم الضريبي ورقم ضريبة القيمة المضافة غير موجودين. يجب أن تحمل الفاتورة أحدهما (الإعدادات).",
    tr: "Not: vergi numarası ve KDV kimlik numarası eksik. Faturada bunlardan biri bulunmalıdır (Ayarlar).",
  },
});

/** "2026-10-25" → "25.10.2026". */
const dayDe = (iso: string | null | undefined) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
};

/** An ISO instant as a German calendar day, in Berlin. */
const instantDe = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" }) : "";

/** "Königsallee 20, 40212 Düsseldorf" → two lines, as an address block is written. */
const addressLines = (address: string | undefined) => (address ? address.split(/,\s*/).filter(Boolean) : []);

const CSS = `
.rx-page { min-height: 100vh; background: #f1f1ea; padding: 24px 16px 48px; }
.rx-bar { max-width: 210mm; margin: 0 auto 16px; display: flex; justify-content: flex-end; gap: 8px; font-family: 'Geist', Arial, sans-serif; }
.rx-bar button { min-height: 38px; padding: 0 14px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
.rx-note { max-width: 210mm; margin: 0 auto 12px; padding: 10px 14px; border-radius: 8px; background: #fff1f3; border: 1px solid #f3c9cf; color: #b7122b; font: 12.5px Arial, sans-serif; }
.rx { box-sizing: border-box; max-width: 210mm; min-height: 297mm; margin: 0 auto; padding: 48px; background: #ffffff; box-shadow: 0 12px 36px #202a2314; font-family: Helvetica, Arial, sans-serif; color: #252b28; font-size: 12.5px; line-height: 1.5; display: flex; flex-direction: column; }
.rx * { box-sizing: border-box; }
.rx header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #d71635; padding-bottom: 18px; margin-bottom: 26px; }
.rx header img { height: 34px; width: auto; }
.rx h1 { font-size: 24px; margin: 0 0 4px; font-weight: 700; font-family: inherit; letter-spacing: 0; }
.rx small { color: #737870; font-size: 11px; }
.rx p { margin: 0 0 6px; }
.rx .grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 28px; margin-bottom: 26px; }
.rx table { width: 100%; border-collapse: collapse; }
.rx .meta td { padding: 2px 0; border: 0; vertical-align: top; }
.rx .meta td:first-child { color: #737870; padding-right: 18px; white-space: nowrap; }
.rx .lines th { padding: 0 0 8px; text-align: left; font-size: 10.5px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; color: #737870; border-bottom: 1px solid #252b28; }
.rx .lines td { padding: 9px 0; border-bottom: 1px solid #e3e5de; vertical-align: top; }
.rx .r { text-align: right; white-space: nowrap; padding-left: 16px; }
.rx .sum td { border-bottom: 0; padding: 5px 0; }
.rx .sum tr:first-child td { padding-top: 12px; }
.rx .t td { border-top: 1px solid #252b28; font-weight: 700; font-size: 15px; padding-top: 10px; }
.rx .pay { margin-top: 22px; }
.rx .bank { margin-top: 10px; padding: 12px 14px; border: 1px solid #e3e5de; border-radius: 6px; display: grid; grid-template-columns: auto 1fr; gap: 2px 18px; font-size: 12px; }
.rx .bank span:nth-child(odd) { color: #737870; }
.rx .void { display: inline-block; margin-top: 6px; padding: 3px 10px; border: 2px solid #b7122b; color: #b7122b; font-weight: 700; letter-spacing: 2px; }
.rx footer { margin-top: auto; padding-top: 14px; border-top: 1px solid #e3e5de; display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; font-size: 10.5px; color: #4a514d; }
.rx .spacer { flex: 1; min-height: 40px; }
@page { size: A4; margin: 0; }
@media print {
  html, body { background: #ffffff !important; }
  .rx-page { padding: 0; background: #ffffff; }
  .rx-bar, .rx-note { display: none !important; }
  .rx { box-shadow: none; margin: 0; max-width: none; width: 210mm; min-height: 297mm; padding: 18mm 18mm 14mm; }
}
`;

export default function InvoicePrintPage() {
  const { sdk, user, loading, isStaff } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const router = useRouter();
  const site = useSiteSettings();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const printed = useRef(false);

  useEffect(() => {
    if (!loading && !user) router.replace(`/${locale}/login?next=${encodeURIComponent(window.location.pathname)}`);
  }, [loading, user, router, locale]);

  const query = useQuery({
    queryKey: ["invoices", "one", id],
    queryFn: () => sdk.http.get<{ invoice: Invoice }>(`/api/invoices/${id}`),
    enabled: Boolean(user && id),
  });
  const invoice = query.data?.invoice;

  useEffect(() => {
    if (invoice) document.title = `Rechnung ${invoice.number}`;
  }, [invoice]);

  // Opened from the list with ?print=1: print once the page (and its logo) has painted.
  useEffect(() => {
    if (!invoice || printed.current) return;
    if (new URLSearchParams(window.location.search).get("print") !== "1") return;
    printed.current = true;
    const timer = setTimeout(() => window.print(), 600);
    return () => clearTimeout(timer);
  }, [invoice]);

  if (!invoice) {
    return (
      <div className="rx-page" dir="ltr">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="rx" style={{ justifyContent: "center", alignItems: "center", color: "#737870" }}>
          {query.isError ? tx("missing") : tx("loading")}
        </div>
      </div>
    );
  }

  const seller = invoice.seller;
  const customer = invoice.customer;
  const rate = Number(invoice.vatRate);
  const rateText = `${rate.toLocaleString("de-DE", { maximumFractionDigits: 2 })} %`;
  const dates = customer.serviceDates ?? [];
  const logo = seller.logo || site.logo;
  const sellerName = seller.name || site.legalName;

  return (
    <div className="rx-page" dir="ltr" lang="de">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* The tools around the sheet speak the dashboard's language; the sheet is German. */}
      <div className="rx-bar" dir={LOCALE_META[locale].dir} lang={locale}>
        <button type="button" onClick={() => window.close()} style={{ border: "1px solid #cfd3cb", background: "#ffffff", color: "#252b28" }}>
          {tx("close")}
        </button>
        <button type="button" onClick={() => window.print()} style={{ border: "1px solid #d71635", background: "#d71635", color: "#ffffff" }}>
          {tx("print")}
        </button>
      </div>
      {/* A note for the office; the customer prints the same page from their account. */}
      {isStaff && !seller.vatId && !seller.taxNumber ? (
        <div className="rx-note" dir={LOCALE_META[locale].dir} lang={locale}>
          {tx("noTax")}
        </div>
      ) : null}

      <article className="rx">
        <header>
          {/* eslint-disable-next-line @next/next/no-img-element -- printed as-is, no optimisation wanted */}
          <img src={logo} alt={sellerName} />
          <div style={{ textAlign: "right" }}>
            <h1>Rechnung</h1>
            <small>{invoice.number}</small>
            {invoice.status === "cancelled" ? (
              <div>
                <span className="void">STORNIERT</span>
              </div>
            ) : null}
          </div>
        </header>

        <div className="grid">
          <div>
            <small style={{ textDecoration: "underline", textUnderlineOffset: 2 }}>{[sellerName, seller.address].filter(Boolean).join(" · ")}</small>
            <p style={{ marginTop: 10 }}>
              <b>{customer.company || customer.name}</b>
              {customer.company ? (
                <>
                  <br />
                  {customer.name}
                </>
              ) : null}
              {addressLines(customer.address).map((line) => (
                <span key={line}>
                  <br />
                  {line}
                </span>
              ))}
            </p>
            {customer.vatId ? <p style={{ fontSize: 11.5, color: "#737870" }}>USt-IdNr. {customer.vatId}</p> : null}
          </div>
          <table className="meta">
            <tbody>
              <tr>
                <td>Rechnungsnr.</td>
                <td>{invoice.number}</td>
              </tr>
              <tr>
                <td>Rechnungsdatum</td>
                <td>{dayDe(invoice.issueDate)}</td>
              </tr>
              <tr>
                <td>Leistungsdatum</td>
                <td>{dates.length ? dates.map(dayDe).join(", ") : "entspricht Rechnungsdatum"}</td>
              </tr>
              {invoice.orderReference ? (
                <tr>
                  <td>Auftrag</td>
                  <td>{invoice.orderReference}</td>
                </tr>
              ) : null}
              <tr>
                <td>Fällig am</td>
                <td>
                  <b>{dayDe(invoice.dueDate)}</b>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <table className="lines">
          <thead>
            <tr>
              <th>Leistung</th>
              <th className="r" style={{ textAlign: "right" }}>
                Betrag (brutto)
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, index) => (
              <tr key={index}>
                <td>{line.label}</td>
                <td className="r">{line.amount < 0 ? `−${euroDe(Math.abs(line.amount))}` : euroDe(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="sum">
          <tbody>
            <tr>
              <td>Nettobetrag</td>
              <td className="r">{euroDe(invoice.netAmount)}</td>
            </tr>
            <tr>
              <td>Umsatzsteuer {rateText} (im Bruttobetrag enthalten)</td>
              <td className="r">{euroDe(invoice.vatAmount)}</td>
            </tr>
            <tr className="t">
              <td>Rechnungsbetrag</td>
              <td className="r">{euroDe(invoice.totalGross)}</td>
            </tr>
          </tbody>
        </table>
        <p style={{ marginTop: 8, fontSize: 11, color: "#737870" }}>Alle Positionen verstehen sich inklusive {rateText} gesetzlicher Umsatzsteuer.</p>

        <div className="pay">
          {invoice.status === "cancelled" ? (
            <p>Diese Rechnung wurde storniert und ist nicht zu bezahlen.</p>
          ) : invoice.paidAt ? (
            <p>Betrag dankend erhalten am {instantDe(invoice.paidAt)}.</p>
          ) : (
            <>
              <p>
                Bitte überweisen Sie den Rechnungsbetrag bis zum <b>{dayDe(invoice.dueDate)}</b> unter Angabe der Rechnungsnummer {invoice.number}
                {seller.iban ? " auf das folgende Konto:" : "."}
              </p>
              {seller.iban ? (
                <div className="bank">
                  <span>Kontoinhaber</span>
                  <span>{sellerName}</span>
                  <span>IBAN</span>
                  <span>{seller.iban}</span>
                  {seller.bic ? (
                    <>
                      <span>BIC</span>
                      <span>{seller.bic}</span>
                    </>
                  ) : null}
                  {seller.bank ? (
                    <>
                      <span>Bank</span>
                      <span>{seller.bank}</span>
                    </>
                  ) : null}
                  <span>Verwendungszweck</span>
                  <span>{invoice.number}</span>
                </div>
              ) : null}
            </>
          )}
          <p style={{ marginTop: 14 }}>Vielen Dank für Ihren Auftrag.</p>
        </div>

        <div className="spacer" />

        <footer>
          <div>
            <b>{sellerName}</b>
            {addressLines(seller.address).map((line) => (
              <span key={line}>
                <br />
                {line}
              </span>
            ))}
            {seller.managingDirector ? (
              <>
                <br />
                Geschäftsführung: {seller.managingDirector}
              </>
            ) : null}
          </div>
          <div>
            {[seller.email, seller.phone, seller.website].filter(Boolean).map((line, i) => (
              <span key={line}>
                {i > 0 ? <br /> : null}
                {line}
              </span>
            ))}
          </div>
          <div>
            {[
              seller.iban ? `IBAN ${seller.iban}` : "",
              seller.bic ? `BIC ${seller.bic}` : "",
              seller.vatId ? `USt-IdNr. ${seller.vatId}` : "",
              seller.taxNumber ? `St.-Nr. ${seller.taxNumber}` : "",
              seller.register ?? "",
            ]
              .filter(Boolean)
              .map((line, i) => (
                <span key={line}>
                  {i > 0 ? <br /> : null}
                  {line}
                </span>
              ))}
          </div>
        </footer>
      </article>
    </div>
  );
}
