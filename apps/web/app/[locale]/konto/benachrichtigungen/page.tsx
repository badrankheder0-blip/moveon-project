"use client";

import Link from "next/link";

import { useAccountText } from "@/app/components/account/AccountShell";
import { useMarkRead, useMyNotifications } from "@/app/components/account/data";
import { Icon } from "@/app/components/account/Icon";
import { NOTE_LOOK, notificationHref, when } from "@/app/components/account/model";
import { useI18n } from "@/lib/i18n/provider";

/**
 * What the office sent this customer from the notification centre, newest
 * first and in their language. An unread one is tinted and says "New";
 * clicking it marks it read, as does "Mark all as read".
 */
export default function AccountNotificationsPage() {
  const { locale } = useI18n();
  const tx = useAccountText();
  const list = useMyNotifications();
  const markRead = useMarkRead();

  const items = list.data?.items ?? [];
  const unread = items.filter((item) => !item.readAt);

  return (
    <>
      <div className="ac-bar">
        <h1 className="ac-h1">{tx("notifs")}</h1>
        {unread.length > 0 ? (
          <button type="button" className="ac-markall" onClick={() => void markRead(unread.map((item) => item.id))}>
            {tx("ntAllRead")}
          </button>
        ) : null}
      </div>

      <div className="ac-nts">
        {list.isLoading ? <div className="ac-skel" style={{ height: 120, borderRadius: 16 }} /> : null}
        {items.map((item, i) => {
          const look = NOTE_LOOK[item.kind] ?? NOTE_LOOK.info;
          const isNew = !item.readAt;
          const href = notificationHref(item.buttonUrl, locale);
          const external = href ? /^https?:/i.test(href) : false;
          return (
            <div
              key={item.id}
              className={`ac-nt${isNew ? " is-new" : ""}`}
              data-rv={String((i % 4) + 1)}
              onClick={() => {
                if (isNew) void markRead([item.id]);
              }}
            >
              <span className="ac-ic" style={{ width: 44, height: 44, background: look.bg, color: look.fg }}>
                <Icon d={look.d} size={19} sw={1.9} />
              </span>
              <span className="ac-nt-t">
                <span className="ac-nt-meta">
                  {isNew ? <span className="ac-nt-new">{tx("ntNew")}</span> : null}
                  <small>{when(item.at, locale)}</small>
                </span>
                <b dir="auto">{item.title}</b>
                <p dir="auto">{item.body}</p>
                {item.buttonText && href ? (
                  external ? (
                    <a className="ac-nt-cta" href={href} target="_blank" rel="noopener noreferrer">
                      {item.buttonText}
                    </a>
                  ) : (
                    <Link className="ac-nt-cta" href={href}>
                      {item.buttonText}
                    </Link>
                  )
                ) : null}
              </span>
            </div>
          );
        })}
        {list.isError ? (
          <p className="ac-none is-boxed">
            {tx("loadFailed")}{" "}
            <button type="button" className="au-under" onClick={() => void list.refetch()}>
              {tx("retry")}
            </button>
          </p>
        ) : null}
        {!list.isLoading && !list.isError && items.length === 0 ? <p className="ac-none is-boxed">{tx("ntNone")}</p> : null}
      </div>
    </>
  );
}
