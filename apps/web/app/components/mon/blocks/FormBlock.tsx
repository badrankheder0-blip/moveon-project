"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { useSdk } from "@/lib/api";
import type { Locale } from "@/lib/i18n/config";

import { Arrow } from "../Icons";
import { Tick } from "./kit";

/**
 * The prototype's lead form (`formB`): a white card with the intro on one
 * side and the fields on the other, then a green "thank you" panel once sent.
 *
 * It posts to the website inbox exactly as the site's LeadForm does
 * (`POST /api/leads`, see components/site/LeadForm.tsx): the fields the inbox
 * knows by name at the top level, every other field under `data`, and the
 * hidden `website` field a bot fills in. The checks are the prototype's —
 * required fields first, then the email's shape — so a visitor sees its
 * red-bordered fields rather than the browser's bubbles.
 */

export interface FieldSpec {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "select" | "area";
  wide?: boolean;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

/** An optional file the visitor can attach (PDF, Word, JPEG or PNG, up to 10 MB). */
export interface UploadSpec {
  label: string;
  hint: string;
  choose: string;
  remove: string;
  errType: string;
  errSize: string;
}

const UPLOAD_ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png";
const UPLOAD_TYPES = /\.(pdf|docx?|jpe?g|png)$/i;
const UPLOAD_MAX = 10 * 1024 * 1024;

export interface FormCopy {
  eyebrow: string;
  title: string;
  sub: string;
  submit: string;
  sentTitle: string;
  sentText: string;
  sendAnother: string;
  errFill: string;
  errEmail: string;
  errSend: string;
}

/** Optional explanation under the intro: numbered points, then a short note box. */
export interface FormGuide {
  title: string;
  items: { title: string; text: string }[];
  afterTitle?: string;
  afterText?: string;
}

const KNOWN = ["name", "email", "phone", "company", "message"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FormBlock({
  anchor = "form",
  kind,
  locale,
  copy,
  fields,
  upload,
  guide,
}: {
  anchor?: string;
  kind: "contact" | "business" | "partner" | "job";
  locale: Locale;
  copy: FormCopy;
  fields: FieldSpec[];
  /** When given, the form takes one optional file and is sent with it (POST /api/leads/with-file). */
  upload?: UploadSpec;
  guide?: FormGuide;
}) {
  const sdk = useSdk();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const pickFile = (picked: File | undefined) => {
    setError("");
    if (!picked || !upload) return;
    if (!UPLOAD_TYPES.test(picked.name)) return setError(upload.errType);
    if (picked.size > UPLOAD_MAX) return setError(upload.errSize);
    setFile(picked);
  };

  // "Apply" on a role picks it here.
  useEffect(() => {
    const onSet = (event: Event) => {
      const detail = (event as CustomEvent<{ form: string; name: string; value: string }>).detail;
      if (detail?.form !== anchor) return;
      setValues((current) => ({ ...current, [detail.name]: detail.value }));
      setSent(false);
    };
    window.addEventListener("mon:form-set", onSet);
    return () => window.removeEventListener("mon:form-set", onSet);
  }, [anchor]);

  const valueOf = (field: FieldSpec) => values[field.name] ?? (field.type === "select" ? (field.options?.[0] ?? "") : "");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    setTried(true);
    if (fields.some((field) => field.required && !valueOf(field).trim())) {
      setError(copy.errFill);
      return;
    }
    const email = values.email?.trim();
    if (email && !EMAIL.test(email)) {
      setError(copy.errEmail);
      return;
    }

    const body: Record<string, unknown> = { kind, locale };
    const data: Record<string, string> = {};
    for (const field of fields) {
      const text = valueOf(field).trim();
      if (!text) continue;
      if (KNOWN.includes(field.name)) body[field.name] = text;
      else data[field.name] = text;
    }
    body.data = data;
    if (honeypot.current?.value) body.website = honeypot.current.value;

    setSending(true);
    setError("");
    try {
      if (upload) {
        const form = new FormData();
        form.append("payload", JSON.stringify(body));
        if (file) form.append("file", file, file.name);
        await sdk.http.post("/api/leads/with-file", form, { anonymous: true, timeoutMs: 120_000 });
      } else {
        await sdk.http.post("/api/leads", body, { anonymous: true });
      }
      setSent(true);
      setValues({});
      setFile(null);
      setTried(false);
    } catch {
      setError(copy.errSend);
    } finally {
      setSending(false);
    }
  };

  return (
    <section style={{ position: "relative" }}>
      <div id={anchor} className="mp-sec mp-form-wrap">
        <div className="mp-form" data-rv="1">
          <div className="mp-form-intro">
            <span className="m-eyebrow">{copy.eyebrow}</span>
            <h2 className="m-h2">{copy.title}</h2>
            <p>{copy.sub}</p>
            {guide && guide.items.length ? (
              <div className="mp-form-guide">
                {guide.title ? <h3>{guide.title}</h3> : null}
                <ol>
                  {guide.items.map((item, i) => (
                    <li key={i}>
                      <span dir="ltr">{i + 1}</span>
                      <div>
                        <b>{item.title}</b>
                        {item.text ? <p>{item.text}</p> : null}
                      </div>
                    </li>
                  ))}
                </ol>
                {guide.afterTitle || guide.afterText ? (
                  <div className="mp-form-after">
                    {guide.afterTitle ? <b>{guide.afterTitle}</b> : null}
                    {guide.afterText ? <p>{guide.afterText}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          {sent ? (
            <div className="mp-sent" role="status">
              <span>
                <Tick size={24} width={2.4} />
              </span>
              <b>{copy.sentTitle}</b>
              <p>{copy.sentText}</p>
              <button type="button" onClick={() => setSent(false)}>
                {copy.sendAnother}
              </button>
            </div>
          ) : (
            <form noValidate onSubmit={(event) => void submit(event)} aria-busy={sending}>
              {fields.map((field) => {
                const miss = tried && error === copy.errFill && field.required && !valueOf(field).trim();
                const common = {
                  name: field.name,
                  value: valueOf(field),
                  className: miss ? "is-miss" : undefined,
                  "aria-invalid": miss || undefined,
                  required: field.required,
                  placeholder: field.placeholder || undefined,
                };
                const set = (value: string) => {
                  setValues((current) => ({ ...current, [field.name]: value }));
                  setError("");
                };
                return (
                  <label key={field.name} className={field.wide ? "is-wide" : undefined}>
                    {field.label}
                    {field.type === "select" ? (
                      <select {...common} onChange={(event) => set(event.target.value)}>
                        {(field.options ?? []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "area" ? (
                      <textarea {...common} rows={4} onChange={(event) => set(event.target.value)} />
                    ) : (
                      <input
                        {...common}
                        type={field.type}
                        dir={field.type === "email" || field.type === "tel" ? "ltr" : "auto"}
                        autoComplete={field.name === "name" ? "name" : field.type === "text" ? undefined : field.type}
                        onChange={(event) => set(event.target.value)}
                      />
                    )}
                  </label>
                );
              })}
 {upload ? (
                <div className="is-wide mp-file">
                  <span>{upload.label}</span>
                  <small>{upload.hint}</small>
                  {file ? (
                    <ul>
                      <li>
                        <b dir="auto">{file.name}</b>
                        <small>{file.size >= 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`}</small>
                        <button type="button" onClick={() => setFile(null)}>
                          {upload.remove}
                        </button>
                      </li>
                    </ul>
                  ) : (
                    <button type="button" className="mp-file-pick" onClick={() => fileInput.current?.click()}>
                      {upload.choose}
                    </button>
                  )}
                  <input
                    ref={fileInput}
                    type="file"
                    accept={UPLOAD_ACCEPT}
                    className="sr-only"
                    tabIndex={-1}
                    aria-label={upload.label}
                    onChange={(event) => {
                      pickFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </div>
              ) : null}
              <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="sr-only" />
              {error ? (
                <p role="alert" className="mp-form-err">
                  {error}
                </p>
              ) : null}
              <button type="submit" className="mp-form-send" disabled={sending}>
                {copy.submit}
                <Arrow size={15} />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
