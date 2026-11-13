"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ChangeEvent } from "react";

import { useAccountText, useFlash } from "@/app/components/account/AccountShell";
import { accountKeys, useMyClaims, useMyInvoices, useMyReviews } from "@/app/components/account/data";
import { Icon, Truck } from "@/app/components/account/Icon";
import {
  IC,
  RED,
  TIME_WINDOWS,
  claimPill,
  dateLocale,
  day,
  longDay,
  money,
  priceLines,
  serviceOf,
  statusPill,
  tabOf,
  todayIso,
  trackOf,
  truckIndex,
  windowOf,
  type AccountOrder,
} from "@/app/components/account/model";
import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { useLiveOrder } from "@/lib/live/useLiveData";

/**
 * One booking, as the prototype's order page draws it: the status tracker,
 * the schedule, the addresses and the price, then what the customer can do —
 * ask for another date, open the invoice, cancel — and, once the job is done,
 * rate it and report damage.
 *
 * Everything shown is the server's: the price lines are the stored breakdown
 * (never recomputed here), the date-change request is the one the office
 * approves or declines in the dashboard, and the tracker follows the order's
 * live status.
 */
export default function AccountOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { sdk } = useApi();
  const { locale, t } = useI18n();
  const tx = useAccountText();
  const say = useFlash();
  const queryClient = useQueryClient();

  const detail = useLiveOrder(id);
  const invoices = useMyInvoices();
  const order = (detail.data as AccountOrder | undefined) ?? null;

  const [cancelling, setCancelling] = useState(false);
  const [change, setChange] = useState<{ date: string; time: string; note: string; err: string; busy: boolean } | null>(null);

  const back = (
    <Link href={`/${locale}/konto/auftraege`} className="ac-back">
      <Icon d={IC.back} size={15} sw={2.2} flip />
      {tx("myOrders")}
    </Link>
  );

  if (detail.isLoading) {
    return (
      <>
        {back}
        <div className="ac-skel" style={{ height: 90, borderRadius: 14 }} />
        <div className="ac-skel" style={{ height: 170 }} />
        <div className="ac-skel" style={{ height: 320 }} />
      </>
    );
  }

  if (!order) {
    return (
      <>
        {back}
        <p className="ac-none is-boxed">{tx("notFound")}</p>
      </>
    );
  }

  const today = todayIso();
  const service = serviceOf(order.serviceType);
  const status = statusPill(order.status);
  const steps = trackOf(order, locale, tx("pending"), today);
  const at = truckIndex(steps);
  const upcoming = tabOf(order, today) === "up";
  const invoice = invoices.data?.invoices.find((entry) => entry.orderId === order.id) ?? null;

  // The latest date-change request decides the note under the title.
  const request = order.dateRequests?.[0] ?? null;
  const requestWhen = request
    ? tx("changeWhen", { date: day(request.requestedDate, locale), time: request.requestedTime ?? "" }).replace(/[,،]\s*$/, "")
    : "";
  const note =
    order.status === "cancelled"
      ? { text: tx("isCancelled"), bg: "#fff1f3" }
      : request?.status === "approved"
        ? { text: `${tx("changeOk")}: ${requestWhen}`, bg: "#e9f5ee" }
        : request?.status === "declined"
          ? { text: tx("changeNo"), bg: "#fff6f6" }
          : request
            ? { text: `${tx("changeNote")}: ${requestWhen}`, bg: "#f1f3f5" }
            : null;

  const slot = windowOf(order.scheduledTime);
  const days = [
    order.scheduledDate
      ? { name: tx(service.name), when: `${longDay(order.scheduledDate, locale)}${slot ? ` · ${slot}` : ""}`, icon: service.icon }
      : null,
    order.scheduledSecondDate ? { name: tx(service.name), when: longDay(order.scheduledSecondDate, locale), icon: service.icon } : null,
  ].filter((entry): entry is { name: string; when: string; icon: string } => entry !== null);

  const address = [
    { label: order.destinationAddress ? tx("from") : tx("addrOnly"), value: order.originAddress, color: RED },
    ...(order.destinationAddress ? [{ label: tx("to"), value: order.destinationAddress, color: "#1d2220" }] : []),
  ];

  const price = priceLines(order);
  const numberTag = dateLocale(locale);
  const fmtParams = (params: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(params).map(([key, value]) => [
        key,
        typeof value === "number"
          ? value.toLocaleString(numberTag, /rate|price|amount/i.test(key) ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 2 })
          : String(value ?? ""),
      ]),
    );
  const lineLabel = (key: string, params: Record<string, unknown>) =>
    key === "line.custom" && params.label ? String(params.label) : t(`line.${key.replace(/^line\./, "")}`, { values: fmtParams(params) });
  const lineRate = (key: string, params: Record<string, unknown>) => {
    if (key === "line.custom" || Object.keys(params).length === 0) return "";
    const caption = `line.${key.replace(/^line\./, "")}.caption`;
    const text = t(caption, { values: fmtParams(params) });
    return text === caption || /\{\w+\}/.test(text) ? "" : text;
  };

  async function cancel() {
    if (!order || !window.confirm(tx("confirmCancel"))) return;
    setCancelling(true);
    try {
      await sdk.orders.cancel(order.id);
      say(tx("cancelledMsg"));
      await Promise.all([detail.refetch(), queryClient.invalidateQueries({ queryKey: ["orders"] })]);
    } catch (caught) {
      say(caught instanceof ApiError && caught.code === "INVALID_STATE_TRANSITION" ? caught.message : tx("errGeneric"), true);
    } finally {
      setCancelling(false);
    }
  }

  async function sendChange() {
    if (!order || !change) return;
    if (!change.date || change.date <= today) {
      setChange({ ...change, err: tx("chooseDate") });
      return;
    }
    setChange({ ...change, busy: true, err: "" });
    try {
      await sdk.http.post(`/api/orders/${order.id}/date-change`, {
        date: change.date,
        time: change.time,
        ...(change.note.trim() ? { reason: change.note.trim() } : {}),
      });
      setChange(null);
      say(tx("changeSent"));
      await detail.refetch();
    } catch (caught) {
      setChange({ ...change, busy: false, err: caught instanceof ApiError && caught.status === 422 ? tx("chooseDate") : tx("errGeneric") });
    }
  }

  const currentWindow = slot;
  const tomorrow = new Date(Date.parse(`${today}T12:00:00Z`) + 864e5).toISOString().slice(0, 10);

  return (
    <>
      {back}

      <div className="ac-o-head">
        <div>
          <h1>{tx(service.name)}</h1>
          <small>
            <span dir="ltr">{order.reference}</span> · {tx("created")} {day(order.createdAt, locale)}
          </small>
        </div>
        <span className="ac-pill" style={{ background: status.bg, color: status.color }}>
          {tx(status.label)}
        </span>
      </div>

      {note ? (
        <p className="ac-note" style={{ background: note.bg }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" />
            <path d="M12 7.5v5.5M12 16.5h.01" />
          </svg>
          {note.text}
        </p>
      ) : null}

      <div className="ac-track" data-rv="1">
        <b className="ac-label">{tx("tracking")}</b>
        <div className="ac-track-truck">
          <Truck position={at >= 0 ? `calc((100% + 8px) * ${at} / ${steps.length} + 17px)` : null} />
        </div>
        <ol className="ac-steps">
          {steps.map((step, i) => {
            const lit = step.done || step.current;
            return (
              <li key={step.label}>
                <span
                  className="ac-dot"
                  style={{
                    borderColor: lit ? RED : "#d6d9d1",
                    background: step.done ? RED : "#ffffff",
                    color: step.done ? "#ffffff" : step.current ? RED : "#a0a49c",
                    boxShadow: step.current ? "0 0 0 6px #d716351f" : "none",
                  }}
                >
                  <Icon d={step.icon} size={15} sw={2.4} />
                </span>
                {i < steps.length - 1 ? <span className="ac-line" style={{ background: step.lineOn ? RED : "#e3e5de" }} /> : null}
                <span>
                  <b style={{ color: lit ? "#1d2220" : "#92958e" }}>{tx(step.label)}</b>
                  <small>{step.sub}</small>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="ac-grid">
        <div className="ac-col">
          <div className="ac-card" style={{ gap: 12 }}>
            <b className="ac-label">{tx("schedule")}</b>
            {days.map((entry) => (
              <div className="ac-day" key={entry.when}>
                <span>
                  <Icon d={entry.icon} size={18} />
                </span>
                <span>
                  <b>{entry.name}</b>
                  <small>{entry.when}</small>
                </span>
              </div>
            ))}
            {days.length === 0 ? <small style={{ fontSize: 13, color: "#5b625e" }}>{tx("pending")}</small> : null}
          </div>
          <div className="ac-card" style={{ gap: 14 }}>
            <b className="ac-label">{tx("addresses")}</b>
            {address.map((entry) => (
              <div className="ac-addr" key={entry.label}>
                <span style={{ borderColor: entry.color }} />
                <span>
                  <small>{entry.label}</small>
                  <span dir="auto">{entry.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="ac-card" style={{ gap: 10 }}>
          <b className="ac-label">{tx("price")}</b>
          {price.lines.map((line, i) => (
            <div className="ac-line-item" key={`${line.key}-${i}`}>
              <span>
                <span>{lineLabel(line.key, line.params)}</span>
                {/* The prototype's rates were English and set LTR; ours are in the page's language. */}
                {lineRate(line.key, line.params) ? <small dir="auto">{lineRate(line.key, line.params)}</small> : null}
              </span>
              <b dir="ltr">{money(line.gross, locale)}</b>
            </div>
          ))}
          {!price.includesVat ? (
            <div className="ac-line-item">
              <span>
                <span>{t("calc.vat", { values: { rate: order.vatRate } })}</span>
              </span>
              <b dir="ltr">{money(order.vatAmount, locale)}</b>
            </div>
          ) : null}
          {price.discount ? (
            <div className="ac-disc">
              <span>
                {tx("discount")}
                {price.discount.code ? ` · ${price.discount.code}` : ""}
              </span>
              <b dir="ltr">−{money(price.discount.gross, locale)}</b>
            </div>
          ) : null}
          <div className="ac-total">
            <b>{tx("total")}</b>
            <b dir="ltr">{money(order.totalGross, locale)}</b>
          </div>
          {price.includesVat ? (
            <small className="ac-vat">
              {tx("vatIncl", { rate: Number.parseFloat(order.vatRate).toLocaleString(numberTag) })} · <span dir="ltr">{money(order.vatAmount, locale)}</span>
            </small>
          ) : null}
        </div>
      </div>

      {upcoming || invoice ? (
        <div className="ac-actions">
          {upcoming ? (
            <button
              type="button"
              className="ac-act is-red"
              onClick={() =>
                setChange({
                  date: order.scheduledDate && order.scheduledDate > today ? order.scheduledDate : tomorrow,
                  time: TIME_WINDOWS.includes(currentWindow) ? currentWindow : TIME_WINDOWS[0]!,
                  note: "",
                  err: "",
                  busy: false,
                })
              }
            >
              <Icon d={IC.calendar} size={16} sw={1.9} />
              {tx("changeDate")}
            </button>
          ) : null}
          {invoice ? (
            <a className="ac-act" href={`/${locale}/dashboard/rechnungen/${invoice.id}`} target="_blank" rel="noopener noreferrer">
              <Icon d={IC.doc} size={16} sw={1.9} />
              {tx("downloadInvoice")}
            </a>
          ) : null}
          {upcoming ? (
            <button type="button" className="ac-act is-cancel" disabled={cancelling} onClick={() => void cancel()}>
              {tx("cancelBooking")}
            </button>
          ) : null}
        </div>
      ) : null}

      {change ? (
        <div className="ac-panel is-red">
          <b className="ac-panel-title">{tx("changeTitle")}</b>
          <div className="ac-two">
            <label className="ac-fl">
              {tx("newDate")}
              <input type="date" dir="ltr" min={tomorrow} value={change.date} onChange={(event) => setChange({ ...change, date: event.target.value, err: "" })} />
            </label>
            <label className="ac-fl">
              {tx("timeWindow")}
              <select dir="ltr" value={change.time} onChange={(event) => setChange({ ...change, time: event.target.value, err: "" })}>
                {TIME_WINDOWS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="ac-fl">
            {tx("noteForTeam")}
            <textarea rows={3} maxLength={1000} value={change.note} onChange={(event) => setChange({ ...change, note: event.target.value })} />
          </label>
          {change.err ? <p className="ac-err">{change.err}</p> : null}
          <div className="ac-btns">
            <button type="button" className="ac-btn-red" disabled={change.busy} onClick={() => void sendChange()}>
              {tx("sendRequest")}
            </button>
            <button type="button" className="ac-btn-line" onClick={() => setChange(null)}>
              {tx("cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {order.status === "completed" ? <ReviewCard orderId={order.id} /> : null}
      {order.status === "completed" || order.status === "confirmed" ? <DamageCard orderId={order.id} /> : null}
    </>
  );
}

// ── "How did we do?" ─────────────────────────────────────────────────────

function ReviewCard({ orderId }: { orderId: string }) {
  const { sdk } = useApi();
  const tx = useAccountText();
  const say = useFlash();
  const queryClient = useQueryClient();
  const reviews = useMyReviews();

  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const mine = reviews.data?.items.find((item) => item.orderId === orderId) ?? null;

  async function send() {
    if (!stars) return setErr(tx("rvNeedStars"));
    if (text.trim().length < 3) return setErr(tx("rvNeedText"));
    setBusy(true);
    setErr("");
    try {
      await sdk.http.post("/api/reviews", { orderId, rating: stars, comment: text.trim() });
      say(tx("rvThanks"));
      await queryClient.invalidateQueries({ queryKey: accountKeys.reviews });
    } catch (caught) {
      setErr(caught instanceof ApiError && caught.code === "RATE_LIMITED" ? tx("errRate") : tx("errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  if (reviews.isLoading) return null;

  const pill = mine?.isPublished
    ? { label: tx("rvPub"), bg: "#e9f5ee", fg: "#2f6b4c" }
    : mine?.hiddenAt
      ? { label: tx("rvHidden"), bg: "#f1f3f5", fg: "#4a514d" }
      : { label: tx("rvWait"), bg: "#f1f3f5", fg: "#4a514d" };

  return (
    <div className="ac-panel" id="review">
      <div className="ac-panel-head">
        <b className="ac-panel-title">{tx("rvTitle")}</b>
        <p>{tx("rvSub")}</p>
      </div>

      {mine ? (
        <div className="ac-myrv">
          <div>
            <span style={{ display: "flex", gap: 2 }} role="img" aria-label={`${mine.rating}/5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Icon key={n} d={IC.star} size={18} fill={n <= mine.rating ? "#ffcb08" : "#d9dcd4"} />
              ))}
            </span>
            <span className="ac-pill" style={{ background: pill.bg, color: pill.fg }}>
              {pill.label}
            </span>
          </div>
          {mine.comment ? <p>{mine.comment}</p> : null}
          {mine.adminReply ? (
            <div className="ac-reply">
              <b>{tx("rvReply")}</b>
              <span dir="auto">{mine.adminReply}</span>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="ac-stars" role="radiogroup" aria-label={tx("rvTitle")}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={stars === n}
                aria-label={String(n)}
                className={n <= stars ? "is-on" : undefined}
                onClick={() => {
                  setStars(n);
                  setErr("");
                }}
              >
                <Icon d={IC.star} size={30} fill="currentColor" />
              </button>
            ))}
          </div>
          <textarea
            className="ac-textarea"
            rows={3}
            maxLength={2000}
            value={text}
            placeholder={tx("rvPh")}
            onChange={(event) => {
              setText(event.target.value);
              setErr("");
            }}
          />
          {err ? <p className="ac-err">{err}</p> : null}
          <div style={{ display: "flex" }}>
            <button type="button" className="ac-btn-red" disabled={busy} onClick={() => void send()}>
              {tx("rvSend")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── "Something damaged?" ─────────────────────────────────────────────────

/** Large phone photos are scaled to 1600px JPEG before upload, as the prototype scales them. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * k);
    canvas.height = Math.round(bitmap.height * k);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    return blob ?? file;
  } catch {
    return file;
  }
}

function DamageCard({ orderId }: { orderId: string }) {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const tx = useAccountText();
  const say = useFlash();
  const queryClient = useQueryClient();
  const claims = useMyClaims();

  // Photos are offered only where the API can store them.
  const uploads = useQuery({
    queryKey: ["account", "claim-photos"],
    queryFn: () => sdk.http.get<{ enabled: boolean }>("/api/claims/photos"),
    staleTime: 10 * 60_000,
  });

  const [form, setForm] = useState<{ item: string; desc: string; photos: string[]; err: string; busy: boolean; uploading: boolean } | null>(null);

  const mine = (claims.data?.claims ?? []).filter((claim) => claim.orderId === orderId);

  async function addPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !form) return;
    setForm({ ...form, uploading: true, err: "" });
    try {
      const body = new FormData();
      body.append("file", await shrink(file), "photo.jpg");
      const { url } = await sdk.http.post<{ url: string }>("/api/claims/photos", body, { timeoutMs: 60_000 });
      setForm((current) => (current ? { ...current, photos: [...current.photos, url].slice(0, 4), uploading: false } : current));
    } catch {
      setForm((current) => (current ? { ...current, uploading: false, err: tx("dmPhotoFail") } : current));
    }
  }

  async function send() {
    if (!form) return;
    if (!form.item.trim() || !form.desc.trim()) {
      setForm({ ...form, err: tx("dmNeed") });
      return;
    }
    setForm({ ...form, busy: true, err: "" });
    try {
      await sdk.http.post("/api/claims", {
        orderId,
        item: form.item.trim(),
        description: form.desc.trim(),
        ...(form.photos.length ? { photos: form.photos } : {}),
      });
      setForm(null);
      say(tx("dmSent"));
      await queryClient.invalidateQueries({ queryKey: accountKeys.claims });
    } catch (caught) {
      setForm((current) =>
        current ? { ...current, busy: false, err: caught instanceof ApiError && caught.code === "RATE_LIMITED" ? tx("errRate") : tx("errGeneric") } : current,
      );
    }
  }

  return (
    <div className="ac-panel">
      <div className="ac-dm-head">
        <div>
          <b className="ac-panel-title">{tx("dmTitle")}</b>
          <p>{tx("dmSub")}</p>
        </div>
        {!form ? (
          <button type="button" className="ac-dm-open" onClick={() => setForm({ item: "", desc: "", photos: [], err: "", busy: false, uploading: false })}>
            <Icon d={IC.shield} size={16} sw={1.9} />
            {tx("dmOpen")}
          </button>
        ) : null}
      </div>

      {mine.length ? (
        <div className="ac-claims">
          {mine.map((claim) => {
            const pill = claimPill(claim.status);
            return (
              <div className="ac-claim" key={claim.id}>
                <span>
                  <b>{claim.item}</b>
                  <small>
                    {tx("dmReported")} {day(claim.createdAt, locale)}
                  </small>
                </span>
                <span className="ac-pill" style={{ background: pill.bg, color: pill.color }}>
                  {tx(pill.label)}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {form ? (
        <>
          <label className="ac-fl">
            {tx("dmItem")}
            <input value={form.item} maxLength={200} dir="auto" onChange={(event) => setForm({ ...form, item: event.target.value, err: "" })} />
          </label>
          <label className="ac-fl">
            {tx("dmDesc")}
            <textarea rows={3} maxLength={4000} value={form.desc} onChange={(event) => setForm({ ...form, desc: event.target.value, err: "" })} />
          </label>
          {uploads.data?.enabled ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{tx("dmPhotos")}</span>
              <div className="ac-photos">
                {form.photos.map((url, i) => (
                  <span className="ac-photo" key={url}>
                    <img src={url} alt="" />
                    <button
                      type="button"
                      aria-label={tx("remove")}
                      onClick={() => setForm({ ...form, photos: form.photos.filter((_, j) => j !== i) })}
                    >
                      <Icon d={IC.close} size={12} sw={2.6} />
                    </button>
                  </span>
                ))}
                {form.photos.length < 4 ? (
                  <label className="ac-addphoto" aria-busy={form.uploading}>
                    <Icon d={IC.camera} size={20} sw={1.9} />
                    {form.uploading ? tx("loading") : tx("dmAddPhoto")}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={form.uploading} onChange={(event) => void addPhoto(event)} />
                  </label>
                ) : null}
              </div>
            </div>
          ) : null}
          {form.err ? <p className="ac-err">{form.err}</p> : null}
          <div className="ac-btns">
            <button type="button" className="ac-btn-red" disabled={form.busy || form.uploading} onClick={() => void send()}>
              {tx("dmSend")}
            </button>
            <button type="button" className="ac-btn-line" onClick={() => setForm(null)}>
              {tx("cancel")}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
