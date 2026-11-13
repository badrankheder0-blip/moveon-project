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
}

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

const KNOWN = ["name", "email", "phone", "company", "message"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FormBlock({
  anchor = "form",
  kind,
  locale,
  copy,
  fields,
}: {
  anchor?: string;
  kind: "contact" | "business" | "partner" | "job";
  locale: Locale;
  copy: FormCopy;
  fields: FieldSpec[];
}) {
  const sdk = useSdk();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);

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
      await sdk.http.post("/api/leads", body, { anonymous: true });
      setSent(true);
      setValues({});
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
