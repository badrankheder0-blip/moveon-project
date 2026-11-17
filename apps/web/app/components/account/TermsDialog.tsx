"use client";

import { useEffect, useState } from "react";

import { useText } from "@/lib/admin/text";

import { Icon } from "./Icon";
import { IC } from "./model";
import { AC } from "./text";

export type TermsDoc = "page-terms" | "page-privacy";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Doc {
  title: string;
  note: string;
  sections: { title: string; body: string }[];
}

/**
 * A legal document (AGB or Datenschutzerklärung) in a popup over the sign-up
 * form. Same CMS text as /agb and /datenschutz (`hero.headline`, `notice`,
 * `N.title` / `N.body`), read when the popup opens.
 */
export function TermsDialog({ section, locale, onClose }: { section: TermsDoc; locale: string; onClose: () => void }) {
  const tx = useText(AC);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    const query = new URLSearchParams({ locale, section });
    fetch(`${API_URL}/api/site/content?${query}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((payload: { sections?: Record<string, Record<string, string>> }) => {
        if (!live) return;
        const copy = payload.sections?.[section] ?? {};
        const c = (slot: string) => copy[slot]?.trim() ?? "";
        const sections: Doc["sections"] = [];
        for (let n = 1; n <= 40; n += 1) {
          const title = c(`${n}.title`).replace(/^\d+\.\s*/, "");
          const body = c(`${n}.body`);
          if (!title && !body) break;
          sections.push({ title, body });
        }
        setDoc({ title: c("hero.headline") || c("meta.title"), note: c("notice"), sections });
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [locale, section]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="au-modal" role="presentation" onClick={onClose}>
      <div className="au-modal-box" role="dialog" aria-modal="true" aria-label={doc?.title || undefined} onClick={(event) => event.stopPropagation()}>
        <div className="au-modal-head">
          <h2>{doc?.title ?? ""}</h2>
          <button type="button" className="au-modal-x" aria-label={tx("auTermsClose")} onClick={onClose} autoFocus>
            <Icon d={IC.close} size={18} sw={2.2} />
          </button>
        </div>
        <div className="au-modal-body">
          {failed ? (
            <p>{tx("auTermsFailed")}</p>
          ) : !doc ? (
            <p>{tx("auTermsLoading")}</p>
          ) : (
            <>
              {doc.note ? <p className="au-modal-note">{doc.note}</p> : null}
              {doc.sections.map((sec, i) => (
                <section key={i}>
                  <h3>{sec.title}</h3>
                  <p>{sec.body}</p>
                </section>
              ))}
            </>
          )}
        </div>
        <div className="au-modal-foot">
          <button type="button" className="au-submit" onClick={onClose}>
            {tx("auTermsClose")}
          </button>
        </div>
      </div>
    </div>
  );
}
