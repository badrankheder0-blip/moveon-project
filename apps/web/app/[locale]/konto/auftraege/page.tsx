"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useAccountText } from "@/app/components/account/AccountShell";
import { useMyOrders } from "@/app/components/account/data";
import { Icon } from "@/app/components/account/Icon";
import { IC, day, money, serviceOf, statusPill, tabOf, type Tab } from "@/app/components/account/model";
import { useI18n } from "@/lib/i18n/provider";

/**
 * The customer's bookings in three tabs: upcoming (soonest first), past and
 * cancelled (latest first). The server returns only this customer's orders;
 * status changes arrive live, so a confirmation shows without a reload.
 */
export default function MyBookingsPage() {
  const { locale } = useI18n();
  const tx = useAccountText();
  const orders = useMyOrders();
  const [tab, setTab] = useState<Tab>("up");

  const all = useMemo(() => orders.data?.items ?? [], [orders.data]);
  const rows = useMemo(
    () =>
      all
        .filter((order) => tabOf(order) === tab)
        .sort((a, b) => (tab === "up" ? 1 : -1) * (a.scheduledDate ?? a.createdAt.slice(0, 10)).localeCompare(b.scheduledDate ?? b.createdAt.slice(0, 10))),
    [all, tab],
  );

  const tabs: [Tab, string][] = [
    ["up", tx("upcoming")],
    ["past", tx("past")],
    ["can", tx("cancelledT")],
  ];

  return (
    <>
      <div className="ac-bar is-end">
        <h1 className="ac-h1">{tx("myOrders")}</h1>
        <div className="ac-seg" role="group" aria-label={tx("myOrders")}>
          {tabs.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>
              {label} <span>{all.filter((order) => tabOf(order) === key).length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="ac-list">
        {orders.isLoading ? <div className="ac-skel" style={{ height: 80, borderRadius: 0 }} /> : null}
        {rows.map((order, i) => {
          const service = serviceOf(order.serviceType);
          const status = statusPill(order.status);
          return (
            <Link key={order.id} href={`/${locale}/konto/auftraege/${order.id}`} className="ac-row" data-rv={String((i % 4) + 1)}>
              <span className="ac-row-ic">
                <Icon d={service.icon} size={20} />
              </span>
              <span className="ac-row-t">
                <b>{tx(service.name)}</b>
                <small>
                  <span dir="ltr">{order.reference}</span> · {day(order.scheduledDate ?? order.createdAt, locale)}
                </small>
              </span>
              <span className="ac-pill" style={{ background: status.bg, color: status.color }}>
                {tx(status.label)}
              </span>
              <b dir="ltr" className="ac-row-sum">
                {money(order.totalGross, locale)}
              </b>
              <Icon d={IC.chevron} size={16} sw={2.2} color="#a0a49c" flip />
            </Link>
          );
        })}
        {orders.isError ? (
          <p className="ac-none">
            {tx("loadFailed")}{" "}
            <button type="button" className="au-under" onClick={() => void orders.refetch()}>
              {tx("retry")}
            </button>
          </p>
        ) : null}
        {!orders.isLoading && !orders.isError && rows.length === 0 ? <p className="ac-none">{tx("noneHere")}</p> : null}
      </div>
    </>
  );
}
