"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

import { ApiError } from "@mon/client";

import { useSdk } from "@/lib/api";
import type { Locale } from "@/lib/i18n/config";
import type { JobsText } from "@/lib/site/jobs";

import { Arrow } from "../Icons";
import { Tick } from "./kit";

/**
 * The application form of one posting, in the site's lead-form card: name,
 * address, phone, email, a message, the CV and up to five more files, and the
 * privacy consent. Checked here first (red-bordered fields, as the other
 * forms), then by the API, whose file errors arrive as codes this turns into
 * the visitor's language.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;
const CV_TYPES = /\.(pdf|docx?)$/i;
const ATTACHMENT_TYPES = /\.(pdf|docx?|jpe?g|png)$/i;
const CV_ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ATTACHMENT_ACCEPT = `${CV_ACCEPT},.jpg,.jpeg,.png,image/jpeg,image/png`;

type Field = "firstName" | "lastName" | "address" | "phone" | "email" | "message";
const REQUIRED: Field[] = ["firstName", "lastName", "phone", "email"];

const sizeText = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function JobApplicationForm({
  slug,
  locale,
  text: t,
  privacyHref,
  jobsHref,
}: {
  slug: string;
  locale: Locale;
  text: JobsText;
  privacyHref: string;
  jobsHref: string;
}) {
  const sdk = useSdk();
  const [values, setValues] = useState<Record<Field, string>>({ firstName: "", lastName: "", address: "", phone: "", email: "", message: "" });
  const [cv, setCv] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const cvInput = useRef<HTMLInputElement>(null);
  const moreInput = useRef<HTMLInputElement>(null);

  const set = (field: Field, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const pickCv = (file: File | undefined) => {
    setError("");
    if (!file) return;
    if (!CV_TYPES.test(file.name)) return setError(t.errCvType);
    if (file.size > MAX_BYTES) return setError(t.errSize);
    setCv(file);
  };

  const pickMore = (files: FileList | null) => {
    setError("");
    const picked = Array.from(files ?? []);
    if (picked.some((file) => !ATTACHMENT_TYPES.test(file.name))) return setError(t.errAttachmentType);
    if (picked.some((file) => file.size > MAX_BYTES)) return setError(t.errSize);
    const next = [...attachments, ...picked];
    if (next.length > MAX_ATTACHMENTS) return setError(t.errTooMany);
    setAttachments(next);
  };

  /** The API's codes, in the visitor's language. */
  const explain = (caught: unknown): string => {
    if (!(caught instanceof ApiError)) return t.errSend;
    if (caught.status === 429) return t.errLimit;
    switch (caught.message) {
      case "FILE_TOO_LARGE":
        return t.errSize;
      case "TOO_MANY_FILES":
        return t.errTooMany;
      case "CV_REQUIRED":
        return t.errCv;
      case "CV_TYPE":
        return t.errCvType;
      case "ATTACHMENT_TYPE":
        return t.errAttachmentType;
    }
    if (caught.fieldIssues.some((issue) => issue.path === "email")) return t.errEmail;
    if (caught.status === 400) return t.errFill;
    return t.errSend;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    setTried(true);
    if (REQUIRED.some((field) => !values[field].trim())) return setError(t.errFill);
    if (!EMAIL.test(values.email.trim())) return setError(t.errEmail);
    if (!cv) return setError(t.errCv);
    if (!consent) return setError(t.errConsent);

    const form = new FormData();
    for (const [field, value] of Object.entries(values)) if (value.trim()) form.append(field, value.trim());
    form.append("locale", locale);
    form.append("consent", "true");
    if (honeypot.current?.value) form.append("website", honeypot.current.value);
    form.append("cv", cv, cv.name);
    for (const file of attachments) form.append("attachments", file, file.name);

    setSending(true);
    setError("");
    try {
      await sdk.http.post(`/api/jobs/posting/${slug}/applications`, form, { anonymous: true, timeoutMs: 180_000 });
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(explain(caught));
    } finally {
      setSending(false);
    }
  };

  const miss = (field: Field) => tried && error === t.errFill && REQUIRED.includes(field) && !values[field].trim();

  const input = (field: Field, type: "text" | "tel" | "email", autoComplete: string, wide = false) => (
    <label className={wide ? "is-wide" : undefined}>
      <span>
        {t[field]}
        {REQUIRED.includes(field) ? <em aria-hidden="true"> *</em> : null}
      </span>
      <input
        name={field}
        type={type}
        value={values[field]}
        required={REQUIRED.includes(field)}
        autoComplete={autoComplete}
        dir={type === "text" ? "auto" : "ltr"}
        className={miss(field) || (field === "email" && tried && error === t.errEmail) ? "is-miss" : undefined}
        aria-invalid={miss(field) || undefined}
        onChange={(event) => set(field, event.target.value)}
      />
    </label>
  );

  return (
    <section style={{ position: "relative" }}>
      <div className="mp-sec mp-form-wrap">
        <div className="mp-form mp-apply" data-rv="1">
          <div className="mp-form-intro">
            <span className="m-eyebrow">{t.applyEyebrow}</span>
            <h2 className="m-h2">{t.formTitle}</h2>
            <p>{t.formSub}</p>
          </div>

          {sent ? (
            <div className="mp-sent" role="status">
              <span>
                <Tick size={24} width={2.4} />
              </span>
              <b>{t.sentTitle}</b>
              <p>{t.sentText}</p>
              <Link href={jobsHref} className="mp-sent-link">
                {t.backToJobs}
              </Link>
            </div>
          ) : (
            <form noValidate onSubmit={(event) => void submit(event)} aria-busy={sending}>
              {input("firstName", "text", "given-name")}
              {input("lastName", "text", "family-name")}
              {input("address", "text", "street-address", true)}
              {input("phone", "tel", "tel")}
              {input("email", "email", "email")}
              <label className="is-wide">
                <span>{t.message}</span>
                <textarea name="message" rows={4} dir="auto" value={values.message} onChange={(event) => set("message", event.target.value)} />
              </label>

              <div className="is-wide mp-file">
                <span>
                  {t.cv}
                  <em aria-hidden="true"> *</em>
                </span>
                <small>{t.cvHint}</small>
                {cv ? (
                  <ul>
                    <li>
                      <b dir="auto">{cv.name}</b>
                      <small>{sizeText(cv.size)}</small>
                      <button type="button" onClick={() => setCv(null)}>
                        {t.remove}
                      </button>
                    </li>
                  </ul>
                ) : (
                  <button type="button" className={tried && error === t.errCv ? "mp-file-pick is-miss" : "mp-file-pick"} onClick={() => cvInput.current?.click()}>
                    {t.choose}
                  </button>
                )}
                <input
                  ref={cvInput}
                  type="file"
                  accept={CV_ACCEPT}
                  className="sr-only"
                  tabIndex={-1}
                  aria-label={t.cv}
                  onChange={(event) => {
                    pickCv(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </div>

              <div className="is-wide mp-file">
                <span>{t.attachments}</span>
                <small>{t.attachmentsHint}</small>
                {attachments.length ? (
                  <ul>
                    {attachments.map((file, i) => (
                      <li key={`${file.name}-${i}`}>
                        <b dir="auto">{file.name}</b>
                        <small>{sizeText(file.size)}</small>
                        <button type="button" onClick={() => setAttachments((current) => current.filter((_, j) => j !== i))}>
                          {t.remove}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {attachments.length < MAX_ATTACHMENTS ? (
                  <button type="button" className="mp-file-pick" onClick={() => moreInput.current?.click()}>
                    {t.chooseMore}
                  </button>
                ) : null}
                <input
                  ref={moreInput}
                  type="file"
                  multiple
                  accept={ATTACHMENT_ACCEPT}
                  className="sr-only"
                  tabIndex={-1}
                  aria-label={t.attachments}
                  onChange={(event) => {
                    pickMore(event.target.files);
                    event.target.value = "";
                  }}
                />
              </div>

              <label className={`is-wide mp-consent${tried && error === t.errConsent ? " is-miss" : ""}`}>
                <input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setError(""); }} />
                <span>
                  {t.consentBefore}
                  <Link href={privacyHref} target="_blank">
                    {t.consentLink}
                  </Link>
                  {t.consentAfter}
                  <em aria-hidden="true"> *</em>
                </span>
              </label>

              <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="sr-only" />
              {error ? (
                <p role="alert" className="mp-form-err">
                  {error}
                </p>
              ) : null}
              <button type="submit" className="mp-form-send" disabled={sending}>
                {sending ? t.sending : t.submit}
                {sending ? null : <Arrow size={15} />}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
