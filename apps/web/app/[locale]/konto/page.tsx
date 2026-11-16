"use client";

import type { OrderSummary } from "@mon/client";
import Link from "next/link";
import { useMemo } from "react";

import { useAccountText } from "@/app/components/account/AccountShell";
import { useMarkRead, useMyNotifications, useMyOrders } from "@/app/components/account/data";
import { Icon, Truck } from "@/app/components/account/Icon";
import {
  IC,
  NOTE_LOOK,
  RED,
  day,
  longDay,
  serviceOf,
  statusPill,
  tabOf,
  trackOf,
  truckIndex,
  type AccountOrder,
} from "@/app/components/account/model";
import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { useLiveOrder } from "@/lib/live/useLiveData";

/**
 * The account's overview: a greeting, the newest unread notification, the
 * next booking with its progress, and four ways onward.
 */
export default function AccountOverviewPage() {
  const { user } = useApi();
  const { locale } = useI18n();
  const tx = useAccountText();

  const orders = useMyOrders();
  const notifications = useMyNotifications();
  const markRead = useMarkRead();

  const all = useMemo(() => orders.data?.items ?? [], [orders.data]);
  const next = useMemo(
    () =>
      all
        .filter((order) => tabOf(order) === "up")
        .sort((a, b) => (a.scheduledDate ?? "9999").localeCompare(b.scheduledDate ?? "9999"))[0] ?? null,
    [all],
  );

  const first = (user?.fullName ?? "").trim().split(/\s+/)[0] ?? "";
  const latest = notifications.data?.items.find((item) => !item.readAt) ?? null;
  const look = latest ? NOTE_LOOK[latest.kind] ?? NOTE_LOOK.info : null;

  const quick: [string, string, string, string][] = [
    [tx("qNew"), tx("qNewD"), `/${locale}/rechner`, IC.box],
    [tx("invoices"), tx("noInvoices"), `/${locale}/konto/rechnungen`, IC.doc],
    [tx("qHelp"), tx("qHelpD"), `/${locale}/faq`, IC.chat],
  ];

  return (
    <>
      <div className="ac-hello" data-rv="1">
        <h1>{first ? `${tx("hello")}, ${first}` : tx("hello")}</h1>
        <p>{tx("accSub")}</p>
      </div>

      {latest && look ? (
        <div className="ac-ntb" data-rv="1">
          <span className="ac-ic" style={{ width: 40, height: 40, background: look.bg, color: look.fg }}>
            <Icon d={look.d} size={19} sw={1.9} />
          </span>
          <span className="ac-ntb-t">
            <b dir="auto">{latest.title}</b>
            <span dir="auto">{latest.body}</span>
            <Link href={`/${locale}/konto/benachrichtigungen`}>{tx("ntSeeAll")}</Link>
          </span>
          <button type="button" className="ac-x" aria-label={tx("close")} onClick={() => void markRead([latest.id])}>
            ×
          </button>
        </div>
      ) : null}

      {orders.isLoading ? <div className="ac-skel" style={{ height: 280, borderRadius: 22 }} /> : null}

      {next ? <NextBooking summary={next} /> : null}

      {!orders.isLoading && !orders.isError && all.length === 0 ? (
        <div className="ac-empty-card" data-rv="2">
          <span>
            <Icon d={IC.truck} size={24} />
          </span>
          <b>{tx("noOrdersTitle")}</b>
          <p>{tx("noOrdersText")}</p>
          <Link href={`/${locale}/rechner`} className="ac-btn-red">
            {tx("newBooking")}
          </Link>
        </div>
      ) : null}

      <div className="ac-quick">
        {quick.map(([title, text, href, icon], i) => (
          <Link key={href} href={href} data-rv={String((i % 4) + 1)}>
            <span>
              <Icon d={icon} size={19} />
            </span>
            <b>{title}</b>
            <small>{text}</small>
          </Link>
        ))}
      </div>
    </>
  );
}

/** The next booking: its day, service, addresses and how far along it is. */
function NextBooking({ summary }: { summary: OrderSummary }) {
  const { locale } = useI18n();
  const tx = useAccountText();
  const detail = useLiveOrder(summary.id);
  const order = (detail.data as AccountOrder | undefined) ?? null;

  const status = statusPill(summary.status);
  const steps = trackOf(order ?? summary, locale, tx("pending"));
  const at = truckIndex(steps);
  const n = steps.length;

  return (
    <Link href={`/${locale}/konto/auftraege/${summary.id}`} className="ac-next" data-rv="2">
      <div className="ac-next-top">
        <div>
          <span className="ac-eyebrow">{tx("nextBooking")}</span>
          <b className="ac-next-date">{summary.scheduledDate ? longDay(summary.scheduledDate, locale) : day(summary.createdAt, locale)}</b>
          <span className="ac-next-meta">
            {tx(serviceOf(summary.serviceType).name)} · <span dir="ltr">{summary.reference}</span>
          </span>
        </div>
        <span className="ac-pill" style={{ background: status.bg, color: status.color }}>
          {tx(status.label)}
        </span>
      </div>

      {order ? (
        <div className="ac-next-addr">
          <span>
            <Icon d={IC.pin} size={16} sw={2} color={RED} />
            <span dir="auto">{order.originAddress}</span>
          </span>
          {order.destinationAddress ? (
            <span>
              <Icon d={IC.pin} size={16} sw={2} color={RED} />
              <span dir="auto">{order.destinationAddress}</span>
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="ac-mini" style={{ gridTemplateColumns: `repeat(${n},minmax(0,1fr))` }}>
        <Truck position={at >= 0 ? `calc((100% + 6px) * ${at} / ${n} + 17px)` : null} />
        {steps.map((step) => {
          const on = step.done;
          const here = step.current;
          return (
            <div key={step.label}>
              <span className="ac-mini-bar" style={{ background: on ? RED : here ? "#f3a5b1" : "#e3e5de" }} />
              <span
                className="ac-mini-dot"
                style={{
                  background: on ? RED : here ? "#fff1f3" : "#f1f3f5",
                  color: on ? "#ffffff" : here ? RED : "#92958e",
                  borderColor: on || here ? RED : "#e3e5de",
                }}
              >
                <Icon d={step.icon} size={15} sw={2.1} />
              </span>
              <small style={{ color: on || here ? "#1d2220" : "#92958e" }}>{tx(step.label)}</small>
            </div>
          );
        })}
      </div>
    </Link>
  );
}
