"use client";

import { useEffect, useRef, useState } from "react";

import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

interface Suggestion {
  intent: string;
  question: string;
}

interface Reply {
  kind: "answer" | "clarify" | "handoff";
  text: string;
  intent?: string;
  suggestions?: Suggestion[];
}

interface Bubble {
  id: string;
  role: "user" | "assistant" | "staff";
  text: string;
  suggestions?: Suggestion[];
}

/**
 * The support assistant.
 *
 * Answers come from the backend's knowledge base, in the customer's language.
 * Three things this version does that the previous one could not:
 *
 *  - it survives a reload, because the thread lives on the server;
 *  - it offers the near-miss questions when unsure, instead of guessing;
 *  - it can hand over to a person.
 */
export default function ChatWidget({ variant }: { variant?: "pill" } = {}) {
  const { sdk } = useApi();
  const { t, locale } = useI18n();

  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [humanHandled, setHumanHandled] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // The greeting follows the active language, rather than being fixed German.
  useEffect(() => {
    setBubbles([{ id: "greeting", role: "assistant", text: t("chat.greeting") }]);
  }, [t]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bubbles, open]);

  function append(bubble: Bubble) {
    setBubbles((previous) => [...previous, bubble]);
  }

  async function send(text: string) {
    if (!text.trim() || sending) return;

    append({ id: `u-${Date.now()}`, role: "user", text });
    setInput("");
    setSending(true);

    try {
      const result = await sdk.http.post<{
        threadId: string;
        reply: Reply;
        isHumanHandled: boolean;
      }>("/api/chat", { message: text, locale, ...(threadId ? { threadId } : {}) });

      setThreadId(result.threadId);
      setHumanHandled(result.isHumanHandled);

      if (result.isHumanHandled) {
        append({ id: `h-${Date.now()}`, role: "assistant", text: t("chat.humanTakeover") });
        return;
      }

      append({
        id: `a-${Date.now()}`,
        role: "assistant",
        text: result.reply.text,
        ...(result.reply.suggestions ? { suggestions: result.reply.suggestions } : {}),
      });
    } catch {
      append({ id: `e-${Date.now()}`, role: "assistant", text: t("chat.failed") });
    } finally {
      setSending(false);
    }
  }

  /** Answers a suggested question directly, without re-matching free text. */
  async function pick(suggestion: Suggestion) {
    if (!threadId || sending) return;

    append({ id: `u-${Date.now()}`, role: "user", text: suggestion.question });
    setSending(true);

    try {
      const result = await sdk.http.post<{ reply: Reply }>(`/api/chat/${threadId}/intent`, {
        intent: suggestion.intent,
      });

      append({ id: `a-${Date.now()}`, role: "assistant", text: result.reply.text });
    } catch {
      append({ id: `e-${Date.now()}`, role: "assistant", text: t("chat.failed") });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* The public site's WhatsApp-green pill (the website prototype's contact button):
          a white disc with the speech bubble, its label sliding out on hover. */}
      {variant === "pill" ? (
        <button
          type="button"
          className="m-fab"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? t("chat.close") : t("chat.open")}
          aria-expanded={open}
        >
          <span className="m-fab-label">{open ? t("chat.close") : t("chat.open")}</span>
          <span className="m-fab-ic">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {open ? (
                <path d="M6 6l12 12M18 6 6 18" />
              ) : (
                <>
                  <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.6z" />
                  <path d="M9 8.6c0 3.4 2.9 6.4 6.4 6.4l1.2-1.4-2-1-1 .8c-1-.5-2.4-1.9-2.9-2.9l.8-1-1-2z" />
                </>
              )}
            </svg>
          </span>
        </button>
      ) : (
        <button
          type="button"
          className="chat-fab"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? t("chat.close") : t("chat.open")}
          aria-expanded={open}
        >
          {open ? "✕" : "💬"}
        </button>
      )}

      {open && (
        <div className="chat-panel">
          <div className="chat-panel-head">
            <strong>{t("chat.title")}</strong>
            <span className="muted">
              {humanHandled ? t("chat.humanTakeover") : t("chat.subtitle")}
            </span>
          </div>

          {/* A log region, so new messages are announced rather than appearing
              silently to anyone using a screen reader. */}
          <div className="chat-panel-body" role="log" aria-live="polite" aria-relevant="additions">
            {bubbles.map((bubble) => (
              <div key={bubble.id}>
                <div className={`chat-bubble ${bubble.role === "user" ? "team" : "kunde"}`}>
                  {bubble.text}
                </div>

                {bubble.suggestions && bubble.suggestions.length > 0 && (
                  <div className="chat-suggestions">
                    {bubble.suggestions.map((suggestion) => (
                      <button
                        key={suggestion.intent}
                        type="button"
                        className="btn ghost small"
                        disabled={sending}
                        onClick={() => void pick(suggestion)}
                      >
                        {suggestion.question}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {sending && <div className="chat-bubble kunde">…</div>}
            <div ref={bottomRef} />
          </div>

          <form
            className="chat-panel-input"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <label htmlFor="chat-input" className="sr-only">
              {t("chat.placeholder")}
            </label>
            <input
              id="chat-input"
              type="text"
              placeholder={t("chat.placeholder")}
              value={input}
              maxLength={2000}
              onChange={(event) => setInput(event.target.value)}
              disabled={sending}
            />
            <button type="submit" className="btn primary" disabled={sending || !input.trim()}>
              {t("chat.send")}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
