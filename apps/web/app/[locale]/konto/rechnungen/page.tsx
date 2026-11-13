"use client";

import { useMemo } from "react";

import { useAccountText } from "@/app/components/account/AccountShell";
import { useMyInvoices, useMyOrders } from "@/app/components/account/data";
import { Icon } from "@/app/components/account/Icon";
import { IC, day, invoicePill, money, serviceOf } from "@/app/components/account/model";
import { useI18n } from "@/lib/i18n/provider";

/**
 * The customer's invoices, once the office has sent them (drafts stay the
 * office's). Each opens as the printable Rechnung in its own tab, to print or
 * save as PDF.
 */
export default function AccountInvoicesPage() {
  const { locale } = useI18n();
  const tx = useAccountText();
  const invoices = useMyInvoices();
  const orders = useMyOrders();

  const serviceByOrder = useMemo(
    () => new Map((orders.data?.items ?? []).map((order) => [order.id, order.serviceType])),
    [orders.data],
  );
  const rows = invoices.data?.invoices ?? [];

  return (
    <>
      <h1 className="ac-h1">{tx("invoices")}</h1>
      <div className="ac-list">
        {invoices.isLoading ? <div className="ac-skel" style={{ height: 80, borderRadius: 0 }} /> : null}
        {rows.map((invoice, i) => {
          const pill = invoicePill(invoice.status);
          const type = serviceByOrder.get(invoice.orderId);
          const href = `/${locale}/dashboard/rechnungen/${invoice.id}`;
          return (
            <div key={invoice.id} className="ac-row" data-rv={String((i % 4) + 1)}>
              <span className="ac-row-ic is-grey">
                <Icon d={IC.doc} size={20} />
              </span>
              <span className="ac-row-t">
                <b dir="ltr">{invoice.number}</b>
                <small>
                  {type ? tx(serviceOf(type).name) : <span dir="ltr">{invoice.orderReference}</span>} · {day(invoice.issueDate, locale)}
                </small>
              </span>
              <span className="ac-pill" style={{ background: pill.bg, color: pill.color }}>
                {tx(pill.label)}
              </span>
              <b dir="ltr" className="ac-row-sum" style={{ fontWeight: 700 }}>
                {money(invoice.totalGross, locale)}
              </b>
              <a className="ac-dl" href={href} target="_blank" rel="noopener noreferrer" aria-label={tx("downloadInvoice")} title={tx("downloadInvoice")}>
                <Icon d={IC.download} size={16} sw={2} />
              </a>
            </div>
          );
        })}
        {invoices.isError ? (
          <p className="ac-none">
            {tx("loadFailed")}{" "}
            <button type="button" className="au-under" onClick={() => void invoices.refetch()}>
              {tx("retry")}
            </button>
          </p>
        ) : null}
        {!invoices.isLoading && !invoices.isError && rows.length === 0 ? <p className="ac-none">{tx("noInvoices")}</p> : null}
      </div>
    </>
  );
}
