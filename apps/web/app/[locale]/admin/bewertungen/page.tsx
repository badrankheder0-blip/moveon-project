"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { SERVICE_TEXT, dateTag } from "@/lib/admin/format";
import { useDrafts } from "@/lib/admin/drafts";
import { defineText, useText, type TextFn } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { LOCALE_META } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Reviews, as the admin prototype's Reviews screen shows them: the average
 * rating, what is waiting and what is on the website, then a card per review
 * with its stars, text, a reply box and Publish / Hide.
 *
 * Moderation is website configuration: Publish, Hide and the reply are
 * drafts (domain "reviews") and reach the site only through the frame's
 * "Save & publish". The cards show the drafted state, as the prototype does.
 */

const TEXT = defineText({
  title: { de: "Bewertungen", en: "Reviews", ar: "التقييمات", tr: "Değerlendirmeler" },
  sub: {
    de: "Geben Sie Bewertungen frei, bevor sie auf der Website erscheinen, und antworten Sie Ihren Kunden.",
    en: "Approve reviews before they appear on the website and reply to customers.",
    ar: "وافق على التقييمات قبل ظهورها على الموقع، وردّ على الزبائن.",
    tr: "Değerlendirmeleri web sitesinde görünmeden önce onaylayın ve müşterilere yanıt verin.",
  },
  avg: { de: "Durchschnittliche Bewertung", en: "Average rating", ar: "متوسط التقييم", tr: "Ortalama puan" },
  waitingN: { de: "Wartend", en: "Waiting", ar: "بانتظار الموافقة", tr: "Bekleyen" },
  publishedN: { de: "Auf der Website", en: "On the website", ar: "على الموقع", tr: "Web sitesinde" },
  all: { de: "Alle", en: "All", ar: "الكل", tr: "Tümü" },
  st_waiting: { de: "Wartend", en: "Waiting", ar: "بانتظار الموافقة", tr: "Bekliyor" },
  st_published: { de: "Veröffentlicht", en: "Published", ar: "منشور", tr: "Yayında" },
  st_hidden: { de: "Ausgeblendet", en: "Hidden", ar: "مخفي", tr: "Gizli" },
  publish: { de: "Veröffentlichen", en: "Publish", ar: "نشر", tr: "Yayınla" },
  hide: { de: "Ausblenden", en: "Hide", ar: "إخفاء", tr: "Gizle" },
  reply: { de: "Ihre Antwort", en: "Your reply", ar: "ردّك", tr: "Yanıtınız" },
  replyPh: { de: "Schreiben Sie eine kurze, freundliche Antwort…", en: "Write a short, friendly reply…", ar: "اكتب رداً قصيراً ولطيفاً…", tr: "Kısa ve samimi bir yanıt yazın…" },
  note: {
    de: "Veröffentlichte Bewertungen erscheinen nach „Speichern & veröffentlichen“ auf der Website.",
    en: "Published reviews go live on the website after Save & publish.",
    ar: "تظهر التقييمات المنشورة على الموقع بعد «حفظ ونشر».",
    tr: "Yayınlanan değerlendirmeler “Kaydet ve yayınla”dan sonra web sitesinde görünür.",
  },
  none: { de: "Hier gibt es keine Bewertungen.", en: "No reviews here.", ar: "لا توجد تقييمات هنا.", tr: "Burada değerlendirme yok." },
  edited: { de: "Noch nicht veröffentlicht", en: "Not published yet", ar: "لم يُنشر بعد", tr: "Henüz yayınlanmadı" },
  noText: { de: "Ohne Text.", en: "No text.", ar: "بدون نص.", tr: "Metin yok." },
  saveFailed: { de: "Das konnte nicht gespeichert werden.", en: "That could not be saved.", ar: "تعذّر الحفظ.", tr: "Kaydedilemedi." },
  loadFailed: { de: "Die Bewertungen konnten nicht geladen werden.", en: "The reviews could not be loaded.", ar: "تعذّر تحميل التقييمات.", tr: "Değerlendirmeler yüklenemedi." },
});

type Tx = TextFn<typeof TEXT>;
type Status = "waiting" | "published" | "hidden";

interface Review {
  id: string;
  orderId: string;
  orderReference: string;
  serviceType: string;
  customerName: string;
  rating: number;
  comment: string | null;
  isPublished: boolean;
  hiddenAt: string | null;
  adminReply: string | null;
  createdAt: string;
}

/** How a review should stand once published: the draft's shape. */
interface Moderation {
  isPublished: boolean;
  hidden: boolean;
  reply: string;
}

const STATUS_COLOURS: Record<Status, [string, string]> = {
  waiting: ["#fbf4e4", "#5c4a00"],
  published: ["#edf5ed", "#3f705a"],
  hidden: ["#f5f5f0", "#4a514d"],
};
const STAR = "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z";
const card: CSSProperties = { background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, boxShadow: "0 12px 36px #202a2308" };

const liveOf = (r: Review): Moderation => ({ isPublished: r.isPublished, hidden: !r.isPublished && !!r.hiddenAt, reply: r.adminReply ?? "" });
const statusOf = (m: Moderation): Status => (m.isPublished ? "published" : m.hidden ? "hidden" : "waiting");
const same = (a: Moderation, b: Moderation) => a.isPublished === b.isPublished && a.hidden === b.hidden && a.reply.trim() === b.reply.trim();

export default function ReviewsPage() {
  const { sdk, can } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const sx = useText(SERVICE_TEXT);
  const toast = useToast();
  const drafts = useDrafts("reviews");
  const rtl = LOCALE_META[locale].dir === "rtl";
  const loc = dateTag(locale);
  const canModerate = can("reviews.moderate");
  const [filter, setFilter] = useState<"all" | Status>("all");

  const reviews = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: () => sdk.http.get<{ items: Review[] }>("/api/reviews/admin"),
  });

  const view = useMemo(() => {
    const list = (reviews.data?.items ?? []).map((r) => {
      const live = liveOf(r);
      const now = drafts.value<Moderation>(r.id, live);
      return { r, live, now, status: statusOf(now), edited: drafts.edited(r.id) };
    });
    const published = list.filter((x) => x.status === "published");
    const avg = published.length ? published.reduce((n, x) => n + (x.r.rating || 5), 0) / published.length : 0;
    const kpis = [
      { label: tx("avg"), value: avg.toFixed(1) },
      { label: tx("waitingN"), value: String(list.filter((x) => x.status === "waiting").length) },
      { label: tx("publishedN"), value: String(published.length) },
    ];
    const tabs = (["all", "waiting", "published", "hidden"] as const).map((key) => ({
      key,
      label: key === "all" ? tx("all") : tx(`st_${key}`),
      n: key === "all" ? list.length : list.filter((x) => x.status === key).length,
    }));
    const cards = list
      .filter((x) => filter === "all" || x.status === filter)
      .sort((a, b) => (a.status === "waiting" ? 0 : 1) - (b.status === "waiting" ? 0 : 1) || b.r.createdAt.localeCompare(a.r.createdAt));
    return { kpis, tabs, cards };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviews.data, drafts.drafts, filter, tx]);

  /** Drafts the change, or drops the draft when it would change nothing. */
  const moderate = async (review: Review, next: Moderation) => {
    try {
      if (same(next, liveOf(review))) {
        if (drafts.edited(review.id)) await drafts.revert(review.id);
      } else {
        await drafts.set(review.id, { ...next, reply: next.reply.trim() });
      }
    } catch {
      toast(tx("saveFailed"));
    }
  };

  return (
    <AdminShell view="reviews">
      <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ maxWidth: 640 }}>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: rtl ? 0 : "-0.9px", lineHeight: 1.2 }}>{tx("title")}</h1>
          <p style={{ color: "#737870", fontSize: 13, marginTop: 6, textWrap: "pretty" } as CSSProperties}>{tx("sub")}</p>
        </div>

        {reviews.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {view.kpis.map((k) => (
            <div key={k.label} style={{ ...card, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
              <small style={{ fontSize: 11.5, color: "#737870" }}>{k.label}</small>
              <b style={{ fontSize: 24, fontWeight: 650, letterSpacing: rtl ? 0 : "-0.5px", fontVariantNumeric: "tabular-nums" }}>{reviews.isLoading ? "—" : k.value}</b>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {view.tabs.map((tab) => {
              const on = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(tab.key)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", minHeight: 34, padding: "0 13px", border: `1px solid ${on ? "#252b28" : "#e3e5de"}`, borderRadius: 999, background: on ? "#252b28" : "#ffffff", color: on ? "#ffffff" : "#4a514d", fontSize: 12, fontWeight: 600 }}
                >
                  {tab.label}
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{tab.n}</span>
                </button>
              );
            })}
          </div>
          <small style={{ fontSize: 12, color: "#737870" }}>{tx("note")}</small>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 330px), 1fr))", gap: 14, alignItems: "start" }}>
          {reviews.isLoading
            ? [0, 1, 2].map((i) => <div key={i} className="a-skel" style={{ height: 240, borderRadius: 10 }} />)
            : view.cards.map(({ r, now, status, edited }) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  now={now}
                  status={status}
                  edited={edited}
                  tx={tx}
                  service={r.serviceType in SERVICE_TEXT ? sx(r.serviceType as keyof typeof SERVICE_TEXT) : r.serviceType}
                  date={new Date(r.createdAt).toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" })}
                  canModerate={canModerate}
                  onModerate={(next) => void moderate(r, next)}
                />
              ))}
        </div>
        {!reviews.isLoading && view.cards.length === 0 ? (
          <p style={{ padding: "40px 20px", textAlign: "center", color: "#737870", fontSize: 13, background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10 }}>{tx("none")}</p>
        ) : null}
      </section>
    </AdminShell>
  );
}

function ReviewCard({
  review,
  now,
  status,
  edited,
  tx,
  service,
  date,
  canModerate,
  onModerate,
}: {
  review: Review;
  now: Moderation;
  status: Status;
  edited: boolean;
  tx: Tx;
  service: string;
  date: string;
  canModerate: boolean;
  onModerate: (next: Moderation) => void;
}) {
  const [reply, setReply] = useState(now.reply);
  useEffect(() => setReply(now.reply), [now.reply]);
  const [bg, fg] = STATUS_COLOURS[status];
  const stars = Math.max(1, Math.min(5, review.rating || 5));

  return (
    <div style={{ ...card, border: `1px solid ${status === "waiting" ? "#d71635" : "#e3e5de"}`, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#f1f3f5", color: "#252b28", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700, flex: "none" }}>
          {review.customerName.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <b style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{review.customerName || "—"}</b>
          <small style={{ fontSize: 11.5, color: "#737870" }}>
            {service} · {date}
          </small>
        </span>
        {edited ? <i title={tx("edited")} aria-label={tx("edited")} style={{ display: "block", width: 7, height: 7, borderRadius: "50%", background: "#ffcb08", flex: "none" }} /> : null}
        <span style={{ padding: "3px 9px", borderRadius: 999, background: bg, color: fg, fontSize: 10.5, fontWeight: 650, whiteSpace: "nowrap" }}>{tx(`st_${status}`)}</span>
      </div>
      <div style={{ display: "flex", gap: 2 }} aria-label={`${stars}/5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill={i <= stars ? "#ffcb08" : "#e3e5de"} aria-hidden="true">
            <path d={STAR} />
          </svg>
        ))}
      </div>
      <p dir="auto" style={{ textAlign: "start", fontSize: 13, lineHeight: 1.55, color: review.comment ? "#252b28" : "#92958e", textWrap: "pretty", whiteSpace: "pre-wrap", overflowWrap: "anywhere" } as CSSProperties}>{review.comment || tx("noText")}</p>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "#737870" }}>
        {tx("reply")}
        <textarea
          dir="auto"
          value={reply}
          rows={2}
          disabled={!canModerate}
          placeholder={tx("replyPh")}
          onChange={(event) => setReply(event.target.value)}
          onBlur={() => reply.trim() !== now.reply.trim() && onModerate({ ...now, reply })}
          style={{ padding: "9px 11px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 12.5, color: "#252b28", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
        />
      </label>
      {canModerate ? (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {status !== "hidden" ? (
            <button
              type="button"
              onClick={() => onModerate({ isPublished: false, hidden: true, reply })}
              style={{ minHeight: 34, padding: "0 13px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 600 }}
            >
              {tx("hide")}
            </button>
          ) : null}
          {status !== "published" ? (
            <button type="button" className="a-btn" onClick={() => onModerate({ isPublished: true, hidden: false, reply })} style={{ minHeight: 34, padding: "0 13px", borderRadius: 6, fontSize: 12 }}>
              {tx("publish")}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
