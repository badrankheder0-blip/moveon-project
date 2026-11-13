"use client";

import { useRef, useState, type FormEvent, type FormHTMLAttributes, type ReactNode } from "react";

import { useSdk } from "@/lib/api";

/**
 * Sends one of the website's forms — contact, business, partnership, job — to
 * the website inbox (`POST /api/leads`).
 *
 * The forms stay server-rendered markup with native controls; this only takes
 * over the submit. The browser's own constraint check (`required`,
 * `type="email"`) runs first, then every named field is posted: the ones the
 * inbox knows by name (name, email, phone, company, message) as themselves,
 * everything else under its own name so the office sees the form as it was
 * filled in. A file input contributes its file's name; the file itself is not
 * uploaded.
 *
 * Without `lead` it renders the plain form it wraps, unchanged.
 */

export interface LeadConfig {
  kind: "contact" | "business" | "partner" | "job";
  locale: "de" | "en" | "ar" | "tr";
  /** CMS copy for the confirmation and the failure line; built-in wording when empty. */
  success?: string | undefined;
  error?: string | undefined;
}

const KNOWN = ["name", "email", "phone", "company", "message"] as const;

const WORDS = {
  success: {
    de: "Danke! Ihre Nachricht ist bei uns angekommen. Wir melden uns so schnell wie möglich.",
    en: "Thank you! Your message has reached us. We'll get back to you as soon as possible.",
    ar: "شكراً لك! وصلتنا رسالتك وسنعود إليك في أقرب وقت ممكن.",
    tr: "Teşekkürler! Mesajınız bize ulaştı. En kısa sürede size dönüş yapacağız.",
  },
  error: {
    de: "Das hat leider nicht geklappt. Bitte versuchen Sie es erneut oder rufen Sie uns an.",
    en: "Sorry, that didn't work. Please try again or give us a call.",
    ar: "عذراً، لم يتم الإرسال. حاول مرة أخرى أو اتصل بنا.",
    tr: "Üzgünüz, gönderilemedi. Lütfen tekrar deneyin veya bizi arayın.",
  },
};

export function LeadForm({
  lead,
  children,
  ...form
}: Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & { lead?: LeadConfig | undefined; children: ReactNode }) {
  const sdk = useSdk();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const sending = useRef(false);

  if (!lead) return <form {...form}>{children}</form>;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    if (sending.current || !element.reportValidity()) return;

    const body: Record<string, unknown> = { kind: lead.kind, locale: lead.locale };
    const data: Record<string, string> = {};
    for (const [key, value] of new FormData(element).entries()) {
      const text = typeof value === "string" ? value.trim() : value.name;
      if (!text) continue;
      if (key === "website") body.website = text;
      else if ((KNOWN as readonly string[]).includes(key)) body[key] = text;
      else data[key] = text;
    }
    body.data = data;

    sending.current = true;
    setState("sending");
    try {
      await sdk.http.post("/api/leads", body, { anonymous: true });
      element.reset();
      setState("sent");
    } catch {
      setState("error");
    } finally {
      sending.current = false;
    }
  };

  return (
    <form {...form} onSubmit={(event) => void submit(event)} aria-busy={state === "sending"}>
      {children}
      {/* A field no visitor sees or reaches; a bot that fills every input fills this one too. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="sr-only" />
      {state === "sent" || state === "error" ? (
        <p role={state === "error" ? "alert" : "status"} className={`text-body-sm font-semibold ${state === "sent" ? "text-success-text" : "text-brand-red"}`}>
          {state === "sent" ? lead.success || WORDS.success[lead.locale] : lead.error || WORDS.error[lead.locale]}
        </p>
      ) : null}
    </form>
  );
}
